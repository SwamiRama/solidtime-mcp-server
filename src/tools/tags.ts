import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { API_PATHS } from "../constants.js";
import type { Tag, PaginatedResponse } from "../types.js";

export function registerTagTools(server: McpServer, api: ApiClient, orgId: string) {
  server.registerTool(
    "solidtime_list_tags",
    {
      title: "List Tags",
      description: "List all tags in the organization.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      const result = await api.get<PaginatedResponse<Tag>>(API_PATHS.tags(orgId));
      const tags = result.data ?? [];
      if (tags.length === 0) {
        return { content: [{ type: "text", text: "No tags found." }] };
      }

      const lines = tags.map((t) => `ID: ${t.id}\nName: ${t.name}`);
      lines.unshift(`Found ${tags.length} tags:\n`);
      return { content: [{ type: "text", text: lines.join("\n\n") }] };
    }
  );

  server.registerTool(
    "solidtime_create_tag",
    {
      title: "Create Tag",
      description: "Create a new tag.",
      inputSchema: {
        name: z.string().min(1).describe("Tag name"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      const result = await api.post<{ data: Tag }>(API_PATHS.tags(orgId), { name: params.name });
      return {
        content: [
          {
            type: "text",
            text: `Tag created.\n\nID: ${result.data.id}\nName: ${result.data.name}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "solidtime_update_tag",
    {
      title: "Update Tag",
      description: "Update a tag's name.",
      inputSchema: {
        id: z.string().uuid().describe("Tag UUID to update"),
        name: z.string().min(1).describe("New tag name"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const result = await api.put<{ data: Tag }>(API_PATHS.tag(orgId, params.id), {
        name: params.name,
      });
      return {
        content: [
          {
            type: "text",
            text: `Tag updated.\n\nID: ${result.data.id}\nName: ${result.data.name}`,
          },
        ],
      };
    }
  );
}
