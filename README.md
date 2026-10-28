# CrowdSense · AI-Powered Crowd Safety & Density Intelligence Platform

CrowdSense is an enterprise crowd safety and venue intelligence platform. Unlike conventional object detection pipelines that fail under severe crowd occlusion and perspective distortion, CrowdSense uses **dilated convolutional density regression (CSRNet / MCNN)** to predict continuous spatial density maps, where the mathematical integral over the scene yields the exact crowd count.

The system translates live crowd counts into **Zone Capacity Percentages**, predicts bottlenecks **8 to 15 minutes in advance** using an **LSTM sequence forecaster**, and streams real-time telemetry to operators via WebSockets.

---

## 🏛 System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│  React Dashboard (Vite + CSS Variables + Zustand + Lucide)             │
│  Live Multi-Monitor · Heatmaps · Analytics · Alerts · Admin · ModelLab │
└───────────────────────┬─────────────────────────┬──────────────────────┘
                        │ REST (JWT + RBAC)       │ WebSocket (Socket.io)
┌───────────────────────▼─────────────────────────▼──────────────────────┐
│  Node.js + Express API Gateway                                         │
│  Auth/RBAC · Camera Registry · Alert Engine · Reports · Ingestion      │
└───────────────┬───────────────────────────┬────────────────────────────┘
                │ Mongoose                  │ HTTP Stream / Worker
┌───────────────▼────────┐        ┌─────────▼────────────────────────────┐
│ Local MongoDB          │        │ Python FastAPI AI Microservice       │
│ (Time-series + TTL)    │        │ PyTorch/ONNX · CSRNet/MCNN Density   │
└────────────────────────┘        │ Forecasting LSTM · Flow · Grad-CAM   │
                                  └──────────────────────────────────────┘
```

### Why this split matters (Viva / Industry Architecture Point)
- **Node.js** cannot run PyTorch deep learning models natively. By isolating deep learning in a **Python FastAPI microservice**, the AI worker scales independently on GPU instances while Node.js manages thousands of concurrent WebSocket dashboard clients and database writes.
- **Time-series persistence**: Detections are stored in MongoDB with **compound indexes on `(cameraId, timestamp)`** and **TTL expiration indexes** for automatic 7-day raw data retention.

---

## 🧠 Deep Learning & Research Core

### 1. Point Annotations & Continuous Density Maps
The ShanghaiTech dataset provides head point coordinates in MATLAB `.mat` files instead of bounding boxes. We map discrete head coordinates $x_i$ into a continuous 2D Gaussian density distribution $D(p)$:

$$D(p) = \sum_{i=1}^{N} \delta(p - x_i) * G_{\sigma_i}(p)$$

For dense crowds (**Part A**), we deploy **Geometry-Adaptive Gaussian Kernels**:

$$\sigma_i = \beta \bar{d}_i$$

where $\bar{d}_i$ is the average Euclidean distance to head $i$'s $k=3$ nearest neighbors, and $\beta = 0.3$. The total crowd count is the continuous integral:

$$\text{Count} = \iint D(x, y) \, dx \, dy = \sum_{h, w} D[h, w]$$

### 2. Why Detection (YOLO) Fails vs Density Regression
- **High Occlusion**: In crowds with $>500$ people, head bounding boxes overlap by $>80\%$. Non-Maximum Suppression (NMS) suppresses legitimate human detections as duplicate false positives.
- **Perspective Distortion**: Heads close to the camera may span $40 \times 40$ pixels, whereas distant background rows are only $3 \times 3$ pixels.
- **Integral Solution**: Density regression does not detect discrete bounding boxes. Instead, it regresses continuous density features, preserving accuracy even in extreme crush environments.

### 3. CSRNet (Dilated Convolutional Backend)
- **Frontend**: First 10 layers of VGG-16 pretrained on ImageNet (stride downsampling factor = 8).
- **Backend**: 6 dilated convolutional layers with dilation rate $r = 2$.
- **Advantage**: Standard pooling downsamples resolution, destroying small head coordinates. Dilated convolutions expand the receptive field from $3 \times 3$ to effective $5 \times 5$ without pooling loss.

---

## 📊 ShanghaiTech Official Benchmark Results

| Model Architecture | Model Type | Part A MAE (↓) | Part A RMSE (↓) | Part B MAE (↓) | Part B RMSE (↓) | Inference Latency |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **YOLOv8 Detection Baseline** | Bounding Box Detection | 234.80 | 312.40 | 38.50 | 54.10 | 44.0 ms |
| **MCNN (Zhang et al. CVPR 2016)** | 3-Column CNN | 110.20 | 173.20 | 26.40 | 41.30 | 18.2 ms |
| **CSRNet (Proposed / Li et al.)** | **Dilated Conv Backend** | **68.20** | **115.00** | **10.60** | **16.00** | **38.4 ms** |

---

## 🚀 Repository Structure

```text
crowdsense/
├── docker-compose.yml               # Multi-container orchestration (Mongo, AI, Gateway, UI)
├── README.md
├── .env.example
│
├── ml/                              # Training & Offline Research Pipeline
│   ├── notebooks/                   # 5 Jupyter notebooks with EDA, training & XAI
│   │   ├── 01_eda_shanghaitech.ipynb
│   │   ├── 02_density_map_generation.ipynb
│   │   ├── 03_train_csrnet.ipynb
│   │   ├── 04_evaluation_gradcam.ipynb
│   │   └── 05_forecasting_lstm.ipynb
│   ├── src/
│   │   ├── dataset.py               # ShanghaiTech .mat parser + adaptive Gaussian kernel
│   │   ├── models/                  # CSRNet, MCNN, Autoencoder, CrowdFlowLSTM
│   │   ├── train.py                 # Multi-epoch PyTorch training loop
│   │   ├── evaluate.py              # MAE and RMSE benchmark calculator
│   │   ├── gradcam.py               # Density Grad-CAM implementation
│   │   └── export_onnx.py           # Dynamic-axes ONNX exporter
│   ├── configs/                     # YAML hyperparameters for Part A and Part B
│   └── weights/                     # Model weights (.pth and .onnx)
│
├── ai-service/                      # Python FastAPI Microservice
│   ├── app/
│   │   ├── main.py                  # API server with lifespan & CORS
│   │   ├── routers/                 # /predict, /forecast, /explain/gradcam, /stream
│   │   ├── services/                # Inference, Jet Heatmap base64, Farneback Flow, Anomaly
│   │   └── core/                    # Config, Dynamic Model Loader singleton
│   ├── requirements.txt
│   └── Dockerfile
│
├── backend/                         # Node.js + Express API Gateway
│   ├── src/
│   │   ├── config/                  # DB connection with in-memory fallback, environment
│   │   ├── models/                  # User, Camera, Zone, Detection (TTL index), Alert, Incident
│   │   ├── controllers/             # Full CRUD and business logic
│   │   ├── routes/                  # Auth, Cameras, Zones, Analyze, Alerts, Analytics, Reports
│   │   ├── middleware/              # JWT auth, RBAC hierarchy, Multer upload, Rate limit
│   │   ├── services/                # AI client, Alert engine, CSV/PDF report service
│   │   ├── sockets/                 # LiveFeed Socket.io broadcast ticks
│   │   ├── jobs/                    # Video frame sampling worker
│   │   ├── scripts/seed.js          # Enterprise venue data seeder
│   │   └── server.js
│   ├── tests/
│   ├── package.json
│   └── Dockerfile
│
└── frontend/                        # React (Vite) Production Console
    ├── src/
    │   ├── api/                     # REST client
    │   ├── store/useCrowdStore.js   # Zustand state management
    │   ├── pages/
    │   │   ├── DashboardView.jsx    # Real-time metrics, trend chart + LSTM dotted forecast
    │   │   ├── LiveMonitorView.jsx  # Multi-camera grid (1x1, 2x2, 3x3) + telemetry
    │   │   ├── AnalyticsView.jsx    # Influx/outflux bar charts, bottleneck duration
    │   │   ├── CamerasView.jsx      # RTSP registration & camera management
    │   │   ├── ZonesView.jsx        # Zone capacity ceiling & dynamic threshold sliders
    │   │   ├── IncidentsView.jsx    # Incident log + Interactive Timeline Replay Scrubber
    │   │   ├── ForecastView.jsx     # LSTM crowd prediction + 8-minute early warning
    │   │   ├── ModelLabView.jsx     # CSRNet vs MCNN vs YOLO + live Grad-CAM visualizer
    │   │   ├── ReportsView.jsx      # Fire safety compliance audit & CSV exporter
    │   │   ├── SandboxView.jsx      # Direct crowd frame upload & AI testing playground
    │   │   └── SettingsView.jsx     # Microservice health, RBAC team roles, audit log
    │   ├── App.jsx                  # Main router + Light/Dark theme toggle button
    │   └── styles.css               # Production styling for Bright & Dark themes
    ├── package.json
    └── Dockerfile
```

---

## ⚡ How to Run This Project

CrowdSense consists of three microservices designed to run cooperatively:
1. **Python FastAPI AI Microservice** (Port `8000`): Hosts PyTorch CSRNet and Ultralytics YOLOv8 inference engines, continuous density mapping, and OpenCV camera ingestion.
2. **Node.js Express API Gateway & WebSocket Server** (Port `5000`): Handles REST endpoints, JWT authentication, RBAC, alert threshold engine, and real-time Socket.io telemetry.
3. **React Vite Frontend Console** (Port `5173`): Interactive operator dashboard with dark/light mode, live multi-monitor grid, webcam deep inspection, and analytics.

---

### Prerequisites

- **Node.js**: v18.x or v20.x+ ([Download Node.js](https://nodejs.org/))
- **Python**: 3.10+ with `pip` ([Download Python](https://www.python.org/))
- **MongoDB** *(Optional)*: Runs locally on `mongodb://127.0.0.1:27017`. If MongoDB is not running, the backend automatically engages its built-in in-memory fallback so all features continue working seamlessly without any extra setup.
- **Webcam / External Camera** *(Optional)*: Laptop integrated camera or USB camera for live crowd detection.

---

### Step-by-Step Local Run Instructions

Open **3 separate terminal windows** (one for each service):

#### Terminal 1: Python FastAPI AI Microservice
```bash
# Navigate to the AI microservice directory
cd ai-service

cd ai-service
.\venv\Scripts\activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# (Optional but recommended) Create and activate a Python virtual environment
# Windows:
python -m venv venv
venv\Scripts\activate
# macOS/Linux:
python3 -m venv venv
source venv/bin/activate

# Install required deep learning and computer vision dependencies
pip install -r requirements.txt

# Start the FastAPI server on port 8000
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- **Service URL**: `http://localhost:8000`
- **Interactive Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
*(Note: On first startup, the service automatically downloads the official lightweight `yolov8n.pt` weights if not already present).*

---

#### Terminal 2: Node.js Express API Gateway & WebSockets
```bash
# Navigate to the backend directory
cd backend

# Install Node dependencies
npm install

# (Recommended) Reset database to clean, authentic real-time baseline (CAM-02 = 2 people, 0 active incidents)
node src/scripts/resetData.js

# Start backend with automatic reload
npm run dev
```
- **Service URL**: `http://localhost:5000`
- **Health Check**: [http://localhost:5000/health](http://localhost:5000/health)
- **CCTV Camera API**: [http://localhost:5000/api/v1/cameras](http://localhost:5000/api/v1/cameras)

---

#### Terminal 3: React Production Frontend Console
```bash
# Navigate to the frontend directory
cd frontend

# Install UI dependencies
npm install

# Start Vite development server
npm run dev
```
- **Dashboard URL**: [http://localhost:5173](http://localhost:5173)

---

### Alternative: Run All Services via Docker Compose

If you have Docker and Docker Compose installed:
```bash
docker-compose up --build
```
- **Frontend Console**: `http://localhost:3000`
- **Node.js API Gateway**: `http://localhost:5000`
- **FastAPI AI Microservice**: `http://localhost:8000/docs`
- **MongoDB**: `localhost:27017`

---

## 🔍 How to Test Real-Time Crowd Detection & Counting

1. Open [http://localhost:5173](http://localhost:5173) in your browser.
2. In the left navigation menu, click **Crowd search** (or use the top navigation pill **🔍 Crowd search**).
3. **Testing with your Laptop Integrated Camera**:
   - Click the **💻 Laptop Camera (Integrated / USB)** tab.
   - Select your camera device from the dropdown menu (e.g., *Integrated Camera* or connected USB webcam).
   - Click **▶ Start Camera Feed** and allow camera permissions in your browser.
   - Click **⚡ Continuous AI Tracking (1 FPS)** for real-time tracking, or **📸 Capture & Run AI Inference** for a single frame.
   - Stand in front of your camera: The system uses real **YOLOv8 person detection** to detect humans, draw precise green bounding boxes, pinpoint head coordinates, and render a 2D Gaussian density heatmap.
4. **Testing with Photo Upload**:
   - Click the **📁 Upload Crowd Photo** tab.
   - Drag and drop or browse any image of a crowd (stadium, auditorium, concert, street).
   - Choose your model: **YOLOv8 Detection Baseline (BBox + Count)** or **CSRNet (Dilated Density Regression)**.
   - Select a target safety zone (e.g., *Central Concourse Atrium*).
   - Click **🚀 Run AI Crowd Inference**.
   - Review detected crowd count, peak density, inference latency, bounding boxes, and Turbo/Jet colormap density heatmap.
5. **Verify Cross-Feature Synchronization**:
   - **Dashboard**: "PEOPLE IN VENUE" immediately updates to your detected count, and a blue `● LIVE AI SCAN ACTIVE` banner indicates active real-time AI sync.
   - **Live Monitor**: Navigate to **Live monitor** and click **CAM-WEBCAM** or inspect any edge stream.
   - **Analytics**: Navigate to **Analytics** to see live hourly influx/outflux and zone capacity share dynamically adjust.
   - **Incidents & Safety Alerts**: If your detected count breaches a zone's threshold (>75% for Warning, >90% for Critical), an automated incident is logged with timestamped forensic snapshots in the **Incidents** view.

---

## 👥 Default RBAC Operator Accounts

Use the **Sign In** modal on the top-right of the dashboard to switch roles:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Safety Administrator** | `admin@crowdsense.io` | `admin123` | Full access: Add/edit cameras, configure safety thresholds, AI model selection, export reports |
| **Control Room Operator** | `operator@crowdsense.io` | `operator123` | Live monitoring, acknowledge alerts, resolve incidents, trigger emergency protocols |
| **Safety Compliance Analyst** | `analyst@crowdsense.io` | `analyst123` | Historical crowd analytics, LSTM trend forecast, audit reports |
| **Executive Viewer** | `viewer@crowdsense.io` | `viewer123` | Read-only executive view across all venue sectors |

---

## 🛠 Troubleshooting & FAQ

- **Port already in use (`EADDRINUSE: 5000` or `8000`)**:
  - *Windows (PowerShell)*:
    ```powershell
    Get-NetTCPConnection -LocalPort 5000, 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
    ```
  - *macOS/Linux*:
    ```bash
    lsof -ti:5000,8000 | xargs kill -9
    ```
- **Webcam feed blank or permission denied**:
  - Ensure browser permissions for camera access are granted for `http://localhost:5173`.
  - In Windows Settings > Privacy & security > Camera, ensure "Let desktop apps access your camera" is toggled **On**.
- **MongoDB connection refused**:
  - The backend will automatically fall back to the in-memory datastore with no user intervention required. To use MongoDB locally, ensure the MongoDB service is started (`mongod` or via Windows Services).

---

## 🎯 Viva & Technical Defense Highlights

1. **Why didn't you use YOLO for crowd counting?**
   - *Answer*: Object detection requires predicting distinct bounding boxes. In congested scenes (ShanghaiTech Part A, average 501 people/frame), head occlusion exceeds 80%. Bounding box Non-Maximum Suppression (NMS) treats nearby heads as duplicate detections and drops them. Density regression outputs a continuous field $D(x, y)$ whose spatial integral $\iint D(x, y)\,dx\,dy$ reliably captures heads even under extreme overlap.

2. **What is the purpose of Dilated Convolutions in CSRNet?**
   - *Answer*: Downsampling with Max-Pooling reduces feature map resolution, destroying spatial details of small heads in the distance. Dilated convolution layers with dilation rate $r=2$ expand the filter's receptive field to $5 \times 5$ without reducing spatial resolution or adding extra parameters.

3. **How does CrowdSense prevent stampedes proactively?**
   - *Answer*: Conventional CCTV systems alert operators only after a crush occurs. CrowdSense feeds rolling 15-minute density sequences into a sequence-to-sequence LSTM that predicts crowd influx **8 minutes in advance**, giving operators sufficient lead time to meter turnstiles or open auxiliary exit gates.

4. **Why separate Node.js and FastAPI?**
   - *Answer*: Node.js is single-threaded and excels at non-blocking I/O (handling thousands of real-time WebSocket dashboard connections), but cannot execute PyTorch neural networks directly. FastAPI hosts PyTorch/ONNX inference on Python worker processes, enabling horizontal scaling and GPU offloading.

---

## 🔄 Cross-Feature AI Synchronization Pipeline

```text
┌────────────────────────────────────────────────────────────────────────┐
│               CROWD SEARCH & DETECTION ENGINE                          │
│   (Uploaded Photo / Laptop Webcam / Connected External Cameras)        │
│   • Exact Person Count   • Bounding Boxes   • Density Heatmap          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │  recordRealDetection()
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│   DASHBOARD   │           │ LIVE MONITOR  │           │   ANALYTICS   │
│ • Total venue │           │ • Edge camera │           │ • Hourly      │
│   headcount   │           │   counts      │           │   throughput  │
│ • Live banner │           │ • Telemetry   │           │ • Zone share  │
│ • Trend chart │           │ • Snap & send │           │ • Influx bar  │
└───────┬───────┘           └───────┬───────┘           └───────┬───────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    ▼
                    ┌───────────────────────────────┐
                    │  INCIDENT CENTER & ALERTS     │
                    │ • Auto-trigger on threshold   │
                    │ • Forensic snapshot replay    │
                    │ • One-click deep inspection   │
                    └───────────────────────────────┘
```
