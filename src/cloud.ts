// Cloud-only barrel — the import target for the `@verity/client/cloud`
// subpath. Exposes both the cloud DTO types and the cloud client
// wrappers in one module so `verity-cloud-web` can
// `import { getAdminCustomers, IntegrationDTO } from "@verity/client/cloud"`
// without a second import line.

export * from "./types/cloud";
export * from "./client/cloud";
