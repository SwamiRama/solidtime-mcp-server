import { DEFAULT_API_URL } from "./constants.js";

export class SolidTimeApiError extends Error {
  constructor(
    public status: number,
    public body: unknown
  ) {
    super(getErrorMessage(status, body));
    this.name = "SolidTimeApiError";
  }
}

function getErrorMessage(status: number, body: unknown): string {
  const detail = typeof body === "object" && body !== null ? JSON.stringify(body) : String(body);

  switch (status) {
    case 401:
      return "Authentication failed. Verify your SOLIDTIME_API_TOKEN is valid.";
    case 403:
      return "Permission denied. Your token may lack access to this organization.";
    case 404:
      return "Resource not found. Use the list tools (e.g. solidtime_list_projects) to find valid IDs.";
    case 422:
      return `Validation error: ${formatValidationErrors(body)}`;
    case 429:
      return "Rate limited. Wait a moment and try again.";
    default:
      if (status >= 500) return `SolidTime server error (${status}). Try again later.`;
      return `API error ${status}: ${detail}`;
  }
}

function formatValidationErrors(body: unknown): string {
  if (typeof body !== "object" || body === null) return String(body);
  const obj = body as Record<string, unknown>;
  if (obj.errors && typeof obj.errors === "object") {
    return Object.entries(obj.errors as Record<string, string[]>)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
  }
  if (obj.message) return String(obj.message);
  return JSON.stringify(body);
}

export class ApiClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string | undefined, token: string) {
    this.baseUrl = (baseUrl || DEFAULT_API_URL).replace(/\/$/, "");
    this.token = token;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = path.startsWith("/api/v1")
      ? `${this.baseUrl}${path}`
      : `${this.baseUrl}/api/v1${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/json",
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new Error(
        `Cannot reach SolidTime at ${this.baseUrl}. Check the SOLIDTIME_API_URL setting. (${err})`
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = await response.text().catch(() => "");
    }

    if (!response.ok) {
      throw new SolidTimeApiError(response.status, responseBody);
    }

    return responseBody as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}
