# Deploying Claudio (cloud VPS)

This is the recommended v1 deployment: a small Linux VPS running the API,
Postgres, and the file storage directory. Total cost typically $15–30/month
for a 2–4 person practice with ~400 GB of documents.

## What you need

- A VPS with at least 2 GB RAM and enough disk for your documents. Good
  options: Hetzner CCX13, DigitalOcean Premium 2 GB, AWS Lightsail 2 GB.
- A domain name (e.g. `claudio.yourfirm.com`).
- A TLS certificate (free via Let's Encrypt + Caddy).
- An offsite backup target (Backblaze B2 ~ $6/TB/mo, or AWS S3).

## One-time server setup (Ubuntu 22.04 LTS)

```bash
# Install Docker + Docker Compose
sudo apt update && sudo apt install -y docker.io docker-compose-plugin caddy

# Create a deploy user with limited sudo
sudo adduser --disabled-password claudio
sudo usermod -aG docker claudio

# Clone the repo
sudo -iu claudio git clone https://github.com/dtatechy/claudio.git
cd /home/claudio/claudio
cp .env.example apps/server/.env
$EDITOR apps/server/.env   # set DATABASE_URL, JWT_SECRET (long random!), CORS_ORIGIN
```

### Caddyfile (TLS reverse proxy)

`/etc/caddy/Caddyfile`:

```
claudio.yourfirm.com {
    reverse_proxy localhost:4000
    encode gzip
    request_body { max_size 250MB }
}
```

Reload: `sudo systemctl reload caddy`. Caddy provisions the certificate
automatically on first request.

### Run the stack

```bash
# Bring up Postgres
docker compose up -d postgres

# Install + build the server
npm install
npm --workspace @claudio/server run db:generate
npm --workspace @claudio/server run db:migrate:deploy
npm --workspace @claudio/server run build

# Run as a systemd service (preferred over `npm run start` directly)
sudo tee /etc/systemd/system/claudio.service > /dev/null <<'EOF'
[Unit]
Description=Claudio API
After=network.target docker.service

[Service]
Type=simple
User=claudio
WorkingDirectory=/home/claudio/claudio/apps/server
EnvironmentFile=/home/claudio/claudio/apps/server/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now claudio
```

## Backups (do this on day one)

Critical because legal data — losing case files would be a serious problem.

### Daily encrypted Postgres dump to B2

```bash
# /usr/local/bin/claudio-backup.sh
#!/usr/bin/env bash
set -euo pipefail
TS=$(date +%Y%m%d-%H%M%S)
docker exec claudio-postgres pg_dump -U claudio claudio \
  | gzip \
  | rclone rcat b2:claudio-backups/db-$TS.sql.gz
rclone sync /home/claudio/claudio/apps/server/storage \
  b2:claudio-backups/storage --transfers 4
```

Add to `/etc/crontab`:

```
0 2 * * * claudio /usr/local/bin/claudio-backup.sh
```

Set up `rclone` once with `rclone config` (Backblaze B2 backend) using a
restricted application key.

### Test restore quarterly

A backup you've never restored is not a backup. Spin up a temporary container
quarterly, restore the latest dump into it, and verify a few cases load.

## Pointing the desktop client at the server

Each staff member edits `apps/desktop/.env` (or sets these as env vars before
launching the packaged app):

```
VITE_API_URL=https://claudio.yourfirm.com
VITE_WS_URL=wss://claudio.yourfirm.com/ws
```

Then run `npm --workspace @claudio/desktop run build` to produce a packaged
build. (Packaging the Electron app into a `.dmg`/`.exe` is a Phase-2 polish
item — for now staff can run it from `npm run dev:electron`.)

## Migrating to on-prem later

If you decide to move to a Synology NAS or a mini-PC at the office:

1. `pg_dump` from the cloud Postgres, scp the dump and `STORAGE_DIR` to the
   new host.
2. Stand up Postgres + Claudio there (the Docker Compose file already runs
   anywhere Docker runs).
3. Swap DNS or point the desktop client `.env` at the new URL.

No code changes required.
