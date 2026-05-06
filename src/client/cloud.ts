// Cloud-only /api/* surface. Tree-shaken out of local + extension
// bundles via the "@verity/client/cloud" subpath. None of the functions
// below are covered by docs/openapi.yaml yet (Open question (4) in
// specs/shared-ts-client.md).

import type {
  AdminCustomerListResponse,
  ApiKeyDTO,
  ApiKeyListResponse,
  BillingInfoDTO,
  ComplianceReportDTO,
  ComplianceReportParams,
  DocumentListResponse,
  IntegrationListResponse,
  OrgSettingsDTO,
  TeamResponse,
} from "../types/cloud";
import { request, type RequestOptions } from "./base";

// --- Auth ----------------------------------------------------------------

export interface AuthMe {
  user_id: string;
  email: string;
  name: string;
  org_id: string;
  role: string;
  is_admin: boolean;
}

export function getMe(opts?: RequestOptions): Promise<AuthMe> {
  return request<AuthMe>("/api/auth/me", { method: "GET", ...opts });
}

// --- Scans (cloud paginated list + detail) -------------------------------

export function getScanCloud(id: string, opts?: RequestOptions) {
  return request<import("../types/api").ScanResponse>(
    `/api/scans/${encodeURIComponent(id)}`,
    { method: "GET", ...opts },
  );
}

// --- Documents -----------------------------------------------------------

export function getDocuments(
  params: { page?: number; q?: string } = {},
  opts?: RequestOptions,
): Promise<DocumentListResponse> {
  return request<DocumentListResponse>("/api/documents", {
    method: "GET",
    query: params,
    ...opts,
  });
}

export function listDocuments(opts?: RequestOptions): Promise<DocumentListResponse> {
  return getDocuments({}, opts);
}

// --- Integrations --------------------------------------------------------

export function getIntegrations(opts?: RequestOptions): Promise<IntegrationListResponse> {
  return request<IntegrationListResponse>("/api/integrations", {
    method: "GET",
    ...opts,
  });
}

export function listIntegrations(opts?: RequestOptions): Promise<IntegrationListResponse> {
  return getIntegrations(opts);
}

export function connectIntegrationURL(provider: string): string {
  return `/api/integrations/${encodeURIComponent(provider)}/connect`;
}

export function disconnectIntegration(
  connectionID: string,
  opts?: RequestOptions,
): Promise<void> {
  return request<void>(
    `/api/integrations/connections/${encodeURIComponent(connectionID)}`,
    { method: "DELETE", ...opts },
  );
}

// Admin-only: resolved integrations config (URL + source labels,
// presence booleans — never raw tokens).
export function getAdminIntegrationsConfig(
  opts?: RequestOptions,
): Promise<import("../types/cloud").AdminIntegrationsConfig> {
  return request<import("../types/cloud").AdminIntegrationsConfig>(
    "/api/admin/integrations/config",
    { method: "GET", ...opts },
  );
}

// Admin-only: persist the router-core URL / api_key to integrations.yaml.
// Empty api_key is NOT sent on the wire so the persisted token is not
// overwritten with an empty string — loadbearing per spec §7.
export function postRouterCoreConfig(
  body: import("../types/cloud").RouterCoreWriteRequest,
  opts?: RequestOptions,
): Promise<import("../types/cloud").RouterCoreWriteResponse> {
  const payload: Record<string, string> = { url: body.url };
  if (body.api_key && body.api_key.length > 0) payload.api_key = body.api_key;
  return request<import("../types/cloud").RouterCoreWriteResponse>(
    "/api/integrations/router-core",
    { method: "POST", body: payload, ...opts },
  );
}

// Admin-only: persist the relayone appliance URL / token / enabled to
// integrations.yaml. Empty appliance_token is NOT sent.
export function postRelayOneConfig(
  body: import("../types/cloud").RelayOneWriteRequest,
  opts?: RequestOptions,
): Promise<import("../types/cloud").RelayOneWriteResponse> {
  const payload: Record<string, unknown> = { appliance_url: body.appliance_url };
  if (body.appliance_token && body.appliance_token.length > 0) {
    payload.appliance_token = body.appliance_token;
  }
  if (typeof body.enabled === "boolean") payload.enabled = body.enabled;
  return request<import("../types/cloud").RelayOneWriteResponse>(
    "/api/integrations/relayone",
    { method: "POST", body: payload, ...opts },
  );
}

// --- API keys ------------------------------------------------------------

export function getApiKeys(opts?: RequestOptions): Promise<ApiKeyListResponse> {
  return request<ApiKeyListResponse>("/api/api-keys", { method: "GET", ...opts });
}

export function listApiKeys(opts?: RequestOptions): Promise<ApiKeyListResponse> {
  return getApiKeys(opts);
}

export function createApiKey(name: string, opts?: RequestOptions): Promise<ApiKeyDTO> {
  return request<ApiKeyDTO>("/api/api-keys", {
    method: "POST",
    body: { name },
    ...opts,
  });
}

export function rotateApiKey(id: string, opts?: RequestOptions): Promise<ApiKeyDTO> {
  return request<ApiKeyDTO>(
    `/api/api-keys/${encodeURIComponent(id)}/rotate`,
    { method: "POST", ...opts },
  );
}

export function deleteApiKey(id: string, opts?: RequestOptions): Promise<void> {
  return request<void>(
    `/api/api-keys/${encodeURIComponent(id)}`,
    { method: "DELETE", ...opts },
  );
}

// --- Team ----------------------------------------------------------------

export function getTeam(opts?: RequestOptions): Promise<TeamResponse> {
  return request<TeamResponse>("/api/team", { method: "GET", ...opts });
}

export function inviteTeamMember(
  email: string,
  role: string,
  opts?: RequestOptions,
): Promise<void> {
  return request<void>("/api/team/invites", {
    method: "POST",
    body: { email, role },
    ...opts,
  });
}

export function updateTeamMember(
  id: string,
  role: string,
  opts?: RequestOptions,
): Promise<void> {
  return request<void>(
    `/api/team/members/${encodeURIComponent(id)}`,
    { method: "PATCH", body: { role }, ...opts },
  );
}

export function removeTeamMember(id: string, opts?: RequestOptions): Promise<void> {
  return request<void>(
    `/api/team/members/${encodeURIComponent(id)}`,
    { method: "DELETE", ...opts },
  );
}

// --- Billing -------------------------------------------------------------

export function getBillingInfo(opts?: RequestOptions): Promise<BillingInfoDTO> {
  return request<BillingInfoDTO>("/api/billing", { method: "GET", ...opts });
}

// --- Settings ------------------------------------------------------------

export function getOrgSettings(opts?: RequestOptions): Promise<OrgSettingsDTO> {
  return request<OrgSettingsDTO>("/api/org/settings", { method: "GET", ...opts });
}

export function updateOrgSettings(
  patch: Partial<OrgSettingsDTO>,
  opts?: RequestOptions,
): Promise<OrgSettingsDTO> {
  return request<OrgSettingsDTO>("/api/org/settings", {
    method: "PATCH",
    body: patch,
    ...opts,
  });
}

// --- Compliance reports --------------------------------------------------

export function generateComplianceReport(
  params: ComplianceReportParams,
  opts?: RequestOptions,
): Promise<ComplianceReportDTO> {
  return request<ComplianceReportDTO>("/api/compliance/reports", {
    method: "POST",
    body: params,
    ...opts,
  });
}

export function getComplianceReport(
  id: string,
  opts?: RequestOptions,
): Promise<ComplianceReportDTO> {
  return request<ComplianceReportDTO>(
    `/api/compliance/reports/${encodeURIComponent(id)}`,
    { method: "GET", ...opts },
  );
}

export function listComplianceReports(
  opts?: RequestOptions,
): Promise<{ reports: ComplianceReportDTO[] }> {
  return request<{ reports: ComplianceReportDTO[] }>(
    "/api/compliance/reports",
    { method: "GET", ...opts },
  );
}

// --- Admin (admin-only endpoints) ---------------------------------------

export function getAdminCustomers(
  params: { page?: number } = {},
  opts?: RequestOptions,
): Promise<AdminCustomerListResponse> {
  return request<AdminCustomerListResponse>("/api/admin/customers", {
    method: "GET",
    query: params,
    ...opts,
  });
}

export function updateCustomerPlan(
  orgID: string,
  plan: string,
  opts?: RequestOptions,
): Promise<void> {
  return request<void>(
    `/api/admin/customers/${encodeURIComponent(orgID)}/plan`,
    { method: "PATCH", body: { plan }, ...opts },
  );
}

