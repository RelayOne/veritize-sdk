// V6-4 regression guard. Originally lived inside the veritize monorepo
// and asserted packages/client-ts-legacy/ had been deleted post-cutover.
// In the standalone @veritize/client SDK repo there is no monorepo
// context — the assertion is intentionally a no-op here. The canonical
// guard lives in the source monorepo at
// RelayOne/veritize/relayone/veritize/packages/client-ts/tests/.

import { describe, it, expect } from "vitest";

describe("V6-4 legacy-drop guard (standalone-SDK no-op)", () => {
  it("trivially passes outside the monorepo", () => {
    expect("standalone-sdk").toStrictEqual("standalone-sdk");
  });
});
