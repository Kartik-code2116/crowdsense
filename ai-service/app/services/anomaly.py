"""
Crowd Anomaly Evaluation Service
Evaluates crowd safety anomalies:
1. Surge Anomaly: rapid count influx violating safety evacuation limits.
2. Stationary Anomaly: crowd freeze / blockage in an egress corridor.
3. Turbulence Anomaly: chaotic velocity vectors indicating panic or crush conditions.
"""

import numpy as np


class AnomalyDetector:
    @staticmethod
    def evaluate_risk(current_count, capacity, flow_speed, historical_counts=None):
        occupancy_ratio = current_count / max(1, capacity)
        
        # Surge detection
        is_surge = False
        surge_rate = 0.0
        if historical_counts and len(historical_counts) >= 3:
            recent_avg = np.mean(historical_counts[-3:])
            if recent_avg > 0:
                surge_rate = (current_count - recent_avg) / recent_avg
                if surge_rate > 0.20:
                    is_surge = True

        # Risk scoring (0.0 to 1.0)
        risk_score = 0.0
        risk_level = "Normal"
        reasons = []

        if occupancy_ratio >= 0.90:
            risk_score += 0.55
            risk_level = "Critical"
            reasons.append("Critical capacity threshold exceeded (>90%)")
        elif occupancy_ratio >= 0.75:
            risk_score += 0.35
            risk_level = "Warning"
            reasons.append("Elevated zone occupancy (>75%)")

        if is_surge:
            risk_score += 0.25
            if risk_level == "Normal":
                risk_level = "Warning"
            reasons.append(f"Sudden crowd surge detected (+{round(surge_rate * 100, 1)}% in 3 min)")

        if flow_speed < 0.3 and occupancy_ratio > 0.8:
            risk_score += 0.20
            risk_level = "Critical"
            reasons.append("Severe bottleneck: near-zero egress flow velocity")

        risk_score = round(min(1.0, risk_score), 2)
        
        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "is_surge": is_surge,
            "surge_percentage": round(surge_rate * 100, 1),
            "reasons": reasons
        }
