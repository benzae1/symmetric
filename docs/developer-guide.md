# Developer Guide

## Prerequisites

- Python 3 for the static file server and backend
- A terminal with access to the project root

## Local development

The project usually runs as two local processes:

1. Static frontend server
2. Flask review API

### Start the frontend

From the project root:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080`.

### Start the backend

From the `backend/` directory:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

The backend listens on `http://localhost:8000` by default.

## Important configuration note

The frontend reads its review API base URL from `config.js`.

At the time this documentation was created, `config.js` points to a remote Tailscale-served API instead of local development:

```js
reviewApiBaseUrl: "https://02w-01.tailf55885.ts.net/api"
```

If you want fully local development, update `config.js` to:

```js
window.SYMMETRIC_CONFIG = window.SYMMETRIC_CONFIG || {
  reviewApiBaseUrl: "http://localhost:8000/api"
};
```

Before deploying, switch it back to the correct public API hostname for that environment.

## Day-to-day workflow

### When changing the frontend

- Edit `index.html` for structure or templates
- Edit `styles.css` for styling
- Edit `script.js` for state, filtering, rendering, or API calls
- Refresh the browser after changes

### When changing the backend

- Edit `backend/app.py`
- Restart the Flask process after code changes
- Verify with `GET /api/health`

### When changing catalog data

- Edit `data/metrics.json` for metric records
- Edit `data/tools.json` for tool records

Be careful with tool IDs. Reviews are attached to tool IDs, and the backend also validates incoming review submissions against that dataset.

## Common change patterns

### Add a new metric

1. Add a new record to `data/metrics.json`.
2. Make sure the shape matches the existing records.
3. Refresh the frontend and verify filtering/search behavior.

### Add a new tool

1. Add a new record to `data/tools.json`.
2. Include a stable `id`.
3. Verify the tool appears in the tool finder.
4. Verify reviews can be opened and submitted for the new tool.

### Change the review API

1. Update `backend/app.py`.
2. Update frontend fetch or rendering logic in `script.js` if the response shape changes.
3. Re-test both summary loading and per-tool review loading.

## Suggested next improvements

- Add automated tests for the Flask API
- Add JSON schema or validation for `metrics.json` and `tools.json`
- Add a local dev mode for `config.js` so manual URL switching is not required
- Add linting or formatting commands for frontend and backend code
