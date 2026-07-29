import { storage } from "@/src/utils/storage";

const rawBase = (process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8002").trim();
const BASE = rawBase.replace(/\/api\/?$/, "").replace(/\/$/, "");
const TOKEN_KEY = "hd_token";

export async function setToken(t: string | null): Promise<void> {
  if (t) await storage.secureSet(TOKEN_KEY, t);
  else await storage.secureRemove(TOKEN_KEY);
}

export async function getToken(): Promise<string | null> {
  return storage.secureGet(TOKEN_KEY, null as unknown as string);
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

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const t = await getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  const res = await fetch(`${BASE}/api${cleanPath}`, {
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
    // Try to extract the actual data from common property names
    const dataKeys = ["data", "stats", "plan", "subscription", "appointment", "appointments", "queue_view", "queue", "prescription", "prescriptions", "doctors", "slots", "reviews", "users", "tickets", "clinics", "labs", "tests", "bookings", "reminders", "family", "notifications", "records"];



    for (const key of dataKeys) {
      if (data[key] !== undefined) {
        return data[key] as T;
      }
    }
    // If no known key found, return the whole object
    return data as T;
  }
  return data as T;
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
