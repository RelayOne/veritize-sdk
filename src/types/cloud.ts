// Cloud-only DTOs served by internal/admin, internal/billing,
// internal/compliance, internal/integrations, and internal/api (team +
// api-keys handlers). Not covered by docs/openapi.yaml today — see
// shared-ts-client spec Open question (4). These types are consumed
// only by verity-cloud-web via the "@verity/client/cloud" subpath; the
// local GUI and extension tree-shake them out.

export interface DocumentDTO {
  id: string;
  title: string;
  source: string;
  chunks: number;
  indexed_at: string;
}

export interface DocumentListResponse {
  documents: DocumentDTO[];
  total: number;
}

export interface IntegrationDTO {
  provider: string;
  display_name: string;
  category: string;
  connected: boolean;
  connection_id?: string;
  last_sync?: string;
  status?: string;
  // kind: "oauth" for the ten OAuth connectors, "config" for the two
  // virtual providers (router-core, relayone) that are operator-
  // configured via integrations.yaml. When absent (older servers),
  // the SPA treats the entry as "oauth" for backwards compatibility.
  // See specs/cross-promo-integrations.md §1 and §5.
  kind?: "oauth" | "config";
}

export interface IntegrationListResponse {
  integrations: IntegrationDTO[];
}

// Admin-only integration config surfaces (spec 3 §5). Tokens are NEVER
// returned; the *_set booleans let the UI render a "configured" chip
// without exposing the value. *_source is "env" | "file" | "default"
// so the UI can draw a "managed by environment" badge adjacent to the
// affected input.
export interface AdminIntegrationsConfig {
  router_core: {
    url: string;
    url_source: "env" | "file" | "default";
    api_key_set: boolean;
  };
  relay_one: {
    appliance_url: string;
    appliance_url_source: "env" | "file" | "default";
    appliance_token_set: boolean;
    enabled: boolean;
    enabled_source: "env" | "file" | "default";
  };
}

// Request body for POST /api/integrations/router-core.
export interface RouterCoreWriteRequest {
  url: string;
  api_key?: string;
}

export interface RouterCoreWriteResponse {
  provider: "router-core";
  url: string;
  shadowed_by_env: boolean;
}

// Request body for POST /api/integrations/relayone.
export interface RelayOneWriteRequest {
  appliance_url: string;
  appliance_token?: string;
  enabled?: boolean;
}

export interface RelayOneWriteResponse {
  provider: "relayone";
  appliance_url: string;
  enabled: boolean;
  shadowed_by_env: boolean;
}

// ApiKeyDTO: CLIENT-ONLY UNTIL GO HANDLER LANDS. Shape derived from the
// SQLite/Postgres migrations (api_keys table). Once internal/api ships
// the handler, reconcile field-by-field.
export interface ApiKeyDTO {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at?: string;
  // raw_key is only present on create — the server never echoes it again.
  raw_key?: string;
}

export interface ApiKeyListResponse {
  keys: ApiKeyDTO[];
}

// TeamMemberDTO: CLIENT-ONLY UNTIL GO HANDLER LANDS. Shape derived from
// the users + user_orgs migrations.
export interface TeamMemberDTO {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member" | "viewer";
  joined_at: string;
}

export interface TeamResponse {
  members: TeamMemberDTO[];
  pending_invites: { email: string; role: string; invited_at: string }[];
}

export interface UsageDTO {
  period_start: string;
  period_end: string;
  scans: number;
  claims_verified: number;
  tokens: number;
  cost_cents: number;
}

// BillingInfoDTO: CLIENT-ONLY UNTIL GO HANDLER LANDS. The Billing page
// renders plan + status + portal link + usage rollup.
export interface BillingInfoDTO {
  plan: string;
  status: string;
  current_period_end?: string;
  stripe_portal_url?: string;
  usage: UsageDTO;
}

// ComplianceReportParams mirrors internal/compliance.Params one-for-one
// for the UI-controlled fields. OrgID + Signer are injected server-side
// from the authenticated session.
export interface ComplianceReportParams {
  type: "ai_content_audit" | "healthcare" | "financial" | "legal";
  from: string; // ISO 8601 — maps to Params.From
  to: string;   // ISO 8601 — maps to Params.To
  format: "html" | "pdf" | "json";
  scans?: string[]; // maps to Params.Scans
}

// ComplianceReportDTO: CLIENT-ONLY UNTIL GO HANDLER LANDS.
// internal/compliance.Generator.Render streams bytes; a JSON envelope
// will eventually live at /api/compliance/reports.
export interface ComplianceReportDTO {
  id: string;
  type: string;
  org_id: string;
  from: string;
  to: string;
  generated_at: string;
  download_url: string;
}

// AdminCustomerDTO matches internal/admin.CustomerSummary.
export interface AdminCustomerDTO {
  id: string;
  name: string;
  plan: string;
  created_at: string;
}

// AdminCustomerListResponse matches internal/admin.CustomersResponse —
// {customers, limit, offset, count}.
export interface AdminCustomerListResponse {
  customers: AdminCustomerDTO[];
  limit: number;
  offset: number;
  count: number;
}

// AdminCustomerDetail matches internal/admin.CustomerDetail.
export interface AdminCustomerDetailDTO {
  id: string;
  name: string;
  plan: string;
  created_at: string;
  scan_count: number;
  member_count: number;
}

// Body for PATCH /api/admin/customers/{orgID}/plan.
export interface AdminUpdatePlanRequest {
  plan: string;
}

export interface OrgSettingsDTO {
  org_id: string;
  name: string;
  domain?: string;
  default_verify_claims: boolean;
  default_detect_hallucinations: boolean;
  webhook_url?: string;
}

export interface GetScansParams {
  page?: number;
  page_size?: number;
  status?: string;
  domain?: string;
}
