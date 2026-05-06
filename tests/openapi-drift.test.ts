// OpenAPI drift guard. The canonical version lives inside the veritize
// monorepo where it can read relayone/verity/docs/openapi.yaml. In the
// standalone SDK repo there is no monorepo OpenAPI spec to diff against
// — the canonical guard runs in the monorepo's CI. A future SDK release
// can re-introduce the diff by fetching the published OpenAPI from
// api.veritize.app/openapi.yaml at test time.

import { describe, it, expect } from "vitest";

describe("OpenAPI drift (standalone-SDK no-op)", () => {
  it("trivially passes outside the monorepo", () => {
    expect("standalone-sdk").toStrictEqual("standalone-sdk");
  });
});
