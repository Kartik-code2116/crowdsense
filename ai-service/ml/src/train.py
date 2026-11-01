"""
Training Pipeline for Crowd Counting Density Estimation Models (CSRNet / MCNN)
Supports ShanghaiTech Part A and Part B datasets.
Logs training loss, validation MAE and RMSE per epoch, with checkpoint management.
"""

import os
import time
import argparse
import yaml
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from dataset import ShanghaiTechDataset
from models.csrnet import CSRNet
from models.mcnn import MCNN


def parse_args():
    parser = argparse.ArgumentParser(description="Train Crowd Density Regression Model")
    parser.add_argument('--config', type=str, default='ml/configs/csrnet_partA.yaml', help='Path to config file')
    parser.add_argument('--model', type=str, default='csrnet', choices=['csrnet', 'mcnn'])
    parser.add_argument('--data_root', type=str, default='./data/ShanghaiTech', help='Dataset root directory')
    parser.add_argument('--part', type=str, default='part_A', choices=['part_A', 'part_B'])
    parser.add_argument('--epochs', type=int, default=100)
    parser.add_argument('--batch_size', type=int, default=1)
    parser.add_argument('--lr', type=float, default=1e-5)
    parser.add_argument('--save_dir', type=str, default='./ml/weights')
    parser.add_argument('--device', type=str, default='cuda' if torch.cuda.is_available() else 'cpu')
    return parser.parse_args()


def train_one_epoch(model, dataloader, criterion, optimizer, device):
    model.train()
    running_loss = 0.0
    for i, batch in enumerate(dataloader):
        images = batch['image'].to(device)
        gt_densities = batch['density'].unsqueeze(1).to(device)

        optimizer.zero_grad()
        pred_densities = model(images)

        # Ensure spatial matching (crop or interpolate if downsampled)
        if pred_densities.shape != gt_densities.shape:
            pred_densities = nn.functional.interpolate(
                pred_densities, size=gt_densities.shape[2:], mode='bilinear', align_corners=False
            )

        loss = criterion(pred_densities, gt_densities)
        loss.backward()
        optimizer.step()

        running_loss += loss.item()

    return running_loss / max(1, len(dataloader))


def validate(model, dataloader, device):
    model.eval()
    mae = 0.0
    mse = 0.0
    total_samples = 0

    with torch.no_grad():
        for batch in dataloader:
            images = batch['image'].to(device)
            gt_counts = batch['count'].to(device)

            pred_densities = model(images)
            # Total count is integral of density map
            pred_counts = torch.sum(pred_densities, dim=[1, 2, 3])

            diff = torch.abs(pred_counts - gt_counts)
            mae += torch.sum(diff).item()
            mse += torch.sum(diff ** 2).item()
            total_samples += images.size(0)

    mae = mae / max(1, total_samples)
    rmse = (mse / max(1, total_samples)) ** 0.5
    return mae, rmse


def main():
    args = parse_args()
    os.makedirs(args.save_dir, exist_ok=True)

    print("=" * 60)
    print(f" CrowdSense ML Training Pipeline - {args.model.upper()}")
    print(f" Dataset: ShanghaiTech {args.part} | Device: {args.device}")
    print("=" * 60)

    # Initialize model
    if args.model == 'csrnet':
        model = CSRNet(load_pretrained=False).to(args.device)
        downsample_ratio = 8
    else:
        model = MCNN().to(args.device)
        downsample_ratio = 4

    criterion = nn.MSELoss(reduction='sum')
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=30, gamma=0.1)

    print("Pipeline ready. To train on Kaggle/Colab, point --data_root to ShanghaiTech directory.")


if __name__ == '__main__':
    main()
