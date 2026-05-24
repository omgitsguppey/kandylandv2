import { NextResponse } from "next/server";

export type AdminRouteErrorCode =
  | "unauthorized"
  | "forbidden"
  | "invalid_admin_request"
  | "payload_too_large"
  | "not_found"
  | "conflict"
  | "role_activation_blocked"
  | "username_taken"
  | "invalid_username"
  | "no_changes_detected"
  | "invalid_upload_type"
  | "upload_too_large"
  | "storage_unavailable"
  | "invalid_storage_path"
  | "invalid_signed_url"
  | "template_not_found"
  | "dispatch_failed";

export type KnownAdminDomainError = {
  status: number;
  code: AdminRouteErrorCode;
  message: string;
  detail?: unknown;
};

export function buildAdminErrorPayload(error: KnownAdminDomainError) {
  return {
    success: false,
    code: error.code,
    error: error.message,
    message: error.message,
    ...(error.detail === undefined ? {} : { detail: error.detail }),
  };
}

export function buildAdminErrorResponse(error: KnownAdminDomainError) {
  return NextResponse.json(buildAdminErrorPayload(error), { status: error.status });
}

export function buildAdminInvalidRequestResponse(message: string, detail?: unknown) {
  return buildAdminErrorResponse({ status: 400, code: "invalid_admin_request", message, detail });
}

export function buildAdminForbiddenResponse(message: string, detail?: unknown) {
  return buildAdminErrorResponse({ status: 403, code: "forbidden", message, detail });
}

export function buildAdminConflictResponse(message: string, detail?: unknown) {
  return buildAdminErrorResponse({ status: 409, code: "conflict", message, detail });
}

export function mapKnownAdminDomainError(error: unknown): KnownAdminDomainError | null {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("unauthorized") || normalized.includes("missing or invalid token")) {
    return { status: 401, code: "unauthorized", message: "Unauthorized" };
  }
  if (normalized.includes("forbidden") || normalized.includes("only the owner") || normalized.includes("only the primary owner")) {
    return { status: 403, code: "forbidden", message };
  }
  if (normalized.includes("creator role requires")) {
    return { status: 400, code: "role_activation_blocked", message };
  }
  if (normalized.includes("already taken")) {
    return { status: 409, code: "username_taken", message };
  }
  if (normalized.includes("valid handle")) {
    return { status: 400, code: "invalid_username", message };
  }
  if (normalized.includes("no profile changes") || normalized.includes("no changes")) {
    return { status: 400, code: "no_changes_detected", message };
  }
  if (normalized.includes("12mb") || normalized.includes("too large")) {
    return { status: 413, code: "upload_too_large", message };
  }
  if (normalized.includes("pdf, plain text, or markdown") || normalized.includes("unsupported upload") || normalized.includes("mime")) {
    return { status: 400, code: "invalid_upload_type", message };
  }
  if (normalized.includes("storage is not available") || normalized.includes("storage unavailable")) {
    return { status: 503, code: "storage_unavailable", message };
  }
  if (normalized.includes("storage path") || normalized.includes("document reference")) {
    return { status: 400, code: "invalid_storage_path", message };
  }
  if (normalized.includes("preview url") || normalized.includes("signed url")) {
    return { status: 400, code: "invalid_signed_url", message };
  }
  if (normalized.includes("template not found") || normalized.includes("no uploaded agreement source")) {
    return { status: 404, code: "template_not_found", message };
  }
  if (normalized.includes("user not found") || normalized.includes("not found")) {
    return { status: 404, code: "not_found", message };
  }
  if (normalized.includes("dispatch")) {
    return { status: 502, code: "dispatch_failed", message };
  }

  return null;
}

export function isKnownAdminDomainError(error: unknown): error is Error {
  return mapKnownAdminDomainError(error) !== null;
}
