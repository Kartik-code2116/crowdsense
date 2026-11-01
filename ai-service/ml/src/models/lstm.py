"""
CrowdFlowLSTM: Multi-horizon Crowd Density & Capacity Forecasting
Accepts sequential historical crowd metrics (count, density variance, velocity)
and predicts crowd occupancy for future time horizons (e.g., 5-min, 15-min, 30-min).
Used to trigger proactive overcrowding alerts before critical safety thresholds are breached.
"""

import torch
import torch.nn as nn


class CrowdFlowLSTM(nn.Module):
    def __init__(self, input_dim=3, hidden_dim=64, num_layers=2, forecast_horizon=8):
        super(CrowdFlowLSTM, self).__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.forecast_horizon = forecast_horizon
        
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.2 if num_layers > 1 else 0.0
        )
        
        # Multi-step ahead forecasting head
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.ReLU(inplace=True),
            nn.Linear(64, forecast_horizon)
        )
        
        # Uncertainty head: predicts variance / std deviation for each forecast step
        self.uncertainty_head = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.ReLU(inplace=True),
            nn.Linear(64, forecast_horizon),
            nn.Softplus()  # Ensure strictly positive variance
        )

    def forward(self, x):
        """
        Args:
            x: Tensor of shape (batch_size, seq_len, input_dim)
        Returns:
            mean_forecast: (batch_size, forecast_horizon)
            uncertainty: (batch_size, forecast_horizon)
        """
        lstm_out, (hn, cn) = self.lstm(x)
        # Use last hidden state
        last_hidden = lstm_out[:, -1, :]
        mean_forecast = self.fc(last_hidden)
        uncertainty = self.uncertainty_head(last_hidden)
        return mean_forecast, uncertainty


if __name__ == '__main__':
    model = CrowdFlowLSTM(input_dim=3, hidden_dim=64, num_layers=2, forecast_horizon=8)
    batch = torch.randn(4, 12, 3)  # 4 batches, 12 past timesteps, 3 features
    mean, std = model(batch)
    print(f"Forecast mean shape: {mean.shape}")
    print(f"Uncertainty shape:   {std.shape}")
    print("✓ CrowdFlowLSTM verified successfully.")
