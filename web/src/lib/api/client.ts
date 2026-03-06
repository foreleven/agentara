import type { AppType } from "agentara";
import { hc } from "hono/client";

const BASE_URL = "/api";

export const api = hc<AppType>("/").api;

/**
 * Typed fetch wrapper for the Agentara backend API.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}
