from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from typing import Optional
from app.services.inference import InferenceEngine

router = APIRouter(tags=["Inference"])


@router.post("/predict")
async def predict_crowd_density(
    file: Optional[UploadFile] = File(None),
    model: str = Form("csrnet"),
    zone_capacity: int = Form(250)
):
    """
    Receives an uploaded frame, regresses continuous density map using CSRNet,
    computes integral crowd count, generates Jet heatmap overlay, and calculates optical flow.
    """
    try:
        if file is not None:
            image_bytes = await file.read()
        else:
            # Generate sample image bytes (300x400 blank placeholder) if no file uploaded
            import io
            from PIL import Image
            sample = Image.new("RGB", (640, 480), color=(50, 70, 85))
            buf = io.BytesIO()
            sample.save(buf, format="JPEG")
            image_bytes = buf.getvalue()

        result = InferenceEngine.process_image(
            image_bytes=image_bytes,
            model_name=model,
            zone_capacity=zone_capacity
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
