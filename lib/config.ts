// Limits and policy shared by the browser and the API routes.
// Everything that decides "how much free storage can one person use" lives here.

export const MB = 1024 * 1024

// ─── Files ────────────────────────────────────────────────
export const MAX_FILES = 10
export const MAX_FILE_SIZE = 100 * MB          // per file
export const MAX_TOTAL_FILES_SIZE = 500 * MB   // per share
export const MAX_FILENAME_LENGTH = 200

// ─── Text ─────────────────────────────────────────────────
// Text travels through a Vercel function (4.5MB body cap), so keep a safe margin.
export const MAX_TEXT_BYTES = 1 * MB

// ─── Expiry ───────────────────────────────────────────────
export const EXPIRATION_OPTIONS: Record<string, number> = {
  '5min': 5 * 60,
  '30min': 30 * 60,
  '1hour': 60 * 60,
  '6hours': 6 * 60 * 60,
  '12hours': 12 * 60 * 60,
  '1day': 24 * 60 * 60,
  '3days': 3 * 24 * 60 * 60,
  '7days': 7 * 24 * 60 * 60,
}

export const EXPIRATION_LABELS: Record<string, string> = {
  '5min': '5 Minutes', '30min': '30 Minutes', '1hour': '1 Hour',
  '6hours': '6 Hours', '12hours': '12 Hours', '1day': '1 Day',
  '3days': '3 Days', '7days': '7 Days',
}

export const DEFAULT_EXPIRATION = '30min'
export const DEFAULT_TTL_SECONDS = EXPIRATION_OPTIONS[DEFAULT_EXPIRATION]

// Files cost real storage, text is tiny: files live at most a day, text up to a week.
export const MAX_FILE_TTL_SECONDS = 24 * 60 * 60
export const MAX_TEXT_TTL_SECONDS = 7 * 24 * 60 * 60

// ─── Codes and ids ────────────────────────────────────────
// 6 digits = 900k combinations. 4 digits (9k) could be brute-forced in minutes.
export const CODE_LENGTH = 6
export const ID_LENGTH = 12
// No 0/1/i/l/o: easier to read aloud and type from another screen. Generator and validator share this.
export const ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
export const CODE_REGEX = new RegExp(`^\\d{${CODE_LENGTH}}$`)
export const ID_REGEX = new RegExp(`^[${ID_ALPHABET}]{${ID_LENGTH}}$`)

// ─── Storage layout (R2 keys) ─────────────────────────────
export const PREFIX_SHARE = 's/'     // s/{id}.json    share manifest
export const PREFIX_FILE = 'f/'      // f/{uploadId}/… uploaded file bytes
export const PREFIX_CODE = 'c/'      // c/{code}       code → id
// Pre-v2 layout. Only read by the cleanup job so old data is finally removed.
export const LEGACY_PREFIXES = ['pastes/', 'codes/']

// Physical retention: objects older than this are deleted by the cleanup cron.
// (Logical expiry is enforced on every read; this just reclaims the space.)
export const FILE_RETENTION_MS = MAX_FILE_TTL_SECONDS * 1000 + 60 * 60 * 1000
export const SHARE_RETENTION_MS = MAX_TEXT_TTL_SECONDS * 1000 + 60 * 60 * 1000

// ─── Previews ─────────────────────────────────────────────
// Only these are ever served inline; everything else is forced to download.
// (No svg / html / pdf: they can carry script.)
export const INLINE_PREVIEW_TYPES: Record<string, 'image' | 'video' | 'audio'> = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/avif': 'image',
  'image/bmp': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/ogg': 'video',
  'audio/mpeg': 'audio',
  'audio/ogg': 'audio',
  'audio/wav': 'audio',
  'audio/webm': 'audio',
  'audio/aac': 'audio',
  'audio/mp4': 'audio',
}

export function previewKind(contentType: string | undefined): 'image' | 'video' | 'audio' | null {
  if (!contentType) return null
  return INLINE_PREVIEW_TYPES[contentType.toLowerCase().split(';')[0].trim()] ?? null
}

// ─── Abuse limits (per IP unless noted) ───────────────────
export const RATE_LIMITS = {
  upload: { limit: 60, windowSeconds: 60 * 60 },       // presign requests per hour
  create: { limit: 60, windowSeconds: 60 * 60 },       // shares created per hour
  lookupCode: { limit: 20, windowSeconds: 60 },        // guessing codes is the attack
  lookupId: { limit: 120, windowSeconds: 60 },
  file: { limit: 300, windowSeconds: 60 },             // video seeking re-requests a lot
  edit: { limit: 30, windowSeconds: 60 },
} as const

// Global circuit breaker: total bytes presigned per UTC day.
// Free-tier math: files expire after 24h but the cleanup cron runs once a day, so at worst two days of uploads
// are on disk at once. 2 x 3 GB = 6 GB, leaving ~4 GB of headroom under R2's free 10 GB for text and manifests.
export const DEFAULT_DAILY_UPLOAD_CAP_BYTES = 3 * 1024 * MB

// Cloudflare R2 free storage. The cleanup job warns once stored data passes WARN_FRACTION of it.
export const R2_FREE_TIER_BYTES = 10 * 1024 * MB
export const STORAGE_WARN_FRACTION = 0.8
