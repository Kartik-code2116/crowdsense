"""
ONNX Model Exporter for CrowdSense
Exports trained PyTorch CSRNet / MCNN models to ONNX format with dynamic spatial axes
for low-latency cross-platform inference in production environments.
"""

import os
import argparse
import torch
from models.csrnet import CSRNet
from models.mcnn import MCNN


def export_to_onnx(model_type='csrnet', output_path='ml/weights/csrnet.onnx', device='cpu'):
    print(f"Exporting {model_type.upper()} to ONNX format...")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    if model_type == 'csrnet':
        model = CSRNet(load_pretrained=False).to(device)
    else:
        model = MCNN().to(device)
        
    model.eval()

    # Dummy input with arbitrary resolution (e.g. 768x1024)
    dummy_input = torch.randn(1, 3, 512, 512, device=device)

    # Dynamic axes allow variable resolution camera feeds in production
    dynamic_axes = {
        'input': {0: 'batch_size', 2: 'height', 3: 'width'},
        'output': {0: 'batch_size', 2: 'density_h', 3: 'density_w'}
    }

    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes=dynamic_axes
    )

    print(f"✓ ONNX model successfully saved to: {output_path}")
    print("  Input signature:  [batch, 3, height, width]")
    print("  Output signature: [batch, 1, height/8, width/8]")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', type=str, default='csrnet', choices=['csrnet', 'mcnn'])
    parser.add_argument('--output', type=str, default='ml/weights/csrnet.onnx')
    args = parser.parse_args()
    export_to_onnx(args.model, args.output)
