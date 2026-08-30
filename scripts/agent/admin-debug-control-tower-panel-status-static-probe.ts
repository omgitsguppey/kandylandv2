export function collectAdminDebugControlTowerPanelStatusStaticProbeFailures(
  { debugPanelStatus, debugNowDiagnostics }: { debugPanelStatus: string; debugNowDiagnostics: string },
): string[] {
  const failures: string[] = [];

  for (const expected of [
    "Signals total",
    "Needs review",
    "data-debug-section-status",
    "data-debug-section-severity",
    "data-debug-signal-type",
    "data-debug-current-counts",
    "data-debug-historical-counts",
    "data-debug-inventory-counts",
    "data-debug-reviewable-signal-count",
    "data-debug-total-signal-count",
  ]) {
    if (!debugPanelStatus.includes(expected)) {
      failures.push(`Panel status by section must separate total and reviewable signals must include "${expected}".`);
    }
  }

  for (const forbidden of [
    'label="Current"',
    "Sample count",
  ]) {
    if (debugNowDiagnostics.includes(forbidden)) {
      failures.push(`Recent diagnostics panel must not render ambiguous diagnostics chips must not include "${forbidden}".`);
    }
  }

  return failures;
}
