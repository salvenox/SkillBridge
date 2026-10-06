import "server-only";

import type { ApiErrorResponse } from "@/lib/externalApiTypes";

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export function jsonError(status: number, code: string, message: string): Response {
  const body: ApiErrorResponse = { error: { code, message } };
  return Response.json(body, { status });
}

export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("The upstream service returned invalid JSON.");
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function safeUpstreamStatus(status: number): { status: number; code: string; message: string } {
  if (status === 401 || status === 403 || status === 410) {
    return { status: 503, code: "UPSTREAM_AUTH_FAILED", message: "The data provider rejected the configured credentials." };
  }
  if (status === 404) {
    return { status: 502, code: "UPSTREAM_NOT_FOUND", message: "The data provider endpoint or requested resource was not found." };
  }
  if (status === 429) {
    return { status: 429, code: "UPSTREAM_RATE_LIMITED", message: "The data provider is rate limiting requests. Try again shortly." };
  }
  if (status >= 500) {
    return { status: 502, code: "UPSTREAM_UNAVAILABLE", message: "The data provider is temporarily unavailable." };
  }
  return { status: 502, code: "UPSTREAM_REQUEST_FAILED", message: "The data provider could not complete the request." };
}
