# Architecture

## Overview

The project is split into two simple parts:

1. A static frontend served as plain HTML, CSS, and JavaScript.
2. A small Flask backend that stores and returns tool reviews.

This keeps the read-heavy metrics browser easy to host while moving user-submitted review data into a server-backed API.

## Top-level structure

- `index.html`: page structure, templates, and tab layout
- `styles.css`: all visual styling
- `script.js`: frontend state, filtering, rendering, and review API integration
- `config.js`: runtime API base URL configuration for the frontend
- `data/metrics.json`: metric catalog used by the metrics tab
- `data/tools.json`: tool catalog used by the tools tab and backend tool validation
- `backend/app.py`: Flask API for health checks and reviews
- `backend/requirements.txt`: backend Python dependency list
- `backend/data/reviews.db`: SQLite database generated at runtime

## Frontend architecture

The frontend is a client-rendered static application.

### Main responsibilities

- Load metric data from `data/metrics.json`
- Load tool data from `data/tools.json`
- Maintain UI state for tabs, filters, sorting, and expanded cards
- Render metric cards and tool cards from HTML templates
- Fetch review summaries and details from the backend API
- Submit new reviews for tools

### Key flow

On startup, `init()` in `script.js`:

1. Binds DOM events.
2. Loads metrics, tools, and review summaries in parallel.
3. Renders the metrics and tools views.

### State model

`script.js` stores app state in a single `state` object. It tracks:

- active tab
- loaded metrics and tools
- filter values for each tab
- expanded metric/tool sections
- review summaries, detailed reviews, loading states, and submission errors

This is intentionally lightweight and framework-free.

## Backend architecture

The backend is a single Flask app in `backend/app.py`.

### Main responsibilities

- Validate review submissions
- Load allowed tool IDs from `data/tools.json`
- Initialize the SQLite database if needed
- Return review summaries and per-tool review details
- Handle basic CORS configuration through `ALLOWED_ORIGINS`

### API endpoints

- `GET /api/health`
- `GET /api/reviews/summary`
- `GET /api/reviews/<tool_id>`
- `POST /api/reviews`

### Storage

Reviews are stored in SQLite at `backend/data/reviews.db`.

Each review contains:

- `tool_id`
- `rating`
- `message`
- `created_at`

The backend also creates an index on `(tool_id, created_at DESC)` to keep tool review lookups efficient.

## Data flow

### Read path

1. Browser loads the static app.
2. Frontend fetches `data/metrics.json` and `data/tools.json`.
3. Frontend fetches review summaries from `${reviewApiBaseUrl}/reviews/summary`.
4. When a user opens a tool review panel, the frontend fetches `${reviewApiBaseUrl}/reviews/<tool_id>`.

### Write path

1. User submits a review from the tool card form.
2. Frontend `POST`s JSON to `${reviewApiBaseUrl}/reviews`.
3. Backend validates `toolId`, `rating`, and `message`.
4. Backend writes the row to SQLite and returns the saved review plus updated summary.
5. Frontend updates the in-memory review state and re-renders the tool card.

## Configuration

The frontend gets the API base URL from `config.js`:

```js
window.SYMMETRIC_CONFIG = window.SYMMETRIC_CONFIG || {
  reviewApiBaseUrl: "https://..."
};
```

The backend uses environment variables:

- `PORT`: server port, default `8000`
- `ALLOWED_ORIGINS`: comma-separated allowed frontend origins, default `*`

## Design tradeoffs

- Simple hosting: the frontend can be served from any static host.
- Minimal dependencies: the backend only needs Flask and SQLite.
- Shared tool identity: the backend validates reviews against `data/tools.json`, which keeps review data aligned with the static catalog.
- Low operational complexity: there is no auth layer, background worker, or external database.

## Known constraints

- No automated test suite is present yet.
- No authentication or rate limiting is implemented for review submission.
- `data/tools.json` must stay consistent because both frontend rendering and backend validation depend on it.
- `config.js` currently controls environment-specific API routing, so it should be reviewed before deployment.
