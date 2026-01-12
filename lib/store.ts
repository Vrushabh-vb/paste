// Define a global type for our store
declare global {
  var pasteStoreGlobal: Map<string, {
    content: string;
    createdAt: number;
    expiresAt: number;
    fileName?: string;
    fileType?: string;
    isFile?: boolean;
    files?: Array<{
      name: string;
      type: string;
      content: string;
    }>;
    isMultiFile?: boolean;
    allowEditing?: boolean;
    downloadCount?: number;
  }> | undefined;
}

// Use the global object to persist the store between hot reloads in development
const pasteStore = globalThis.pasteStoreGlobal || new Map<string, {
  content: string;
  createdAt: number;
  expiresAt: number;
  fileName?: string;
  fileType?: string;
  isFile?: boolean;
  files?: Array<{
    name: string;
    type: string;
    content: string;
  }>;
  isMultiFile?: boolean;
  allowEditing?: boolean;
  downloadCount?: number;
}>();

if (process.env.NODE_ENV !== 'production') {
  globalThis.pasteStoreGlobal = pasteStore;
}

// Expiration options in milliseconds
export const EXPIRATION_OPTIONS = {
  '5min': 5 * 60 * 1000,
  '30min': 30 * 60 * 1000,
  '1hour': 60 * 60 * 1000,
  '6hours': 6 * 60 * 60 * 1000,
  '12hours': 12 * 60 * 60 * 1000,
  '1day': 24 * 60 * 60 * 1000,
  '3days': 3 * 24 * 60 * 60 * 1000,
  '7days': 7 * 24 * 60 * 60 * 1000,
  '30days': 30 * 24 * 60 * 60 * 1000
}

// Default TTL in milliseconds (30 minutes)
export const DEFAULT_TTL_MS = EXPIRATION_OPTIONS['30min']

// Maximum file size in bytes (500MB)
export const MAX_FILE_SIZE = 500 * 1024 * 1024

// Maximum total files size in bytes (500MB)
export const MAX_TOTAL_FILES_SIZE = 500 * 1024 * 1024

// Maximum number of files
export const MAX_FILES = 20

export function generateCode(): string {
  let code: string
  do {
    code = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  } while (pasteStore.has(code))
  return code
}

export function cleanExpiredPastes() {
  const now = Date.now()
  for (const [code, paste] of pasteStore.entries()) {
    if (now > paste.expiresAt) {
      pasteStore.delete(code)
    }
  }
}

export function formatExpirationTime(ms: number): string {
  const minutes = Math.floor(ms / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`
  } else {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
  }
}

// Export the store
export { pasteStore } 