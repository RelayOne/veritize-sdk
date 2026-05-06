// Intermediate barrel — kept so that local imports inside the package
// can write `from "./client.js"`. Does NOT re-export from `./cloud`;
// consumers reach the cloud surface via the `@verity/client/cloud`
// subpath (src/cloud.ts).
export * from "./base.js";
export * from "./public.js";
