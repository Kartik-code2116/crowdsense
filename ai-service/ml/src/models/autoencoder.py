"""
Crowd Spatial Anomaly Autoencoder
Detects spatial crowd density anomalies (stampede formation, counter-flow, localized bottlenecks)
by computing density reconstruction error against normal training patterns.
"""

import torch
import torch.nn as nn


class CrowdAnomalyAutoencoder(nn.Module):
    def __init__(self, in_channels=1):
        super(CrowdAnomalyAutoencoder, self).__init__()
        
        # Encoder: compress density map to latent bottleneck
        self.encoder = nn.Sequential(
            nn.Conv2d(in_channels, 32, kernel_size=3, stride=2, padding=1),  # 1/2
            nn.BatchNorm2d(32),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1),           # 1/4
            nn.BatchNorm2d(64),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1),          # 1/8
            nn.BatchNorm2d(128),
            nn.LeakyReLU(0.2, inplace=True)
        )
        
        # Decoder: reconstruct normal spatial distribution
        self.decoder = nn.Sequential(
            nn.ConvTranspose2d(128, 64, kernel_size=3, stride=2, padding=1, output_padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.ConvTranspose2d(64, 32, kernel_size=3, stride=2, padding=1, output_padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.ConvTranspose2d(32, in_channels, kernel_size=3, stride=2, padding=1, output_padding=1),
            nn.ReLU(inplace=True)
        )

    def forward(self, x):
        latent = self.encoder(x)
        reconstruction = self.decoder(latent)
        return reconstruction

    def compute_anomaly_score(self, x):
        """
        Computes reconstruction error (MSE map + scalar anomaly score).
        High reconstruction error signifies anomalous crowd distribution.
        """
        reconstructed = self.forward(x)
        error_map = torch.abs(x - reconstructed)
        anomaly_score = torch.mean(error_map, dim=[1, 2, 3])
        return anomaly_score, error_map
