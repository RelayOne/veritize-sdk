// Auth strategies — small helper that documents and narrows the three
// credential shapes the clients flow through. Use of these helpers is
// optional; callers may pass a raw `RequestOptions` object to
// `request()`.
//
// The consumers differ in how they source credentials:
//   cloud:     session cookie (credentials: "include") + optional bearer.
//   local:     same-origin, no auth (the binary serves the SPA).
//   extension: bearer from chrome.storage.local + resolved base URL.

import type { RequestOptions } from "../client/base";

/** Cloud: session cookie + optional bearer + optional active-org header. */
export interface CookieAuth {
  kind: "cookie";
  apiKey?: string | null;
  activeOrg?: string | null;
}

/** Local / same-origin: nothing to send beyond content-type. */
export interface NoAuth {
  kind: "none";
}

/** Extension: bearer token against a resolved base URL. */
export interface BearerAuth {
  kind: "bearer";
  apiKey: string;
  baseUrl: string;
}

export type AuthStrategy = CookieAuth | NoAuth | BearerAuth;

/** Translate an AuthStrategy into the subset of RequestOptions it implies. */
export function toRequestOptions(auth: AuthStrategy): RequestOptions {
  switch (auth.kind) {
    case "cookie":
      return {
        credentials: "include",
        apiKey: auth.apiKey,
        activeOrg: auth.activeOrg,
      };
    case "bearer":
      return { baseUrl: auth.baseUrl, apiKey: auth.apiKey };
    case "none":
    default:
      return {};
  }
}
