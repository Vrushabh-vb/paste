// Define a global type for our store
declare global {
  var pasteStoreGlobal: Map<string, { content: string; createdAt: number }> | undefined;
}

// Use the global object to persist the store between hot reloads in development
const pasteStore = global.pasteStoreGlobal || new Map<string, { content: string; createdAt: number }>();
if (process.env.NODE_ENV !== 'production') {
  global.pasteStoreGlobal = pasteStore;
}

// TTL in milliseconds (default 30 minutes)
export const TTL_MS = Number.parseInt(process.env.PASTE_TTL_SECONDS || "1800") * 1000

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