"""
Density Grad-CAM: Explainable AI (XAI) for Crowd Counting Regression
Adapts Gradient-weighted Class Activation Mapping (Grad-CAM) to continuous density regression.
Target score: Total crowd count C = sum(D_pred)
Gradients are backpropagated into the final dilated convolutional layer (backend).
"""

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image


class DensityGradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        
        # Register hooks with cloning to support PyTorch autograd graph
        self.target_layer.register_forward_hook(self._save_activation)
        self.target_layer.register_full_backward_hook(self._save_gradient)

    def _save_activation(self, module, input, output):
        self.activations = output.clone()

    def _save_gradient(self, module, grad_input, grad_output):
        if grad_output[0] is not None:
            self.gradients = grad_output[0].clone()

    def generate(self, input_tensor):
        """
        Generates Grad-CAM heatmap for the given input image.
        Args:
            input_tensor: (1, 3, H, W) normalized image tensor
        Returns:
            cam: 2D numpy array normalized between 0 and 1
            pred_count: predicted count
        """
        self.model.eval()
        self.model.zero_grad()
        
        # Forward pass
        density_map = self.model(input_tensor)
        pred_count = torch.sum(density_map)

        # Backward pass with respect to total crowd count
        pred_count.backward(retain_graph=True)

        if self.gradients is None or self.activations is None:
            # Fallback to normalized activation
            cam = torch.mean(self.activations, dim=1, keepdim=True) if self.activations is not None else density_map
        else:
            # Global average pooling of gradients: alpha_k = (1/Z) * sum(grad_k)
            weights = torch.mean(self.gradients, dim=[2, 3], keepdim=True)
            # Weighted combination of activation maps
            cam = torch.sum(weights * self.activations, dim=1, keepdim=True)

        # Apply ReLU to focus on features having positive contribution
        cam = F.relu(cam)

        # Upsample to match original input size
        cam = F.interpolate(
            cam, size=input_tensor.shape[2:], mode='bilinear', align_corners=False
        )

        cam = cam.squeeze().cpu().detach().numpy()

        # Normalize between 0 and 1
        cam_min, cam_max = np.min(cam), np.max(cam)
        if cam_max > cam_min:
            cam = (cam - cam_min) / (cam_max - cam_min)
        else:
            cam = np.zeros_like(cam)

        return cam, float(pred_count.item())


if __name__ == '__main__':
    from models.csrnet import CSRNet
    model = CSRNet(load_pretrained=False)
    target_layer = model.backend[-2]
    gradcam = DensityGradCAM(model, target_layer)
    dummy_input = torch.randn(1, 3, 256, 256, requires_grad=True)
    cam, count = gradcam.generate(dummy_input)
    print("Grad-CAM check:", cam.shape, count)
