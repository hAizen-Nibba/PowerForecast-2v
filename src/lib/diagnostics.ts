import { SUPABASE_URL } from "./supabaseClient";

export type ErrorCategory =
  | "rate_limit"
  | "network"
  | "credentials"
  | "unconfirmed"
  | "storage"
  | "clock"
  | "unknown";

export interface DiagnosticReport {
  timestamp: string;
  isOnline: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWebView: boolean;
  userAgent: string;
  storage: {
    localStorageAvailable: boolean;
    sessionStorageAvailable: boolean;
    error?: string;
  };
  supabase: {
    reachable: boolean;
    latencyMs: number;
    httpStatus?: number;
    error?: string;
  };
  clock: {
    deviceTime: string;
    serverTime?: string;
    driftSeconds?: number;
    hasClockDrift: boolean;
  };
  errorAnalysis?: {
    name?: string;
    message?: string;
    status?: number;
    code?: string;
    category: ErrorCategory;
    friendlyExplanation: string;
    suggestedFix: string;
  };
  rawError?: any;
}

/**
 * Safely tests if localStorage is readable and writable
 */
export function testLocalStorage(): { ok: boolean; error?: string } {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return { ok: false, error: "localStorage is undefined in this environment." };
    }
    const testKey = "__powerforecast_storage_test__";
    window.localStorage.setItem(testKey, "test");
    const retrieved = window.localStorage.getItem(testKey);
    window.localStorage.removeItem(testKey);
    if (retrieved !== "test") {
      return { ok: false, error: "localStorage readback mismatch." };
    }
    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || "Storage access restricted (Private Browsing or In-App WebView).",
    };
  }
}

/**
 * Safely tests if sessionStorage is available
 */
export function testSessionStorage(): { ok: boolean; error?: string } {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return { ok: false, error: "sessionStorage is undefined." };
    }
    const testKey = "__powerforecast_session_test__";
    window.sessionStorage.setItem(testKey, "test");
    window.sessionStorage.removeItem(testKey);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "sessionStorage access restricted." };
  }
}

/**
 * Detects whether the current browser is an in-app webview (FB, IG, Messenger, TikTok, etc.)
 */
export function detectInAppWebView(ua: string): boolean {
  return /FBAN|FBAV|Instagram|Line|Twitter|MicroMessenger|Snapchat|musical_ly|BytedanceWebview/i.test(ua);
}

/**
 * Runs a complete diagnostic sweep for authentication, connectivity, and device storage
 */
export async function runAuthDiagnostics(rawError?: any): Promise<DiagnosticReport> {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isWebView = detectInAppWebView(ua);
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  // 1. Storage checks
  const lsCheck = testLocalStorage();
  const ssCheck = testSessionStorage();

  // 2. Supabase Reachability & Server Time (Clock Drift) Check
  let supabaseReachable = false;
  let latencyMs = 0;
  let httpStatus: number | undefined = undefined;
  let supabaseError: string | undefined = undefined;
  let serverDateStr: string | undefined = undefined;
  let driftSeconds: number | undefined = undefined;
  let hasClockDrift = false;

  const startPing = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const pingRes = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      method: "GET",
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_gfiWW-NqpccAsARI5pO4Kg_qzOTY6Az",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    latencyMs = Math.round(performance.now() - startPing);
    httpStatus = pingRes.status;
    supabaseReachable = pingRes.ok || pingRes.status < 500;

    // Check server Date header for clock drift
    const dateHeader = pingRes.headers.get("date");
    if (dateHeader) {
      serverDateStr = dateHeader;
      const serverTimeMs = new Date(dateHeader).getTime();
      const deviceTimeMs = Date.now();
      driftSeconds = Math.round(Math.abs(deviceTimeMs - serverTimeMs) / 1000);
      if (driftSeconds > 120) {
        hasClockDrift = true;
      }
    }
  } catch (pingErr: any) {
    latencyMs = Math.round(performance.now() - startPing);
    supabaseError = pingErr?.name === "AbortError"
      ? "Connection to Supabase timed out after 6 seconds."
      : pingErr?.message || "Failed to reach Supabase server.";
  }

  // 3. Error Analysis
  let category: ErrorCategory = "unknown";
  let friendlyExplanation = "An unspecified authentication issue occurred.";
  let suggestedFix = "Please check your network connection and try again.";

  const errStr = (rawError?.message || rawError?.error_description || String(rawError || "")).toLowerCase();
  const status = rawError?.status || rawError?.statusCode || httpStatus;
  const code = rawError?.code || rawError?.name;

  if (hasClockDrift) {
    category = "clock";
    friendlyExplanation = `Device clock is desynchronized by ~${driftSeconds} seconds from the server.`;
    suggestedFix = "Set your mobile phone clock to 'Set Automatically' in your device settings.";
  } else if (!isOnline || supabaseError?.includes("timed out") || errStr.includes("failed to fetch") || errStr.includes("networkerror")) {
    category = "network";
    friendlyExplanation = "Cannot establish a reliable network connection to Supabase.";
    suggestedFix = "Check if your Wi-Fi or Mobile Data is active. If on cellular data, toggle Airplane Mode off and on.";
  } else if (status === 429 || errStr.includes("rate limit") || errStr.includes("too many requests")) {
    category = "rate_limit";
    friendlyExplanation = "Mobile Carrier IP Rate Limit exceeded (Supabase throttled requests from this shared IP).";
    suggestedFix = "Switch from Mobile Data to Wi-Fi, or wait 2-5 minutes before attempting to sign in again.";
  } else if (errStr.includes("email not confirmed") || errStr.includes("unconfirmed")) {
    category = "unconfirmed";
    friendlyExplanation = "This account requires email confirmation before you can sign in.";
    suggestedFix = "Check your email inbox and spam folder for the confirmation link sent by PowerForecast.";
  } else if (!lsCheck.ok) {
    category = "storage";
    friendlyExplanation = "Browser storage (localStorage) is blocked or running in a restricted sandbox.";
    suggestedFix = isWebView
      ? "You are inside an In-App browser. Tap the three dots (...) and choose 'Open in Safari' or 'Open in Chrome'."
      : "Turn off Private Browsing / Incognito mode in your browser.";
  } else if (errStr.includes("invalid login credentials") || errStr.includes("invalid credentials")) {
    category = "credentials";
    friendlyExplanation = "Incorrect email address or password entered.";
    suggestedFix = "Verify that the first letter was not auto-capitalized by your mobile keyboard, or use 'Forgot Password'.";
  } else if (errStr.includes("user not found") || errStr.includes("no account found")) {
    category = "credentials";
    friendlyExplanation = "No account found matching this email address.";
    suggestedFix = "Verify the spelling of your email address or click 'Sign Up' to create a new account.";
  }

  return {
    timestamp: new Date().toISOString(),
    isOnline,
    isMobile,
    isIOS,
    isAndroid,
    isWebView,
    userAgent: ua,
    storage: {
      localStorageAvailable: lsCheck.ok,
      sessionStorageAvailable: ssCheck.ok,
      error: lsCheck.error,
    },
    supabase: {
      reachable: supabaseReachable,
      latencyMs,
      httpStatus,
      error: supabaseError,
    },
    clock: {
      deviceTime: new Date().toISOString(),
      serverTime: serverDateStr,
      driftSeconds,
      hasClockDrift,
    },
    errorAnalysis: {
      name: rawError?.name,
      message: rawError?.message || rawError?.error_description,
      status,
      code,
      category,
      friendlyExplanation,
      suggestedFix,
    },
    rawError: rawError ? (typeof rawError === "object" ? { ...rawError, message: rawError?.message, stack: rawError?.stack } : rawError) : undefined,
  };
}
