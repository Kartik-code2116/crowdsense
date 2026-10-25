from fastapi import APIRouter
from pydantic import BaseModel
import time

router = APIRouter(tags=["Stream Ingestion"])


class StreamConfigRequest(BaseModel):
    camera_id: str
    stream_url: str
    target_fps: float = 2.0
    zone_id: str


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
