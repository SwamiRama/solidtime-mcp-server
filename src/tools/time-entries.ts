import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { API_PATHS, GROUP_BY_VALUES, PAGINATION } from "../constants.js";
import { coerceBoolean, coerceUuidArray } from "../schemas.js";
import { formatDuration, formatCurrency, formatDateTime, nowUTC } from "../formatting.js";
import type { TimeEntry, TimeEntryReport, PaginatedResponse } from "../types.js";

export function registerTimeEntryTools(
  server: McpServer,
  api: ApiClient,
  orgId: string,
  getMemberId: () => string
) {
  async function getActiveTimer(): Promise<TimeEntry | null> {
    const response = await api.getOrNull<{ data: TimeEntry }>(API_PATHS.activeTimer);
    return response?.data ?? null;
  }

  // --- Get Active Timer ---
  server.registerTool(
    "solidtime_get_active_timer",
    {
      title: "Get Active Timer",
      description: "Get the currently running timer, or null if no timer is active.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      const entry = await getActiveTimer();
      if (!entry) {
        return { content: [{ type: "text", text: "No active timer." }] };
      }
      return { content: [{ type: "text", text: formatTimeEntry(entry) }] };
    }
  );

  // --- Start Timer ---
  server.registerTool(
    "solidtime_start_timer",
    {
      title: "Start Timer",
      description:
        "Start a new running timer. Checks for an existing active timer first. Use solidtime_stop_timer to stop it later.",
      inputSchema: {
        project_id: z.string().uuid().optional().describe("Project UUID"),
        task_id: z.string().uuid().optional().describe("Task UUID"),
        description: z.string().max(5000).optional().describe("What you're working on"),
        billable: coerceBoolean.optional().describe("Whether this time is billable"),
        tag_ids: coerceUuidArray.optional().describe("Array of tag UUIDs to attach"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      const existing = await getActiveTimer();
      if (existing) {
        return {
          content: [
            {
              type: "text",
              text: `A timer is already running (started ${formatDateTime(existing.start)}). Stop it first with solidtime_stop_timer.\n\n${formatTimeEntry(existing)}`,
            },
          ],
        };
      }

      const body: Record<string, unknown> = {
        member_id: getMemberId(),
        start: nowUTC(),
        billable: params.billable ?? false,
      };
      if (params.project_id) body.project_id = params.project_id;
      if (params.task_id) body.task_id = params.task_id;
      if (params.description) body.description = params.description;
      if (params.tag_ids) body.tags = params.tag_ids;

      const result = await api.post<{ data: TimeEntry }>(API_PATHS.timeEntries(orgId), body);
      return {
        content: [{ type: "text", text: `Timer started.\n\n${formatTimeEntry(result.data)}` }],
      };
    }
  );

  // --- Stop Timer ---
  server.registerTool(
    "solidtime_stop_timer",
    {
      title: "Stop Timer",
      description: "Stop the currently running timer by setting end time to now.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      const existing = await getActiveTimer();
      if (!existing) {
        return { content: [{ type: "text", text: "No active timer to stop." }] };
      }

      const result = await api.put<{ data: TimeEntry }>(API_PATHS.timeEntry(orgId, existing.id), {
        end: nowUTC(),
      });
      return {
        content: [{ type: "text", text: `Timer stopped.\n\n${formatTimeEntry(result.data)}` }],
      };
    }
  );

  // --- List Time Entries ---
  server.registerTool(
    "solidtime_list_time_entries",
    {
      title: "List Time Entries",
      description:
        "List time entries with optional filters. Returns newest first. Use limit/offset for pagination.",
      inputSchema: {
        start: z
          .string()
          .optional()
          .describe(
            "Filter: only entries starting after this UTC datetime (e.g. 2026-03-01T00:00:00Z)"
          ),
        end: z.string().optional().describe("Filter: only entries ending before this UTC datetime"),
        active: z.enum(["true", "false"]).optional().describe("Filter by active/inactive"),
        billable: z.enum(["true", "false"]).optional().describe("Filter by billable status"),
        project_ids: coerceUuidArray.optional().describe("Filter by project UUIDs"),
        client_ids: coerceUuidArray.optional().describe("Filter by client UUIDs"),
        task_ids: coerceUuidArray.optional().describe("Filter by task UUIDs"),
        tag_ids: coerceUuidArray.optional().describe("Filter by tag UUIDs"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(PAGINATION.maxLimit)
          .optional()
          .describe(
            `Number of entries to return (1-${PAGINATION.maxLimit}, default ${PAGINATION.defaultLimit})`
          ),
        offset: z.number().int().min(0).optional().describe("Offset for pagination (default 0)"),
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
      if (params.start) query.set("start", params.start);
      if (params.end) query.set("end", params.end);
      if (params.active) query.set("active", params.active);
      if (params.billable) query.set("billable", params.billable);
      if (params.project_ids)
        params.project_ids.forEach((id) => query.append("filter[project_ids][]", id));
      if (params.client_ids)
        params.client_ids.forEach((id) => query.append("filter[client_ids][]", id));
      if (params.task_ids) params.task_ids.forEach((id) => query.append("filter[task_ids][]", id));
      if (params.tag_ids) params.tag_ids.forEach((id) => query.append("filter[tag_ids][]", id));

      const limit = params.limit ?? PAGINATION.defaultLimit;
      const offset = params.offset ?? 0;
      query.set("limit", String(limit));
      query.set("offset", String(offset));

      const path = `${API_PATHS.timeEntries(orgId)}?${query.toString()}`;
      const result = await api.get<PaginatedResponse<TimeEntry>>(path);

      const entries = result.data ?? [];
      if (entries.length === 0) {
        return { content: [{ type: "text", text: "No time entries found." }] };
      }

      const hasMore = entries.length === limit;
      const lines = entries.map((e, i) => `${i + 1 + offset}. ${formatTimeEntry(e)}`);
      if (hasMore) {
        lines.push(
          `\n--- Showing ${entries.length} entries. Use offset=${offset + limit} to see more. ---`
        );
      }
      lines.unshift(`Found ${entries.length} time entries:\n`);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // --- Create Time Entry ---
  server.registerTool(
    "solidtime_create_time_entry",
    {
      title: "Create Time Entry",
      description:
        "Create a completed time entry with start and end times. For running timers, use solidtime_start_timer instead.",
      inputSchema: {
        start: z.string().describe("Start time in UTC (e.g. 2026-03-03T09:00:00Z)"),
        end: z.string().describe("End time in UTC (e.g. 2026-03-03T10:30:00Z)"),
        project_id: z.string().uuid().optional().describe("Project UUID"),
        task_id: z.string().uuid().optional().describe("Task UUID"),
        description: z.string().max(5000).optional().describe("What was done"),
        billable: coerceBoolean
          .optional()
          .describe("Whether this time is billable (default false)"),
        tag_ids: coerceUuidArray.optional().describe("Array of tag UUIDs to attach"),
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
        member_id: getMemberId(),
        start: params.start,
        end: params.end,
        billable: params.billable ?? false,
      };
      if (params.project_id) body.project_id = params.project_id;
      if (params.task_id) body.task_id = params.task_id;
      if (params.description) body.description = params.description;
      if (params.tag_ids) body.tags = params.tag_ids;

      const result = await api.post<{ data: TimeEntry }>(API_PATHS.timeEntries(orgId), body);
      return {
        content: [{ type: "text", text: `Time entry created.\n\n${formatTimeEntry(result.data)}` }],
      };
    }
  );

  // --- Update Time Entry ---
  server.registerTool(
    "solidtime_update_time_entry",
    {
      title: "Update Time Entry",
      description: "Update an existing time entry. Only provided fields will be changed.",
      inputSchema: {
        id: z.string().uuid().describe("Time entry UUID to update"),
        start: z.string().optional().describe("New start time in UTC"),
        end: z.string().optional().describe("New end time in UTC"),
        project_id: z.string().uuid().optional().describe("New project UUID"),
        task_id: z.string().uuid().optional().describe("New task UUID"),
        description: z.string().max(5000).optional().describe("New description"),
        billable: coerceBoolean.optional().describe("New billable status"),
        tag_ids: z
          .array(z.string().uuid())
          .optional()
          .describe("New tag UUIDs (replaces existing tags)"),
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
      if (params.start !== undefined) body.start = params.start;
      if (params.end !== undefined) body.end = params.end;
      if (params.project_id !== undefined) body.project_id = params.project_id;
      if (params.task_id !== undefined) body.task_id = params.task_id;
      if (params.description !== undefined) body.description = params.description;
      if (params.billable !== undefined) body.billable = params.billable;
      if (params.tag_ids !== undefined) body.tags = params.tag_ids;

      const result = await api.put<{ data: TimeEntry }>(
        API_PATHS.timeEntry(orgId, params.id),
        body
      );
      return {
        content: [{ type: "text", text: `Time entry updated.\n\n${formatTimeEntry(result.data)}` }],
      };
    }
  );

  // --- Delete Time Entry ---
  server.registerTool(
    "solidtime_delete_time_entry",
    {
      title: "Delete Time Entry",
      description: "Permanently delete a time entry. This cannot be undone.",
      inputSchema: {
        id: z.string().uuid().describe("Time entry UUID to delete"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      await api.delete(API_PATHS.timeEntry(orgId, params.id));
      return { content: [{ type: "text", text: `Time entry ${params.id} deleted.` }] };
    }
  );

  // --- Time Entry Report ---
  server.registerTool(
    "solidtime_get_time_entry_report",
    {
      title: "Time Entry Report",
      description:
        "Get aggregated time entry data grouped by a dimension (day, week, month, year, project, client, task, user, billable, description, tag). Optionally add a sub-grouping.",
      inputSchema: {
        group_by: z.enum(GROUP_BY_VALUES).describe("Primary grouping dimension"),
        sub_group: z.enum(GROUP_BY_VALUES).optional().describe("Secondary grouping dimension"),
        start: z
          .string()
          .optional()
          .describe("Filter: only entries starting after this UTC datetime"),
        end: z.string().optional().describe("Filter: only entries ending before this UTC datetime"),
        project_ids: coerceUuidArray.optional().describe("Filter by project UUIDs"),
        client_ids: coerceUuidArray.optional().describe("Filter by client UUIDs"),
        billable: z.enum(["true", "false"]).optional().describe("Filter by billable status"),
        tag_ids: coerceUuidArray.optional().describe("Filter by tag UUIDs"),
        member_ids: coerceUuidArray.optional().describe("Filter by member UUIDs"),
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
      query.set("group", params.group_by);
      if (params.sub_group) query.set("sub_group", params.sub_group);
      if (params.start) query.set("start", params.start);
      if (params.end) query.set("end", params.end);
      if (params.billable) query.set("billable", params.billable);
      if (params.project_ids)
        params.project_ids.forEach((id) => query.append("filter[project_ids][]", id));
      if (params.client_ids)
        params.client_ids.forEach((id) => query.append("filter[client_ids][]", id));
      if (params.tag_ids) params.tag_ids.forEach((id) => query.append("filter[tag_ids][]", id));
      if (params.member_ids)
        params.member_ids.forEach((id) => query.append("filter[member_ids][]", id));

      const path = `${API_PATHS.timeEntryReport(orgId)}?${query.toString()}`;
      const result = await api.get<TimeEntryReport>(path);

      if (!result.grouped_data || result.grouped_data.length === 0) {
        return { content: [{ type: "text", text: "No data for this report." }] };
      }

      const lines = [`Report grouped by: ${result.grouped_type}\n`];
      for (const group of result.grouped_data) {
        const duration = formatDuration(group.seconds);
        const cost = group.cost > 0 ? ` (${formatCurrency(group.cost)})` : "";
        lines.push(`${group.key}: ${duration}${cost}`);

        if (group.grouped_data) {
          for (const sub of group.grouped_data) {
            const subDuration = formatDuration(sub.seconds);
            const subCost = sub.cost > 0 ? ` (${formatCurrency(sub.cost)})` : "";
            lines.push(`  ${sub.key}: ${subDuration}${subCost}`);
          }
        }
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}

function formatTimeEntry(entry: TimeEntry): string {
  const parts: string[] = [`ID: ${entry.id}`];
  if (entry.description) parts.push(`Description: ${entry.description}`);
  parts.push(`Start: ${formatDateTime(entry.start)}`);
  if (entry.end) {
    parts.push(`End: ${formatDateTime(entry.end)}`);
  } else {
    parts.push("Status: RUNNING");
  }
  if (entry.duration !== null && entry.duration !== undefined) {
    parts.push(`Duration: ${formatDuration(entry.duration)}`);
  }
  parts.push(`Billable: ${entry.billable ? "Yes" : "No"}`);
  if (entry.project_id) parts.push(`Project ID: ${entry.project_id}`);
  if (entry.task_id) parts.push(`Task ID: ${entry.task_id}`);
  if (entry.tags && entry.tags.length > 0) parts.push(`Tags: ${entry.tags.join(", ")}`);
  return parts.join("\n");
}
