export type SecurityEventSeverity = "low" | "medium" | "high";

export interface SecurityEventDescriptor {
  reason: string;
  label: string;
  message: string;
  locationLabel: string;
  severity: SecurityEventSeverity;
}

const SECURITY_REASON_MAP: Record<string, Omit<SecurityEventDescriptor, "reason">> = {
  screenshot_hotkey: {
    label: "Screenshot shortcut blocked",
    message: "The viewer caught a screenshot shortcut while protected content was open.",
    locationLabel: "Protected viewer",
    severity: "high",
  },
  print_shortcut: {
    label: "Print shortcut blocked",
    message: "The viewer caught a print shortcut while protected content was open.",
    locationLabel: "Protected viewer",
    severity: "high",
  },
  devtools_shortcut: {
    label: "Developer tools shortcut blocked",
    message: "The viewer caught a shortcut that can expose protected media or page code.",
    locationLabel: "Protected viewer",
    severity: "medium",
  },
};

export function describeSecurityEvent(reason: string | null | undefined): SecurityEventDescriptor {
  const normalizedReason = typeof reason === "string" && reason.trim().length > 0
    ? reason.trim().toLowerCase()
    : "unknown";

  const descriptor = SECURITY_REASON_MAP[normalizedReason] ?? {
    label: "Viewer protection warning",
    message: "The viewer logged a protection warning that needs review.",
    locationLabel: "Protected viewer",
    severity: "medium" as const,
  };

  return {
    reason: normalizedReason,
    ...descriptor,
  };
}
