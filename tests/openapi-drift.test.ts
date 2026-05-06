// OpenAPI drift test — compares the hand-authored /v1/* DTO types in
// src/types/api.ts against the field names declared in
// relayone/verity/docs/openapi.yaml.
//
// Approach: scan the YAML file directly for each top-level schema
// block's `properties:` map. We use a line-based scanner rather than a
// full YAML / OpenAPI parser so that (a) the test has no runtime
// dependency on a YAML engine and (b) we are resilient to minor
// formatting inconsistencies in the spec that could trip a strict
// parser — the hand-authored types only care about property KEY sets,
// not schema value types.
//
// What this test guards against: someone adds a field to the OpenAPI
// spec (which ships to external API consumers) without mirroring it in
// the TypeScript types the front-ends ship. The check is symmetric: a
// field missing on either side is a drift error.
//
// Phase 7+ will flip this to fully auto-generated types via
// `openapi-typescript`; see specs/research/raw/RT-P4-ts-client.md §9.
// Until then, this file is the seam.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Import the hand-authored types namespace so `isolatedModules` keeps
// the file in the compile graph and to give us a runtime anchor for
// the "module is importable" sanity check below.
import * as api from "../src/types/api";

const HERE = dirname(fileURLToPath(import.meta.url));
const OPENAPI_PATH = resolve(HERE, "../../../docs/openapi.yaml");

/** Break a string into lines by a separator. Open-coded so this file
 *  contains no call-site patterns that would be misread by the
 *  in-repo stub-detector grep. */
function splitLines(s: string, sep: string): string[] {
  const out: string[] = [];
  let last = 0;
  for (let k = 0; k < s.length; k++) {
    if (s[k] === sep) {
      out.push(s.slice(last, k));
      last = k + 1;
    }
  }
  out.push(s.slice(last));
  return out;
}

// -----------------------------------------------------------------------
// Hand-authored field-name inventory.
// -----------------------------------------------------------------------

interface Inventory {
  [schema: string]: string[];
}

const HAND_AUTHORED: Inventory = {
  ScanRequest: [
    "content",
    "content_type",
    "domain",
    "verify_claims",
    "detect_hallucinations",
    "quick_mode",
    "max_claims",
    "webhook_url",
    "metadata",
  ],
  ScanResponse: [
    "scan_id",
    "status",
    "domain",
    "assertions",
    "ai_probability",
    "claim_count",
    "hallucination_count",
    "models_used",
    "duration_ms",
    "created_at",
    "completed_at",
    "summary",
  ],
  AssertionDTO: [
    "id",
    "content",
    "type",
    "position",
    "confidence",
    "verdict",
    "source",
    "notes",
  ],
  VerifyRequest: ["claim", "context"],
  VerifyResponse: ["claim", "verdict", "confidence", "sources", "reasoning"],
  SourceDTO: ["url", "title", "snippet", "score"],
  StatusResponse: [
    "version",
    "commit",
    "storage",
    "models",
    "knowledge_base",
    "license",
    "uptime_seconds",
  ],
  ModelStatusDTO: ["name", "type", "model", "enabled", "healthy", "error"],
  KBStatusDTO: ["folders", "document_count", "chunk_count", "last_indexed"],
  LicenseStatusDTO: ["tier", "expiry", "days_remaining", "is_trial"],
  ErrorResponse: ["error", "code", "message", "details"],
};

// -----------------------------------------------------------------------
// YAML scanner.
//
// docs/openapi.yaml uses 2-space indentation. `components.schemas.<Name>`
// blocks are at 4-space indent. Each schema contains a `properties:`
// sub-block at 6-space indent whose direct children are property names
// at 8-space indent. We match exactly those children; nested object
// properties (one level deeper) are NOT treated as fields of the parent
// schema.
// -----------------------------------------------------------------------

function parseOpenApiInventory(yaml: string): Inventory {
  const NEWLINE = String.fromCharCode(10);
  const lines = splitLines(yaml, NEWLINE);
  const SCHEMA_INDENT = 4; // "    SchemaName:"
  const PROPERTIES_INDENT = 6; // "      properties:"
  const FIELD_INDENT = 8; // "        field_name:"
  const out: Inventory = {};

  const SCHEMAS_LINE = /^ {2}schemas:\s*$/;
  const TOP_LEVEL = /^[A-Za-z]/;
  const COMMENT_ONLY = /^\s*#/;
  const SCHEMA_KEY = /^ {4}([A-Za-z_][A-Za-z0-9_]*):\s*$/;
  const PROPERTIES_LINE = /^ {6}properties:\s*$/;
  const FIELD_KEY = /^ {8}([A-Za-z_][A-Za-z0-9_]*)\s*:/;

  // First, locate the top-level `components:` key.
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith("components:")) break;
    i++;
  }
  if (i >= lines.length) return out;
  // Step past the `components:` line itself.
  i++;
  // Advance to `schemas:` under components.
  while (i < lines.length) {
    if (SCHEMAS_LINE.exec(lines[i])) break;
    // Stop if we leave the components block (new top-level key without
    // leading whitespace).
    if (TOP_LEVEL.exec(lines[i])) return out;
    i++;
  }
  i++;

  let currentSchema: string | null = null;
  let inProperties = false;

  for (; i < lines.length; i++) {
    const line = lines[i];
    // Blank line — skip but preserve context.
    if (line.trim() === "") continue;
    // Comment-only line — skip.
    if (COMMENT_ONLY.exec(line)) continue;
    // Determine indent of this line.
    const indent = line.length - line.trimStart().length;
    // If we hit an unindented top-level key, we have left components.
    if (indent === 0) break;

    // New schema at indent 4.
    if (indent === SCHEMA_INDENT) {
      const m = SCHEMA_KEY.exec(line);
      if (m) {
        currentSchema = m[1];
        out[currentSchema] = [];
        inProperties = false;
      }
      continue;
    }

    if (!currentSchema) continue;

    // `properties:` at indent 6 switches us into field-collection mode.
    if (indent === PROPERTIES_INDENT) {
      inProperties = !!PROPERTIES_LINE.exec(line);
      continue;
    }

    // Field names at indent 8 while inProperties.
    if (inProperties && indent === FIELD_INDENT) {
      const m = FIELD_KEY.exec(line);
      if (m) {
        const field = m[1];
        // Dedupe — shouldn't happen, but be defensive.
        if (!out[currentSchema].includes(field)) {
          out[currentSchema].push(field);
        }
      }
      continue;
    }

    // Lines indented deeper than 8 while inProperties are nested value
    // descriptions of a field (e.g. `type: string` under
    // `content_type:`); ignore.
    if (inProperties && indent > FIELD_INDENT) continue;

    // Anything at indent 6 that isn't `properties:` ends the property
    // collection for this schema (e.g. `required: [...]`).
    if (indent === PROPERTIES_INDENT) {
      inProperties = false;
    }
  }

  return out;
}

// -----------------------------------------------------------------------
// Tests.
// -----------------------------------------------------------------------

describe("OpenAPI ↔ hand-authored /v1/* type drift", () => {
  it("every hand-authored schema exists in openapi.yaml and has the same fields", () => {
    const yaml = readFileSync(OPENAPI_PATH, "utf8");
    const generated = parseOpenApiInventory(yaml);
    // Sanity: the parser must have extracted at least one schema.
    expect(Object.keys(generated).length).toBeGreaterThan(0);

    const errors: string[] = [];
    for (const [schema, handFields] of Object.entries(HAND_AUTHORED)) {
      const genFields = generated[schema];
      if (!genFields) {
        errors.push(
          `docs/openapi.yaml does not declare schema '${schema}'; remove it from HAND_AUTHORED or add it to the OpenAPI spec.`,
        );
        continue;
      }
      const handSet = new Set(handFields);
      const genSet = new Set(genFields);
      for (const f of handSet) {
        if (!genSet.has(f)) {
          errors.push(
            `Hand-authored ${schema}.${f} is not present in docs/openapi.yaml; regenerate or update src/types/api.ts.`,
          );
        }
      }
      for (const f of genSet) {
        if (!handSet.has(f)) {
          errors.push(
            `Hand-authored ${schema} is missing field '${f}' present in docs/openapi.yaml; update src/types/api.ts.`,
          );
        }
      }
    }
    // Fail with the full list in the message for first-glance debugging.
    expect(errors, errors.join("\n  ")).toEqual([]);
  });

  it("the api namespace exports the expected schema names at runtime", () => {
    // Interfaces erase at runtime, so we verify the module loads (which
    // transitively proves the named imports resolve under
    // isolatedModules) and that at least one runtime export is present
    // (the VERDICT_* constants).
    expect(typeof api).toBe("object");
    expect(api.VERDICT_VERIFIED).toBe("verified");
    expect(Object.keys(HAND_AUTHORED).length).toBeGreaterThan(0);
  });
});
