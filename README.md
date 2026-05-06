# @veritize/client

TypeScript HTTP client and DTOs for the public Veritize `/v1/*` API.

Veritize is content fact-checking with claim-level evidence — see <https://veritize.app>.

## Install

While the npm scope is being claimed, install directly from this GitHub repo:

```sh
npm install github:RelayOne/veritize-sdk
# or pin to a tag:
npm install github:RelayOne/veritize-sdk#v0.2.0
```

The package builds itself on install via a `prepare` hook, so consumers get a ready-to-import `dist/` without running build steps.

Once the npm scope is claimed, the same package will be available as `npm install @veritize/client` with provenance attestations.

## Usage

```ts
import { postScan, getStatus, ApiError } from "@veritize/client";

const res = await postScan(
  { content: "hi", verify_claims: true, detect_hallucinations: true },
  { baseUrl: "https://api.veritize.app", apiKey: "ver_..." },
);

const status = await getStatus();
```

Cloud-only admin / billing / integrations endpoints are isolated in a side-entry so local and extension bundles can tree-shake them out:

```ts
import { getAdminCustomers, getBillingInfo } from "@veritize/client/cloud";
```

## Get an API key

Generate one at <https://app.veritize.app/account/api-keys>. The `apiKey` is sent as a `Bearer` header on every request.

## Design rules

- **React-agnostic.** Zero React imports, no hooks, no `peerDependencies` on `react`. A consumer that wants `useQuery` wrappers keeps them consumer-side.
- **Zero runtime dependencies.** Only native `fetch`, `Headers`, and `URLSearchParams`.
- **Hand-authored types today.** The `/v1/*` DTOs in `src/types/api.ts` are kept in lockstep with the canonical OpenAPI spec at the source monorepo.
- **No side effects.** `"sideEffects": false` in `package.json` so bundlers can tree-shake unused wrappers (the cloud module especially).

## Source

The canonical source lives in the [Veritize monorepo](https://github.com/RelayOne/veritize/tree/main/relayone/veritize/packages/client-ts) at `relayone/veritize/packages/client-ts/`. This repo is a thin export of that package — releases are tagged here in lockstep with the monorepo source.

## License

FSL-1.1-Apache-2.0. See [LICENSE](LICENSE).
