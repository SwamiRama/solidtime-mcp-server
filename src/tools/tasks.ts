import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { API_PATHS } from "../constants.js";
import { coerceBoolean } from "../schemas.js";
import { formatDuration } from "../formatting.js";
import type { Task, PaginatedResponse } from "../types.js";

export function registerTaskTools(server: McpServer, api: ApiClient, orgId: string) {
  server.registerTool(
    "solidtime_list_tasks",
    {
      title: "List Tasks",
      description: "List tasks. Optionally filter by project or done status.",
      inputSchema: {
        project_id: z.string().uuid().optional().describe("Filter by project UUID"),
        done: z.enum(["true", "false"]).optional().describe("Filter by done status"),
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
      if (params.project_id) query.set("project_id", params.project_id);
      if (params.done) query.set("done", params.done);
      const qs = query.toString();
      const path = qs ? `${API_PATHS.tasks(orgId)}?${qs}` : API_PATHS.tasks(orgId);

      const result = await api.get<PaginatedResponse<Task>>(path);
      const tasks = result.data ?? [];
      if (tasks.length === 0) {
        return { content: [{ type: "text", text: "No tasks found." }] };
      }

      const lines = tasks.map((t) => formatTask(t));
      lines.unshift(`Found ${tasks.length} tasks:\n`);
      return { content: [{ type: "text", text: lines.join("\n\n") }] };
    }
  );

  server.registerTool(
    "solidtime_create_task",
    {
      title: "Create Task",
      description: "Create a new task within a project.",
      inputSchema: {
        name: z.string().min(1).describe("Task name"),
        project_id: z.string().uuid().describe("Project UUID this task belongs to"),
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
        project_id: params.project_id,
      };
      if (params.estimated_time !== undefined) body.estimated_time = params.estimated_time;

      const result = await api.post<{ data: Task }>(API_PATHS.tasks(orgId), body);
      return {
        content: [{ type: "text", text: `Task created.\n\n${formatTask(result.data)}` }],
      };
    }
  );

  server.registerTool(
    "solidtime_update_task",
    {
      title: "Update Task",
      description: "Update a task's name, done status, or estimated time.",
      inputSchema: {
        id: z.string().uuid().describe("Task UUID to update"),
        name: z.string().min(1).optional().describe("New task name"),
        is_done: coerceBoolean.optional().describe("Mark task as done or not done"),
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
      const body: Record<string, unknown> = {};
      if (params.name !== undefined) body.name = params.name;
      if (params.is_done !== undefined) body.is_done = params.is_done;
      if (params.estimated_time !== undefined) body.estimated_time = params.estimated_time;

      const result = await api.put<{ data: Task }>(API_PATHS.task(orgId, params.id), body);
      return {
        content: [{ type: "text", text: `Task updated.\n\n${formatTask(result.data)}` }],
      };
    }
  );
}

function formatTask(t: Task): string {
  const parts = [
    `ID: ${t.id}`,
    `Name: ${t.name}`,
    `Done: ${t.is_done ? "Yes" : "No"}`,
    `Project ID: ${t.project_id}`,
  ];
  if (t.estimated_time !== null) parts.push(`Estimated: ${formatDuration(t.estimated_time)}`);
  if (t.spent_time > 0) parts.push(`Spent: ${formatDuration(t.spent_time)}`);
  return parts.join("\n");
}
