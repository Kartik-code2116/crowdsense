from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import numpy as np

router = APIRouter(tags=["Forecasting"])


class ForecastRequest(BaseModel):
    zone_id: str
    capacity: int = 250
    historical_counts: List[int] = [120, 125, 134, 142, 155, 168, 180, 192, 205]
    forecast_steps: int = 8  # 8 steps ahead (e.g. +2, +4, +6, +8, +10, +12, +14, +16 min)


@router.post("/forecast")
async def forecast_crowd_levels(req: ForecastRequest):
    """
    Simulates sequential LSTM multi-horizon forecasting for crowd counts,
    computing mean trend and upper/lower 95% confidence intervals.
    """
    counts = np.array(req.historical_counts, dtype=np.float32)
    last_val = counts[-1] if len(counts) > 0 else 100.0
    
    # Calculate recent trend rate of change
    if len(counts) >= 3:
        trend = (counts[-1] - counts[-3]) / 2.0
    else:
        trend = 2.5
        
    forecasts = []
    overcrowding_step = None
    overcrowding_minutes = None

    for step in range(1, req.forecast_steps + 1):
        minutes_ahead = step * 2  # Each step is 2 minutes
        # Trend continuation with slight dampening
        pred_val = last_val + (trend * step * 0.95)
        # Variance grows over time
        uncertainty = 3.5 + (step * 2.2)
        
        ci_lower = max(0, int(round(pred_val - 1.96 * uncertainty)))
        ci_upper = int(round(pred_val + 1.96 * uncertainty))
        mean_count = int(round(pred_val))
        
        pct_capacity = round((mean_count / max(1, req.capacity)) * 100, 1)

        if mean_count >= req.capacity * 0.9 and overcrowding_step is None:
            overcrowding_step = step
            overcrowding_minutes = minutes_ahead

        forecasts.append({
            "step": step,
            "minutes_ahead": minutes_ahead,
            "predicted_count": mean_count,
            "ci_lower": ci_lower,
            "ci_upper": ci_upper,
            "predicted_occupancy_pct": pct_capacity,
            "risk": "Critical" if pct_capacity >= 90 else "Warning" if pct_capacity >= 75 else "Normal"
        })

    return {
        "zone_id": req.zone_id,
        "capacity": req.capacity,
        "baseline_count": int(last_val),
        "forecast_horizon_minutes": req.forecast_steps * 2,
        "predicted_overcrowding_in_minutes": overcrowding_minutes,
        "alert_triggered": overcrowding_minutes is not None,
        "forecast_series": forecasts
    }
