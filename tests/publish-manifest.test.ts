// publish-manifest.test.ts — codifies the invariants the V2-5 publish-prep
// `pack:smoke` script enforces at command-line time. This test duplicates
// the npm-pack `--dry-run --json` contract check inside vitest so that any
// regression (e.g. someone drops `LICENSE` from `files[]`, or renames
// `dist/index.js`, or forgets to run `build` before publish) is caught by
// the regular `npm test` gate too — not only by the dedicated smoke
// script.
//
// What this guards against:
//   1. `package.json` `files` array drifts so a required artifact stops
//      shipping (LICENSE, README, CHANGELOG, any dist/* exports entry).
//   2. The `exports` map declares a subpath (e.g. `./cloud`) but the
//      dist file for that subpath is absent — breaking downstream
//      `import "@veritize/client/cloud"`.
//   3. Required metadata fields (`name`, `version`, `license`, `type`,
//      `publishConfig.access`) stop being present in package.json.
//   4. The canonical package accidentally ships `src/` or `tests/` to
//      the registry (doubles tarball size + leaks test fixtures).
//
// Why a test file: the `pack:smoke` npm script fires only when a human
// runs it; this vitest file fires on every `npm test` and every `ci` run.

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { execSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");

describe("publish-manifest", () => {
  let pkg: {
    name: string;
    version: string;
    license: string;
    type: string;
    main: string;
    types: string;
    exports: Record<string, { types: string; import: string }>;
    files: string[];
    publishConfig: { access: string; registry?: string };
    scripts: Record<string, string>;
  };

  beforeAll(() => {
    pkg = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf-8"));
  });

  it("declares canonical Veritize package metadata", () => {
    expect(pkg.name).toBe("@veritize/client");
    expect(pkg.license).toBe("FSL-1.1-Apache-2.0");
    expect(pkg.type).toBe("module");
    // V1-4 bumped to 0.2.0; V2-5 publish prep does not change version.
    // If you're bumping for a real publish, update this literal deliberately.
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+(-[\w.]+)?$/);
  });

  it("declares public publishConfig.access for the scoped org", () => {
    expect(pkg.publishConfig?.access).toBe("public");
  });

  it("allowlists exactly the expected file patterns in files[]", () => {
    // An exact list is load-bearing: adding a pattern here is a deliberate
    // decision, not a drive-by edit.
    expect(pkg.files).toEqual(["dist", "README.md", "CHANGELOG.md", "LICENSE"]);
  });

  it("has LICENSE + README + CHANGELOG + PUBLISH files with expected markers", () => {
    // Read content and assert file-specific markers so a zero-byte or
    // wrong-content file fails the gate (existence-only would not).
    const license = readFileSync(join(pkgRoot, "LICENSE"), "utf-8");
    expect(license).toContain("Functional Source License");

    const readme = readFileSync(join(pkgRoot, "README.md"), "utf-8");
    expect(readme).toMatch(/@veritize\/client/);

    const changelog = readFileSync(join(pkgRoot, "CHANGELOG.md"), "utf-8");
    expect(changelog).toMatch(/^#\s/m); // at least one markdown heading

    const publish = readFileSync(join(pkgRoot, "PUBLISH.md"), "utf-8");
    expect(publish).toContain("prepublishOnly");
    expect(publish).toContain("npm publish");
  });

  it("has the prepublishOnly lifecycle hook wired to typecheck + test + build", () => {
    const hook = pkg.scripts.prepublishOnly;
    expect(hook).toBeDefined();
    // Order-independent substring check — some maintainers may reorder
    // the chain, we only care each step is present.
    expect(hook).toContain("typecheck:build");
    expect(hook).toContain("test");
    expect(hook).toContain("build");
    expect(hook).toContain("clean");
  });

  it("has the typecheck:build script pointed at tsconfig.build.json", () => {
    // The ordinary typecheck script currently hits TS6059 on tests/ due
    // to the pre-existing rootDir/include misalignment in tsconfig.json.
    // typecheck:build is the V2-5 workaround that publishes clean.
    expect(pkg.scripts["typecheck:build"]).toMatch(/tsconfig\.build\.json/);
    expect(pkg.scripts["typecheck:build"]).toContain("--noEmit");
  });

  it("declares exports.{.,./cloud} with both types + import entry points", () => {
    expect(pkg.exports["."]).toEqual({
      types: "./dist/index.d.ts",
      import: "./dist/index.js",
    });
    expect(pkg.exports["./cloud"]).toEqual({
      types: "./dist/cloud.d.ts",
      import: "./dist/cloud.js",
    });
  });

  // Integration test — actually runs `npm pack --dry-run --json` and
  // asserts the real tarball manifest. This is the load-bearing check:
  // the assertions above verify the package.json declarations match
  // expectations, but only npm-pack itself can verify the actual files
  // that WILL ship to the registry (e.g., that `npm run build` produced
  // the dist files, that files[] picks them up, that no src/tests leak).
  // Runs on every `npm test`; ~1.7s cost is acceptable for a
  // registry-behavior gate.
  it("npm pack --dry-run --json lists every required file (integration)", () => {
    // Run build first so dist/ is present.
    execSync("npm run build", { cwd: pkgRoot, stdio: "pipe" });
    const json = execSync("npm pack --dry-run --json", {
      cwd: pkgRoot,
      encoding: "utf-8",
    });
    const manifest = JSON.parse(json)[0] as {
      name: string;
      version: string;
      files: Array<{ path: string; size: number }>;
      size: number;
      unpackedSize: number;
    };
    // Assert the manifest name + version match the package.json.
    expect(manifest.name).toBe(pkg.name);
    expect(manifest.version).toBe(pkg.version);
    const paths = new Set(manifest.files.map((f) => f.path));
    const required = [
      "LICENSE",
      "README.md",
      "CHANGELOG.md",
      "package.json",
      "dist/index.js",
      "dist/index.d.ts",
      "dist/cloud.js",
      "dist/cloud.d.ts",
    ];
    // Compute the set of missing required files and assert it is empty.
    // If non-empty, the failure message names every missing file at once
    // instead of erroring on the first gap.
    const missing = required.filter((r) => !paths.has(r));
    expect(missing).toEqual([]);
    // Negative assertion: src/ and tests/ must NOT ship (would double
    // the tarball size + leak test fixtures to every consumer).
    const leaked = [...paths].filter(
      (p) => p.startsWith("src/") || p.startsWith("tests/"),
    );
    expect(leaked).toEqual([]);

    // Sanity-check the packed+unpacked sizes are non-trivial (catch the
    // "empty tarball" failure mode where build silently produced no
    // output). 1 KB packed is the floor for a working dist.
    expect(manifest.size).toBeGreaterThan(1024);
    expect(manifest.unpackedSize).toBeGreaterThan(manifest.size);
  });
});
