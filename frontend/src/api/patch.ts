import { getToken } from "./client";
import { ApiError } from "./client";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL as string;

export async function patch<T>(path: string, body: unknown): Promise<T> {
  const t = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${BASE}/api${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const detail = (data && (data.detail || data.message)) || `Request failed (${res.status})`;
    throw new ApiError(res.status, detail);
  }
  return data as T;
}
