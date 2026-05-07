# Claudio

A case management system for personal injury and maritime plaintiff's practice.
Built as a desktop app (Electron) backed by a self-hosted server, modeled after
the case-centric workflow of Aderant Total Office.

## What's in the box (v1)

- **Cases** — matter records with practice area, status, incident date, and
  statute-of-limitations tracking.
- **Contacts** — clients, opposing parties/counsel, witnesses, experts, medical
  providers, adjusters, and courts, scoped per case.
- **Documents** — file library per case, with upload/download/delete. Designed
  to layer SharePoint/OneDrive sync on top in Phase 2.
- **Calendar & deadlines** — hearings, depositions, mediations, trials,
  deadlines, and SOLs. Designed to ingest LawToolbox-generated Outlook events
  in Phase 2 (see `docs/integrations.md`).
- **Tasks** — assignable, prioritized, with due dates.
- **Notes** — case timeline / call summaries / strategy notes.
- **Real-time collaboration** — every staff member sees changes instantly via
  WebSockets.
- **Multi-user auth** — first user becomes ADMIN; admin can invite STAFF/ATTORNEY.

## Architecture

```
┌────────────────────────┐      HTTPS / WSS       ┌──────────────────────────┐
│  Electron desktop app  │ ─────────────────────▶ │   Fastify + Prisma API   │
│  (React + Vite + TS)   │                        │  ┌────────────────────┐  │
│                        │ ◀──── WebSocket ─────  │  │ PostgreSQL         │  │
└────────────────────────┘                        │  │ STORAGE_DIR (files)│  │
                                                  │  └────────────────────┘  │
                                                  └──────────────────────────┘
```

Monorepo layout:

```
apps/
  desktop/        Electron + Vite + React UI
  server/         Fastify + Prisma + Postgres backend
packages/
  shared/         Shared TypeScript types
docs/
  integrations.md Phase-2 Microsoft 365 / LawToolbox plan
  deployment.md   Cloud-VPS deployment guide
```

## Local development

Prereqs: Node 20+, Docker (for Postgres), and on Linux the usual Electron deps
(`libgtk-3-0`, `libnss3`, `libasound2`, etc.).

```bash
# 1) Install workspace deps
npm install

# 2) Copy env and start Postgres
cp .env.example apps/server/.env
cp .env.example apps/desktop/.env
npm run db:up

# 3) Run migrations + seed (creates an admin@example.com / changeme user)
npm --workspace @claudio/server run db:generate
npm --workspace @claudio/server run db:migrate -- --name init
npm --workspace @claudio/server run db:seed

# 4) In one terminal: the API
npm run dev:server

# 5) In another terminal: the desktop client
npm run dev:desktop                        # browser preview at http://localhost:5173
npm --workspace @claudio/desktop run dev:electron  # to launch the Electron window
```

## Deployment

See `docs/deployment.md`. Recommended for v1: a small cloud VPS running the API
(behind a reverse proxy with TLS) and a managed Postgres. Document storage
lives on the VPS disk for now; we can swap it for S3-compatible storage later
without code changes.

## Roadmap

- **Phase 2 — Microsoft 365 / LawToolbox integration.** OAuth via MSAL, Graph
  API for Outlook calendar (LawToolbox events flow in for free), SharePoint /
  OneDrive document linking, per-case email filing. Schema is already prepared
  with `source` / `externalId` / `etag` columns.
- **Phase 3 — PI/maritime specifics.** Medical providers + bills, lien tracking,
  insurance/adjuster info, damages worksheet, settlement calculator.
- **Phase 4 — Time/billing, document templates with merge fields, court-rules
  docketing, conflict checks.**

## Security notes

- Legal client data is sensitive. In production, **always** terminate TLS at a
  reverse proxy, rotate `JWT_SECRET`, take encrypted off-machine backups, and
  enable full-disk encryption on whatever stores `STORAGE_DIR` and Postgres.
- Storing the firm's only copy on a single external SSD is not a safe plan.
  Use mirrored storage and an offsite backup (e.g. Backblaze B2) at a minimum.
