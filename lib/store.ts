// Define a global type for our store
declare global {
  var pasteStoreGlobal: Map<string, { 
    content: string; 
    createdAt: number;
    fileName?: string;
    fileType?: string;
    isFile?: boolean;
    files?: Array<{
      name: string;
      type: string;
      content: string;
    }>;
    isMultiFile?: boolean;
  }> | undefined;
}

// Use the global object to persist the store between hot reloads in development
const pasteStore = global.pasteStoreGlobal || new Map<string, { 
  content: string; 
  createdAt: number;
  fileName?: string;
  fileType?: string;
  isFile?: boolean;
  files?: Array<{
    name: string;
    type: string;
    content: string;
  }>;
  isMultiFile?: boolean;
}>();

if (process.env.NODE_ENV !== 'production') {
  global.pasteStoreGlobal = pasteStore;
}

// TTL in milliseconds (default 30 minutes)
export const TTL_MS = Number.parseInt(process.env.PASTE_TTL_SECONDS || "1800") * 1000

// Maximum file size in bytes (5MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024

// Maximum total files size in bytes (20MB)
export const MAX_TOTAL_FILES_SIZE = 20 * 1024 * 1024

// Maximum number of files
export const MAX_FILES = 5

export function generateCode(): string {
  let code: string
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString()
  } while (pasteStore.has(code))
  return code
}

export function cleanExpiredPastes() {
  const now = Date.now()
  for (const [code, paste] of pasteStore.entries()) {
    if (now - paste.createdAt > TTL_MS) {
      pasteStore.delete(code)
    }
  }
}

// Export the store
export { pasteStore } 