import { devLog } from './devLogger';

export interface GeminiKeyStatus {
  hasKeys: boolean;
  keyCount: number;
  primaryKey: string;
  primarySource: 'localStorage' | 'env' | 'none';
  fallbackCount: number;
  maskedKeys: { label: string; masked: string; source: string }[];
}

const STORAGE_PRIMARY_KEY = 'powerforecast_gemini_api_key';
const STORAGE_FALLBACK_KEY = 'powerforecast_gemini_fallback_keys';

/**
 * Clean & validate API key string
 */
function cleanKey(val?: string | null): string {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim().replace(/^["']|["']$/g, '');
  if (!trimmed || trimmed === 'your_gemini_api_key_here' || trimmed.length < 10) return '';
  return trimmed;
}

/**
 * Mask key for safe UI presentation (e.g. AIzaSy...9xyz)
 */
export function maskGeminiKey(key: string): string {
  if (!key || key.length < 8) return '****';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

/**
 * Returns an ordered pool of available Gemini API keys.
 * Priority:
 * 1. User LocalStorage Primary Override
 * 2. Environment Primary Key (VITE_GEMINI_API_KEY or GEMINI_API_KEY)
 * 3. User LocalStorage Fallback Keys
 * 4. Environment Secondary / Fallback Keys (GEMINI_API_KEY_2, VITE_GEMINI_API_KEY_2, etc.)
 */
export function getGeminiApiKeyPool(): string[] {
  const keys: string[] = [];

  const addKey = (raw?: string | null) => {
    if (!raw) return;
    if (raw.includes(',') || raw.includes(';') || raw.includes('\n')) {
      const parts = raw.split(/[,;\n\r]+/);
      for (const p of parts) addKey(p);
      return;
    }
    const clean = cleanKey(raw);
    if (clean && !keys.includes(clean)) {
      keys.push(clean);
    }
  };

  // 1. Primary: Browser Local Storage Override
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      addKey(localStorage.getItem(STORAGE_PRIMARY_KEY));
    } catch {
      // Ignore storage errors
    }
  }

  // 2. Primary: Vite / Vercel Environment Variables
  const env = (import.meta as any).env || {};
  addKey(env.VITE_GEMINI_API_KEY);
  addKey(env.GEMINI_API_KEY);

  // 3. Fallbacks: Browser Local Storage Fallback Pool
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const storedFallbacks = localStorage.getItem(STORAGE_FALLBACK_KEY);
      if (storedFallbacks) {
        try {
          const parsed = JSON.parse(storedFallbacks);
          if (Array.isArray(parsed)) {
            parsed.forEach((k) => addKey(k));
          } else {
            addKey(storedFallbacks);
          }
        } catch {
          addKey(storedFallbacks);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  // 4. Fallbacks: Environment Backup Keys
  addKey(env.VITE_GEMINI_API_KEY_2);
  addKey(env.GEMINI_API_KEY_2);
  addKey(env.VITE_GEMINI_API_KEY_3);
  addKey(env.GEMINI_API_KEY_3);
  addKey(env.VITE_GEMINI_API_KEY_4);
  addKey(env.GEMINI_API_KEY_4);
  addKey(env.VITE_GEMINI_API_KEY_FALLBACK);
  addKey(env.GEMINI_API_KEY_FALLBACK);
  addKey(env.GEMINI_API_KEYS);

  return keys;
}

/**
 * Returns real-time status of Gemini keys configured in the client
 */
export function getGeminiKeyStatus(): GeminiKeyStatus {
  const pool = getGeminiApiKeyPool();
  const env = (import.meta as any).env || {};

  let primaryKey = '';
  let primarySource: 'localStorage' | 'env' | 'none' = 'none';

  const storedPrimary = cleanKey(typeof window !== 'undefined' ? localStorage?.getItem(STORAGE_PRIMARY_KEY) : null);
  const envPrimary = cleanKey(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY);

  if (storedPrimary) {
    primaryKey = storedPrimary;
    primarySource = 'localStorage';
  } else if (envPrimary) {
    primaryKey = envPrimary;
    primarySource = 'env';
  } else if (pool.length > 0) {
    primaryKey = pool[0];
    primarySource = 'env';
  }

  const maskedKeys = pool.map((k, idx) => ({
    label: idx === 0 ? 'Primary Key' : `Fallback Key #${idx}`,
    masked: maskGeminiKey(k),
    source: k === storedPrimary ? 'Browser Storage' : 'Environment / Config',
  }));

  return {
    hasKeys: pool.length > 0,
    keyCount: pool.length,
    primaryKey,
    primarySource,
    fallbackCount: Math.max(0, pool.length - 1),
    maskedKeys,
  };
}

/**
 * Saves primary & fallback keys to browser localStorage and notifies listeners
 */
export function saveGeminiApiKeys(primary: string, fallbacks: string[] = []): void {
  if (typeof window === 'undefined') return;

  const cleanPrimary = cleanKey(primary);
  if (cleanPrimary) {
    localStorage.setItem(STORAGE_PRIMARY_KEY, cleanPrimary);
  } else {
    localStorage.removeItem(STORAGE_PRIMARY_KEY);
  }

  const cleanFallbacks = fallbacks.map(cleanKey).filter(Boolean);
  if (cleanFallbacks.length > 0) {
    localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify(cleanFallbacks));
  } else {
    localStorage.removeItem(STORAGE_FALLBACK_KEY);
  }

  window.dispatchEvent(new Event('powerforecast_gemini_keys_changed'));
}

/**
 * Test connectivity for a given Gemini API Key
 */
export async function testGeminiApiKey(key: string, model: string = 'gemini-2.5-flash'): Promise<{ success: boolean; message: string }> {
  const clean = cleanKey(key);
  if (!clean) return { success: false, message: 'API key is empty or invalid format.' };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${clean}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with OK' }] }],
        generationConfig: { maxOutputTokens: 5 },
      }),
    });

    if (res.ok) {
      return { success: true, message: `Connected successfully with ${model}!` };
    }

    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || `HTTP ${res.status}`;
    return { success: false, message: msg };
  } catch (err: any) {
    return { success: false, message: err.message || 'Network request failed' };
  }
}

/**
 * Executes a Gemini request with automatic multi-key rotation and multi-model cascade.
 * If Key 1 throws 429 (ResourceExhausted / Rate Limit), 403 (Invalid/Quota), or 400 (API_KEY_INVALID),
 * it immediately switches to Key 2, Key 3, etc.
 */
export async function executeWithGeminiKeyRotation<T>(
  operation: (apiKey: string, model: string) => Promise<T>,
  options?: {
    preferredModels?: string[];
    callerName?: string;
  }
): Promise<{ result: T; keyUsed: string; modelUsed: string }> {
  const keyPool = getGeminiApiKeyPool();
  const caller = options?.callerName || 'Gemini AI';

  if (keyPool.length === 0) {
    throw new Error(
      'Gemini API key is required. Please set GEMINI_API_KEY in Vercel / .env or configure a key in the settings.'
    );
  }

  const models = options?.preferredModels || [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ];

  let lastError: any = null;

  // Outer loop: Try each API key in the pool (Primary -> Fallback 1 -> Fallback 2)
  for (let keyIdx = 0; keyIdx < keyPool.length; keyIdx++) {
    const currentKey = keyPool[keyIdx];
    const keyLabel = keyIdx === 0 ? 'Primary Key' : `Fallback Key #${keyIdx}`;

    // Inner loop: Try prioritized models for this key
    for (const currentModel of models) {
      try {
        devLog.info(caller, `Attempting query with ${keyLabel} [${maskGeminiKey(currentKey)}] on model [${currentModel}]`);

        const result = await operation(currentKey, currentModel);

        devLog.success(caller, `Query successful using ${keyLabel} on [${currentModel}]`);
        return {
          result,
          keyUsed: currentKey,
          modelUsed: currentModel,
        };
      } catch (err: any) {
        lastError = err;
        const msg = (err.message || '').toLowerCase();
        const isQuotaOrRateLimit =
          msg.includes('429') ||
          msg.includes('resource_exhausted') ||
          msg.includes('quota') ||
          msg.includes('rate limit');
        const isKeyInvalid =
          msg.includes('403') ||
          msg.includes('400') ||
          msg.includes('api_key_invalid') ||
          msg.includes('forbidden') ||
          msg.includes('unregistered');

        if (isQuotaOrRateLimit || isKeyInvalid) {
          devLog.warn(
            caller,
            `${keyLabel} failed (${err.message}). Quota or key issue detected. Rotating to next key in pool...`
          );
          // Break out of model loop for this key, switch to NEXT key immediately!
          break;
        }

        // If it's a 404 model not found or temporary model error, try next model with same key
        devLog.warn(caller, `Model [${currentModel}] failed: ${err.message}. Trying next model...`);
      }
    }
  }

  const keyCountNotice = keyPool.length > 1 ? `across ${keyPool.length} configured keys` : 'with the configured key';
  throw new Error(
    `All Gemini API attempts failed ${keyCountNotice}: ${lastError?.message || 'Unknown error'}. Please verify your API key or configure a fallback key.`
  );
}
