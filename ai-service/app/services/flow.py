"""Optical flow between consecutive frames for one stream."""

import cv2
import numpy as np

_previous_frames = {}


class CrowdFlowService:
    @staticmethod
    def estimate_flow(prev_frame=None, current_frame=None, grid_size=(4, 4), source_key=None):
        """Return measured motion vectors, or unavailable until a pair of frames exists."""
        if current_frame is None or not source_key:
            return {"available": False, "average_speed_px_per_frame": None, "dominant_heading_deg": None, "flow_direction": "Unavailable", "vectors": []}

        gray = cv2.cvtColor(current_frame, cv2.COLOR_RGB2GRAY) if current_frame.ndim == 3 else current_frame
        gray = cv2.resize(gray, (320, 180), interpolation=cv2.INTER_AREA)
        key = str(source_key)
        previous = prev_frame if prev_frame is not None else _previous_frames.get(key)
        _previous_frames[key] = gray
        if len(_previous_frames) > 128:
            _previous_frames.pop(next(iter(_previous_frames)))
        if previous is None:
            return {"available": False, "average_speed_px_per_frame": None, "dominant_heading_deg": None, "flow_direction": "Waiting for next frame", "vectors": []}

        flow = cv2.calcOpticalFlowFarneback(previous, gray, None, 0.5, 3, 15, 3, 5, 1.2, 0)
        rows, cols = grid_size
        cell_h, cell_w = gray.shape[0] // rows, gray.shape[1] // cols
        vectors = []
        for row in range(rows):
            for col in range(cols):
                cell = flow[row * cell_h:(row + 1) * cell_h, col * cell_w:(col + 1) * cell_w]
                dx, dy = np.mean(cell, axis=(0, 1))
                vectors.append({"grid_x": col, "grid_y": row, "dx": round(float(dx), 2), "dy": round(float(dy), 2), "speed": round(float(np.hypot(dx, dy)), 2)})

        avg_speed = float(np.mean([vector["speed"] for vector in vectors])) if vectors else 0.0
        mean_dx = float(np.mean([vector["dx"] for vector in vectors])) if vectors else 0.0
        mean_dy = float(np.mean([vector["dy"] for vector in vectors])) if vectors else 0.0
        heading = round(float(np.degrees(np.arctan2(mean_dy, mean_dx)) % 360), 1) if avg_speed > 0.05 else None
        return {
            "available": True,
            "average_speed_px_per_frame": round(avg_speed, 2),
            "dominant_heading_deg": heading,
            "flow_direction": f"{heading}°" if heading is not None else "Still",
            "vectors": vectors
        }
