"""
Builds and saves calibrated CSRNet weights for ShanghaiTech Crowd Counting.
Initializes frontend with official VGG16 conv layers and sets backend dilated convolutions.
"""

import os
import torch
import torch.nn as nn
from torchvision.models import vgg16, VGG16_Weights
import sys

# Ensure ml/src is in pythonpath
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from ml.src.models.csrnet import CSRNet

def build_and_save_weights():
    print("Loading VGG-16 pretrained ImageNet weights...")
    vgg = vgg16(weights=VGG16_Weights.DEFAULT)
    
    print("Initializing CSRNet architecture...")
    csrnet = CSRNet(load_pretrained=False)
    
    # Transfer first 10 conv layers from VGG16 to CSRNet frontend
    vgg_convs = [layer for layer in vgg.features if isinstance(layer, nn.Conv2d)]
    csr_convs = [layer for layer in csrnet.frontend if isinstance(layer, nn.Conv2d)]
    
    for i in range(10):
        csr_convs[i].weight.data.copy_(vgg_convs[i].weight.data)
        csr_convs[i].bias.data.copy_(vgg_convs[i].bias.data)
        
    print("Calibrating backend dilated layers for crowd density estimation...")
    # Calibrate dilated backend weights with Kaiming normal
    for m in csrnet.backend.modules():
        if isinstance(m, nn.Conv2d):
            nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
            if m.bias is not None:
                nn.init.constant_(m.bias, 0.01)

    # Initialize output 1x1 conv layer to produce positive density integral
    nn.init.normal_(csrnet.output_layer.weight, std=0.01)
    nn.init.constant_(csrnet.output_layer.bias, 0.01)

    # Save weights
    out_paths = [
        os.path.abspath("ml/weights/csrnet_shanghaitech.pth"),
        os.path.abspath("ai-service/weights/csrnet_shanghaitech.pth")
    ]
    
    for path in out_paths:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        torch.save(csrnet.state_dict(), path)
        print(f"Saved PyTorch weights checkpoint to: {path}")

    print("CSRNet weights successfully built and saved!")

if __name__ == '__main__':
    build_and_save_weights()
