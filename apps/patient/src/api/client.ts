import { storage } from "@/src/utils/storage";

const rawBase = (process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8000").trim();
const BASE = rawBase.replace(/\/api\/?$/, "").replace(/\/$/, "");
const TOKEN_KEY = "hd_token";

// ── In-memory token cache ────────────────────────────────────────────────
// Avoids async storage reads on every single API call. The cache is
// invalidated whenever setToken is called (login/logout).
let _cachedToken: string | null | undefined = undefined; // undefined = not yet loaded

export async function setToken(t: string | null): Promise<void> {
  _cachedToken = t;
  if (t) await storage.secureSet(TOKEN_KEY, t);
  else await storage.secureRemove(TOKEN_KEY);
}

export async function getToken(): Promise<string | null> {
  if (_cachedToken !== undefined) return _cachedToken;
  const t = await storage.secureGet(TOKEN_KEY, null as unknown as string);
  _cachedToken = t;
  return t;
}

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

// ── Request timeout helper ───────────────────────────────────────────────
const DEFAULT_TIMEOUT_MS = 15_000;

function fetchWithTimeout(
  url: string,
  opts: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

// ── Core request function ────────────────────────────────────────────────
async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean; retries?: number } = {},
): Promise<T> {
  const { method = "GET", body, auth = true, retries = 1 } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const t = await getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const cleanPath = path.startsWith("/") ? path : "/" + path;
  const url = `${BASE}/api${cleanPath}`;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) {
        const detail =
          (data && (data.detail || data.message)) || `Request failed (${res.status})`;
        throw new ApiError(res.status, detail);
      }
      // Handle wrapped responses from Node.js backend
      if (data && typeof data === "object" && "success" in data) {
        if ("access_token" in data) {
          return data as T;
        }
        const dataKeys = [
          "data", "user", "stats", "plan", "subscription", "appointment", "appointments",
          "queue_view", "queue", "prescription", "prescriptions", "doctors",
          "slots", "reviews", "users", "tickets", "clinics", "labs", "tests",
          "bookings", "reminders", "family", "notifications", "records",
          "transaction", "token_response", "status",
        ];
        for (const key of dataKeys) {
          if (data[key] !== undefined) {
            return data[key] as T;
          }
        }
        return data as T;
      }
      return data as T;
    } catch (e) {
      lastError = e;
      // Don't retry on client errors (4xx) or if we're out of retries
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) throw e;
      if (attempt >= retries) throw e;
      // Exponential backoff: 500ms, 1000ms, etc.
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

export const api = {
  get: <T>(p: string, auth = true) => request<T>(p, { auth }),
  post: <T>(p: string, body?: unknown, auth = true) =>
    request<T>(p, { method: "POST", body, auth }),
  patch: <T>(p: string, body?: unknown, auth = true) =>
    request<T>(p, { method: "PATCH", body, auth }),
  put: <T>(p: string, body?: unknown, auth = true) =>
    request<T>(p, { method: "PUT", body, auth }),
  del: <T>(p: string, auth = true) => request<T>(p, { method: "DELETE", auth }),
};
