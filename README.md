# CrowdSense

CrowdSense is a crowd-monitoring project that connects camera sources to venue zones, estimates occupancy with a selected vision model, and records threshold alerts for operator review. Its setup flow is:

1. Create **zones and capacity ceilings**.
2. Add one or more cameras to each zone.
3. Choose **CSRNet** or **YOLOv8** for each camera.
4. Review live samples, dashboard overview, incidents, analytics, reports, and a recent-count trend projection.

CrowdSense is a decision-support prototype. Its counts and threshold alerts need validation against the venue’s own cameras and labeled data before operational use. It is not a certified life-safety system.

## What the application does

- **Zones:** store people capacity, warning and critical thresholds, floor, and camera assignments.
- **Cameras:** register a reachable stream URL or a browser-local webcam. Direct network streams are sampled by the backend worker; the laptop webcam uses browser camera permission in the operator’s browser.
- **Model Lab:** compare CSRNet density regression and YOLOv8 person boxes, set the default for new cameras, and save the model assigned to each camera.
- **Camera scanner:** analyze a selected camera or the operator’s webcam. Uploaded photos and bundled examples are one-shot scans; they do not become venue observations.
- **Live monitor and dashboard:** show configured cameras, last successful sample, observed counts, zone totals, service state, and open incidents.
- **Alerts and incidents:** compare a zone estimate with its configured thresholds, create an incident when a threshold is crossed, attach the triggering frame when available, and let an operator resolve the incident.
- **Analytics and reports:** show recorded observations and export CSV or print a report.
- **Trend forecast:** fit a transparent linear trend to recent recorded zone counts. A trained LSTM checkpoint is not connected to the running application.

## Architecture

```text
React + Vite browser UI
       │ REST / JWT and Socket.IO
       ▼
Node.js + Express API ───── MongoDB
       │
       ├── camera stream sampling worker
       ▼
Python + FastAPI + PyTorch inference
       ├── CSRNet density regression
       └── YOLOv8 person detection
```

The browser handles interaction and browser-local webcam capture. The Express service owns authenticated workspaces, camera and zone configuration, detections, incidents, and reports. The Python service performs image inference. MongoDB persists configured records and detection history. Socket.IO sends account-scoped live telemetry and newly created alerts.

## Models and forecast

**CSRNet** estimates a spatial density map; its integral is used as the crowd estimate. Model Lab shows the original paper’s ShanghaiTech Part A and Part B MAE values (68.2 and 10.6) as reference results only. They are not measured results for the checkpoint installed on a particular deployment.

**YOLOv8** returns individual person detections and bounding boxes. CrowdSense does not include a project-specific ShanghaiTech evaluation for YOLOv8. Performance depends on the checkpoint, image quality, scene, and hardware. Validate both models locally before comparing them.

The forecast page uses recorded samples and a linear trend baseline. The repository contains an LSTM model definition and a notebook, but the app has no trained LSTM weights or connected LSTM inference endpoint. Forecasts are exploratory and do not trigger automated controls.

## Camera sources and operating limits

| Source | What CrowdSense can do | Limit |
| --- | --- | --- |
| Direct HTTP/HTTPS image, video, HLS, or RTSP URL | The AI service attempts to capture a frame; browser preview works only for browser-compatible sources. | The stream must be reachable from the server. RTSP preview in a browser needs a media gateway. |
| Public YouTube, Twitch, Vimeo, or Dailymotion link | The player embeds supported URLs where the provider permits it, and the server attempts frame extraction through `yt-dlp`. | Provider restrictions, private streams, DRM, login requirements, geoblocking, and extractor changes can prevent capture. |
| Laptop or USB webcam | Capture in CrowdSense Scanner through the browser’s `getUserMedia` permission. | This is the operator’s local browser camera; it is not accessible to a remote server worker. Use HTTPS outside localhost. |
| Bundled image or uploaded photo | Run one image inference. | A photo is not a live stream and does not enter camera history unless the operator captures it from a registered camera. |

The server samples at most two network streams concurrently, with a minimum five-second interval per camera. A zone total is currently the sum of fresh camera counts. If cameras overlap, some people can be counted more than once; camera overlap calibration and cross-camera deduplication are not implemented.

Thresholds operate on model estimates. A Warning or Critical alert is stored and broadcast to the signed-in workspace. Clearing the threshold resolves the active alert; an incident remains for operator review until resolved. This workflow does not contact turnstiles, emergency systems, or external messaging services.

## Run with Docker Compose

Requirements: Docker Compose and the model checkpoints you want to use. The repository does not guarantee that usable model weights are present in a fresh clone.

1. Copy `.env.example` to `.env` in the repository root.
2. Set unique secrets for `JWT_SECRET` (at least 32 characters), `ADMIN_REGISTRATION_CODE` (at least 24 characters), `MONGO_ROOT_USERNAME`, and `MONGO_ROOT_PASSWORD`. Use URI-safe Mongo credentials and set `CORS_ORIGIN` to the browser-facing origin.
3. Put model weights in `ai-service/weights/`:
   - CSRNet: `csrnet_shanghaitech.pth`
   - YOLOv8: `yolov8n.pt` (or configure the loader for your checkpoint)
4. Start the stack:

```sh
docker compose up --build
```

Open `http://localhost:3000`. Register a workspace using the configured invitation code. No default administrator or demo password is provisioned. If a checkpoint is missing or fails to load, the AI health endpoint reports the service as degraded and inference returns an error rather than fabricated results.

## Local development

Run MongoDB locally, then use separate terminals:

```sh
# Terminal 1: backend
cd backend
npm ci
npm run dev
```

```sh
# Terminal 2: AI service
cd ai-service
python -m venv .venv
# Activate the environment, then:
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

```sh
# Terminal 3: frontend
cd frontend
npm ci
npm run dev
```

The Vite development server proxies `/api` and `/socket.io` to port 5000, and only `/ai/health` to port 8000. Configure backend variables in `backend/.env` (at minimum `MONGODB_URI` and `JWT_SECRET`); configure model paths and `DEVICE` for the AI service in `ai-service/.env`. To add an optional empty starter zone to an existing account, set `SEED_USER_EMAIL` in `backend/.env` and run `npm run seed` from `backend/`. This never creates accounts, cameras, incidents, or detection history. If your MongoDB volume was initialized before authentication was enabled, migrate it deliberately or use a new volume; existing data volumes are not reset automatically.

## Data and security notes

- API routes and Socket.IO connections require a signed JWT. Passwords are hashed with bcrypt. Production registration requires the configured invitation code.
- Production startup requires MongoDB and explicit secrets/origins. The development in-memory store is temporary and is cleared when the backend restarts.
- Detection records are stored in MongoDB; set up backups and retention for the deployment. The project does not currently enforce an automatic detection TTL policy.
- Camera URLs are fetched by the AI service. Only register streams the deployment is authorized to access and can safely expose to that service.
- Validate model accuracy, alert thresholds, stream stability, and camera overlap on representative local footage before relying on results.

## Presentation material

See [PRESENTATION_NOTES.md](PRESENTATION_NOTES.md) for a project overview, demo sequence, architecture explanation, limitations, and likely viva questions.
