export type SecurityEventSeverity = "low" | "medium" | "high";
export type SecurityEventConfidence = "confirmed" | "heuristic";

export interface SecurityEventDescriptor {
  reason: string;
  label: string;
  message: string;
  locationLabel: string;
  severity: SecurityEventSeverity;
  confidence: SecurityEventConfidence;
  telemetryEventName: string;
  detectionKind: "screenshot" | "screen_recording" | "file_scrape" | "print" | "devtools" | "runtime";
}

const SECURITY_REASON_MAP: Record<string, Omit<SecurityEventDescriptor, "reason">> = {
  // Heuristic Screenshot Signals
  heuristic_screenshot_shortcut_mac_capture: {
    label: "macOS screenshot shortcut blocked",
    message: "The viewer caught Command+Shift+3. The browser cannot confirm if an OS screenshot was actually saved.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "heuristic",
    telemetryEventName: "heuristic_screenshot_shortcut_mac",
    detectionKind: "screenshot",
  },
  heuristic_screenshot_shortcut_mac_area: {
    label: "macOS area screenshot shortcut blocked",
    message: "The viewer caught Command+Shift+4. The browser cannot confirm if an OS screenshot was actually saved.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "heuristic",
    telemetryEventName: "heuristic_screenshot_shortcut_mac",
    detectionKind: "screenshot",
  },
  heuristic_screen_record_shortcut_mac_toolbar: {
    label: "macOS capture toolbar blocked",
    message: "The viewer caught Command+Shift+5, which can launch capture tools. Not a confirmed capture.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "heuristic",
    telemetryEventName: "heuristic_screen_record_shortcut",
    detectionKind: "screen_recording",
  },
  heuristic_screenshot_shortcut_windows_snip: {
    label: "Windows snipping shortcut blocked",
    message: "The viewer caught Win+Shift+S. The browser cannot confirm if a snip was actually saved.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "heuristic",
    telemetryEventName: "heuristic_screenshot_shortcut_windows",
    detectionKind: "screenshot",
  },
  heuristic_screenshot_shortcut_printscreen: {
    label: "Print Screen shortcut blocked",
    message: "The viewer caught a Print Screen press. The browser cannot confirm if the OS saved it.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "heuristic",
    telemetryEventName: "heuristic_screenshot_shortcut_windows",
    detectionKind: "screenshot",
  },
  heuristic_screen_record_shortcut_windows_gamebar: {
    label: "Windows recording shortcut blocked",
    message: "The viewer caught the Xbox Game Bar shortcut. Not a confirmed capture.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "heuristic",
    telemetryEventName: "heuristic_screen_record_shortcut",
    detectionKind: "screen_recording",
  },
  heuristic_devtools_shortcut: {
    label: "Developer tools shortcut blocked",
    message: "The viewer caught a shortcut that can expose protected media or page code.",
    locationLabel: "Protected viewer",
    severity: "medium",
    confidence: "heuristic",
    telemetryEventName: "heuristic_devtools_shortcut",
    detectionKind: "devtools",
  },
  heuristic_source_view_shortcut: {
    label: "View source shortcut blocked",
    message: "The viewer caught a source-view shortcut while protected content was open.",
    locationLabel: "Protected viewer",
    severity: "medium",
    confidence: "heuristic",
    telemetryEventName: "heuristic_devtools_shortcut",
    detectionKind: "devtools",
  },
  heuristic_rapid_visibility_capture_pattern: {
    label: "Possible capture/theft pattern from rapid hide/show",
    message: "Repeated hide/show transitions can correlate with capture or scrape attempts, but they do not confirm theft on their own.",
    locationLabel: "Protected viewer",
    severity: "medium",
    confidence: "heuristic",
    telemetryEventName: "heuristic_rapid_visibility_capture",
    detectionKind: "runtime",
  },
  heuristic_rip_pattern: {
    label: "Repeated extraction pattern detected",
    message: "Rapid successive extraction or selection attempts indicative of a scrape or rip.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "heuristic",
    telemetryEventName: "heuristic_rip_pattern",
    detectionKind: "file_scrape",
  },

  // Confirmed Platform Signals
  confirmed_print_shortcut: {
    label: "Print attempt blocked",
    message: "The viewer intercepted a verified print dialog request.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "confirmed",
    telemetryEventName: "confirmed_print_attempt",
    detectionKind: "print",
  },
  confirmed_save_shortcut: {
    label: "Save shortcut blocked",
    message: "The viewer intercepted a verified save/download shortcut.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "confirmed",
    telemetryEventName: "confirmed_save_attempt",
    detectionKind: "file_scrape",
  },
  confirmed_copy_shortcut: {
    label: "Copy attempt blocked",
    message: "The viewer intercepted a verified clipboard copy operation.",
    locationLabel: "Protected viewer",
    severity: "medium",
    confidence: "confirmed",
    telemetryEventName: "confirmed_copy_attempt",
    detectionKind: "file_scrape",
  },
  confirmed_cut_shortcut: {
    label: "Cut attempt blocked",
    message: "The viewer intercepted a verified clipboard cut operation.",
    locationLabel: "Protected viewer",
    severity: "medium",
    confidence: "confirmed",
    telemetryEventName: "confirmed_cut_attempt",
    detectionKind: "file_scrape",
  },
  confirmed_selection_attempt: {
    label: "Selection attempt blocked",
    message: "The viewer intercepted a verified text/element selection gesture.",
    locationLabel: "Protected viewer",
    severity: "low",
    confidence: "confirmed",
    telemetryEventName: "confirmed_selection_attempt",
    detectionKind: "file_scrape",
  },
  confirmed_drag_export_attempt: {
    label: "Drag export attempt blocked",
    message: "The viewer intercepted a verified drag/export gesture.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "confirmed",
    telemetryEventName: "confirmed_drag_attempt",
    detectionKind: "file_scrape",
  },
  confirmed_context_menu_attempt: {
    label: "Context menu attempt blocked",
    message: "The viewer intercepted a verified context menu request.",
    locationLabel: "Protected viewer",
    severity: "medium",
    confidence: "confirmed",
    telemetryEventName: "confirmed_context_menu_attempt",
    detectionKind: "file_scrape",
  },
  
  // Legacy mappings for safe fallback
  screenshot_shortcut_mac_capture: {
    label: "macOS screenshot shortcut blocked",
    message: "The viewer caught Command+Shift+3. The browser cannot confirm if an OS screenshot was actually saved.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "heuristic",
    telemetryEventName: "heuristic_screenshot_shortcut_mac",
    detectionKind: "screenshot",
  },
  screenshot_shortcut_mac_area: {
    label: "macOS area screenshot shortcut blocked",
    message: "The viewer caught Command+Shift+4. The browser cannot confirm if an OS screenshot was actually saved.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "heuristic",
    telemetryEventName: "heuristic_screenshot_shortcut_mac",
    detectionKind: "screenshot",
  },
  screen_record_shortcut_mac_toolbar: {
    label: "macOS capture toolbar blocked",
    message: "The viewer caught Command+Shift+5, which can launch capture tools. Not a confirmed capture.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "heuristic",
    telemetryEventName: "heuristic_screen_record_shortcut",
    detectionKind: "screen_recording",
  },
  screenshot_shortcut_windows_snip: {
    label: "Windows snipping shortcut blocked",
    message: "The viewer caught Win+Shift+S. The browser cannot confirm if a snip was actually saved.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "heuristic",
    telemetryEventName: "heuristic_screenshot_shortcut_windows",
    detectionKind: "screenshot",
  },
  screenshot_shortcut_printscreen: {
    label: "Print Screen shortcut blocked",
    message: "The viewer caught a Print Screen press. The browser cannot confirm if the OS saved it.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "heuristic",
    telemetryEventName: "heuristic_screenshot_shortcut_windows",
    detectionKind: "screenshot",
  },
  print_shortcut: {
    label: "Print attempt blocked",
    message: "The viewer intercepted a verified print dialog request.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "confirmed",
    telemetryEventName: "confirmed_print_attempt",
    detectionKind: "print",
  },
  save_shortcut: {
    label: "Save shortcut blocked",
    message: "The viewer intercepted a verified save/download shortcut.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "confirmed",
    telemetryEventName: "confirmed_save_attempt",
    detectionKind: "file_scrape",
  },
  copy_shortcut: {
    label: "Copy attempt blocked",
    message: "The viewer intercepted a verified clipboard copy operation.",
    locationLabel: "Protected viewer",
    severity: "medium",
    confidence: "confirmed",
    telemetryEventName: "confirmed_copy_attempt",
    detectionKind: "file_scrape",
  },
  selection_attempt: {
    label: "Selection attempt blocked",
    message: "The viewer intercepted a verified text/element selection gesture.",
    locationLabel: "Protected viewer",
    severity: "low",
    confidence: "confirmed",
    telemetryEventName: "confirmed_selection_attempt",
    detectionKind: "file_scrape",
  },
  drag_export_attempt: {
    label: "Drag export attempt blocked",
    message: "The viewer intercepted a verified drag/export gesture.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "confirmed",
    telemetryEventName: "confirmed_drag_attempt",
    detectionKind: "file_scrape",
  },
  context_menu_attempt: {
    label: "Context menu attempt blocked",
    message: "The viewer intercepted a verified context menu request.",
    locationLabel: "Protected viewer",
    severity: "medium",
    confidence: "confirmed",
    telemetryEventName: "confirmed_context_menu_attempt",
    detectionKind: "file_scrape",
  },
  devtools_shortcut: {
    label: "Developer tools shortcut blocked",
    message: "The viewer caught a shortcut that can expose protected media or page code.",
    locationLabel: "Protected viewer",
    severity: "medium",
    confidence: "heuristic",
    telemetryEventName: "heuristic_devtools_shortcut",
    detectionKind: "devtools",
  },
  source_view_shortcut: {
    label: "View source shortcut blocked",
    message: "The viewer caught a source-view shortcut while protected content was open.",
    locationLabel: "Protected viewer",
    severity: "medium",
    confidence: "heuristic",
    telemetryEventName: "heuristic_devtools_shortcut",
    detectionKind: "devtools",
  },
  rapid_visibility_capture_pattern: {
    label: "Possible capture/theft pattern from rapid hide/show",
    message: "Repeated hide/show transitions can correlate with capture or scrape attempts, but they do not confirm theft on their own.",
    locationLabel: "Protected viewer",
    severity: "medium",
    confidence: "heuristic",
    telemetryEventName: "heuristic_rapid_visibility_capture",
    detectionKind: "runtime",
  },
  screenshot_hotkey: {
    label: "Screenshot shortcut blocked",
    message: "The viewer caught a screenshot shortcut. The browser cannot confirm if the OS saved it.",
    locationLabel: "Protected viewer",
    severity: "high",
    confidence: "heuristic",
    telemetryEventName: "heuristic_screenshot_shortcut_windows",
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
    confidence: "heuristic" as const,
    telemetryEventName: "heuristic_unknown_threat",
    detectionKind: "runtime" as const,
  };

  return {
    reason: normalizedReason,
    ...descriptor,
  };
}

export function isKnownSecurityEventReason(reason: string | null | undefined): boolean {
  const normalizedReason = typeof reason === "string" && reason.trim().length > 0
    ? reason.trim().toLowerCase()
    : "unknown";

  return Boolean(SECURITY_REASON_MAP[normalizedReason]);
}
