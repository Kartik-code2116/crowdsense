from fastapi import APIRouter, File, UploadFile, Form
from typing import Optional
import io
import os
import torch
import numpy as np
from PIL import Image

from app.core.config import settings
from app.core.model_loader import model_loader
from app.services.heatmap import density_to_base64_heatmap
from app.services.inference import transform_pipeline

router = APIRouter(tags=["Explainable AI"])


@router.post("/explain/gradcam")
async def generate_density_gradcam(
    file: Optional[UploadFile] = File(None),
    layer: str = Form("backend_conv5_3")
):
    """
    Computes genuine Density Grad-CAM activation map using PyTorch backpropagation.
    Highlights spatial regions where convolutional features most heavily
    influenced the total integrated crowd count.
    """
    gradcam = model_loader.get_gradcam()
    
    # Load image bytes
    if file is not None:
        image_bytes = await file.read()
    else:
        sample_path = "ai-service/samples/stadium_dense.jpg"
        if os.path.exists(sample_path):
            with open(sample_path, "rb") as f:
                image_bytes = f.read()
        else:
            sample = Image.new("RGB", (640, 480), color=(50, 70, 85))
            buf = io.BytesIO()
            sample.save(buf, format="JPEG")
            image_bytes = buf.getvalue()

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = img.size
    
    max_dim = 640
    if max(w, h) > max_dim:
        scale = max_dim / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.BILINEAR)
        w, h = img.size

    if gradcam is not None:
        tensor = transform_pipeline(img).unsqueeze(0).to(settings.DEVICE)
        tensor.requires_grad = True
        cam, count = gradcam.generate(tensor)
    else:
        cam = np.zeros((h // 8, w // 8), dtype=np.float32)

    # Render colorized Grad-CAM overlay (base64)
    gradcam_url = density_to_base64_heatmap(cam, target_size=(w, h))

    return {
        "status": "success",
        "is_real_pytorch": gradcam is not None,
        "target_layer": layer,
        "explanation": "Grad-CAM backpropagates d(Count)/dA_k to weight positive dilated receptive field features",
        "gradcam_data_url": gradcam_url,
        "cam_shape": list(cam.shape),
        "peak_activation": float(np.max(cam))
    }
