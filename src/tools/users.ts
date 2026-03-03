import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApiClient } from "../api-client.js";
import { API_PATHS } from "../constants.js";
import type { User } from "../types.js";

export function registerUserTools(server: McpServer, api: ApiClient, getMemberId: () => string) {
  server.registerTool(
    "solidtime_get_current_user",
    {
      title: "Get Current User",
      description:
        "Get the current user profile including name, email, timezone, and the resolved member_id for this organization.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      const response = await api.get<{ data: User }>(API_PATHS.me);
      const user = response.data;
      const memberId = getMemberId();
      const text = [
        `Name: ${user.name}`,
        `Email: ${user.email}`,
        `Timezone: ${user.timezone}`,
        `Week starts: ${user.week_start}`,
        `Member ID: ${memberId}`,
      ].join("\n");

      return { content: [{ type: "text", text }] };
    }
  );
}
