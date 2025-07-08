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
    chunks?: Map<number, string>;
    totalChunks?: number;
    uploadProgress?: number;
  }> | undefined;

  var chunkedUploadsGlobal: Map<string, {
    chunks: Map<number, string>;
    totalChunks: number;
    fileName: string;
    fileType: string;
    totalSize: number;
    uploadedChunks: number;
    expiresAt: number;
  }> | undefined;
}

// Use the global object to persist the store between hot reloads in development
const pasteStore = global.pasteStoreGlobal || new Map<string, { 
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
  chunks?: Map<number, string>;
  totalChunks?: number;
  uploadProgress?: number;
}>();

const chunkedUploads = global.chunkedUploadsGlobal || new Map<string, {
  chunks: Map<number, string>;
  totalChunks: number;
  fileName: string;
  fileType: string;
  totalSize: number;
  uploadedChunks: number;
  expiresAt: number;
}>();

if (process.env.NODE_ENV !== 'production') {
  global.pasteStoreGlobal = pasteStore;
  global.chunkedUploadsGlobal = chunkedUploads;
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

// Maximum file size in bytes (500MB) - but will be chunked for upload
export const MAX_FILE_SIZE = 500 * 1024 * 1024

// Maximum total files size in bytes (500MB)
export const MAX_TOTAL_FILES_SIZE = 500 * 1024 * 1024

// Maximum number of files
export const MAX_FILES = 20

// Chunk size for large file uploads (3MB to stay under Vercel's 4.5MB limit with base64 overhead)
export const CHUNK_SIZE = 3 * 1024 * 1024

export function generateCode(): string {
  let code: string
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString()
  } while (pasteStore.has(code))
  return code
}

export function generateUploadId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}

export function cleanExpiredPastes() {
  const now = Date.now()
  for (const [code, paste] of pasteStore.entries()) {
    if (now > paste.expiresAt) {
      pasteStore.delete(code)
    }
  }
  
  // Clean expired chunked uploads
  for (const [uploadId, upload] of chunkedUploads.entries()) {
    if (now > upload.expiresAt) {
      chunkedUploads.delete(uploadId)
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

// Export the stores
export { pasteStore, chunkedUploads } 