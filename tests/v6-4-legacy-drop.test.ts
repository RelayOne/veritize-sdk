// V6-4 regression guard — asserts the @verity/client npm shim workspace
// has been dropped and pnpm-workspace.yaml no longer references it.
//
// Context: the 60-day V1-4 dual-publish window (@veritize/client
// canonical + @verity/client re-export shim) elapsed on 2026-06-22.
// V6-4 removed the `packages/client-ts-legacy/` workspace in its
// entirety. This test exists so a future "oops, put the shim back"
// revert (outside a deliberate rollback commit revert) fails loudly
// instead of silently reinstating a public surface the rename plan
// announced as gone.
//
// Intentionally uses only Node built-ins (`node:fs`, `node:path`) +
// vitest so the regression guard has no runtime dependency on the
// very workspace it is asserting about.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Repo-root relative paths computed from this test's own location:
// `packages/client-ts/tests/v6-4-legacy-drop.test.ts` → three `..`
// hops up to the monorepo root (`relayone/verity/`).
const monorepoRoot = resolve(__dirname, "..", "..", "..");
const legacyShimDir = resolve(monorepoRoot, "packages", "client-ts-legacy");
const workspaceFile = resolve(monorepoRoot, "pnpm-workspace.yaml");

describe("V6-4 — @verity/client npm shim drop (post-2026-06-22)", () => {
  it("packages/client-ts-legacy/ directory no longer exists", () => {
    expect(existsSync(legacyShimDir)).toBe(false);
  });

  it("pnpm-workspace.yaml contains no client-ts-legacy entry", () => {
    const yaml = readFileSync(workspaceFile, "utf8");
    // Assert the literal workspace path is absent. We do a substring
    // check rather than a full YAML parse because the workspace file is
    // a single, trivially-formatted list. A substring false-positive
    // would require someone literally typing "client-ts-legacy" into
    // an unrelated key, which is fine — the test's job is to fail.
    expect(yaml).not.toMatch(/client-ts-legacy/);
  });

  it("@veritize/client canonical package.json name is unchanged", () => {
    // Guard against an accidental rename back to @verity/client.
    const pkgPath = resolve(
      monorepoRoot,
      "packages",
      "client-ts",
      "package.json",
    );
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      name: string;
    };
    expect(pkg.name).toBe("@veritize/client");
  });
});
