"""
CSRNet: Dilated Convolutional Neural Networks for Understanding the Highly Congested Scenes
Reference: Li et al., CVPR 2018 (https://arxiv.org/abs/1802.10062)

Architecture:
  - Frontend: VGG-16 first 10 convolutional layers (conv1_1 to conv4_3) with pooling.
    Downsampling factor = 8 (2 * 2 * 2).
  - Backend: 6 dilated convolutional layers with dilation rate = 2.
    Expands receptive field to capture contextual crowd information without pooling loss.
  - Final 1x1 Conv regressing continuous density map.
"""

import torch
import torch.nn as nn
from torchvision import models


class CSRNet(nn.Module):
    def __init__(self, load_pretrained=False):
        super(CSRNet, self).__init__()
        
        # Build Frontend (Channels: 3 -> 64 -> 128 -> 256 -> 512)
        # We use inplace=False to allow clean Grad-CAM backward hooks
        self.frontend = nn.Sequential(
            nn.Conv2d(3, 64, kernel_size=3, padding=1),
            nn.ReLU(inplace=False),
            nn.Conv2d(64, 64, kernel_size=3, padding=1),
            nn.ReLU(inplace=False),
            nn.MaxPool2d(kernel_size=2, stride=2),
            
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.ReLU(inplace=False),
            nn.Conv2d(128, 128, kernel_size=3, padding=1),
            nn.ReLU(inplace=False),
            nn.MaxPool2d(kernel_size=2, stride=2),
            
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.ReLU(inplace=False),
            nn.Conv2d(256, 256, kernel_size=3, padding=1),
            nn.ReLU(inplace=False),
            nn.Conv2d(256, 256, kernel_size=3, padding=1),
            nn.ReLU(inplace=False),
            nn.MaxPool2d(kernel_size=2, stride=2),
            
            nn.Conv2d(256, 512, kernel_size=3, padding=1),
            nn.ReLU(inplace=False),
            nn.Conv2d(512, 512, kernel_size=3, padding=1),
            nn.ReLU(inplace=False),
            nn.Conv2d(512, 512, kernel_size=3, padding=1),
            nn.ReLU(inplace=False)
        )
        
        # Backend: Dilated Convolutions (dilation=2, padding=2 to keep spatial dimensions)
        self.backend = nn.Sequential(
            nn.Conv2d(512, 512, kernel_size=3, dilation=2, padding=2),
            nn.ReLU(inplace=False),
            nn.Conv2d(512, 512, kernel_size=3, dilation=2, padding=2),
            nn.ReLU(inplace=False),
            nn.Conv2d(512, 512, kernel_size=3, dilation=2, padding=2),
            nn.ReLU(inplace=False),
            nn.Conv2d(512, 256, kernel_size=3, dilation=2, padding=2),
            nn.ReLU(inplace=False),
            nn.Conv2d(256, 128, kernel_size=3, dilation=2, padding=2),
            nn.ReLU(inplace=False),
            nn.Conv2d(128, 64, kernel_size=3, dilation=2, padding=2),
            nn.ReLU(inplace=False)
        )
        
        # Output 1x1 Convolution: regresses 1-channel continuous crowd density map
        self.output_layer = nn.Conv2d(64, 1, kernel_size=1)
        
        if load_pretrained:
            self._load_vgg_weights()
        else:
            self._initialize_weights()

    def forward(self, x):
        features = self.frontend(x)
        features = self.backend(features)
        density = self.output_layer(features)
        # Density cannot be negative; ReLU ensures non-negativity
        return torch.relu(density)

    def _initialize_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.normal_(m.weight, std=0.01)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)

    def _load_vgg_weights(self):
        vgg = models.vgg16(weights=models.VGG16_Weights.DEFAULT)
        vgg_conv_layers = [l for l in vgg.features if isinstance(l, nn.Conv2d)]
        csr_conv_layers = [l for l in self.frontend if isinstance(l, nn.Conv2d)]
        
        for vgg_l, csr_l in zip(vgg_conv_layers[:10], csr_conv_layers):
            csr_l.weight.data.copy_(vgg_l.weight.data)
            csr_l.bias.data.copy_(vgg_l.bias.data)


if __name__ == '__main__':
    model = CSRNet(load_pretrained=False)
    x = torch.randn(1, 3, 384, 512)
    density_map = model(x)
    print(f"Density map shape: {density_map.shape}")
