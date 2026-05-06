# PUBLISH.md — @veritize/client

Operator runbook for publishing `@veritize/client` to the public npm registry. Follow this when the release-cut decision is taken.

## Who can publish

- Member of the `@veritize` npm org with `publish` role.
- Has 2FA active on the npm account (required by `publishConfig.access: public`).
- Has a clean git working tree on the branch/tag being published.

## Pre-flight checklist

Run from this directory (`packages/client-ts/`):

```bash
# 1. Confirm the canonical version number matches what you intend to ship.
#    As of 2026-04-23 this is 0.2.0 (V1-4 bump; name-only rename from
#    @verity/client → @veritize/client, API surface unchanged from 0.1.1).
cat package.json | jq -r .version

# 2. Confirm you are on the intended git ref (usually a tag like v0.2.0).
git rev-parse --short HEAD
git describe --tags --exact-match HEAD  # should print the tag on a release cut

# 3. Confirm the working tree is clean.
git status --porcelain  # must be empty

# 4. Confirm workspace dependency resolution works against the current
#    canonical build (legacy shim uses workspace:* which resolves at
#    publish-time; nothing to do here, but pnpm build must be green).
pnpm build

# 5. Run the smoke test. This runs typecheck:build + test + build via the
#    prepublishOnly hook indirectly, plus verifies the tarball includes
#    every expected file.
pnpm pack:smoke
# Expected: "OK: 48 files, ~19.7 kB packed, ~70 kB unpacked"

# 6. Dry-run the actual publish command to catch registry-side errors
#    (auth, name-collision, version-already-published) before the real run.
npm publish --dry-run --access public
```

## Publish

```bash
# Publish to the public npm registry. The prepublishOnly npm lifecycle hook
# will automatically run before upload: clean → typecheck:build → test → build.
# If any step fails, the publish aborts before contacting npm.
npm publish --access public

# Verify the upload landed.
npm view @veritize/client version  # should match package.json version
npm view @veritize/client dist-tags.latest
```

## Post-publish smoke (fresh shell, fresh temp dir)

```bash
# Confirm a fresh install can resolve the package end-to-end.
cd "$(mktemp -d)"
npm init -y >/dev/null
npm install @veritize/client
node -e "import('@veritize/client').then(m => console.log(Object.keys(m).sort()))"
node -e "import('@veritize/client/cloud').then(m => console.log(Object.keys(m).sort()))"
```

## Versioning policy

- MAJOR: breaking DTO shape changes, required field additions, auth flow changes.
- MINOR: additive DTOs, new endpoint clients, new optional fields.
- PATCH: bugfix-only, internal refactor, dependency bumps without surface change.

Coordinate every minor+ bump with the `CONTRACTS.md` §23 consumer-integration record — if the DTO changes, CloudSwarm + TrustPlane adapt-or-refuse per the frozen contract.

## Legacy shim coordination

`@verity/client` (in `../client-ts-legacy/`) is a re-export shim through 2026-06-22. When you publish a new `@veritize/client` version, publish a matching `@verity/client` version with the same number — the legacy shim's `workspace:*` dep resolves at publish-time to the canonical. See `../client-ts-legacy/PUBLISH.md`.

At v1.0.0 or 2026-06-22 (whichever is later) the legacy shim stops being published and gets `npm deprecate`-ed with a migration pointer. The canonical continues normally.

## Rollback

If a publish goes wrong:

```bash
# Within 72 hours of publish, unpublish is allowed.
npm unpublish @veritize/client@<bad-version>

# After 72 hours, deprecate instead (unpublish is refused by registry policy).
npm deprecate @veritize/client@<bad-version> "Use @veritize/client@<good-version>"
```

Never re-publish the same version after unpublish — npm blocks same-version republish for 24 hours. Bump the patch and publish a new version.

## 2FA

The `@veritize` npm org requires 2FA on publish. If you get `ENEEDAUTH` or `EOTP` errors:

```bash
npm login                     # if not logged in
npm publish --otp=123456 --access public  # supply 2FA code explicitly
```

## Reference

- V1-4 scaffolding commit: `a68f0742` (`feat(V1-4): npm @veritize/client canonical + @verity/client shim for 60d`)
- V2-5 publish-prep commits (this work order): see `git log --grep="V2-5" --oneline` on the `claude/veritize-rename-v3-2-claude-and-contracts-md` branch
- Work order: `/home/eric/repos/plans/work-orders/work-veritize-rename.md` §V1-4 + §V2-5
