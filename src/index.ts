#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main() {
  const apiToken = process.env.SOLIDTIME_API_TOKEN;
  const organizationId = process.env.SOLIDTIME_ORGANIZATION_ID;
  const apiUrl = process.env.SOLIDTIME_API_URL;

  if (!apiToken) {
    console.error("Error: SOLIDTIME_API_TOKEN environment variable is required.");
    console.error("Get your API token from your SolidTime instance under Settings > API.");
    process.exit(1);
  }

  if (!organizationId) {
    console.error("Error: SOLIDTIME_ORGANIZATION_ID environment variable is required.");
    console.error("Find your organization ID in the SolidTime URL or API response.");
    process.exit(1);
  }

  const server = await createServer({ apiToken, organizationId, apiUrl });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
