// Public /v1/* surface. These wrappers are the harmonized form of the
// three per-consumer hand-authored copies: cloud, local, and extension
// all delegate here. URL paths are frozen per docs/openapi.yaml and
// CONTRACTS.md §11.

import type {
  ScanRequest,
  ScanResponse,
  VerifyRequest,
  VerifyResponse,
  StatusResponse,
  ScanListResponse,
} from "../types/api";
import type { GetScansParams } from "../types/cloud";
import { request, type RequestOptions } from "./base";

/** POST /v1/scan. */
export function postScan(
  body: ScanRequest,
  opts?: RequestOptions,
): Promise<ScanResponse> {
  return request<ScanResponse>("/v1/scan", {
    method: "POST",
    body,
    ...opts,
  });
}

/** POST /v1/verify. */
export function verify(
  body: VerifyRequest,
  opts?: RequestOptions,
): Promise<VerifyResponse> {
  return request<VerifyResponse>("/v1/verify", {
    method: "POST",
    body,
    ...opts,
  });
}

/** GET /v1/status. */
export function getStatus(opts?: RequestOptions): Promise<StatusResponse> {
  return request<StatusResponse>("/v1/status", {
    method: "GET",
    ...opts,
  });
}

/**
 * Fetch scans. Without paginator params the call hits `/v1/scans` (the
 * local GUI flavor — the Go binary returns an array). With paginator
 * params it hits `/api/scans` (the cloud flavor — returns a paginated
 * envelope). Consumers choose by passing or omitting `params`.
 */
export function getScans(
  params?: GetScansParams,
  opts?: RequestOptions,
): Promise<ScanListResponse> {
  const usePaginated =
    !!params && (params.page !== undefined || params.page_size !== undefined);
  if (usePaginated) {
    return request<ScanListResponse>("/api/scans", {
      method: "GET",
      query: {
        page: params?.page,
        page_size: params?.page_size,
        status: params?.status,
        domain: params?.domain,
      },
      ...opts,
    });
  }
  return request<ScanListResponse>("/v1/scans", {
    method: "GET",
    query: params
      ? { status: params.status, domain: params.domain }
      : undefined,
    ...opts,
  });
}

/** GET /v1/scans/{id}. */
export function getScan(
  id: string,
  opts?: RequestOptions,
): Promise<ScanResponse> {
  return request<ScanResponse>(
    `/v1/scans/${encodeURIComponent(id)}`,
    { method: "GET", ...opts },
  );
}
