# Deployment Notes

## Frontend deployment

The frontend is static and can be deployed to any static hosting platform.

Before deploying, verify `config.js` points at the correct public review API base URL:

```js
window.SYMMETRIC_CONFIG = window.SYMMETRIC_CONFIG || {
  reviewApiBaseUrl: "https://api.yourdomain.com/api"
};
```

If this file still points to a local or temporary hostname, review features in production will fail.

## Backend deployment

The current backend is designed to run as a small Python service, including on a Raspberry Pi.

### Backend runtime needs

- Python 3
- Flask from `backend/requirements.txt`
- write access to `backend/data/` for the SQLite database

### Environment variables

- `PORT`: optional, defaults to `8000`
- `ALLOWED_ORIGINS`: recommended in production to restrict browser access to real frontend origins

Example:

```powershell
$env:ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
python backend/app.py
```

## Existing deployment assets

The repository already includes:

- `backend/symmetric-reviews.service.example`
- `backend/cloudflared-config.example.yml`

These support a deployment pattern where:

1. The frontend is hosted statically elsewhere.
2. The Flask backend runs on a Raspberry Pi.
3. Cloudflare Tunnel exposes the backend through a public hostname.

## Production considerations

- Back up `backend/data/reviews.db`
- Keep the host machine updated
- Restrict `ALLOWED_ORIGINS`
- Add rate limiting or edge protection if review spam becomes a problem
- Remember that there is currently no authentication on review submission
