# PasteHere

Free, no-account sharing of text, code, images, video, zips and any other file. Share by a 6-digit code, a link or a QR code.
Runs on Vercel (Hobby) + Cloudflare R2 free tier, with no database.

## How it works

```
text   browser ──POST /api/share──────────────▶ Vercel fn ──▶ R2  s/{id}.json   (manifest)
files  browser ──POST /api/upload (presign)───▶ Vercel fn
       browser ──PUT (signed, size enforced)──────────────────▶ R2  f/{uploadId}/…   (bytes never touch Vercel)
       browser ──POST /api/share (finalize)───▶ Vercel fn ──▶ R2  s/{id}.json + c/{code}
view   browser ──GET /api/share/{code|id}─────▶ Vercel fn ──▶ R2  (expiry checked here)
       browser ──GET /api/file/{id}/{n}───────▶ 302 to a 5-minute signed R2 URL
cron   Vercel Cron, daily ──▶ /api/cron/cleanup ──▶ deletes expired shares, their files and codes
```

- Links are `/view/{12 random chars}` (unguessable). The 6-digit code is a convenience for typing on another device.
- Files go straight from the browser to R2, so Vercel's 4.5 MB function body limit does not apply.
- Expiry is enforced on every read, and the cleanup cron physically deletes the data.
- Only images, video and audio are ever rendered inline. Everything else (including html/svg/pdf) is forced to download.
- Pre-v2 links (`/view/1234#<data>`) still open until they expire.
- Share pages and the API are `noindex` / disallowed in `robots.txt`, and `Referrer-Policy: no-referrer` stops a share link leaking when someone clicks a link inside a paste.

## Limits (`lib/config.ts`)

| | |
|---|---|
| File | 100 MB each, 10 per share, 500 MB per share |
| Text | 1 MB |
| Expiry | text up to 7 days, files up to 24 hours |
| Code | 6 digits (900k combinations) |
| Rate limits per IP | 60 uploads/h, 60 shares/h, 20 code lookups/min, 120 link lookups/min |
| Daily cap (everyone) | 3 GB of uploads per UTC day (`DAILY_UPLOAD_CAP_MB`) |

### Why this stays inside R2's free 10 GB

Files live at most 24 hours, and the cleanup job runs once a day (Vercel Hobby allows one cron run per day), so at worst
two days of uploads are on disk at once: 2 x 3 GB = **6 GB**, leaving about 4 GB of headroom for text and manifests.
The cleanup job logs `storedBytes` on every run and warns (`nearFreeLimit`) when stored data passes 80% of 10 GB.
If it ever warns, lower `DAILY_UPLOAD_CAP_MB`.

## One-time setup

### 1. Create the R2 bucket

Cloudflare dashboard → R2 Object Storage → **Create bucket**:

| Field | Value |
|---|---|
| Bucket name | anything, e.g. `pastehere` (permanent) |
| Location | **Automatic** (a location hint can only be set now, never later) |
| Default storage class | **Standard**. Do not pick *Infrequent Access*: it has no free tier and bills a 30-day minimum per object. |

Leave the bucket **private** (the default). Downloads go through `/api/file`, which checks expiry and hands out short-lived signed links, so you do not need `r2.dev` public access or a custom domain.

Then R2 → **Manage API tokens** → Create API token → permission **Object Read & Write**, scoped to this bucket only.
Copy the Access Key ID and Secret Access Key (shown once). Your Account ID is on the R2 overview page.

### 2. Environment variables (Vercel → Project → Settings → Environment Variables, and `.env.local` for local dev)

See `.env.example`. Required: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `CRON_SECRET`.
`NEXT_PUBLIC_R2_PUBLIC_URL` is no longer used. Optional: `NEXT_PUBLIC_CONTACT_EMAIL` (shows a Contact link in the footer).
Redeploy after changing environment variables.

### 3. Bucket CORS (required, otherwise browser uploads fail)

R2 → your bucket → Settings → **CORS Policy** → Add:

```json
[
  {
    "AllowedOrigins": ["https://YOUR-DOMAIN", "http://localhost:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

Origins must match **exactly** (scheme + host + port): `http://localhost:3000`, `http://127.0.0.1:3000` and a LAN address
like `http://192.168.1.20:3000` (the "Network" URL `npm run dev` prints, needed to test from a phone) are three different origins.
Use `"*"` for `AllowedOrigins` if you also want Vercel preview deployments and LAN testing to upload.
Check it: this must return `200` with an `access-control-allow-origin` header, not `403 CORS not configured`:

```bash
curl -i -X OPTIONS "https://<ACCOUNT_ID>.r2.cloudflarestorage.com/<BUCKET>/x" \
  -H "Origin: https://YOUR-DOMAIN" -H "Access-Control-Request-Method: PUT" -H "Access-Control-Request-Headers: content-type"
```

### 4. Object lifecycle rules (a safety net in case the cron ever fails)

R2 → your bucket → Settings → **Object lifecycle rules**. Add one rule per prefix. **Do not use a single whole-bucket rule**: text shares live up to 7 days and would be deleted early.

| Rule name | Prefix | Delete objects after |
|---|---|---|
| files | `f/` | 2 days |
| shares | `s/` | 8 days |
| codes | `c/` | 8 days |

### 5. Cleanup cron

`vercel.json` already schedules `/api/cron/cleanup` daily. It only runs if `CRON_SECRET` is set (any long random string).
Preview without deleting: `curl -H "Authorization: Bearer $CRON_SECRET" "https://YOUR-DOMAIN/api/cron/cleanup?dry=1"`
(the response includes `freedBytes` and `storedBytes`).
If you are migrating from an older bucket, the cron also purges the old `pastes/` and `codes/` prefixes. A brand-new bucket has none of that.

### 6. Recommended: Upstash Redis (free)

Add the Upstash integration from the Vercel Marketplace (sets `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`).
Without it, rate limits and the daily cap are tracked per serverless instance, which is only best effort.

## Development

```bash
npm install
npm run dev          # needs the R2_* values in .env.local
npm test             # 120 unit + route tests with an in-memory storage fake (no network)
npm run build && npx next start -p 3100
BASE_URL=http://localhost:3100 npm run e2e   # real R2: presign, upload, download, limits
```

`npm run e2e` only creates short-lived data; the cleanup cron removes it.

Design tokens (the "Ivory & Ink" light and "Obsidian & Champagne" dark palettes) live in `app/globals.css`;
fonts are Instrument Serif (display), Geist (UI) and Geist Mono (codes), loaded in `app/layout.tsx`.

## Staying free

- **Vercel Hobby** is for non-commercial use (100 GB transfer, 1M function invocations per month at the time of writing).
  Files never pass through Vercel; only small JSON and redirects do.
- **R2 free tier**: 10 GB-month storage, 1M writes and 10M reads per month, free egress.
- If you add ads or any revenue, Vercel's terms require the Pro plan.
- Hosting arbitrary files means you will get abuse reports. Set `NEXT_PUBLIC_CONTACT_EMAIL`, and have the Privacy and Terms pages (`app/privacy`, `app/terms`) reviewed for your jurisdiction.
