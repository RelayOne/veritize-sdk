# Changelog

All notable changes to `@veritize/client` are tracked here. The package
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.3.0 — 2026-06-22

Phase V6-4 of the Verity → Veritize rename. The 60-day `@verity/client`
npm shim window (V1-4, 2026-04-23 → 2026-06-22) has elapsed: the
`packages/client-ts-legacy/` workspace is removed from the tree and the
final deprecated version of `@verity/client@0.2.1` has been published to
npm with a `deprecated` field pointing at `@veritize/client`. Consumers
that still import `@verity/client` see the npm deprecation notice on
`npm install` and must flip to `@veritize/client`.

### Removed

- `packages/client-ts-legacy/` workspace package (entire directory tree,
  including `src/`, `tsconfig*.json`, `package.json`, `README.md`,
  `CHANGELOG.md`, and `LICENSE`).
- `packages/client-ts-legacy` entry from `pnpm-workspace.yaml`.

### Changed

- `name` retained as `@veritize/client`; no API surface changes from
  0.2.0.

## 0.2.0 — 2026-04-23

Phase V1-4 of the Verity → Veritize rename. The package is now
published as `@veritize/client`. The legacy `@verity/client` name
continues to work as a thin re-export shim (see
`packages/client-ts-legacy`) through 2026-06-22.

### Changed

- `name` in `package.json`: `@verity/client` → `@veritize/client`.
- No API surface changes. Every export, type, and runtime behaviour is
  byte-for-byte identical to 0.1.1; the bump to 0.2.0 reflects the
  package-identity change alone.

### Migration

- Update `import` specifiers from `@verity/client` (and
  `@verity/client/cloud`) to `@veritize/client` (and
  `@veritize/client/cloud`).
- Existing imports continue to resolve via the `@verity/client` shim
  through 2026-06-22.

## 0.1.1 — 2026-04-22

Aligns with Go binary v0.1.1 release.

### Changed

- `docs/openapi.yaml`: `ScanRequest.domain` and `ScanResponse.domain` now
  carry `enum: [generic, marketing, healthcare, financial, legal, technical]`.
  TypeScript interfaces are unchanged (`domain: string`) — the enum is
  informational at the schema level and the drift test continues to pass.

## 0.1.0 — 2026-04-20

Initial release. Extracted from the three hand-authored copies of the
fetch wrapper that previously lived in `web/cloud/src/lib/`,
`web/local/src/lib/`, and `web/extension/src/lib/` per the
`specs/shared-ts-client.md` spec.

### Added

- Public `/v1/*` surface: `postScan`, `verify`, `getStatus`, `getScans`,
  `getScan`.
- Cloud-only `/api/*` surface under the `@verity/client/cloud` subpath:
  admin, billing, team, integrations, API keys, compliance, org settings.
- Frozen DTOs mirroring `relayone/verity/internal/api/dto.go` exactly.
- `ApiError` + `VerityApiError` (backwards-compat alias).
- `request()`, `buildHeaders()`, `buildUrl()` shared primitives.
- OpenAPI drift test (`tests/openapi-drift.test.ts`) comparing the
  hand-authored types against `docs/openapi.yaml`.
