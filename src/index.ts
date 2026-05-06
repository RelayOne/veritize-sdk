// @verity/client — public entry point. See README.md for usage.
//
// Cloud-only admin / billing / integrations wrappers (and their DTO
// types) live under the `./cloud` subpath so the local GUI and the
// Chrome extension can tree-shake them out of their bundles.

// /v1/* public DTOs
export * from "./types/api.js";

// Shared HTTP primitives (request, ApiError, VerityApiError,
// RequestOptions, buildHeaders, buildUrl)
export * from "./client/base.js";

// /v1/* wrappers (postScan, verify, getStatus, getScans, getScan)
export * from "./client/public.js";

// Optional auth-strategy helpers
export * from "./auth/strategies.js";
