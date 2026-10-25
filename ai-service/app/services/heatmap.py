"""
Heatmap Rendering Service
Converts continuous 2D crowd density maps into high-contrast colorized
alpha-blended overlays (Jet/Turbo colormap) and encodes to base64 for dashboard rendering.
"""

import io
import base64
import numpy as np
from PIL import Image


def colormap_jet(values):
    """
    Vectorized pure-Python/NumPy implementation of the Jet/Turbo colormap.
    Values normalized in [0, 1].
    Returns (H, W, 4) RGBA uint8 array.
    """
    v = np.clip(values, 0.0, 1.0)
    
    # 4-stage color interpolation:
    # 0.0 -> Blue (0, 0, 1)
    # 0.25 -> Cyan (0, 1, 1)
    # 0.5 -> Green (0, 1, 0)
    # 0.75 -> Yellow (1, 1, 0)
    # 1.0 -> Red (1, 0, 0)
    r = np.clip(1.5 - np.abs(4.0 * v - 3.0), 0.0, 1.0)
    g = np.clip(1.5 - np.abs(4.0 * v - 2.0), 0.0, 1.0)
    b = np.clip(1.5 - np.abs(4.0 * v - 1.0), 0.0, 1.0)
    
    # Opacity ramps up with density to keep low-density zones transparent
    alpha = np.clip(v * 1.8, 0.0, 0.85)

    rgba = np.stack([
        (r * 255).astype(np.uint8),
        (g * 255).astype(np.uint8),
        (b * 255).astype(np.uint8),
        (alpha * 255).astype(np.uint8)
    ], axis=-1)

    return rgba


def density_to_base64_heatmap(density_map, target_size=None):
    """
    Renders 2D density map as a base64 PNG data URL.
    """
    d_min = np.min(density_map)
    d_max = np.max(density_map)
    
    if d_max > d_min:
        norm = (density_map - d_min) / (d_max - d_min)
    else:
        norm = np.zeros_like(density_map)
        
    rgba = colormap_jet(norm)
    img = Image.fromarray(rgba, mode='RGBA')
    
    if target_size is not None and target_size != (img.width, img.height):
        img = img.resize(target_size, Image.Resampling.BILINEAR)

    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    encoded = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return f"data:image/png;base64,{encoded}"
