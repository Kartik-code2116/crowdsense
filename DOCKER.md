# CrowdSense Docker Deployment Guide

CrowdSense is fully containerized as a multi-tier microservice architecture managed with Docker Compose.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │          Host Browser / User           │
                      └──────────────────┬─────────────────────┘
                                         │ Port 3000
                                         ▼
                      ┌────────────────────────────────────────┐
                      │    crowdsense-frontend (Nginx SPA)     │
                      │  - Production React bundle             │
                      │  - Reverse proxy /api & /socket.io     │
                      └───────┬────────────────────────┬───────┘
                              │                        │
               Internal API   │         Internal AI    │
               /api/v1/*      ▼         /ai/*          ▼
┌─────────────────────────────────────┐ ┌──────────────────────────────────────┐
│     crowdsense-backend (Node.js)    │ │   crowdsense-ai-service (FastAPI)    │
│  - Port 5000:5000                   │ │  - Port 8000:8000                    │
│  - Real-time WebSocket Ingestion    │ │  - PyTorch Dilated CSRNet VGG16      │
│  - Time-series Telemetry Aggregator │ │  - Grad-CAM Visual Heatmaps          │
│  - Alert & Incident Engine          │ │  - Real ShanghaiTech Weights Loaded  │
└──────────────────┬──────────────────┘ └──────────────────────────────────────┘
                   │
                   │ Internal Port 27017
                   ▼
┌─────────────────────────────────────┐
│       crowdsense-mongodb (7.0)      │
│  - Port 27017:27017                 │
│  - Persistent Volume: mongo-data    │
│  - Time-series & Geospatial Indexes │
└─────────────────────────────────────┘
```

---

## Service Endpoints & Port Mappings

| Service | Container Name | Host Port | Internal Port | Healthcheck Endpoint |
|---|---|---|---|---|
| **Frontend Web UI** | `crowdsense-frontend` | `http://localhost:3000` | `80` | `GET /` |
| **Backend API Gateway** | `crowdsense-backend` | `http://localhost:5000` | `5000` | `GET /health` |
| **Deep Learning AI Service** | `crowdsense-ai-service` | `http://localhost:8000` | `8000` | `GET /health` |
| **Database** | `crowdsense-mongodb` | `localhost:27017` | `27017` | `mongosh admin ping` |

---

## Quick Start Commands

### 1. Start all containers in the background
```bash
docker-compose up -d
```

### 2. Check running container status
```bash
docker-compose ps
```

### 3. View live aggregated logs
```bash
docker-compose logs -f
```

To view logs for a specific service:
```bash
docker-compose logs -f ai-service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### 4. Stop all containers
```bash
docker-compose down
```

To stop containers and remove persistent volume data (fresh database start):
```bash
docker-compose down -v
```

### 5. Rebuild containers after code changes
```bash
docker-compose build
docker-compose up -d
```

---

## Verification & Health Check

Test that all services are online and communicating:

```bash
# 1. AI Service with PyTorch CSRNet weights
curl http://localhost:8000/health
# Response: {"status":"online","service":"CSRNet Deep Learning Model","active_model":"csrnet","real_weights_loaded":true}

# 2. Backend API Gateway
curl http://localhost:5000/health
# Response: {"status":"online","service":"CrowdSense API Gateway"}

# 3. Frontend Web Interface
curl http://localhost:3000/
# Response: HTML with status 200 OK
```
