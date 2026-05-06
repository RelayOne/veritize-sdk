// Frozen /v1/* DTOs — mirrors relayone/verity/internal/api/dto.go
// byte-for-byte per CONTRACTS.md §11. The OpenAPI drift test
// (tests/openapi-drift.test.ts) enforces structural agreement with
// docs/openapi.yaml; update this file whenever the Go DTO changes and
// let the drift test confirm parity.

export interface AssertionDTO {
  id: string;
  content: string;
  type: string;
  position: number;
  confidence: number;
  verdict: string;
  source?: string;
  notes?: string;
}

export interface SourceDTO {
  url: string;
  title?: string;
  snippet?: string;
  score: number;
}

export interface ScanRequest {
  content: string;
  content_type?: string;
  domain?: string;
  verify_claims: boolean;
  detect_hallucinations: boolean;
  quick_mode?: boolean;
  max_claims?: number;
  webhook_url?: string;
  metadata?: Record<string, unknown>;
}

export interface ScanResponse {
  scan_id: string;
  status: string;
  domain: string;
  assertions: AssertionDTO[];
  ai_probability: number;
  claim_count: number;
  hallucination_count: number;
  models_used: string[];
  duration_ms: number;
  created_at: string;
  completed_at?: string;
  summary?: string;
}

export interface VerifyRequest {
  claim: string;
  context?: string;
}

export interface VerifyResponse {
  claim: string;
  verdict: string;
  confidence: number;
  sources: SourceDTO[];
  reasoning?: string;
}

export interface BatchRequest {
  scans: ScanRequest[];
}

export interface BatchResponse {
  results: ScanResponse[];
}

export interface ModelStatusDTO {
  name: string;
  type: string;
  model: string;
  enabled: boolean;
  healthy: boolean;
  error?: string;
}

export interface KBStatusDTO {
  folders: string[];
  document_count: number;
  chunk_count: number;
  last_indexed?: string;
}

export interface LicenseStatusDTO {
  tier: string;
  expiry?: string;
  days_remaining: number;
  is_trial: boolean;
}

export interface StatusResponse {
  version: string;
  commit?: string;
  storage: string;
  models: ModelStatusDTO[];
  knowledge_base: KBStatusDTO;
  license?: LicenseStatusDTO;
  uptime_seconds: number;
}

export interface ErrorResponse {
  error: string;
  code: string;
  message: string;
  details?: unknown;
}

export interface ScanListItem {
  scan_id: string;
  status: string;
  domain: string;
  claim_count: number;
  hallucination_count: number;
  created_at: string;
  completed_at?: string;
}

export interface ScanListResponse {
  scans: ScanListItem[];
  total: number;
  page: number;
  page_size: number;
}

// Verdict literals emitted by the server. The wire shape is a raw
// string; the constants below are UI-side sugar.
export const VERDICT_VERIFIED = "verified";
export const VERDICT_UNVERIFIED = "unverified";
export const VERDICT_CONTRADICTED = "contradicted";
export const VERDICT_HALLUCINATED = "hallucinated";

export type Verdict =
  | typeof VERDICT_VERIFIED
  | typeof VERDICT_UNVERIFIED
  | typeof VERDICT_CONTRADICTED
  | typeof VERDICT_HALLUCINATED
  | string;
