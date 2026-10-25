# CrowdSense

CrowdSense is a crowd safety and venue operations system. Its target workflow samples camera frames, estimates crowd density, translates counts into zone capacity, and gives operators a live view of conditions and incidents.

## Current project status

The repository currently contains a responsive React/Vite operations dashboard in `frontend/`. It is a self-contained UI preview with sample venue data, interactive page navigation, a camera heatmap visibility control, occupancy range selector, printable report action, and a light/dark theme preference saved in local storage. The API, persistence, authentication, live camera ingestion, and trained density model are not connected yet; the dashboard labels itself as a UI preview where appropriate.

## Run the dashboard

```bash
cd frontend
npm install
npm run dev
```

Create a production bundle with `npm run build`.

## Recommended production layout

```text
crowdsense/
├── frontend/                 # React operator console (current)
│   ├── src/
│   │   ├── api/              # REST client and typed endpoint modules
│   │   ├── components/       # Shared layout, camera, chart and alert UI
│   │   ├── features/         # Dashboard, cameras, zones, incidents, reports
│   │   ├── hooks/            # Socket, session and query hooks
│   │   ├── store/            # Session and UI state
│   │   ├── App.jsx
│   │   └── styles.css
│   └── package.json
├── backend/                  # Node.js/Express API gateway (next phase)
│   ├── src/
│   │   ├── config/           # Environment and database configuration
│   │   ├── middleware/       # Authentication, roles, validation, errors
│   │   ├── models/           # Users, cameras, zones, detections, incidents
│   │   ├── routes/           # Auth, cameras, analytics, alerts, reports
│   │   ├── services/         # AI client, alert engine and report generation
│   │   ├── sockets/          # Live dashboard event delivery
│   │   └── server.js
│   └── tests/
├── ai-service/               # Python FastAPI inference service (next phase)
│   ├── app/
│   │   ├── routers/          # Predict, forecast and explain endpoints
│   │   ├── services/         # Inference, heatmap and flow processing
│   │   └── core/             # Settings and model loading
│   └── requirements.txt
├── ml/                       # Model training and evaluation
│   ├── configs/
│   ├── notebooks/
│   ├── src/                  # Dataset, CSRNet/MCNN, training and evaluation
│   └── weights/              # Local model files; keep large weights out of git
├── infra/                    # Compose, reverse proxy and deployment files
└── README.md
```

## Model approach

ShanghaiTech provides point annotations rather than bounding boxes. The primary research model should therefore predict a density map (for example CSRNet or MCNN); integrating that map estimates the crowd count. Keep the existing Roboflow/YOLO detector as a baseline for comparison, and report MAE and RMSE on held-out data. A Python service hosts PyTorch/ONNX inference; Node.js handles users, cameras, persistence, alerts, reports, and real-time delivery.

## Data flow

1. An operator registers a camera or uploads a video.
2. A worker samples frames at a controlled rate and sends them to the Python inference service.
3. Inference returns the count, density/heatmap output, confidence or uncertainty, and optional flow information.
4. The API associates the result with a camera and zone, stores it, and evaluates capacity thresholds.
5. Live events update the operator console; scheduled jobs can generate forecasts from recent counts.

## Production considerations

- Add role-based access, refreshable sessions, request validation, rate limits, and audit events before exposing the API.
- Index detections by `(cameraId, timestamp)` and expire short-lived raw detections with a retention policy; preserve aggregated reporting data separately.
- Keep secrets and model weights out of source control. Use environment templates for required configuration.
- Add health/readiness checks, structured logs, model version tracking, and monitoring for inference latency and frame processing rate.
- Treat forecasts and model confidence as decision support, with visible timestamps and a clear operator escalation path.
