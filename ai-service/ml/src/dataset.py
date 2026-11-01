"""
ShanghaiTech Crowd Counting Dataset and Density Map Generator
Handles loading of ShanghaiTech Part A (dense) and Part B (sparse) datasets,
parsing MATLAB ground truth annotations (.mat), and generating continuous
density maps using fixed or geometry-adaptive Gaussian kernels.
"""

import os
import glob
import numpy as np
import scipy.io as io
from scipy.ndimage import gaussian_filter
from scipy.spatial import KDTree
from PIL import Image
import torch
from torch.utils.data import Dataset
import torchvision.transforms as transforms
import torchvision.transforms.functional as TF


def gaussian_filter_density(gt_points, image_shape, adaptive=True, beta=0.3, k=3, fixed_sigma=15.0):
    """
    Generates a 2D density map from head point annotations.
    
    Args:
        gt_points: (N, 2) array of (x, y) head coordinate annotations.
        image_shape: tuple of (H, W).
        adaptive: If True, uses geometry-adaptive Gaussian kernel (recommended for Part A).
                  sigma_i = beta * average_distance_to_k_nearest_neighbors.
                  If False, uses fixed Gaussian kernel with fixed_sigma (recommended for Part B).
        beta: scaling factor for adaptive sigma (typically 0.3 as in CSRNet paper).
        k: number of nearest neighbors (typically 3).
        fixed_sigma: standard deviation for fixed Gaussian filtering.
        
    Returns:
        density: 2D numpy array of shape (H, W), where sum(density) == len(gt_points).
    """
    H, W = image_shape
    density = np.zeros((H, W), dtype=np.float32)
    num_points = len(gt_points)

    if num_points == 0:
        return density

    if adaptive and num_points > k:
        tree = KDTree(gt_points.copy(), leafsize=2048)
        # distances to k+1 nearest neighbors (index 0 is the point itself)
        distances, _ = tree.query(gt_points, k=k + 1)

    for i, pt in enumerate(gt_points):
        x = int(round(pt[0]))
        y = int(round(pt[1]))
        if y < 0 or y >= H or x < 0 or x >= W:
            continue

        if adaptive and num_points > k:
            # Average distance to k nearest neighbors
            d_i = np.mean(distances[i][1:])
            sigma = max(1.0, beta * d_i)
        else:
            sigma = fixed_sigma

        # Local window to avoid convolving over full image every head
        radius = int(round(3 * sigma))
        x_min, x_max = max(0, x - radius), min(W, x + radius + 1)
        y_min, y_max = max(0, y - radius), min(H, y + radius + 1)

        # Generate local Gaussian patch
        patch_x, patch_y = np.meshgrid(
            np.arange(x_min, x_max) - x,
            np.arange(y_min, y_max) - y
        )
        kernel = np.exp(-(patch_x**2 + patch_y**2) / (2 * (sigma**2)))
        kernel_sum = np.sum(kernel)
        if kernel_sum > 0:
            kernel /= kernel_sum
            density[y_min:y_max, x_min:x_max] += kernel

    return density


class ShanghaiTechDataset(Dataset):
    """
    PyTorch Dataset for ShanghaiTech crowd dataset.
    Loads raw RGB images and associated GT head coordinates (.mat).
    Applies downsampling to match CSRNet output stride (1/8 resolution).
    """
    def __init__(self, root_dir, part='part_A', split='train_data', 
                 downsample_ratio=8, is_train=True, img_size=(768, 1024)):
        super().__init__()
        self.root_dir = root_dir
        self.part = part
        self.split = split
        self.downsample_ratio = downsample_ratio
        self.is_train = is_train
        self.img_size = img_size
        self.adaptive = (part.lower() == 'part_a')

        self.img_dir = os.path.join(root_dir, part, split, 'images')
        self.gt_dir = os.path.join(root_dir, part, split, 'ground-truth')

        self.image_files = sorted(glob.glob(os.path.join(self.img_dir, '*.jpg')))
        
        # Standard ImageNet normalization for VGG-16 backbone
        self.normalize = transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )

    def __len__(self):
        return len(self.image_files)

    def __getitem__(self, idx):
        img_path = self.image_files[idx]
        file_name = os.path.basename(img_path)
        gt_name = f"GT_{os.path.splitext(file_name)[0]}.mat"
        gt_path = os.path.join(self.gt_dir, gt_name)

        # Load image
        img = Image.open(img_path).convert('RGB')
        w, h = img.size

        # Load ground truth coordinates
        if os.path.exists(gt_path):
            mat = io.loadmat(gt_path)
            # ShanghaiTech stores points under 'image_info' or 'annPoints'
            if 'image_info' in mat:
                gt_points = mat['image_info'][0, 0][0, 0][0]
            elif 'annPoints' in mat:
                gt_points = mat['annPoints']
            else:
                gt_points = np.zeros((0, 2))
        else:
            gt_points = np.zeros((0, 2))

        # Generate ground truth density map at original resolution
        density = gaussian_filter_density(
            gt_points=gt_points,
            image_shape=(h, w),
            adaptive=self.adaptive,
            beta=0.3,
            k=3,
            fixed_sigma=15.0
        )

        # Convert to PyTorch tensors
        img_tensor = transforms.ToTensor()(img)

        # Data augmentation during training: random horizontal flip
        if self.is_train and np.random.rand() > 0.5:
            img_tensor = TF.hflip(img_tensor)
            density = np.fliplr(density).copy()

        # Downsample density map by downsample_ratio (1/8 for CSRNet)
        # Note: we multiply by (ratio^2) to preserve integral (total count)
        if self.downsample_ratio > 1:
            target_h = int(h // self.downsample_ratio)
            target_w = int(w // self.downsample_ratio)
            
            density_tensor = torch.from_numpy(density).unsqueeze(0).unsqueeze(0)
            density_downsampled = torch.nn.functional.interpolate(
                density_tensor,
                size=(target_h, target_w),
                mode='bilinear',
                align_corners=False
            ).squeeze(0).squeeze(0)
            density_downsampled *= (self.downsample_ratio * self.downsample_ratio)
        else:
            density_downsampled = torch.from_numpy(density)

        img_tensor = self.normalize(img_tensor)
        
        gt_count = float(np.sum(density))

        return {
            'image': img_tensor,
            'density': density_downsampled,
            'count': torch.tensor(gt_count, dtype=torch.float32),
            'filename': file_name
        }


if __name__ == '__main__':
    print("Testing dataset module with synthetic head points...")
    H, W = 400, 600
    points = np.array([
        [100, 150], [105, 155], [110, 160],
        [300, 200], [310, 205], [500, 350]
    ])
    d_adaptive = gaussian_filter_density(points, (H, W), adaptive=True)
    d_fixed = gaussian_filter_density(points, (H, W), adaptive=False)
    
    print(f"Number of GT points: {len(points)}")
    print(f"Adaptive density sum: {np.sum(d_adaptive):.4f}")
    print(f"Fixed density sum:    {np.sum(d_fixed):.4f}")
    assert np.isclose(np.sum(d_adaptive), len(points), atol=1e-1)
    print("✓ Density map generation unit test passed!")
