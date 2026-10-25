from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.model_loader import model_loader
from app.routers import predict, forecast, explain, stream


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load models & weights
    model_loader.initialize(settings)
    yield
    # Shutdown logic if any


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Microservice providing CSRNet/MCNN density regression, LSTM forecasting, and Grad-CAM explainability.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(predict.router, prefix=settings.API_PREFIX)
app.include_router(forecast.router, prefix=settings.API_PREFIX)
app.include_router(explain.router, prefix=settings.API_PREFIX)
app.include_router(stream.router, prefix=settings.API_PREFIX)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "service": "CrowdSense AI Microservice",
        "version": settings.VERSION,
        "active_model": model_loader.active_model_name,
        "device": settings.DEVICE,
        "real_weights_loaded": model_loader.has_real_weights
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
