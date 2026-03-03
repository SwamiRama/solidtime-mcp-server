import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { API_PATHS } from "../constants.js";
import type { Client, PaginatedResponse } from "../types.js";

export function registerClientTools(server: McpServer, api: ApiClient, orgId: string) {
  server.registerTool(
    "solidtime_list_clients",
    {
      title: "List Clients",
      description: "List all clients in the organization. Optionally filter by archived status.",
      inputSchema: {
        archived: z.enum(["true", "false"]).optional().describe("Filter by archived status"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const query = new URLSearchParams();
      if (params.archived) query.set("archived", params.archived);
      const qs = query.toString();
      const path = qs ? `${API_PATHS.clients(orgId)}?${qs}` : API_PATHS.clients(orgId);

      const result = await api.get<PaginatedResponse<Client>>(path);
      const clients = result.data ?? [];
      if (clients.length === 0) {
        return { content: [{ type: "text", text: "No clients found." }] };
      }

      const lines = clients.map(
        (c) => `ID: ${c.id}\nName: ${c.name}\nArchived: ${c.is_archived ? "Yes" : "No"}`
      );
      lines.unshift(`Found ${clients.length} clients:\n`);
      return { content: [{ type: "text", text: lines.join("\n\n") }] };
    }
  );

  server.registerTool(
    "solidtime_create_client",
    {
      title: "Create Client",
      description: "Create a new client.",
      inputSchema: {
        name: z.string().min(1).describe("Client name"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      const result = await api.post<{ data: Client }>(API_PATHS.clients(orgId), {
        name: params.name,
      });
      return {
        content: [
          {
            type: "text",
            text: `Client created.\n\nID: ${result.data.id}\nName: ${result.data.name}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "solidtime_update_client",
    {
      title: "Update Client",
      description: "Update a client's name.",
      inputSchema: {
        id: z.string().uuid().describe("Client UUID to update"),
        name: z.string().min(1).describe("New client name"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const result = await api.put<{ data: Client }>(API_PATHS.client(orgId, params.id), {
        name: params.name,
      });
      return {
        content: [
          {
            type: "text",
            text: `Client updated.\n\nID: ${result.data.id}\nName: ${result.data.name}`,
          },
        ],
      };
    }
  );
}
