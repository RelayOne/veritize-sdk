// publish-manifest invariants — assert package.json's `files` array
// keeps the artifacts a consumer needs after `npm install
// github:RelayOne/veritize-sdk` (or eventually `npm install
// @veritize/client`). Lighter-weight than the monorepo's pack:smoke
// gate because the SDK repo has a `prepare` hook that builds dist/ on
// install — the npm tarball shape doesn't apply to git-source installs.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "..", "package.json"), "utf8"),
);

describe("package.json publish manifest", () => {
  it("name is @veritize/client", () => {
    expect(pkg.name).toStrictEqual("@veritize/client");
  });

  it("declares both . and ./cloud subpath exports", () => {
    expect(Object.keys(pkg.exports).sort()).toStrictEqual([".", "./cloud"]);
  });

  it("files array includes dist + LICENSE + README + CHANGELOG", () => {
    for (const required of ["dist", "README.md", "CHANGELOG.md", "LICENSE"]) {
      expect(pkg.files).toContain(required);
    }
  });

  it("has a `prepare` script so git-source installs build dist/ automatically", () => {
    expect(pkg.scripts.prepare).toBeDefined();
    expect(pkg.scripts.prepare).toMatch(/tsc/);
  });

  it("repository.url points at RelayOne/veritize-sdk (the public SDK repo)", () => {
    expect(pkg.repository.url).toMatch(/RelayOne\/veritize-sdk/);
  });

  it("declares no runtime dependencies (zero-dep SDK)", () => {
    expect(pkg.dependencies ?? {}).toStrictEqual({});
  });

  it("type=module so ESM consumers get .mjs-style imports", () => {
    expect(pkg.type).toStrictEqual("module");
  });
});
