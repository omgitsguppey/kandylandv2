export type SecurityEventSeverity = "low" | "medium" | "high";

export interface SecurityEventDescriptor {
  reason: string;
  label: string;
  message: string;
  locationLabel: string;
  severity: SecurityEventSeverity;
  telemetryEventName: string;
  detectionKind: "screenshot" | "screen_recording" | "file_scrape" | "print" | "devtools" | "runtime";
}

const SECURITY_REASON_MAP: Record<string, Omit<SecurityEventDescriptor, "reason">> = {
  screenshot_shortcut_mac_capture: {
    label: "macOS screenshot shortcut blocked",
    message: "The viewer caught Command+Shift+3 while protected content was open.",
    locationLabel: "Protected viewer",
    severity: "high",
    telemetryEventName: "security_screenshot_mac_attempted",
    detectionKind: "screenshot",
  },
  screenshot_shortcut_mac_area: {
    label: "macOS area screenshot shortcut blocked",
    message: "The viewer caught Command+Shift+4 while protected content was open.",
    locationLabel: "Protected viewer",
    severity: "high",
    telemetryEventName: "security_screenshot_mac_attempted",
    detectionKind: "screenshot",
  },
  screen_record_shortcut_mac_toolbar: {
    label: "macOS capture toolbar blocked",
    message: "The viewer caught Command+Shift+5, which can launch screenshot and screen recording tools.",
    locationLabel: "Protected viewer",
    severity: "high",
    telemetryEventName: "security_screen_record_attempted",
    detectionKind: "screen_recording",
  },
  screenshot_shortcut_windows_snip: {
    label: "Windows snipping shortcut blocked",
    message: "The viewer caught Win+Shift+S while protected content was open.",
    locationLabel: "Protected viewer",
    severity: "high",
    telemetryEventName: "security_screenshot_windows_attempted",
    detectionKind: "screenshot",
  },
  screenshot_shortcut_printscreen: {
    label: "Print Screen shortcut blocked",
    message: "The viewer caught a Print Screen capture attempt while protected content was open.",
    locationLabel: "Protected viewer",
    severity: "high",
    telemetryEventName: "security_screenshot_windows_attempted",
    detectionKind: "screenshot",
  },
  screen_record_shortcut_windows_gamebar: {
    label: "Windows screen recording shortcut blocked",
    message: "The viewer caught the Xbox Game Bar recording shortcut while protected content was open.",
    locationLabel: "Protected viewer",
    severity: "high",
    telemetryEventName: "security_screen_record_attempted",
    detectionKind: "screen_recording",
  },
  print_shortcut: {
    label: "Print shortcut blocked",
    message: "The viewer caught a print shortcut while protected content was open.",
    locationLabel: "Protected viewer",
    severity: "high",
    telemetryEventName: "security_print_attempted",
    detectionKind: "print",
  },
  save_shortcut: {
    label: "Save shortcut blocked",
    message: "The viewer caught a save/download shortcut while protected content was open.",
    locationLabel: "Protected viewer",
    severity: "high",
    telemetryEventName: "security_save_attempted",
    detectionKind: "file_scrape",
  },
  copy_shortcut: {
    label: "Copy shortcut blocked",
    message: "The viewer caught a clipboard copy shortcut while protected content was open.",
    locationLabel: "Protected viewer",
    severity: "medium",
    telemetryEventName: "security_copy_attempted",
    detectionKind: "file_scrape",
  },
  selection_attempt: {
    label: "Selection attempt blocked",
    message: "The viewer detected a selection gesture that often precedes copy or scrape behavior.",
    locationLabel: "Protected viewer",
    severity: "medium",
    telemetryEventName: "security_selection_attempted",
    detectionKind: "file_scrape",
  },
  drag_export_attempt: {
    label: "Drag export attempt blocked",
    message: "The viewer detected a drag/export gesture on protected content.",
    locationLabel: "Protected viewer",
    severity: "high",
    telemetryEventName: "security_drag_export_attempted",
    detectionKind: "file_scrape",
  },
  context_menu_attempt: {
    label: "Context menu attempt blocked",
    message: "The viewer detected a context menu attempt on protected content.",
    locationLabel: "Protected viewer",
    severity: "medium",
    telemetryEventName: "security_context_menu_attempted",
    detectionKind: "file_scrape",
  },
  devtools_shortcut: {
    label: "Developer tools shortcut blocked",
    message: "The viewer caught a shortcut that can expose protected media or page code.",
    locationLabel: "Protected viewer",
    severity: "medium",
    telemetryEventName: "security_devtools_attempted",
    detectionKind: "devtools",
  },
  source_view_shortcut: {
    label: "View source shortcut blocked",
    message: "The viewer caught a source-view shortcut while protected content was open.",
    locationLabel: "Protected viewer",
    severity: "medium",
    telemetryEventName: "security_source_view_attempted",
    detectionKind: "devtools",
  },
  rapid_visibility_capture_pattern: {
    label: "Rapid hide/show capture pattern detected",
    message: "The viewer saw repeated hide/show transitions that often correlate with screen capture or scrape attempts.",
    locationLabel: "Protected viewer",
    severity: "medium",
    telemetryEventName: "security_capture_pattern_detected",
    detectionKind: "runtime",
  },
  screenshot_hotkey: {
    label: "Screenshot shortcut blocked",
    message: "The viewer caught a screenshot shortcut while protected content was open.",
    locationLabel: "Protected viewer",
    severity: "high",
    telemetryEventName: "security_screenshot_windows_attempted",
    detectionKind: "screenshot",
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
