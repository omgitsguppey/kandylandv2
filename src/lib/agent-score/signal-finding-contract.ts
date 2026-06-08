export const SIGNAL_FINDING_SCHEMA_VERSION = "signal_finding_v1" as const;
export const SIGNAL_FINDINGS_REPORT_PATH = "agent/state/signal-findings.generated.json" as const;

export type SignalSeverity = "info" | "minor" | "moderate" | "major" | "critical";
export type SignalConfidence = "low" | "medium" | "high" | "blocked";
export type SignalSourceSurface =
  | "user_ui"
  | "creator_ui"
  | "admin_ui"
  | "server_truth"
  | "analytics_telemetry"
  | "identity_auth"
  | "wallet_economy_payment"
  | "drop_content_unlock"
  | "chat_support"
  | "repo_intelligence"
  | "test_fixture"
  | "generated_artifact"
  | "unknown";
export type SignalOwnerLane =
  | "frontend"
  | "backend"
  | "telemetry"
  | "debug_evidence"
  | "agent_context"
  | "code_organization"
  | "type_schema"
  | "test_fixture"
  | "release_governance"
  | "privacy"
  | "cost"
  | "unknown";
export type SignalEvidenceKind =
  | "source"
  | "generated_snapshot"
  | "debug_evidence"
  | "fixture"
  | "runtime_redacted"
  | "provider_proof"
  | "manual_operator";
export type SignalStaleEvidenceMarker = "current" | "stale" | "missing" | "not_applicable";
export type SignalTerminalProofRequirement = "none" | "targeted" | "signoff" | "forbidden";
export type SignalAffectedFileRole = "primary" | "adjacent" | "test" | "validator" | "doc" | "generated";
export type SignalSarifLevel = "none" | "note" | "warning" | "error";

export type SignalAffectedFile = {
  path: string;
  role: SignalAffectedFileRole;
  line?: number;
};

export type SignalEvidence = {
  kind: SignalEvidenceKind;
  source: string;
  summary: string;
  freshness: SignalStaleEvidenceMarker;
  redacted: boolean;
};

export type SignalSarifProjection = {
  ruleId: string;
  level: SignalSarifLevel;
  message: string;
  artifactUri: string;
  startLine?: number;
  properties: {
    signalId: string;
    ownerLane: SignalOwnerLane;
    sourceSurface: SignalSourceSurface;
    confidence: SignalConfidence;
    terminalProof: SignalTerminalProofRequirement;
    evidenceKinds: SignalEvidenceKind[];
  };
};

export type SignalFinding = {
  schemaVersion: typeof SIGNAL_FINDING_SCHEMA_VERSION;
  id: string;
  ruleId: string;
  title: string;
  severity: SignalSeverity;
  confidence: SignalConfidence;
  sourceSurface: SignalSourceSurface;
  ownerLane: SignalOwnerLane;
  evidence: SignalEvidence[];
  affectedFiles: SignalAffectedFile[];
  rootCauseHypothesis: string;
  staleEvidence: SignalStaleEvidenceMarker;
  terminalProof: SignalTerminalProofRequirement;
  recommendedNextAction: string;
  minimalVerificationCommands: string[];
  sarif: SignalSarifProjection;
};

export type SignalFindingReport = {
  schemaVersion: typeof SIGNAL_FINDING_SCHEMA_VERSION;
  generatedAtUtc: string;
  sourceInputs: string[];
  findings: SignalFinding[];
  summary: {
    findingCount: number;
    criticalCount: number;
    majorCount: number;
    blockedConfidenceCount: number;
    providerProofRequiredCount: number;
  };
};

export function signalSeverityToSarifLevel(severity: SignalSeverity): SignalSarifLevel {
  if (severity === "critical" || severity === "major") {
    return "error";
  }
  if (severity === "moderate") {
    return "warning";
  }
  if (severity === "minor" || severity === "info") {
    return "note";
  }
  return "none";
}

export function buildSignalSarifProjection(
  finding: Omit<SignalFinding, "schemaVersion" | "sarif" | "minimalVerificationCommands">,
): SignalSarifProjection {
  const primaryFile = finding.affectedFiles.find((file) => file.role === "primary") ?? finding.affectedFiles[0];

  return {
    ruleId: finding.ruleId,
    level: signalSeverityToSarifLevel(finding.severity),
    message: finding.title,
    artifactUri: primaryFile?.path ?? "",
    ...(primaryFile?.line ? { startLine: primaryFile.line } : {}),
    properties: {
      signalId: finding.id,
      ownerLane: finding.ownerLane,
      sourceSurface: finding.sourceSurface,
      confidence: finding.confidence,
      terminalProof: finding.terminalProof,
      evidenceKinds: Array.from(new Set(finding.evidence.map((evidence) => evidence.kind))),
    },
  };
}

export function validateSignalFinding(finding: SignalFinding): string[] {
  const failures: string[] = [];

  if (finding.schemaVersion !== SIGNAL_FINDING_SCHEMA_VERSION) {
    failures.push(`schemaVersion must be ${SIGNAL_FINDING_SCHEMA_VERSION}.`);
  }
  if (!finding.id.trim()) {
    failures.push("id is required.");
  }
  if (!finding.ruleId.trim()) {
    failures.push("ruleId is required.");
  }
  if (finding.affectedFiles.length === 0) {
    failures.push("affectedFiles must include at least one file.");
  }
  if (finding.evidence.length === 0) {
    failures.push("evidence must include at least one source.");
  }
  if (!finding.rootCauseHypothesis.trim()) {
    failures.push("rootCauseHypothesis is required.");
  }
  if (!finding.recommendedNextAction.trim()) {
    failures.push("recommendedNextAction is required.");
  }
  if (
    (finding.terminalProof === "targeted" || finding.terminalProof === "signoff") &&
    finding.minimalVerificationCommands.length === 0
  ) {
    failures.push("minimalVerificationCommands must be populated when terminal proof is targeted or signoff.");
  }
  if (finding.terminalProof === "forbidden" && finding.minimalVerificationCommands.length > 0) {
    failures.push("minimalVerificationCommands must be empty when terminal proof is forbidden.");
  }
  if (finding.evidence.some((evidence) => evidence.kind === "runtime_redacted" && !evidence.redacted)) {
    failures.push("runtime_redacted evidence must be marked redacted.");
  }
  if (finding.evidence.some((evidence) => evidence.kind === "provider_proof" && evidence.redacted)) {
    failures.push("provider_proof evidence should reference proof metadata, not redacted runtime content.");
  }
  if (!finding.sarif.ruleId || !finding.sarif.artifactUri || !finding.sarif.properties.signalId) {
    failures.push("sarif projection must include ruleId, artifactUri, and signalId.");
  }

  return failures;
}
