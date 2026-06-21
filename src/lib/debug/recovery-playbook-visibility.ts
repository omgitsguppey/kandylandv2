export type RecoveryPlaybookVisibilityStatus =
  | "visible_active_issue"
  | "collapsed_no_active_issue"
  | "collapsed_formal_playbook"
  | "unknown";

export type RecoveryPlaybookVisibilityInput = {
  scoreArtifactCurrent: boolean;
  debugRuntimeStatus: string;
  adminTruthStatus: string;
  activeIssues: Array<{
    id: string;
    kind?: string;
    severity?: string;
    scoreImpact?: number;
  }>;
  playbooks: Array<{
    id: string;
    title: string;
    command: string;
    scoreImpact?: number;
  }>;
};

export type RecoveryPlaybookVisibilityResult = {
  status: RecoveryPlaybookVisibilityStatus;
  visiblePlaybooks: RecoveryPlaybookVisibilityInput["playbooks"];
  collapsedPlaybooks: Array<RecoveryPlaybookVisibilityInput["playbooks"][number] & { collapseReason: string }>;
  fixFirstPlaybooks: RecoveryPlaybookVisibilityInput["playbooks"];
};

function matchesIssue(playbookId: string, activeIssue: RecoveryPlaybookVisibilityInput["activeIssues"][number]) {
  const haystack = `${playbookId} ${activeIssue.id} ${activeIssue.kind ?? ""}`.toLowerCase();
  if (playbookId === "stale_artifact_recovery") return haystack.includes("stale");
  if (playbookId === "debug_runtime_unknown_recovery") return haystack.includes("runtime") && haystack.includes("unknown");
  if (playbookId === "admin_truth_unknown_recovery") return haystack.includes("admin") && haystack.includes("unknown");
  return haystack.includes(playbookId.replace(/_recovery$/u, ""));
}

function collapseReason(input: RecoveryPlaybookVisibilityInput, playbookId: string) {
  if (playbookId === "stale_artifact_recovery" && input.scoreArtifactCurrent) {
    return "score artifact current; generic score:beta CTA is not an active recovery.";
  }
  if (playbookId === "debug_runtime_unknown_recovery" && !/unknown/iu.test(input.debugRuntimeStatus)) {
    return "debug runtime is source-ready/current, not unknown.";
  }
  if (playbookId === "admin_truth_unknown_recovery" && !/unknown/iu.test(input.adminTruthStatus)) {
    return "admin truth is source-ready/formal-sample-required, not unknown.";
  }
  if (/formal|provider|runtime_smoke|admin_truth_sample/iu.test(playbookId)) {
    return "typed evidence playbook belongs in collapsed evidence-boundary drilldown.";
  }
  return "no active matching issue.";
}

export function classifyRecoveryPlaybookVisibility(
  input: RecoveryPlaybookVisibilityInput,
): RecoveryPlaybookVisibilityResult {
  const visiblePlaybooks = input.playbooks.filter((playbook) =>
    input.activeIssues.some((issue) => matchesIssue(playbook.id, issue))
    && !(playbook.id === "stale_artifact_recovery" && input.scoreArtifactCurrent)
    && !(playbook.id === "debug_runtime_unknown_recovery" && !/unknown/iu.test(input.debugRuntimeStatus))
    && !(playbook.id === "admin_truth_unknown_recovery" && !/unknown/iu.test(input.adminTruthStatus)));
  const visibleIds = new Set(visiblePlaybooks.map((playbook) => playbook.id));
  const collapsedPlaybooks = input.playbooks
    .filter((playbook) => !visibleIds.has(playbook.id))
    .map((playbook) => ({ ...playbook, collapseReason: collapseReason(input, playbook.id) }));
  const highestActiveImpact = Math.max(0, ...input.activeIssues.map((issue) => issue.scoreImpact ?? 0));
  const fixFirstPlaybooks = visiblePlaybooks.filter((playbook) => (playbook.scoreImpact ?? 0) > 1 && (playbook.scoreImpact ?? 0) >= highestActiveImpact);

  return {
    status: visiblePlaybooks.length > 0 ? "visible_active_issue" : "collapsed_no_active_issue",
    visiblePlaybooks,
    collapsedPlaybooks,
    fixFirstPlaybooks,
  };
}
