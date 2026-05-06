# @veritize/client

Shared HTTP client and TypeScript DTOs for the public Veritize `/v1/*`
API. Consumed by the three front-end workspaces — `veritize-cloud-web`,
`veritize-local-gui`, and `veritize-extension` — so that the fetch
wrapper and frozen DTO definitions live in exactly one place.

> **Rename note.** This package was formerly published as
> `@verity/client`. The 60-day `@verity/client` re-export shim
> elapsed 2026-06-22 (V6-4 cutover) and the `packages/client-ts-legacy/`
> workspace has been removed. The final `@verity/client@0.2.1` tarball
> remains on npm with a `deprecated` field pointing at this package;
> new consumers MUST install `@veritize/client` directly.

## Install

```sh
pnpm add @veritize/client
# or, inside the monorepo:
# pnpm add "@veritize/client@workspace:*"
```

## Usage

```ts
import { postScan, getStatus, ApiError } from "@veritize/client";

const res = await postScan(
  { content: "hi", verify_claims: true, detect_hallucinations: true },
  { baseUrl: "https://api.veritize.app", apiKey: "ver_..." },
);

const status = await getStatus();
```

Cloud-only admin / billing / integrations endpoints are isolated in a
side-entry so local and extension bundles can tree-shake them out:

```ts
import { getAdminCustomers, getBillingInfo } from "@veritize/client/cloud";
```

## Design rules

- **React-agnostic.** Zero React imports, no hooks, no `peerDependencies`
  on `react`. A consumer that wants `useQuery` wrappers keeps them
  consumer-side.
- **Zero runtime dependencies.** Only native `fetch`, `Headers`, and
  `URLSearchParams`.
- **Hand-authored types today.** The `/v1/*` DTOs in `src/types/api.ts`
  are kept in lockstep with `relayone/verity/internal/api/dto.go`.
  The `tests/openapi-drift.test.ts` test compares the hand-authored
  types against `docs/openapi.yaml` using `openapi-typescript` in-process
  — when the OpenAPI spec changes, update `src/types/api.ts` first and
  let the drift test confirm parity.
- **No side effects.** `"sideEffects": false` in `package.json` so
  bundlers can tree-shake unused wrappers (the cloud module especially).

See `specs/shared-ts-client.md` for the full design contract and
`specs/research/raw/RT-P4-ts-client.md` for the underlying research.

## License

FSL-1.1-Apache-2.0. See `LICENSE`.
