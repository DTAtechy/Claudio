# Microsoft 365 + LawToolbox integration plan (Phase 2)

This document describes how Claudio will integrate with Microsoft 365 and how
LawToolbox-generated deadlines will flow through it. The schema is already
prepared (`source`, `externalId`, `etag` columns and a `MicrosoftAccount`
table); only the sync code remains.

## Why Graph instead of a direct LawToolbox integration

LawToolbox writes its computed deadlines into the user's Outlook calendar
(usually as a dedicated calendar like "LawToolbox Deadlines" or as
category-tagged events). We don't need a direct LawToolbox API integration —
we read the same Outlook calendars via Microsoft Graph, and any event
LawToolbox creates flows into Claudio for free.

## Auth (MSAL OAuth2)

Per-user OAuth via the **Microsoft Authentication Library**:

- Tenant: per-user (multi-tenant) so each staff member can sign into their own
  M365 account.
- Scopes: `offline_access`, `User.Read`, `Calendars.Read`,
  `Calendars.ReadWrite.Shared`, `Files.Read.All`, `Sites.Read.All`,
  `Mail.Read` (for filing email later).
- Refresh tokens are stored in the `MicrosoftAccount.refreshTokenCipher`
  column, encrypted at rest with a key from `M365_TOKEN_KEY` (separate from
  `JWT_SECRET`).

## Calendar sync

1. On first connect, Graph returns a **delta link** for each calendar the user
   selects. We persist this in `MicrosoftAccount.calendarDeltaLink`.
2. A background worker polls the delta endpoint every 5 minutes (or subscribes
   to Graph webhooks; webhooks need a publicly reachable URL).
3. For each changed event:
   - Match it to a Claudio case using a case-number prefix in the event subject
     (e.g. `[DEMO-001] Hearing on motion to compel`) or a custom Outlook
     category that we set on Claudio-created events.
   - Upsert the `CalendarEvent` row keyed by `(source, externalId)`.
   - Tag LawToolbox-origin events: if the event has the LawToolbox category or
     organizer, set `source = LAWTOOLBOX` (or `OUTLOOK_SYNC` with
     `externalCategory = 'LawToolbox'`).
4. Two-way sync: when a user creates/edits an event in Claudio with `source =
   INTERNAL`, the worker pushes it to a chosen Outlook calendar and stores the
   resulting `externalId` + `etag`.

Conflict policy: last-write-wins by `etag`. LawToolbox-origin events are
**read-only** in Claudio's UI to prevent accidental edits.

## Documents (SharePoint / OneDrive)

Two modes:

1. **Native** — files uploaded into Claudio (`source = INTERNAL`,
   `storagePath` populated).
2. **Linked** — a case has an associated SharePoint folder / OneDrive folder.
   The worker indexes that folder via the Graph driveItem delta query and
   creates `Document` rows with `source = SHAREPOINT_SYNC`,
   `storagePath = null`, `externalId = driveItemId`, and `externalUrl` set to
   the SharePoint web URL. Click-to-open opens the SharePoint preview.

A user-initiated "promote" action can copy a SharePoint file into the native
store if the user wants Claudio to be the system of record for a particular
document.

## Email filing (Phase 2.5)

- One-click "File this email to a case" from a small Outlook web add-in we'll
  ship later. The add-in calls `POST /cases/:id/email` on the Claudio API with
  the message id; Claudio fetches the EML via Graph and stores it as a
  document with `mimeType = 'message/rfc822'`.
- Optional auto-filing rules per case (by sender domain or subject prefix).

## Teams (out of scope for v1/v2)

We'll revisit when there's a clear need — e.g. posting a notification to a
Teams channel when a SOL is within 30 days.

## Setup checklist when we build this

- Register an app in Microsoft Entra ID with the scopes above.
- Set redirect URI to `http://localhost:4000/auth/microsoft/callback` in dev,
  the production URL otherwise.
- Add `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `M365_TOKEN_KEY` to the
  server env.
- Implement `/auth/microsoft/start` and `/auth/microsoft/callback` routes.
- Implement the sync worker as a separate process (or the same process running
  a cron — fine at our scale).
