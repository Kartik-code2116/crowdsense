from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from app.services.inference import InferenceEngine

router = APIRouter(tags=["Inference"])


@router.post("/predict")
async def predict_crowd_density(
    file: UploadFile = File(...),
    model: str = Form("csrnet"),
    zone_capacity: int = Form(250),
    warning_pct: float = Form(75),
    critical_pct: float = Form(90)
):
    """
    Receives an uploaded frame, regresses continuous density map using CSRNet,
    computes integral crowd count, generates Jet heatmap overlay, and calculates optical flow.
    """
    try:
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Upload a non-empty image file.")

        result = InferenceEngine.process_image(
            image_bytes=image_bytes,
            model_name=model,
            zone_capacity=zone_capacity,
            warning_pct=warning_pct,
            critical_pct=critical_pct,
            source_key=f"upload:{file.filename}" if file is not None and file.filename else None
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
