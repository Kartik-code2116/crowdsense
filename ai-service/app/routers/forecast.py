"""Forecast baseline endpoint. This route is deliberately not described as a trained LSTM."""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List
import numpy as np

router = APIRouter(tags=["Forecasting"])


class ForecastRequest(BaseModel):
    zone_id: str
    capacity: int = Field(default=250, ge=1)
    historical_counts: List[int] = Field(min_length=3)
    forecast_steps: int = Field(default=8, ge=1, le=24)
    warning_pct: int = Field(default=70, ge=1, le=99)
    critical_pct: int = Field(default=85, ge=1, le=100)


@router.post("/forecast")
async def forecast_crowd_levels(req: ForecastRequest):
    counts = np.maximum(0, np.asarray(req.historical_counts, dtype=np.float32))
    recent = counts[-8:]
    differences = np.diff(recent)
    trend_per_sample = float(np.median(differences)) if len(differences) else 0.0
    residual_range = float(np.std(differences)) if len(differences) > 1 else 0.0
    last_value = float(counts[-1])

    forecasts = []
    overload_minutes = None
    for step in range(1, req.forecast_steps + 1):
        minutes = step * 2  # Historical samples must be supplied at two-minute intervals.
        predicted = max(0, int(round(last_value + trend_per_sample * step)))
        spread = int(round(residual_range * np.sqrt(step)))
        occupancy = round(predicted / req.capacity * 100, 1)
        risk = "Critical" if occupancy >= req.critical_pct else "Warning" if occupancy >= req.warning_pct else "Normal"
        if risk == "Critical" and overload_minutes is None:
            overload_minutes = minutes
        forecasts.append({
            "step": step, "minutes_ahead": minutes, "predicted_count": predicted,
            "trend_range_lower": max(0, predicted - spread), "trend_range_upper": predicted + spread,
            "predicted_occupancy_pct": occupancy, "risk": risk
        })

    return {
        "zone_id": req.zone_id,
        "capacity": req.capacity,
        "baseline_count": int(last_value),
        "forecast_method": "linear trend baseline (not a trained LSTM)",
        "forecast_horizon_minutes": req.forecast_steps * 2,
        "predicted_overcrowding_in_minutes": overload_minutes,
        "alert_triggered": overload_minutes is not None,
        "forecast_series": forecasts
    }
