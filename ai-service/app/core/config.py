import os
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env from the ai-service root directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))


class Settings(BaseModel):
    PROJECT_NAME: str = "CrowdSense AI Microservice"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    
    # Model parameters
    DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "csrnet")
    DEVICE: str = os.getenv("DEVICE", "cuda" if os.getenv("USE_CUDA") == "true" else "cpu")
    CSRNET_WEIGHTS_PATH: str = os.getenv("CSRNET_WEIGHTS_PATH", "./weights/csrnet_shanghaitech.pth")
    MCNN_WEIGHTS_PATH: str = os.getenv("MCNN_WEIGHTS_PATH", "./weights/mcnn_shanghaitech.pth")
    ONNX_WEIGHTS_PATH: str = os.getenv("ONNX_WEIGHTS_PATH", "./weights/csrnet.onnx")
    
    # Thresholds
    SURGE_THRESHOLD_PERCENT: float = 25.0  # % increase over rolling baseline
    ANOMALY_SENSITIVITY: float = 0.75
    
    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000",
        "*"
    ]


settings = Settings()
