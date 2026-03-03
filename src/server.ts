import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApiClient } from "./api-client.js";
import { API_PATHS } from "./constants.js";
import { registerUserTools } from "./tools/users.js";
import { registerTimeEntryTools } from "./tools/time-entries.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerClientTools } from "./tools/clients.js";
import { registerTagTools } from "./tools/tags.js";
import { registerTaskTools } from "./tools/tasks.js";
import type { User, Member, PaginatedResponse } from "./types.js";

interface ServerConfig {
  apiToken: string;
  organizationId: string;
  apiUrl?: string;
}

export async function createServer(config: ServerConfig) {
  const api = new ApiClient(config.apiUrl, config.apiToken);
  const orgId = config.organizationId;

  // Resolve member_id at startup
  const userResponse = await api.get<{ data: User }>(API_PATHS.me);
  const user = userResponse.data;
  const membersResponse = await api.get<PaginatedResponse<Member>>(API_PATHS.members(orgId));
  const members = membersResponse.data ?? [];
  const member = members.find((m) => m.user_id === user.id);

  if (!member) {
    throw new Error(
      `Could not find member for user ${user.email} (${user.id}) in organization ${orgId}. ` +
        `Found ${members.length} members. Verify your SOLIDTIME_ORGANIZATION_ID is correct.`
    );
  }

  const memberId = member.id;
  const getMemberId = () => memberId;

  console.error(`SolidTime MCP: Authenticated as ${user.name} (${user.email}), member ${memberId}`);

  const server = new McpServer({
    name: "solidtime",
    version: "1.0.0",
  });

  registerUserTools(server, api, getMemberId);
  registerTimeEntryTools(server, api, orgId, getMemberId);
  registerProjectTools(server, api, orgId);
  registerClientTools(server, api, orgId);
  registerTagTools(server, api, orgId);
  registerTaskTools(server, api, orgId);

  return server;
}
