// Happy-path + core-behavior tests for the shared HTTP primitives in
// src/client/base.ts: request(), buildHeaders(), buildUrl(), ApiError,
// VerityApiError. No tests hit the network; every fetch is stubbed via
// a fetchImpl injected through RequestOptions.

import { describe, it, expect, vi } from "vitest";
import {
  ApiError,
  VerityApiError,
  buildHeaders,
  buildUrl,
  request,
  type RequestOptions,
} from "../src/client/base";

type FetchCall = { url: string; init?: RequestInit };

function makeFetchStub(
  init: { status?: number; body?: unknown; text?: string } = {},
): { fetchImpl: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, reqInit?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, init: reqInit });
    const status = init.status ?? 200;
    const text =
      init.text ?? (init.body === undefined ? "{}" : JSON.stringify(init.body));
    return new Response(text, {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
  return { fetchImpl: fn as unknown as typeof fetch, calls };
}

describe("buildUrl", () => {
  it("returns the bare path when no query given", () => {
    expect(buildUrl("/api/scans")).toBe("/api/scans");
  });
  it("appends encoded query string and drops undefined", () => {
    const u = buildUrl("/api/scans", {
      page: 2,
      status: "completed",
      domain: undefined,
    });
    expect(u).toBe("/api/scans?page=2&status=completed");
  });
  it("joins a base URL with a leading slash path cleanly", () => {
    expect(buildUrl("/v1/status", undefined, "https://x.test")).toBe(
      "https://x.test/v1/status",
    );
  });
  it("strips trailing slashes from the base URL", () => {
    expect(buildUrl("/v1/status", undefined, "https://x.test/")).toBe(
      "https://x.test/v1/status",
    );
  });
});

describe("buildHeaders", () => {
  it("sets JSON content-type by default", () => {
    const h = buildHeaders();
    expect(h["Content-Type"]).toBe("application/json");
    expect(h.Accept).toBe("application/json");
  });
  it("emits Authorization: Bearer when apiKey provided", () => {
    const h = buildHeaders({ apiKey: "vk_abc" });
    expect(h.Authorization).toBe("Bearer vk_abc");
  });
  it("emits X-Verity-Org when activeOrg provided", () => {
    const h = buildHeaders({ activeOrg: "org_42" });
    expect(h["X-Verity-Org"]).toBe("org_42");
  });
  it("emits both when both provided", () => {
    const h = buildHeaders({ apiKey: "vk", activeOrg: "org" });
    expect(h.Authorization).toBe("Bearer vk");
    expect(h["X-Verity-Org"]).toBe("org");
  });
  it("emits neither when neither provided", () => {
    const h = buildHeaders({});
    expect(h.Authorization).toBeUndefined();
    expect(h["X-Verity-Org"]).toBeUndefined();
  });
  it("trims whitespace around apiKey and activeOrg", () => {
    expect(buildHeaders({ apiKey: "  tk  " }).Authorization).toBe("Bearer tk");
    expect(buildHeaders({ activeOrg: "  org  " })["X-Verity-Org"]).toBe("org");
  });
  it("ignores empty/blank apiKey values", () => {
    expect(buildHeaders({ apiKey: "" }).Authorization).toBeUndefined();
    expect(buildHeaders({ apiKey: "   " }).Authorization).toBeUndefined();
    expect(buildHeaders({ apiKey: null }).Authorization).toBeUndefined();
  });
});

describe("request()", () => {
  it("POSTs JSON with the right URL, method, content-type, and body", async () => {
    const { fetchImpl, calls } = makeFetchStub({ body: { scan_id: "s1" } });
    const result = await request<{ scan_id: string }>("/v1/scan", {
      method: "POST",
      body: { content: "hi" },
      fetchImpl,
    });
    expect(result.scan_id).toBe("s1");
    expect(calls[0].url).toBe("/v1/scan");
    expect(calls[0].init?.method).toBe("POST");
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({
      content: "hi",
    });
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("returns undefined for a 204 response without attempting to parse", async () => {
    // Native Response constructor rejects 204-with-body; build a minimal
    // duck-typed stand-in instead.
    const calls: FetchCall[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, reqInit?: RequestInit) => {
      calls.push({ url: String(input), init: reqInit });
      return {
        ok: true,
        status: 204,
        statusText: "No Content",
        headers: new Headers(),
        text: async () => "",
      } as unknown as Response;
    }) as unknown as typeof fetch;
    const result = await request<void>("/api/resource", {
      method: "DELETE",
      fetchImpl,
    });
    expect(result).toBeUndefined();
    expect(calls[0].init?.method).toBe("DELETE");
  });

  it("forwards credentials + abort signal when set", async () => {
    const ctl = new AbortController();
    const { fetchImpl, calls } = makeFetchStub({ body: {} });
    await request<unknown>("/v1/status", {
      method: "GET",
      credentials: "include",
      signal: ctl.signal,
      fetchImpl,
    });
    expect(calls[0].init?.credentials).toBe("include");
    expect(calls[0].init?.signal).toBe(ctl.signal);
  });

  it("joins baseUrl with path", async () => {
    const { fetchImpl, calls } = makeFetchStub({ body: {} });
    const opts: RequestOptions = { baseUrl: "https://api.veritize.app", fetchImpl };
    await request<unknown>("/v1/status", { method: "GET", ...opts });
    expect(calls[0].url).toBe("https://api.veritize.app/v1/status");
  });

  it("serializes query strings and drops undefined values", async () => {
    const { fetchImpl, calls } = makeFetchStub({ body: {} });
    await request<unknown>("/api/scans", {
      method: "GET",
      query: { page: 2, page_size: undefined, status: "failed" },
      fetchImpl,
    });
    expect(calls[0].url).toBe("/api/scans?page=2&status=failed");
  });
});

describe("ApiError + VerityApiError", () => {
  it("request() throws ApiError with parsed code/message/status on non-2xx JSON", async () => {
    const { fetchImpl } = makeFetchStub({
      status: 403,
      body: { error: "forbidden", code: "license_required", message: "no license" },
    });
    await expect(
      request("/v1/status", { method: "GET", fetchImpl }),
    ).rejects.toBeInstanceOf(ApiError);
    try {
      await request("/v1/status", { method: "GET", fetchImpl });
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(403);
      expect(e.code).toBe("license_required");
      expect(e.message).toBe("no license");
    }
  });

  it("request() throws ApiError with http_error code on non-JSON error", async () => {
    const { fetchImpl } = makeFetchStub({ status: 500, text: "server exploded" });
    try {
      await request("/v1/status", { method: "GET", fetchImpl });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const e = err as ApiError;
      expect(e.status).toBe(500);
      expect(e.message).toBe("server exploded");
    }
  });

  it("request() translates network-level failures into ApiError status=0", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("failed to fetch");
    }) as unknown as typeof fetch;
    await expect(
      request("/v1/status", { method: "GET", fetchImpl }),
    ).rejects.toMatchObject({
      status: 0,
      code: "network_error",
    });
  });

  it("VerityApiError is a subclass of ApiError with the right name", () => {
    const err = new VerityApiError(401, "unauthorized", "bad token");
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(VerityApiError);
    expect(err.name).toBe("VerityApiError");
    expect(err.status).toBe(401);
    expect(err.code).toBe("unauthorized");
    expect(err.message).toBe("bad token");
  });

  it("ApiError accepts the legacy (status, code, message) call shape", () => {
    const err = new ApiError(503, "unavailable", "db down");
    expect(err.status).toBe(503);
    expect(err.code).toBe("unavailable");
    expect(err.message).toBe("db down");
  });
});
