# Helpful Commands

## Run the project

Serve the static frontend from the project root:

```powershell
python -m http.server 8080
```

Create the backend virtual environment:

```powershell
cd backend
python -m venv .venv
```

Activate the backend virtual environment:

```powershell
cd backend
.venv\Scripts\Activate.ps1
```

Install backend dependencies:

```powershell
cd backend
pip install -r requirements.txt
```

Run the backend API:

```powershell
cd backend
python app.py
```

## Quick checks

Check backend health:

```powershell
Invoke-RestMethod http://localhost:8000/api/health
```

Fetch review summaries:

```powershell
Invoke-RestMethod http://localhost:8000/api/reviews/summary
```

Fetch reviews for a tool:

```powershell
Invoke-RestMethod http://localhost:8000/api/reviews/tool-3
```

Submit a review:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8000/api/reviews `
  -ContentType "application/json" `
  -Body '{"toolId":"tool-3","rating":5,"message":"Fast and easy to adopt."}'
```

## Repository navigation

List files:

```powershell
Get-ChildItem -Force
```

Find files quickly:

```powershell
rg --files
```

Search for a symbol or string:

```powershell
rg "reviewApiBaseUrl|loadReviewSummaries|create_review"
```

## Git helpers

Check working tree status:

```powershell
git status --short
```

See changed lines:

```powershell
git diff
```

## Troubleshooting

If the frontend loads but reviews fail:

- check `config.js`
- confirm the backend is running on port `8000`
- call `http://localhost:8000/api/health`
- verify `ALLOWED_ORIGINS` allows the frontend origin

If review submission fails with unknown tool errors:

- confirm the `toolId` exists in `data/tools.json`
- restart the backend if `data/tools.json` changed while the app was already running
