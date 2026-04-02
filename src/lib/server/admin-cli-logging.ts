export type AdminPromotionPrincipalKind = "email" | "uid";
export type AdminCredentialSource = "environment" | "local_file" | "application_default";

function sanitizeConsoleValue(value: string) {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\u0000-\u001f\u007f]+/g, "")
    .trim();
}

export function maskAdminPromotionIdentifier(value: string, kind: AdminPromotionPrincipalKind) {
  const sanitized = sanitizeConsoleValue(value);
  if (!sanitized) {
    return "***";
  }

  if (kind === "email") {
    const separatorIndex = sanitized.lastIndexOf("@");
    if (separatorIndex <= 0 || separatorIndex === sanitized.length - 1) {
      return "***";
    }

    const localPart = sanitized.slice(0, separatorIndex);
    const domain = sanitized.slice(separatorIndex + 1);
    const visiblePrefix = localPart.length <= 2 ? localPart.slice(0, 1) : localPart.slice(0, 2);
    return `${visiblePrefix || "***"}***@${domain}`;
  }

  return sanitized.length <= 4 ? "***" : `${sanitized.slice(0, 4)}***`;
}

export function describeAdminPromotionTarget(input: string) {
  const sanitizedInput = sanitizeConsoleValue(input);
  const kind: AdminPromotionPrincipalKind = sanitizedInput.includes("@") ? "email" : "uid";

  return {
    kind,
    sanitizedInput,
    maskedInput: maskAdminPromotionIdentifier(sanitizedInput, kind),
  };
}

export function describeResolvedAdminPromotionUser(user: {
  uid: string;
  email?: string | null;
}) {
  const maskedUid = maskAdminPromotionIdentifier(user.uid, "uid");
  const maskedEmail = user.email ? maskAdminPromotionIdentifier(user.email, "email") : null;

  return maskedEmail ? `${maskedUid} (${maskedEmail})` : maskedUid;
}

export function describeAdminCredentialSource(source: AdminCredentialSource) {
  switch (source) {
    case "environment":
      return "Using credentials from GOOGLE_APPLICATION_CREDENTIALS.";
    case "local_file":
      return "Using the local service account key file.";
    default:
      return "Using application default credentials.";
  }
}

export function describeAdminPromotionError(error: unknown) {
  if (error instanceof Error) {
    return sanitizeConsoleValue(error.message) || "Unknown error";
  }

  return sanitizeConsoleValue(String(error)) || "Unknown error";
}
