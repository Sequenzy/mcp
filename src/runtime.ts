import { AsyncLocalStorage } from "node:async_hooks";

import {
  formatMcpError,
  McpApiError,
  type McpApiErrorContext,
} from "./error-output.js";

const DEFAULT_API_URL = "https://api.sequenzy.com";

export interface McpRequestContext {
  apiKey?: string | undefined;
  apiUrl?: string | undefined;
  selectedCompanyId?: string | null | undefined;
}

const requestContextStorage = new AsyncLocalStorage<McpRequestContext>();

/**
 * Whether tools may read files from the local filesystem (e.g. uploading a
 * product delivery file from a path). Only the local stdio server enables
 * this; the hosted remote MCP server must never read server-side paths.
 */
let localFileUploadsEnabled = false;

export function enableLocalFileUploads(): void {
  localFileUploadsEnabled = true;
}

export function areLocalFileUploadsEnabled(): boolean {
  return localFileUploadsEnabled;
}

let selectedCompanyId: string | null = null;

export function getSelectedCompanyId(): string | null {
  const context = requestContextStorage.getStore();
  if (context) {
    return context.selectedCompanyId ?? null;
  }

  return selectedCompanyId;
}

export function setSelectedCompanyId(companyId: string | null): void {
  const context = requestContextStorage.getStore();
  if (context) {
    context.selectedCompanyId = companyId;
    return;
  }

  selectedCompanyId = companyId;
}

export function withMcpRequestContext<T>(
  context: McpRequestContext,
  callback: () => T
): T {
  return requestContextStorage.run(context, callback);
}

function getApiUrl(): string {
  return (
    requestContextStorage.getStore()?.apiUrl ??
    process.env.SEQUENZY_API_URL ??
    DEFAULT_API_URL
  );
}

function getApiKey(): string | undefined {
  return (
    requestContextStorage.getStore()?.apiKey ?? process.env.SEQUENZY_API_KEY
  );
}

export function assertConfiguredApiKey(): void {
  if (getApiKey()) {
    return;
  }

  console.error(
    formatMcpError(
      new McpApiError(
        "SEQUENZY_API_KEY environment variable is required",
        401,
        undefined,
        "MCP_AUTH_REQUIRED"
      )
    )
  );
  process.exit(1);
}

function getStringField(
  record: Record<string, unknown>,
  key: string
): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function formatStructuredDetails(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  return JSON.stringify(value);
}

function parseApiErrorPayload(raw: string): {
  message: string;
  code?: string;
  details?: string;
  context?: McpApiErrorContext;
} {
  if (!raw.trim()) {
    return { message: "Request failed" };
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | string;

    if (typeof parsed === "string") {
      return { message: parsed };
    }

    const nestedError =
      typeof parsed.error === "object" && parsed.error !== null
        ? (parsed.error as Record<string, unknown>)
        : undefined;

    const code =
      getStringField(parsed, "code") ??
      (nestedError ? getStringField(nestedError, "code") : undefined);
    const message =
      (typeof parsed.error === "string" ? parsed.error : undefined) ??
      (nestedError ? getStringField(nestedError, "message") : undefined) ??
      getStringField(parsed, "message") ??
      getStringField(parsed, "error") ??
      raw;
    const howToFix =
      getStringField(parsed, "howToFix") ??
      getStringField(parsed, "resolution");
    const context: McpApiErrorContext = {
      ...(getStringField(parsed, "title")
        ? { title: getStringField(parsed, "title") }
        : {}),
      ...(getStringField(parsed, "description")
        ? { description: getStringField(parsed, "description") }
        : {}),
      ...(howToFix ? { howToFix } : {}),
      ...(getStringField(parsed, "docsUrl")
        ? { docsUrl: getStringField(parsed, "docsUrl") }
        : {}),
    };
    const details = formatStructuredDetails(parsed.details);

    if (Object.keys(context).length > 0 || details) {
      return {
        message,
        ...(code ? { code } : {}),
        ...(details ? { details } : {}),
        ...(Object.keys(context).length > 0 ? { context } : {}),
      };
    }

    if (typeof parsed.error === "string") {
      return {
        message: parsed.error,
        ...(code ? { code } : {}),
      };
    }

    if (nestedError) {
      return {
        message,
        ...(code ? { code } : {}),
      };
    }

    return {
      message,
      ...(code ? { code } : {}),
    };
  } catch {
    return { message: raw };
  }
}

export async function apiRequest<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  companyIdOverride?: string
): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new McpApiError(
      "SEQUENZY_API_KEY environment variable is required",
      401,
      undefined,
      "MCP_AUTH_REQUIRED"
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const effectiveCompanyId = companyIdOverride ?? getSelectedCompanyId();
  if (effectiveCompanyId) {
    headers["x-company-id"] = effectiveCompanyId;
  }

  let response: Response;

  try {
    response = await fetch(`${getApiUrl()}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new McpApiError(
      error instanceof Error ? error.message : "Failed to reach Sequenzy API",
      0,
      undefined,
      "NETWORK_ERROR"
    );
  }

  if (!response.ok) {
    const rawError = await response.text();
    const parsedError = parseApiErrorPayload(rawError);
    throw new McpApiError(
      parsedError.message,
      response.status,
      parsedError.details ?? rawError,
      parsedError.code,
      parsedError.context
    );
  }

  return response.json() as Promise<T>;
}
