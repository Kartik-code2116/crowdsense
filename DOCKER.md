# Docker Compose deployment

Docker Compose runs four containers on a private network: the React/Nginx frontend, Express API, FastAPI inference service, and MongoDB. Only the frontend is published to the host at port `3000`; API and AI requests pass through Nginx and the API, and MongoDB stays inside the Compose network.

## Configure

1. Copy `.env.example` to `.env` at the repository root.
2. Set unique values for `JWT_SECRET`, `ADMIN_REGISTRATION_CODE`, `MONGO_ROOT_USERNAME`, and `MONGO_ROOT_PASSWORD`. Use URI-safe alphanumeric MongoDB credentials.
3. Set `CORS_ORIGIN` to the public frontend origin, such as `http://localhost:3000` for local evaluation.
4. Add the checkpoints you plan to use under `ai-service/weights/`:
   - `csrnet_shanghaitech.pth`
   - `yolov8n.pt`

The AI service starts without checkpoints in degraded state so the rest of the project can be inspected; inference requests fail with an error until the selected model is available. The application does not create a demo administrator or synthetic detection history.

## Run

```sh
docker compose up --build -d
docker compose ps
docker compose logs -f
```

Open `http://localhost:3000`, register a workspace using the invitation code from `.env`, then create zones, add camera sources, and assign a model to each camera.

The API health check is available at `http://localhost:3000/api/v1/health`. AI model health is exposed read-only at `http://localhost:3000/ai/health`. Inference requests require a signed-in session and go through the authenticated API. The AI service and MongoDB are not exposed as host ports.

## Stop and update

```sh
docker compose down
docker compose up --build -d
```

`docker compose down -v` removes the MongoDB data volume. Run it only when you intentionally want to delete the saved database.

## Local development

Run MongoDB locally, then start the backend, AI service, and frontend in separate terminals. Use `backend/.env` for API settings and `ai-service/.env` for model paths and device settings. Vite proxies authenticated `/api` calls to Express, Socket.IO to Express, and only the AI `/health` endpoint for status display.

See [README.md](README.md) for the full data flow, page descriptions, model notes, and operating limits.
