// Shared fetch primitive and ApiError class. Every consumer's
// per-endpoint wrapper funnels through `request()` below so that
// credential handling, JSON parsing, and error translation live in
// exactly one place.
//
// The client is React-agnostic and zero-runtime-dep — only native
// `fetch`, `URLSearchParams`, and `Response` are used.

import type { ErrorResponse } from "../types/api.js";

export interface RequestOptions {
  /** Optional absolute base URL. Empty / undefined means same-origin. */
  baseUrl?: string;
  /** Bearer token (`Authorization: Bearer <apiKey>`). */
  apiKey?: string | null;
  /** Active org — emitted as `X-Verity-Org`. */
  activeOrg?: string | null;
  /** AbortController signal forwarded to fetch. */
  signal?: AbortSignal;
  /**
   * Whether to send credentials (cookies). Cloud enables this for the
   * session-cookie flow; local/extension leave it default.
   */
  credentials?: RequestCredentials;
  /** Override fetch implementation — primarily for tests. */
  fetchImpl?: typeof fetch;
  /** Extra headers merged on top of defaults. */
  headers?: Record<string, string>;
}

export interface RequestInitExtras {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * ApiError wraps any non-2xx response. `VerityApiError` is an alias kept
 * for backward compatibility with the extension's pre-shared-client
 * symbol name.
 *
 * Two constructor forms are supported so the three consumers' pre-
 * migration call shapes keep compiling:
 *   new ApiError(status, { code, message, details, error })   // cloud + extension
 *   new ApiError(status, code, message, details?)              // local
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    bodyOrCode: (Partial<ErrorResponse> & { error?: string }) | string,
    message?: string,
    details?: unknown,
  ) {
    let resolvedCode: string;
    let resolvedMessage: string;
    let resolvedDetails: unknown;
    if (typeof bodyOrCode === "string") {
      resolvedCode = bodyOrCode || "unknown";
      resolvedMessage = message ?? `HTTP ${status}`;
      resolvedDetails = details;
    } else {
      const body = bodyOrCode ?? {};
      resolvedCode = body.code ?? "unknown";
      resolvedMessage = body.message ?? body.error ?? `HTTP ${status}`;
      resolvedDetails = body.details;
    }
    super(resolvedMessage);
    this.name = "ApiError";
    this.status = status;
    this.code = resolvedCode;
    this.details = resolvedDetails;
  }
}

/**
 * Backwards-compat subclass. The Chrome extension previously exported
 * `VerityApiError`; keeping the symbol — including `err.name === "VerityApiError"`
 * — avoids touching ~30 test / call-site lines during the migration.
 * Subclassing (instead of simply aliasing) so `instanceof ApiError`
 * still matches is intentional.
 */
export class VerityApiError extends ApiError {
  constructor(
    status: number,
    bodyOrCode: (Partial<ErrorResponse> & { error?: string }) | string,
    message?: string,
    details?: unknown,
  ) {
    super(status, bodyOrCode, message, details);
    this.name = "VerityApiError";
  }
}

/** Join a path to a base URL without introducing double-slashes. */
export function joinUrl(base: string | undefined | null, path: string): string {
  const b = (base ?? "").replace(/\/+$/, "");
  if (!b) return path;
  return `${b}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Build a URL including query string. Undefined/null values are dropped. */
export function buildUrl(
  path: string,
  query?: RequestInitExtras["query"],
  baseUrl?: string,
): string {
  const full = joinUrl(baseUrl, path);
  if (!query) return full;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${full}?${qs}` : full;
}

/**
 * Encode the three-way auth dance (session cookie implicit via
 * `credentials`, bearer via `opts.apiKey`, org header via
 * `opts.activeOrg`). The return value is a plain object so callers that
 * don't use `fetch` (e.g. tests that inspect headers) can read it.
 *
 * V1-2 dual-send: the canonical org header is `X-Veritize-Org`; the
 * legacy `X-Verity-Org` is also emitted with the same value for the
 * 30-day transition window ending 2026-05-23. At V6-1 drop the legacy
 * assignment.
 */
export function buildHeaders(opts: RequestOptions = {}): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const key = opts.apiKey;
  if (key && key.trim().length > 0) {
    headers.Authorization = `Bearer ${key.trim()}`;
  }
  const org = opts.activeOrg;
  if (org && org.trim().length > 0) {
    const orgVal = org.trim();
    headers["X-Veritize-Org"] = orgVal;
    headers["X-Verity-Org"] = orgVal;
  }
  if (opts.headers) {
    for (const [k, v] of Object.entries(opts.headers)) {
      headers[k] = v;
    }
  }
  return headers;
}

/**
 * Core fetch wrapper. Handles content-type, JSON parsing, error
 * translation, and a couple of Verity-specific quirks (empty 204
 * responses, non-JSON error bodies). Every /v1/* and /api/* call goes
 * through this function.
 */
export async function request<T>(
  path: string,
  init: RequestInitExtras & RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, init.query, init.baseUrl);
  const method = init.method ?? "GET";
  const f = init.fetchImpl ?? fetch;
  const headers = buildHeaders(init);
  const fetchInit: RequestInit = {
    method,
    headers,
    signal: init.signal,
  };
  if (init.credentials !== undefined) {
    fetchInit.credentials = init.credentials;
  }
  if (init.body !== undefined) {
    fetchInit.body = JSON.stringify(init.body);
  }

  let res: Response;
  try {
    res = await f(url, fetchInit);
  } catch (err) {
    throw new ApiError(0, {
      code: "network_error",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const ct = res.headers?.get?.("Content-Type") ?? "";
  const isJSON = ct.includes("application/json");

  // Read body once. Some mock `Response` shims only define `text()`; fall
  // through accordingly.
  let text = "";
  try {
    text = await res.text();
  } catch {
    text = "";
  }
  let parsed: unknown = undefined;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }
  }

  if (!res.ok) {
    let body: Partial<ErrorResponse>;
    if (parsed && typeof parsed === "object") {
      body = parsed as Partial<ErrorResponse>;
    } else {
      // No parseable JSON body — treat the raw text (if any) as the
      // human-readable message.
      body = {
        error: "http_error",
        code: "http_error",
        message: text || res.statusText || `HTTP ${res.status}`,
      };
    }
    throw new ApiError(res.status, body);
  }

  return (parsed as T) ?? (undefined as T);
}
