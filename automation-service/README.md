# Lumina Automation Service

Real browser automation backend for the Lumina Job Agent. Uses Puppeteer to navigate to job portals, detect form fields, fill them with resume data, and submit applications.

## Quick Start

```bash
cd automation-service
npm install
npm start
```

This starts a WebSocket server on `ws://localhost:3001`.

## Configuration

Copy `.env.example` to `.env`:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | WebSocket server port |
| `HEADLESS` | `false` | Set to `true` to run browser in headless mode |
| `GROQ_API_KEY` | (optional) | Groq API key for LLM-based field detection |
| `CHROME_PATH` | (auto) | Path to Chrome/Chromium executable |

## Usage

1. Start the service: `npm start`
2. In the Lumina dashboard, go to the **Job Agent** tab
3. Click **Config** and set the WebSocket URL (default: `ws://localhost:3001`)
4. Click **Save & Test** — the status indicator should turn green
5. Paste a job application URL, select a resume, and click **Launch Agent**

## How It Works

1. **Navigate** — Opens the target URL in a real browser
2. **Detect Apply** — Finds and clicks "Apply" buttons automatically
3. **Scan Fields** — Detects all form fields (text, selects, radios, checkboxes, file uploads)
4. **Map & Fill** — Maps field labels to resume data and fills each field
5. **Submit** — Navigates multi-step forms (Next → Review → Submit) and clicks submit

## Deployment

### Railway / Render / Fly.io

```bash
# Set HEADLESS=true
# Set PORT to the platform-assigned port
```

### Docker

```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y chromium --no-install-recommends
ENV CHROME_PATH=/usr/bin/chromium
ENV HEADLESS=true
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
```
