import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { API_PATHS } from "../constants.js";
import { coerceBoolean } from "../schemas.js";
import { formatCurrency, formatDuration } from "../formatting.js";
import type { Project, PaginatedResponse } from "../types.js";

export function registerProjectTools(server: McpServer, api: ApiClient, orgId: string) {
  server.registerTool(
    "solidtime_list_projects",
    {
      title: "List Projects",
      description: "List all projects in the organization. Optionally filter by archived status.",
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
      const path = qs ? `${API_PATHS.projects(orgId)}?${qs}` : API_PATHS.projects(orgId);

      const result = await api.get<PaginatedResponse<Project>>(path);
      const projects = result.data ?? [];
      if (projects.length === 0) {
        return { content: [{ type: "text", text: "No projects found." }] };
      }

      const lines = projects.map((p) => formatProject(p));
      lines.unshift(`Found ${projects.length} projects:\n`);
      return { content: [{ type: "text", text: lines.join("\n\n") }] };
    }
  );

  server.registerTool(
    "solidtime_create_project",
    {
      title: "Create Project",
      description: "Create a new project.",
      inputSchema: {
        name: z.string().min(1).describe("Project name"),
        color: z
          .string()
          .regex(/^#[0-9a-f]{6}$/)
          .describe("Hex color, lowercase (e.g. #4caf50)"),
        is_billable: coerceBoolean.describe("Whether time tracked to this project is billable"),
        client_id: z.string().uuid().describe("Client UUID to assign (required)"),
        billable_rate: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Billable rate in cents (e.g. 15000 = EUR 150.00)"),
        estimated_time: z.number().int().min(0).optional().describe("Estimated time in seconds"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      const body: Record<string, unknown> = {
        name: params.name,
        color: params.color,
        is_billable: params.is_billable,
        client_id: params.client_id,
      };
      if (params.billable_rate !== undefined) body.billable_rate = params.billable_rate;
      if (params.estimated_time !== undefined) body.estimated_time = params.estimated_time;

      const result = await api.post<{ data: Project }>(API_PATHS.projects(orgId), body);
      return {
        content: [{ type: "text", text: `Project created.\n\n${formatProject(result.data)}` }],
      };
    }
  );

  server.registerTool(
    "solidtime_update_project",
    {
      title: "Update Project",
      description: "Update an existing project. Only provided fields will be changed.",
      inputSchema: {
        id: z.string().uuid().describe("Project UUID to update"),
        name: z.string().min(1).optional().describe("New project name"),
        color: z
          .string()
          .regex(/^#[0-9a-f]{6}$/)
          .optional()
          .describe("New hex color, lowercase (e.g. #4caf50)"),
        is_billable: coerceBoolean.optional().describe("New billable status"),
        is_archived: coerceBoolean.optional().describe("Archive or unarchive"),
        client_id: z.string().uuid().optional().describe("New client UUID"),
        billable_rate: z.number().int().min(0).optional().describe("New billable rate in cents"),
        estimated_time: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("New estimated time in seconds"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      // SolidTime API requires all fields on PUT, so fetch current state first
      const current = await api.get<{ data: Project }>(API_PATHS.project(orgId, params.id));
      const project = current.data;

      const body: Record<string, unknown> = {
        name: params.name ?? project.name,
        color: params.color ?? project.color,
        is_billable: params.is_billable ?? project.is_billable,
        client_id: params.client_id ?? project.client_id,
      };
      if (params.is_archived !== undefined) body.is_archived = params.is_archived;
      if (params.billable_rate !== undefined) body.billable_rate = params.billable_rate;
      else if (project.billable_rate !== null) body.billable_rate = project.billable_rate;
      if (params.estimated_time !== undefined) body.estimated_time = params.estimated_time;
      else if (project.estimated_time !== null) body.estimated_time = project.estimated_time;

      const result = await api.put<{ data: Project }>(API_PATHS.project(orgId, params.id), body);
      return {
        content: [{ type: "text", text: `Project updated.\n\n${formatProject(result.data)}` }],
      };
    }
  );

  server.registerTool(
    "solidtime_delete_project",
    {
      title: "Delete Project",
      description: "Permanently delete a project. This cannot be undone.",
      inputSchema: {
        id: z.string().uuid().describe("Project UUID to delete"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      await api.delete(API_PATHS.project(orgId, params.id));
      return { content: [{ type: "text", text: `Project ${params.id} deleted.` }] };
    }
  );
}

function formatProject(p: Project): string {
  const parts = [
    `ID: ${p.id}`,
    `Name: ${p.name}`,
    `Color: ${p.color}`,
    `Billable: ${p.is_billable ? "Yes" : "No"}`,
    `Archived: ${p.is_archived ? "Yes" : "No"}`,
  ];
  if (p.billable_rate !== null) parts.push(`Rate: ${formatCurrency(p.billable_rate)}/h`);
  if (p.client_id) parts.push(`Client ID: ${p.client_id}`);
  if (p.estimated_time !== null) parts.push(`Estimated: ${formatDuration(p.estimated_time)}`);
  if (p.spent_time > 0) parts.push(`Spent: ${formatDuration(p.spent_time)}`);
  return parts.join("\n");
}
