import {
  HUMAN_ERROR_ALIASES,
  HUMAN_ERROR_DICTIONARY,
  isHumanErrorKey,
  type HumanErrorKey,
} from "./error-dictionary";
import type { ErrorSurface, HumanErrorDescriptor } from "./error-language";

type ResolveHumanErrorInput = {
  code?: unknown;
  status?: number | null;
  surface?: ErrorSurface;
  fallback?: HumanErrorKey;
  error?: unknown;
};

type BugReportIntent = {
  shouldShowBugReport: boolean;
  errorKey: string;
  surface: ErrorSurface;
  primaryAction: string;
  rewardEligible: boolean;
  context?: Record<string, unknown>;
};

const RAW_DEV_ERROR_PATTERN =
  /\b(Internal server error|FirebaseError|PayPal|ZodError|JSON\.parse|SyntaxError|Unexpected token|stack trace|Unhandled|ECONN|INSTRUMENT_DECLINED|permission-denied|at\s+\w+\.|Error:)\b/i;

function normalizeCode(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase().replace(/[\s-]+/gu, "_");
}

function withSurface(descriptor: HumanErrorDescriptor, surface?: ErrorSurface): HumanErrorDescriptor {
  return surface && surface !== "unknown" ? { ...descriptor, surface } : descriptor;
}

function resolveKey(code: unknown): HumanErrorKey | null {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return null;
  }

  if (isHumanErrorKey(normalized)) {
    return normalized;
  }

  return HUMAN_ERROR_ALIASES[normalized] ?? null;
}

function readErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "";
  }

  const record = error as Record<string, unknown>;
  const candidate = record.code ?? record.errorCode ?? record.errorKey;
  return typeof candidate === "string" ? candidate : "";
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    return message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const candidate = record.userMessage ?? record.message ?? record.error;
    return typeof candidate === "string" ? candidate : "";
  }

  return "";
}

export function isRawDevErrorMessage(value: unknown) {
  return typeof value === "string" && RAW_DEV_ERROR_PATTERN.test(value);
}

export function resolveHumanErrorFromCode(
  code: unknown,
  surface: ErrorSurface = "unknown",
  fallback: HumanErrorKey = "unknown_error",
) {
  const key = resolveKey(code) ?? fallback;
  return withSurface(HUMAN_ERROR_DICTIONARY[key], surface);
}

export function resolveHumanErrorFromStatus(
  status: number,
  surface: ErrorSurface = "unknown",
  fallback: HumanErrorKey = "unknown_error",
) {
  const key: HumanErrorKey = (() => {
    if (status === 400) return "validation_failed";
    if (status === 401) return "auth_required";
    if (status === 403) return "forbidden";
    if (status === 404) return "route_not_connected";
    if (status === 409) return surface === "creator_booking" ? "slot_unavailable" : "mutation_failed";
    if (status === 413) return "payload_too_large";
    if (status === 422) return "validation_failed";
    if (status === 429) return "rate_limited";
    if (status === 500) return "internal_server_error";
    if (status === 503) return "service_unavailable";
    return fallback;
  })();

  return withSurface(HUMAN_ERROR_DICTIONARY[key], surface);
}

export function resolveHumanError(input: ResolveHumanErrorInput = {}) {
  const surface = input.surface ?? "unknown";
  const explicitKey = resolveKey(input.code);
  if (explicitKey) {
    return withSurface(HUMAN_ERROR_DICTIONARY[explicitKey], surface);
  }

  const embeddedCode = resolveKey(readErrorCode(input.error));
  if (embeddedCode) {
    return withSurface(HUMAN_ERROR_DICTIONARY[embeddedCode], surface);
  }

  if (typeof input.status === "number") {
    return resolveHumanErrorFromStatus(input.status, surface, input.fallback ?? "unknown_error");
  }

  return sanitizeErrorForUser(input.error, surface, input.fallback);
}

export function sanitizeErrorForUser(
  error: unknown,
  surface: ErrorSurface = "unknown",
  fallback: HumanErrorKey = "unknown_error",
) {
  const code = resolveKey(readErrorCode(error));
  if (code) {
    return withSurface(HUMAN_ERROR_DICTIONARY[code], surface);
  }

  const message = readErrorMessage(error);
  if (!message.trim()) {
    return withSurface(HUMAN_ERROR_DICTIONARY[fallback], surface);
  }

  if (/ZodError|Invalid JSON|JSON\.parse|Unexpected token|SyntaxError/i.test(message)) {
    return withSurface(HUMAN_ERROR_DICTIONARY.validation_failed, surface);
  }

  if (/Payload too large/i.test(message)) {
    return withSurface(HUMAN_ERROR_DICTIONARY.payload_too_large, surface);
  }

  if (/network|failed to fetch|ECONN|offline/i.test(message)) {
    return withSurface(HUMAN_ERROR_DICTIONARY.network_error, surface);
  }

  if (/timeout|timed out/i.test(message)) {
    return withSurface(HUMAN_ERROR_DICTIONARY.request_timeout, surface);
  }

  if (/PayPal|INSTRUMENT_DECLINED|provider/i.test(message)) {
    return withSurface(HUMAN_ERROR_DICTIONARY.provider_unavailable, surface);
  }

  if (isRawDevErrorMessage(message) || /FirebaseError|permission-denied|Missing or insufficient permissions/i.test(message)) {
    return withSurface(HUMAN_ERROR_DICTIONARY.internal_server_error, surface);
  }

  return withSurface(HUMAN_ERROR_DICTIONARY[fallback], surface);
}

export function getBugReportIntent(
  descriptor: HumanErrorDescriptor,
  context?: Record<string, unknown>,
): BugReportIntent {
  return {
    shouldShowBugReport: descriptor.bugReportEligible,
    errorKey: descriptor.errorKey,
    surface: descriptor.surface,
    primaryAction: descriptor.primaryAction,
    rewardEligible: descriptor.rewardEligible,
    context,
  };
}
