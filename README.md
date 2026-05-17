# Software & DevOps Metrics Database

This project is a static, GitHub Pages-compatible frontend for browsing the metrics described in `devops_metrics_tables.md`. It turns the source tables into a local JSON dataset and renders a searchable, filterable interface with plain HTML, CSS, and JavaScript.

## Data storage

The dataset lives in `data/metrics.json`.

Each metric object includes:

- `id`
- `type`
- `name`
- `category`
- `shortDescription`
- `measurement`
- `leadingLagging`
- `difficulty`
- `difficultyJustification`
- `tags`

## Run locally

Because the frontend fetches `data/metrics.json`, serve the folder with a local static server instead of opening `index.html` directly from the filesystem.

Python:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.
