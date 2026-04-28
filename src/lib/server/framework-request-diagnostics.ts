import "server-only";

import { recordRouteFailure } from "@/lib/server/route-diagnostics";
import { recordRuntimeWarning } from "@/lib/server/runtime-warning-store";

type RequestErrorContext = {
  routerKind?: string;
  routePath?: string;
  routeType?: string;
  renderSource?: string;
  renderType?: string;
};

function sanitizeText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 200)
    : fallback;
}

function toUrlPath(input: unknown) {
  if (typeof input !== "string" || input.trim().length === 0) {
    return "";
  }

  try {
    return new URL(input).pathname.slice(0, 200);
  } catch {
    return input.slice(0, 200);
  }
}

function buildFrameworkSurface(request: { url?: string } | undefined, context: RequestErrorContext | undefined) {
  return sanitizeText(
    context?.routePath
      || context?.routeType
      || toUrlPath(request?.url)
      || "next/request",
    "next/request",
  );
}

function readHeader(headers: unknown, name: string) {
  if (!headers || typeof headers !== "object") {
    return undefined;
  }

  if ("get" in headers && typeof headers.get === "function") {
    const value = headers.get(name);
    return typeof value === "string" && value.trim().length > 0 ? value : undefined;
  }

  const record = headers as Record<string, unknown>;
  const directValue = record[name] ?? record[name.toLowerCase()];
  if (Array.isArray(directValue)) {
    const firstValue = directValue.find((entry) => typeof entry === "string" && entry.trim().length > 0);
    return typeof firstValue === "string" ? firstValue : undefined;
  }

  return typeof directValue === "string" && directValue.trim().length > 0 ? directValue : undefined;
}

export async function recordFrameworkRequestError(input: {
  error: unknown;
  request?: {
    method?: string;
    url?: string;
    headers?: Headers;
  };
  context?: RequestErrorContext;
}) {
  const surface = buildFrameworkSurface(input.request, input.context);
  const method = sanitizeText(input.request?.method, "UNKNOWN");
  const routeContext = `next/request-error:${surface}`;
  const traceId = readHeader(input.request?.headers, "x-request-id")
    || readHeader(input.request?.headers, "x-cloud-trace-context")
    || undefined;

  recordRouteFailure(routeContext, input.error, {
    channel: "runtime",
    message: `Framework request error at ${surface}`,
    traceId,
    moduleKey: sanitizeText(input.context?.routeType, "request"),
    detail: {
      method,
      urlPath: toUrlPath(input.request?.url),
      routerKind: sanitizeText(input.context?.routerKind, "unknown"),
      routeType: sanitizeText(input.context?.routeType, "unknown"),
      renderSource: sanitizeText(input.context?.renderSource, "unknown"),
      renderType: sanitizeText(input.context?.renderType, "unknown"),
    },
  });

  await recordRuntimeWarning({
    code: "framework_request_error",
    severity: "error",
    executionLayer: "next_route",
    status: "failed",
    surface,
    moduleKey: sanitizeText(input.context?.routeType, "request"),
    detail: {
      method,
      routeContext,
      urlPath: toUrlPath(input.request?.url),
      routerKind: sanitizeText(input.context?.routerKind, "unknown"),
      routeType: sanitizeText(input.context?.routeType, "unknown"),
      renderSource: sanitizeText(input.context?.renderSource, "unknown"),
      renderType: sanitizeText(input.context?.renderType, "unknown"),
      traceId: traceId ?? null,
    },
  });
}
