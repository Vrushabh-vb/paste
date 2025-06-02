import { kv } from '@vercel/kv';

// Define a global type for our store (for development mode)
declare global {
  var pasteStoreGlobal: Map<string, { content: string; createdAt: number }> | undefined;
}

// Use the global object to persist the store between hot reloads in development
const inMemoryStore = global.pasteStoreGlobal || new Map<string, { content: string; createdAt: number }>();
if (process.env.NODE_ENV !== 'production') {
  global.pasteStoreGlobal = inMemoryStore;
}

// TTL in milliseconds (default 30 minutes)
export const TTL_MS = Number.parseInt(process.env.PASTE_TTL_SECONDS || "1800") * 1000;
const TTL_SECONDS = Math.floor(TTL_MS / 1000);

// Store interface
export interface PasteStore {
  get(code: string): Promise<{ content: string; createdAt: number } | undefined>;
  set(code: string, data: { content: string; createdAt: number }): Promise<void>;
  has(code: string): Promise<boolean>;
  delete(code: string): Promise<void>;
}

// In-memory store implementation
const inMemoryStoreImpl: PasteStore = {
  async get(code: string) {
    return inMemoryStore.get(code);
  },
  async set(code: string, data: { content: string; createdAt: number }) {
    inMemoryStore.set(code, data);
  },
  async has(code: string) {
    return inMemoryStore.has(code);
  },
  async delete(code: string) {
    inMemoryStore.delete(code);
  }
};

// Vercel KV store implementation
const kvStoreImpl: PasteStore = {
  async get(code: string) {
    return await kv.get<{ content: string; createdAt: number }>(code);
  },
  async set(code: string, data: { content: string; createdAt: number }) {
    await kv.set(code, data, { ex: TTL_SECONDS }); // Set with expiration
  },
  async has(code: string) {
    return (await kv.exists(code)) > 0;
  },
  async delete(code: string) {
    await kv.del(code);
  }
};

// Choose the appropriate store implementation based on environment
export const pasteStore: PasteStore = 
  process.env.NODE_ENV === 'production' ? kvStoreImpl : inMemoryStoreImpl;

export async function generateCode(): Promise<string> {
  let code: string;
  let attempts = 0;
  const maxAttempts = 10;
  
  try {
    do {
      code = Math.floor(1000 + Math.random() * 9000).toString();
      attempts++;
      
      if (attempts > maxAttempts) {
        throw new Error("Failed to generate a unique code after multiple attempts");
      }
      
      const exists = await pasteStore.has(code);
      if (!exists) break;
    } while (true);
    
    return code;
  } catch (error) {
    console.error("Error generating code:", error);
    // Fallback to a timestamp-based code if KV has issues
    return `${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;
  }
}

export async function cleanExpiredPastes(): Promise<void> {
  // In production with Vercel KV, expiration is handled automatically
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  
  // Only needed for in-memory store
  const now = Date.now();
  for (const [code, paste] of inMemoryStore.entries()) {
    if (now - paste.createdAt > TTL_MS) {
      inMemoryStore.delete(code);
    }
  }
} 