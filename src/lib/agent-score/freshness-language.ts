export type FreshnessPlainLanguageContext = {
  currentHead?: string;
  sourceCommit?: string;
  generatedAtUtc?: string;
  freshness?: string;
  ageHours?: number;
  reportPath?: string;
  runtimeCodeChangedSinceReport?: boolean;
  openPrTriageFresh?: boolean;
};

export type FreshnessPlainLanguageDescription = {
  internalStatus: string;
  userTitle: string;
  userMessage: string;
  operatorMessage: string;
  actionLabel: string;
  actionDetail: string;
  technicalDetails: {
    currentHead?: string;
    sourceCommit?: string;
    generatedAtUtc?: string;
    freshness?: string;
    ageHours?: number;
    reportPath?: string;
    runtimeCodeChangedSinceReport?: boolean;
    openPrTriageFresh?: boolean;
  };
};

function details(context: FreshnessPlainLanguageContext): FreshnessPlainLanguageDescription["technicalDetails"] {
  return {
    currentHead: context.currentHead,
    sourceCommit: context.sourceCommit,
    generatedAtUtc: context.generatedAtUtc,
    freshness: context.freshness,
    ageHours: context.ageHours,
    reportPath: context.reportPath,
    runtimeCodeChangedSinceReport: context.runtimeCodeChangedSinceReport,
    openPrTriageFresh: context.openPrTriageFresh,
  };
}

function description(
  context: FreshnessPlainLanguageContext,
  input: Omit<FreshnessPlainLanguageDescription, "technicalDetails">,
): FreshnessPlainLanguageDescription {
  return {
    ...input,
    technicalDetails: details(context),
  };
}

export function describeCommitFreshness(context: FreshnessPlainLanguageContext): FreshnessPlainLanguageDescription {
  if (context.sourceCommit && context.currentHead && context.sourceCommit !== context.currentHead) {
    return description(context, {
      internalStatus: "source_version_mismatch",
      userTitle: "Evidence needs refresh",
      userMessage: "This report was generated before the latest code changes, so it cannot be used as current beta proof yet.",
      operatorMessage: "Refresh the generated report from the latest code version, then rerun the beta score check.",
      actionLabel: "Refresh report",
      actionDetail: context.reportPath
        ? `Refresh this report: ${context.reportPath}.`
        : "Refresh this report from the latest code version.",
    });
  }

  return description(context, {
    internalStatus: "source_version_current",
    userTitle: "Evidence is current",
    userMessage: "This report matches the latest code version and is fresh enough for scoring.",
    operatorMessage: "No source-version refresh is needed for this report.",
    actionLabel: "No refresh needed",
    actionDetail: "Keep this evidence attached to the beta readiness record.",
  });
}

export function describeReportFreshness(context: FreshnessPlainLanguageContext): FreshnessPlainLanguageDescription {
  if (context.freshness === "missing") {
    return description(context, {
      internalStatus: "missing",
      userTitle: "Evidence is missing",
      userMessage: "This report is missing, so it cannot be used as beta proof yet.",
      operatorMessage: "Create or refresh this report from the latest code version, then rerun the related check.",
      actionLabel: "Create report",
      actionDetail: context.reportPath
        ? `Create this report: ${context.reportPath}.`
        : "Create the missing evidence report.",
    });
  }

  if (context.freshness === "stale") {
    return description(context, {
      internalStatus: "stale",
      userTitle: "Evidence is outdated",
      userMessage: "This report is older than the freshness window. Refresh it before using it for beta exit.",
      operatorMessage: "Refresh this report from the latest code version before using it for beta readiness.",
      actionLabel: "Refresh evidence",
      actionDetail: context.reportPath
        ? `Refresh this report: ${context.reportPath}.`
        : "Refresh this evidence from the latest code version.",
    });
  }

  if (context.freshness === "unknown" || !context.freshness) {
    return description(context, {
      internalStatus: "unknown",
      userTitle: "Evidence freshness is unknown",
      userMessage: "This report does not include enough freshness information, so it needs review before beta exit.",
      operatorMessage: "Refresh this report from the latest code version or attach freshness metadata.",
      actionLabel: "Review freshness",
      actionDetail: context.reportPath
        ? `Review freshness for ${context.reportPath}.`
        : "Review the report freshness metadata.",
    });
  }

  return describeCommitFreshness(context);
}

export function describeFreshnessState(context: FreshnessPlainLanguageContext): FreshnessPlainLanguageDescription {
  if (context.runtimeCodeChangedSinceReport) {
    return description(context, {
      internalStatus: "runtime_code_changed",
      userTitle: "Evidence needs refresh",
      userMessage: "The evidence needs refresh because new runtime code landed after this report was created.",
      operatorMessage: "Refresh runtime readiness evidence from the latest code version, then rerun the beta score check.",
      actionLabel: "Refresh report",
      actionDetail: "Refresh runtime readiness evidence before beta exit review.",
    });
  }

  if (context.openPrTriageFresh === false) {
    return description(context, {
      internalStatus: "open_pr_triage_outdated",
      userTitle: "Evidence needs refresh",
      userMessage: "Open pull request triage is outdated, so refresh it before using beta readiness.",
      operatorMessage: "Refresh pull request triage from the latest code version, then rerun the beta score check.",
      actionLabel: "Refresh triage",
      actionDetail: "Refresh open pull request triage before beta exit review.",
    });
  }

  if (context.sourceCommit && context.currentHead && context.sourceCommit !== context.currentHead) {
    return describeCommitFreshness(context);
  }

  return describeReportFreshness(context);
}

export function describeEvidenceRefreshAction(context: FreshnessPlainLanguageContext): FreshnessPlainLanguageDescription {
  return description(context, {
    internalStatus: "refresh_action",
    userTitle: "Evidence needs refresh",
    userMessage: "Refresh this report from the latest code version before using it for beta readiness.",
    operatorMessage: "Run the matching refresh command, then rerun the beta score check.",
    actionLabel: "Refresh report",
    actionDetail: context.reportPath
      ? `Refresh this report: ${context.reportPath}.`
      : "Refresh this report from the latest code version.",
  });
}

export function normalizeTechnicalFreshnessTerms(value: string): string {
  return value
    .replace(/Stale or HEAD-mismatched evidence/gu, "Outdated evidence")
    .replace(/HEAD-mismatched evidence/gu, "evidence generated before the latest code changes")
    .replace(/currentHead mismatch/gu, "this report was generated before the latest code changes")
    .replace(/because of a sourceCommit mismatch/gu, "because this report was generated before the latest code changes")
    .replace(/sourceCommit mismatch/gu, "this report was generated before the latest code changes")
    .replace(/generated report\(s\) were created before the current HEAD/gu, "generated report(s) were created before the latest code changes")
    .replace(/generated report\(s\) were created before current HEAD/gu, "generated report(s) were created before the latest code changes")
    .replace(/generated report\(s\) were generated before current HEAD/gu, "generated report(s) were generated before the latest code changes")
    .replace(/generated before current HEAD/gu, "generated before the latest code changes")
    .replace(/before the current HEAD/gu, "before the latest code changes")
    .replace(/before current HEAD/gu, "before the latest code changes")
    .replace(/from current HEAD/gu, "from the latest code version")
    .replace(/current HEAD/gu, "latest code version")
    .replace(/stale generated reports/gu, "outdated generated reports")
    .replace(/Regenerate/gu, "Refresh")
    .replace(/regenerate/gu, "refresh")
    .replace(/Runtime code changed after the readiness report was generated/gu, "New runtime code landed after this readiness report was created")
    .replace(/Runtime code changed after evidence was generated/gu, "New runtime code landed after this report was created")
    .replace(/runtimeCodeChangedSinceReport/gu, "new runtime code landed after this report");
}
