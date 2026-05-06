// Tests for the /v1/* wrappers in src/client/public.ts. Each hits a
// fetch stub and asserts URL + method + body shape.

import { describe, it, expect, vi } from "vitest";
import {
  getScan,
  getScans,
  getStatus,
  postScan,
  verify,
  type ScanRequest,
  type VerifyRequest,
} from "../src";

type FetchCall = { url: string; init?: RequestInit };

function makeFetchStub(body: unknown = {}): {
  fetchImpl: typeof fetch;
  calls: FetchCall[];
} {
  const calls: FetchCall[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, reqInit?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, init: reqInit });
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  return { fetchImpl: fn as unknown as typeof fetch, calls };
}

describe("postScan", () => {
  it("POSTs to /v1/scan with the request body verbatim", async () => {
    const { fetchImpl, calls } = makeFetchStub({ scan_id: "s1" });
    const req: ScanRequest = {
      content: "hello",
      verify_claims: true,
      detect_hallucinations: true,
    };
    const res = await postScan(req, { fetchImpl });
    expect(res.scan_id).toBe("s1");
    expect(calls[0].url).toBe("/v1/scan");
    expect(calls[0].init?.method).toBe("POST");
    expect(JSON.parse(calls[0].init?.body as string)).toEqual(req);
  });
});

describe("verify", () => {
  it("POSTs to /v1/verify with the claim body", async () => {
    const { fetchImpl, calls } = makeFetchStub({ claim: "c", verdict: "supported", confidence: 0.9, sources: [] });
    const req: VerifyRequest = { claim: "c", context: "ctx" };
    const res = await verify(req, { fetchImpl });
    expect(res.verdict).toBe("supported");
    expect(calls[0].url).toBe("/v1/verify");
    expect(calls[0].init?.method).toBe("POST");
  });
});

describe("getStatus", () => {
  it("GETs /v1/status", async () => {
    const { fetchImpl, calls } = makeFetchStub({
      version: "1",
      storage: "pg",
      models: [],
      knowledge_base: { folders: [], document_count: 0, chunk_count: 0 },
      uptime_seconds: 0,
    });
    const res = await getStatus({ fetchImpl });
    expect(res.version).toBe("1");
    expect(calls[0].url).toBe("/v1/status");
    expect(calls[0].init?.method ?? "GET").toBe("GET");
  });
});

describe("getScans", () => {
  it("hits /v1/scans (local flavor) when no paginator params are passed", async () => {
    const { fetchImpl, calls } = makeFetchStub([]);
    await getScans(undefined, { fetchImpl });
    expect(calls[0].url).toBe("/v1/scans");
    expect(calls[0].init?.method ?? "GET").toBe("GET");
  });
  it("hits /api/scans (cloud flavor) when paginator params are passed", async () => {
    const { fetchImpl, calls } = makeFetchStub({ scans: [], total: 0, page: 1, page_size: 10 });
    await getScans({ page: 2, page_size: 10, status: "failed" }, { fetchImpl });
    expect(calls[0].url).toBe("/api/scans?page=2&page_size=10&status=failed");
  });
});

describe("getScan", () => {
  it("encodes the id in the path", async () => {
    const { fetchImpl, calls } = makeFetchStub({ scan_id: "s/1" });
    await getScan("s/1", { fetchImpl });
    expect(calls[0].url).toBe("/v1/scans/s%2F1");
  });
});
