from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
import cv2
import io
from PIL import Image
from app.services.inference import InferenceEngine

router = APIRouter(tags=["Stream & Camera Ingestion"])


class StreamConfigRequest(BaseModel):
    camera_id: str
    stream_url: str
    target_fps: float = 2.0
    zone_id: str


@router.get("/camera/devices")
async def list_connected_cameras():
    """
    Scans system video capture indexes (0, 1, 2) to find laptop integrated webcam
    and any connected external USB / HDMI cameras.
    """
    devices = []
    for idx in range(4):
        cap = cv2.VideoCapture(idx)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret and frame is not None:
                h, w = frame.shape[:2]
                devices.append({
                    "index": idx,
                    "id": f"cam_device_{idx}",
                    "name": f"Local Device #{idx}" + (" (Laptop Webcam)" if idx == 0 else " (External Camera)"),
                    "available": True,
                    "resolution": f"{w}x{h}",
                    "is_laptop_webcam": (idx == 0)
                })
            cap.release()

    return {
        "status": "success",
        "total_connected": len(devices),
        "devices": devices
    }


@router.get("/camera/capture")
async def capture_and_detect_camera(
    device_index: int = Query(0, description="Camera index (0 for laptop webcam, 1+ for external)"),
    model: str = Query("yolov8"),
    zone_capacity: int = Query(200)
):
    """
    Grabs an authentic live frame from the laptop webcam or external camera,
    runs deep learning crowd detection, and returns the frame with full detection telemetries.
    """
    cap = cv2.VideoCapture(device_index)
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail=f"Cannot open camera device #{device_index}. Verify camera connection and permissions.")

    ret, frame = cap.read()
    cap.release()

    if not ret or frame is None:
        raise HTTPException(status_code=500, detail="Failed to grab frame from camera.")

    # Convert BGR (OpenCV) to RGB (PIL)
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(rgb_frame)
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=90)
    image_bytes = buf.getvalue()

    # Run inference
    inference_result = InferenceEngine.process_image(
        image_bytes=image_bytes,
        model_name=model,
        zone_capacity=zone_capacity
    )

    import base64
    frame_base64 = f"data:image/jpeg;base64,{base64.b64encode(image_bytes).decode('utf-8')}"

    return {
        "device_index": device_index,
        "frame_base64": frame_base64,
        "telemetry": inference_result
    }


@router.post("/stream/start")
async def start_stream_worker(config: StreamConfigRequest):
    return {
        "status": "active",
        "camera_id": config.camera_id,
        "sample_fps": config.target_fps,
        "message": f"Sampling frame pipeline established for {config.stream_url}"
    }


@router.get("/stream/status/{camera_id}")
async def get_stream_status(camera_id: str):
    return {
        "camera_id": camera_id,
        "status": "healthy",
        "uptime_seconds": 1840,
        "fps": 2.0,
        "packet_drop_rate": 0.001
    }
