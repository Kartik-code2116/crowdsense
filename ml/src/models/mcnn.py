"""
MCNN: Multi-Column Convolutional Neural Network for Single-Image Crowd Counting
Reference: Zhang et al., CVPR 2016 (https://arxiv.org/abs/1608.06125)

Architecture:
  - Branch 1 (Large filters): 9x9 -> 7x7 -> 7x7 -> captures large heads (close to camera)
  - Branch 2 (Medium filters): 7x7 -> 5x5 -> 5x5 -> captures medium heads
  - Branch 3 (Small filters): 5x5 -> 3x3 -> 3x3 -> captures small heads (distant/dense)
  - Fusion: Concatenate feature maps and pass through 1x1 conv to regress density.
"""

import torch
import torch.nn as nn


class ConvBlock(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size, pool=True):
        super(ConvBlock, self).__init__()
        padding = (kernel_size - 1) // 2
        layers = [
            nn.Conv2d(in_channels, out_channels, kernel_size=kernel_size, padding=padding),
            nn.ReLU(inplace=True)
        ]
        if pool:
            layers.append(nn.MaxPool2d(kernel_size=2, stride=2))
        self.block = nn.Sequential(*layers)

    def forward(self, x):
        return self.block(x)


class MCNN(nn.Module):
    def __init__(self):
        super(MCNN, self).__init__()
        
        # Column 1: Large receptive field (9x9, 7x7, 7x7)
        self.branch_large = nn.Sequential(
            ConvBlock(3, 16, 9, pool=True),
            ConvBlock(16, 32, 7, pool=True),
            ConvBlock(32, 16, 7, pool=False),
            ConvBlock(16, 8, 7, pool=False)
        )
        
        # Column 2: Medium receptive field (7x7, 5x5, 5x5)
        self.branch_medium = nn.Sequential(
            ConvBlock(3, 20, 7, pool=True),
            ConvBlock(20, 40, 5, pool=True),
            ConvBlock(40, 20, 5, pool=False),
            ConvBlock(20, 10, 5, pool=False)
        )
        
        # Column 3: Small receptive field (5x5, 3x3, 3x3)
        self.branch_small = nn.Sequential(
            ConvBlock(3, 24, 5, pool=True),
            ConvBlock(24, 48, 3, pool=True),
            ConvBlock(48, 24, 3, pool=False),
            ConvBlock(24, 12, 3, pool=False)
        )
        
        # Fuse branches (8 + 10 + 12 = 30 channels)
        self.fuse = nn.Sequential(
            nn.Conv2d(30, 1, kernel_size=1),
            nn.ReLU(inplace=True)
        )
        
        self._initialize_weights()

    def forward(self, x):
        out_large = self.branch_large(x)
        out_medium = self.branch_medium(x)
        out_small = self.branch_small(x)
        
        # Concatenate along channel dimension
        fused = torch.cat([out_large, out_medium, out_small], dim=1)
        density = self.fuse(fused)
        return density

    def _initialize_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.normal_(m.weight, std=0.01)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)


if __name__ == '__main__':
    model = MCNN()
    x = torch.randn(1, 3, 384, 512)
    density_map = model(x)
    print(f"MCNN Input: {x.shape}")
    print(f"MCNN Output density: {density_map.shape} (stride 4)")
    print("✓ MCNN forward pass verified successfully.")
