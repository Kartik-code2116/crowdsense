# CrowdSense presentation notes

## Short project description

**CrowdSense is a camera-based crowd-monitoring prototype.** An operator creates venue zones with capacity limits, assigns one or more camera sources to each zone, chooses CSRNet or YOLOv8 for each camera, and reviews crowd estimates and threshold incidents in one workspace.

The goal is to help an operator notice a rising crowd level sooner by putting camera estimates, configured limits, and recorded alerts together. The application is a decision-support prototype; it does not replace trained venue safety staff or certified safety equipment.

## Suggested 7-minute presentation

### 1. Problem and motivation — 45 seconds

Large venues may have several camera views, and an operator has to understand where crowding is developing. Looking at feeds independently makes it harder to compare a live estimate with a location’s safe capacity.

**Project question:** Can a vision pipeline connect camera observations to zone capacity thresholds and present the results in an operator-friendly dashboard?

### 2. Project workflow — 60 seconds

Walk through this sequence:

```text
Create zone and capacity
        ↓
Add camera source to zone
        ↓
Choose CSRNet or YOLOv8 per camera
        ↓
Capture frame and run inference
        ↓
Record camera estimate and zone total
        ↓
Compare with warning / critical thresholds
        ↓
Show live overview, history, and incident
```

The main design decision is to configure the zone first. That gives every camera a location and capacity context before its estimates are used in dashboards or alerts.

### 3. Architecture — 75 seconds

```text
React / Vite operator interface
      │ REST requests with JWT; Socket.IO updates
      ▼
Node.js / Express API ─── MongoDB
      │ camera sampling and alert rules
      ▼
Python / FastAPI inference service
      ├─ CSRNet: density map → estimated count
      └─ YOLOv8: person boxes → detected count
```

- **React** provides zones, cameras, Model Lab, dashboard, scanner, analytics, incidents, reports, and settings.
- **Express** handles sign-in, account-scoped configuration and records, camera sampling, capacity checks, and event delivery.
- **FastAPI and PyTorch** perform the selected model’s inference.
- **MongoDB** stores workspace data and timestamped observations.
- **Socket.IO** sends telemetry and new alert events to the authenticated workspace.

### 4. Deep-learning model choices — 90 seconds

CrowdSense exposes two model outputs because different views need different evidence:

| Model | Output | Useful when | Evaluation status |
| --- | --- | --- | --- |
| CSRNet | Density map and integrated crowd estimate | People overlap and individual boxes are hard to separate | Model Lab includes published ShanghaiTech reference MAE values for context; the installed checkpoint is not independently benchmarked here. |
| YOLOv8 | Individual person detections and boxes | The operator needs localized detections in the frame | The project has no local ShanghaiTech evaluation for its configured YOLO checkpoint. |

CSRNet’s density-map approach is relevant to crowded images because it estimates spatial density rather than requiring one clean box for every person. YOLOv8 gives more directly inspectable person locations. Neither is universally best; both need evaluation on venue footage.

### 5. Capacity alerts and operator pages — 60 seconds

For a zone with capacity `C`, and an observed zone estimate `N`, the dashboard computes:

```text
occupancy percentage = 100 × N / C
```

The operator configures warning and critical percentages. Crossing a configured threshold creates an alert and an incident record, with a triggering frame attached when available. Operators can review the count, capacity, source camera, and evidence, then resolve the incident.

The dashboard presents the current overview; Live Monitor shows configured camera sources; Analytics and Reports use recorded observations; Trend Forecast shows an exploratory linear projection from recent counts.

### 6. Demo sequence — 2 minutes

1. Sign in to the workspace.
2. Open **Zones & Capacity** and create “Main Entrance” with capacity 100, warning at 70%, and critical at 90%.
3. Open **Cameras** and add a reachable public stream URL, direct network stream, or the local webcam. For a classroom demo, the Scanner’s browser webcam or a bundled image is easiest to control.
4. Open **Model Lab**. Explain the CSRNet and YOLOv8 outputs, set a default for future cameras, then choose the model for the camera.
5. Run a camera scan. Point out the model name, estimated people, measured inference time, and any available model output overlay.
6. If the estimate is above the zone threshold, show the alert and incident record. A one-shot uploaded photo is not a live observation; use the selected camera or webcam if you want to demonstrate history and incidents.
7. Open **Analytics** or **Reports** to show how recorded samples become operational history.

Avoid promising that the demo will produce a particular count: the result depends on the camera view and checkpoint installed. If a model is unavailable, explain that model weights are supplied separately and show the model health status instead of claiming a successful inference.

### 7. Limitations and next work — 45 seconds

- Model accuracy has not been independently validated on representative target-venue footage.
- Camera-count aggregation currently sums fresh camera estimates. Overlapping views can count the same people more than once.
- Stream extraction depends on network reachability and the source provider’s playback permissions. Private, DRM-protected, or login-only video may fail.
- A browser-local webcam is available to the operator’s browser; it is not a server-attached camera.
- The forecast is a linear trend baseline. The repository’s LSTM model definition is not trained, validated, or connected to app inference.
- Threshold incidents provide operator review signals; they do not automatically change turnstiles or contact emergency services.

Next engineering steps are to validate checkpoints on labeled venue footage, calibrate camera overlap and perspective, add a trained and evaluated temporal model, store evidence in managed object storage, and load-test stream sampling and alert delivery.

## Likely viva questions

**Why split the web API and AI inference service?**  
The Node.js API serves authenticated configuration, storage, and events. Python provides the PyTorch and computer-vision ecosystem used by the inference pipeline. The services can be packaged and monitored separately.

**How does CSRNet estimate a crowd count?**  
It predicts a spatial density map. Summing the predicted density values gives the model’s estimated count. The trained weights and image preprocessing affect the result.

**Why support object detection too?**  
YOLOv8 provides person boxes that are easier to inspect in less crowded views. CSRNet can be a more suitable output when people overlap, but target-footage validation is needed for both.

**How is an alert triggered?**  
The current zone estimate is divided by the configured capacity. When its percentage reaches the warning or critical threshold, the backend creates or updates the zone alert and records an incident for review.

**Is the forecast an LSTM?**  
No. The application currently uses a linear trend baseline over recent observations. An LSTM architecture exists in the research code, but no trained checkpoint is connected to the application’s inference endpoint.

**Can the project accept any web link?**  
It accepts direct HTTP/HTTPS/RTSP sources and attempts extraction for several public video providers. A URL still has to be reachable and playable by the server. Authentication, DRM, provider restrictions, and changing extraction formats can prevent access.

**What is the main counting limitation with multiple cameras?**  
The current zone total sums camera estimates and does not match people across camera views. Overlapping cameras can therefore double-count people. The deployment should avoid overlapping views or add calibrated cross-camera deduplication.

**Is it ready to control real venue safety systems?**  
No. This project is a prototype for operator decision support. It needs local model evaluation, reliability and security review, and venue safety approval before operational use.
