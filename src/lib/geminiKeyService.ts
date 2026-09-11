import { devLog } from './devLogger';

/**
 * SECURITY ENFORCEMENT:
 * Immediately wipe any previously stored API keys from client localStorage.
 * Credentials must NEVER be stored or exposed on the client browser.
 */
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    localStorage.removeItem('powerforecast_gemini_api_key');
    localStorage.removeItem('powerforecast_gemini_fallback_keys');
    localStorage.removeItem('powerforecast_gemini_api_keys');
  } catch {
    // Ignore storage access errors
  }
}

/**
 * Clean & validate key format internally
 */
function cleanKey(val?: string | null): string {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim().replace(/^["']|["']$/g, '');
  if (!trimmed || trimmed === 'your_gemini_api_key_here' || trimmed.length < 10) return '';
  return trimmed;
}

/**
 * Returns build-time developer fallback keys if explicitly defined with VITE_ prefix.
 * Production deployments use Vercel Serverless /api/analyze where keys stay 100% server-side.
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

  const env = (import.meta as any).env || {};
  addKey(env.VITE_GEMINI_API_KEY);
  addKey(env.VITE_GEMINI_API_KEY_2);
  addKey(env.VITE_GEMINI_API_KEY_3);
  addKey(env.VITE_GEMINI_API_KEY_FALLBACK);

  return keys;
}

export interface ExecuteRotationOptions {
  callerName?: string;
  preferredModels?: string[];
  maxRetriesPerKey?: number;
}

/**
 * Executes a Gemini request with automatic multi-key rotation and multi-model cascade.
 * Raw keys are never stored, logged in full, or surfaced to user-facing UI.
 */
export async function executeWithGeminiKeyRotation<T>(
  requestFn: (activeKey: string, activeModel: string) => Promise<T>,
  options: ExecuteRotationOptions = {}
): Promise<{ result: T; usedKeyIndex: number; usedModel: string }> {
  const caller = options.callerName || 'GeminiAI';
  const models = options.preferredModels && options.preferredModels.length > 0
    ? options.preferredModels
    : ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

  const keys = getGeminiApiKeyPool();

  if (keys.length === 0) {
    throw new Error(
      `No Gemini API key available on client. Serverless /api/analyze is used on production where keys remain secure in Vercel environment variables.`
    );
  }

  let lastError: Error | null = null;

  for (let keyIdx = 0; keyIdx < keys.length; keyIdx++) {
    const currentKey = keys[keyIdx];

    for (const currentModel of models) {
      try {
        const result = await requestFn(currentKey, currentModel);
        return { result, usedKeyIndex: keyIdx, usedModel: currentModel };
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        lastError = err instanceof Error ? err : new Error(errMsg);

        const isQuotaExhausted =
          errMsg.includes('429') ||
          errMsg.toLowerCase().includes('quota') ||
          errMsg.toLowerCase().includes('resource has been exhausted') ||
          errMsg.toLowerCase().includes('rate limit');

        const isAuthError =
          errMsg.includes('403') ||
          errMsg.includes('400') ||
          errMsg.toLowerCase().includes('api_key_invalid') ||
          errMsg.toLowerCase().includes('key not valid');

        if (isQuotaExhausted || isAuthError) {
          devLog.warn(
            caller,
            `Key #${keyIdx + 1} rejected (${isQuotaExhausted ? 'Quota/Rate-Limit' : 'Auth error'}). Rotating to next key in pool...`
          );
          break; // Break inner model loop to rotate to the next key
        }
      }
    }
  }

  throw lastError || new Error(`All ${keys.length} Gemini API keys exhausted.`);
}
