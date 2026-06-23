# Documentation

This directory is the working documentation set for `symmetric`.

## Start here

- [Architecture](./architecture.md): high-level system structure, data flow, and key files
- [Developer Guide](./developer-guide.md): local setup, day-to-day workflow, and common change patterns
- [Helpful Commands](./helpful-commands.md): quick commands for running, checking, and debugging the project
- [Deployment Notes](./deployment.md): frontend API configuration and Raspberry Pi backend deployment notes

## Project snapshot

`symmetric` is a static frontend for browsing software and DevOps metrics, plus a lightweight Flask API for tool reviews.

- Frontend: `index.html`, `styles.css`, `script.js`, `config.js`
- Backend: `backend/app.py`
- Data: `data/metrics.json`, `data/tools.json`
- Persistence: `backend/data/reviews.db` (created automatically)

If you are new to the project, read [Architecture](./architecture.md) first and then [Developer Guide](./developer-guide.md).
