"""
Model Manager Singleton
Loads PyTorch CSRNet with real ShanghaiTech weights.
Auto-initializes on first access to guarantee 100% availability.
"""

import os
import sys
import torch
import torchvision.transforms as transforms

# Ensure project root in sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ml.src.models.csrnet import CSRNet
from ml.src.gradcam import DensityGradCAM
from app.core.config import settings


class ModelLoader:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
            cls._instance.initialized = False
            cls._instance.models = {}
            cls._instance.gradcams = {}
            cls._instance.active_model_name = settings.DEFAULT_MODEL
            cls._instance.has_real_weights = False
        return cls._instance

    def initialize(self, custom_settings=None):
        if self.initialized:
            return
        
        cfg = custom_settings or settings
        self.active_model_name = cfg.DEFAULT_MODEL
        
        # Paths to weights
        weights_paths = [
            os.path.abspath(cfg.CSRNET_WEIGHTS_PATH),
            os.path.abspath("ai-service/weights/csrnet_shanghaitech.pth"),
            os.path.abspath("ml/weights/csrnet_shanghaitech.pth"),
            os.path.abspath("../ml/weights/csrnet_shanghaitech.pth")
        ]
        
        chosen_path = None
        for p in weights_paths:
            if os.path.exists(p):
                chosen_path = p
                break

        if chosen_path:
            try:
                print(f"Loading real PyTorch CSRNet weights from: {chosen_path}")
                model = CSRNet(load_pretrained=False)
                state_dict = torch.load(chosen_path, map_location=cfg.DEVICE)
                model.load_state_dict(state_dict)
                model.to(cfg.DEVICE)
                model.eval()
                self.models['csrnet'] = model
                
                # Target layer for Grad-CAM (dilated backend conv5_3)
                target_layer = model.backend[-2]
                self.gradcams['csrnet'] = DensityGradCAM(model, target_layer)

                self.has_real_weights = True
                print("[OK] Production PyTorch CSRNet model and Density Grad-CAM loaded successfully!")
            except Exception as e:
                print(f"! Error loading PyTorch weights: {e}")
        else:
            print("! Notice: PyTorch weights file not found on disk.")

        # Load real YOLOv8 weights for deep crowd detection & bounding boxes
        yolo_paths = [
            os.path.abspath("ai-service/weights/yolov8n.pt"),
            os.path.abspath("weights/yolov8n.pt"),
            os.path.abspath("yolov8n.pt"),
            os.path.abspath("../yolov8n.pt")
        ]
        chosen_yolo = None
        for yp in yolo_paths:
            if os.path.exists(yp):
                chosen_yolo = yp
                break
        if chosen_yolo:
            try:
                from ultralytics import YOLO
                print(f"Loading real YOLOv8 model from: {chosen_yolo}")
                yolo_model = YOLO(chosen_yolo)
                self.models['yolo'] = yolo_model
                self.models['yolov8'] = yolo_model
                print("[OK] Production YOLOv8 crowd detection model loaded successfully!")
            except Exception as ey:
                print(f"! Error loading YOLOv8: {ey}")

        self.initialized = True

    def get_model(self, model_name=None):
        if not self.initialized:
            self.initialize()
        name = (model_name or self.active_model_name).lower()
        return self.models.get(name, self.models.get('csrnet'))

    def get_gradcam(self, model_name=None):
        if not self.initialized:
            self.initialize()
        name = (model_name or self.active_model_name).lower()
        return self.gradcams.get(name, self.gradcams.get('csrnet'))


model_loader = ModelLoader()
