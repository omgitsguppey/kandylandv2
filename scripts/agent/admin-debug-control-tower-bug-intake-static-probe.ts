export function collectAdminDebugControlTowerBugIntakeStaticProbeFailures(
  { debugTabActions, debugBugIntakePanel }: { debugTabActions: string; debugBugIntakePanel: string },
): string[] {
  const failures: string[] = [];
  const focusedComponent = "<DebugBugIntakePanel data={data} />";

  if (!debugTabActions.includes(focusedComponent)) {
    failures.push(`Debug actions tab must delegate loaded bug intake truth to the focused panel must include "${focusedComponent}".`);
  }

  for (const expected of [
    "Bug reports to triage",
    "Loaded",
    "Last 7d",
    "Older backlog",
    "Needs triage",
    "Last 7 days",
    "Path clusters",
    "Loaded sample and last-seven-day intake are separate",
    "data-bug-intake-loaded-count",
    "data-bug-intake-last7d-count",
    "data-bug-intake-backlog-count",
    "data-bug-intake-needs-triage-count",
    "data-bug-report-status",
    "data-bug-report-severity",
    "data-bug-report-age-bucket",
    "data-bug-report-evidence-state",
    "createdAtUtc",
    "ageBucket === \"last_7d\" ? \"RECENT\" : \"BACKLOG\"",
    "badgeLabel=\"LOADED\"",
    "badgeLabel=\"INFO\"",
  ]) {
    if (!debugBugIntakePanel.includes(expected)) {
      failures.push(`Bug intake triage panel must separate loaded sample, recent intake, backlog, and evidence inventory must include "${expected}".`);
    }
  }

  for (const forbidden of [
    "<Pill label=\"Status\" value={report.status} />",
    "<Pill label=\"Breadcrumbs\" value={report.breadcrumbsCount} />",
    "<Pill label=\"Diagnostics\" value={report.diagnosticsCount} />",
    "<Pill label=\"Rollouts\" value={report.rolloutCount} />",
    "<Pill label=\"When\" value={formatRelative(report.timestamp)} />",
  ]) {
    if (`${debugTabActions}\n${debugBugIntakePanel}`.includes(forbidden)) {
      failures.push(`Bug intake panel must not render WAIT-style chips for known loaded values must not include "${forbidden}".`);
    }
  }

  return failures;
}
