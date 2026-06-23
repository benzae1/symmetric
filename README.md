# Software & DevOps Metrics Database

This project is a static frontend for browsing software metrics and tools, now extended with a lightweight review system:

- the frontend stays plain `HTML + CSS + JavaScript`
- the review API lives in `backend/app.py`
- reviews are stored in `SQLite`
- tool reviews are keyed by the existing tool IDs in [data/tools.json](/c:/Users/anton/Documents/Projects/symmetric/data/tools.json)

## Project layout

- [index.html](/c:/Users/anton/Documents/Projects/symmetric/index.html) renders the static site
- [script.js](/c:/Users/anton/Documents/Projects/symmetric/script.js) handles filters, cards, and review API calls
- [styles.css](/c:/Users/anton/Documents/Projects/symmetric/styles.css) styles the metrics browser and review UI
- [config.js](/c:/Users/anton/Documents/Projects/symmetric/config.js) sets the frontend review API base URL
- [backend/app.py](/c:/Users/anton/Documents/Projects/symmetric/backend/app.py) exposes the review API

## Review API

The backend exposes:

- `GET /api/health`
- `GET /api/reviews/summary`
- `GET /api/reviews/<toolId>`
- `POST /api/reviews`

`POST /api/reviews` accepts:

```json
{
  "toolId": "tool-3",
  "rating": 5,
  "message": "Fast, modern, and very easy to adopt."
}
```

## Run locally

You need two local servers:

1. Static frontend

```bash
python -m http.server 8080
```

2. Review backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Then open `http://localhost:8080`.

By default, [config.js](/c:/Users/anton/Documents/Projects/symmetric/config.js) points the frontend at `http://localhost:8000/api`, which matches the backend default.

## Configure the deployed frontend

Before you deploy the static site, update [config.js](/c:/Users/anton/Documents/Projects/symmetric/config.js) so it points to your public API hostname:

```js
window.SYMMETRIC_CONFIG = window.SYMMETRIC_CONFIG || {
  reviewApiBaseUrl: "https://api.yourdomain.com/api"
};
```

## Raspberry Pi deployment with Cloudflare Tunnel

These steps assume:

- your static site is hosted separately, for example on GitHub Pages
- your Raspberry Pi runs the review backend
- Cloudflare Tunnel publishes the Pi backend as `https://api.yourdomain.com`

### 1. Prepare the Pi

SSH into the Pi and install the basics:

```bash
sudo apt update
sudo apt install -y python3 python3-venv git
```

Clone your repo:

```bash
git clone <your-repo-url>
cd symmetric
```

### 2. Create the backend environment

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Test the backend locally on the Pi

Run:

```bash
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com" python app.py
```

In another terminal on the Pi:

```bash
curl http://127.0.0.1:8000/api/health
```

You should get JSON back.

### 4. Create a systemd service for the backend

Copy the example unit file:

```bash
sudo cp backend/symmetric-reviews.service.example /etc/systemd/system/symmetric-reviews.service
```

Edit it:

```bash
sudo nano /etc/systemd/system/symmetric-reviews.service
```

Update these values:

- `User=pi` if your username is different
- `WorkingDirectory=/home/pi/symmetric/backend`
- `Environment=ALLOWED_ORIGINS=...` with your real frontend origin(s)
- `ExecStart=` path if your repo lives somewhere else

Then enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable symmetric-reviews
sudo systemctl start symmetric-reviews
sudo systemctl status symmetric-reviews
```

### 5. Install Cloudflare Tunnel on the Pi

Follow Cloudflare’s current install instructions for `cloudflared` on Linux:

- https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/
- https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/

Then authenticate and create a tunnel.

### 6. Point the tunnel at the backend

Use the example config in [backend/cloudflared-config.example.yml](/c:/Users/anton/Documents/Projects/symmetric/backend/cloudflared-config.example.yml).

Copy it into your Cloudflare config location, usually:

```bash
mkdir -p ~/.cloudflared
cp backend/cloudflared-config.example.yml ~/.cloudflared/config.yml
```

Edit:

```bash
nano ~/.cloudflared/config.yml
```

Replace:

- `<TUNNEL-UUID>`
- `/home/pi/.cloudflared/<TUNNEL-UUID>.json`
- `api.yourdomain.com`

That config routes the public hostname to `http://localhost:8000`.

### 7. Add the public hostname

Cloudflare supports routing a hostname to the tunnel, either from the dashboard or with `cloudflared`.

Example CLI command from the Cloudflare docs:

```bash
cloudflared tunnel route dns <TUNNEL-UUID> api.yourdomain.com
```

Relevant docs:

- https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/dns/
- https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/

### 8. Run cloudflared as a service

Cloudflare documents installing the Linux service with:

```bash
sudo cloudflared --config /home/pi/.cloudflared/config.yml service install
sudo systemctl start cloudflared
sudo systemctl status cloudflared
```

Reference:

- https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/as-a-service/linux/

### 9. Update the frontend

Change [config.js](/c:/Users/anton/Documents/Projects/symmetric/config.js) to:

```js
window.SYMMETRIC_CONFIG = window.SYMMETRIC_CONFIG || {
  reviewApiBaseUrl: "https://api.yourdomain.com/api"
};
```

Redeploy the static site.

### 10. Smoke test from the public internet

Check:

- `https://api.yourdomain.com/api/health`
- your static site tool cards show the review summary area
- submitting a review updates the count and recent reviews list

## Security notes

- Restrict `ALLOWED_ORIGINS` to your real frontend domains.
- Keep the Pi updated with `sudo apt update && sudo apt upgrade`.
- The current backend is intentionally lightweight and has no auth.
- If spam becomes a problem, add rate limiting or Cloudflare protection in front of `POST /api/reviews`.
- Back up `backend/data/reviews.db` periodically.
