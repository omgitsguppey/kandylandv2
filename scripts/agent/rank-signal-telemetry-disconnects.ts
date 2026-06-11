import { pathToFileURL } from "node:url";

import {
  fileExists,
  getPackageScripts,
  nowIso,
  readJsonFile,
  writeJsonFile,
  type Json,
} from "./shared";
import { selectVerificationPlan } from "./verification-selector";

const TELEMETRY_GRAPH_PATH = "agent/state/signal-telemetry-graph.generated.json";
const REPORT_PATH = "agent/state/signal-telemetry-disconnects.generated.json";
const MAX_RANKED_FINDINGS = 50;

type TelemetryGraphFinding = {
  id: string;
  classification:
    | "event_missing"
    | "actor_missing"
    | "consent_blocked"
    | "identity_link_missing"
    | "materializer_missing"
    | "debug_lane_missing"
    | "runtime_unproven"
    | "external_provider_unproven"
    | "disconnected_emitter"
    | "disconnected_ingestion"
    | "disconnected_materializer"
    | "duplicate_intent"
    | "stale_generated_evidence"
    | "source_only_proof_risk"
    | "missing_admin_debug_consumer"
    | "false_positive_manual_review";
  risk: "low" | "medium" | "high";
  title: string;
  affectedFiles: string[];
  evidenceKind: "source" | "generated_snapshot";
  recommendedNextAction: string;
  minimalVerification: string[];
};

type SignalTelemetryGraphReport = {
  schemaVersion: "signal.telemetry-graph.v1";
  generatedAtUtc: string;
  reportPath: typeof TELEMETRY_GRAPH_PATH;
  summary: {
    findingCount: number;
  };
  findings: TelemetryGraphFinding[];
};

type ActorScope = "global" | "guest" | "signed_in_user" | "linked_person" | "creator_role" | "admin_operator";
type CurrentState =
  | "connected"
  | "source_missing"
  | "bridge_missing"
  | "materializer_missing"
  | "consumer_missing"
  | "duplicate_intent"
  | "stale_evidence"
  | "permission_blocked";
type TerminalProofRequirement = "none" | "targeted" | "signoff" | "forbidden";

type RankedTelemetryDisconnect = {
  rank: number;
  findingId: string;
  score: number;
  eventOrMetricName: string;
  affectedActorScope: ActorScope[];
  currentState: CurrentState;
  canonicalOwner: string;
  likelyFixType:
    | "catalog_or_alias_ownership"
    | "identity_bridge"
    | "materializer_bridge"
    | "admin_consumer_wiring"
    | "dedupe_policy"
    | "generated_evidence_refresh"
    | "provider_bypass_review"
    | "manual_review";
  safeFirstFileToInspect: string;
  minimalVerificationRecommendation: string[];
  terminalProofRequirement: TerminalProofRequirement;
  sourceTruthCaveat: string;
  affectedFiles: string[];
  dimensions: {
    userLevelMetricImpact: number;
    adminTruthImpact: number;
    privacyRisk: number;
    sourceOnlyProofRisk: number;
    duplicateIntentRisk: number;
    identityBridgeRisk: number;
    materializerGap: number;
    staleGeneratedEvidence: number;
    affectedSurfaceBreadth: number;
    canonicalOwnerExists: number;
    minimalFixComplexity: number;
    validatorCoverage: number;
  };
};

type SignalTelemetryDisconnectReport = {
  schemaVersion: "signal.telemetry-disconnect-rank.v1";
  generatedAtUtc: string;
  telemetryGraphPath: typeof TELEMETRY_GRAPH_PATH;
  telemetryGraphGeneratedAtUtc: string;
  reportPath: typeof REPORT_PATH;
  commandBudget: {
    allowedCommands: string[];
    forbiddenCommands: string[];
  };
  summary: {
    sourceFindingCount: number;
    rankedFindingCount: number;
    topScore: number;
    sourceOnlyEvidenceCount: number;
    staleEvidenceCount: number;
    targetedTerminalCount: number;
    signoffTerminalCount: number;
    forbiddenTerminalCount: number;
  };
  rankedFindings: RankedTelemetryDisconnect[];
};

const RISK_WEIGHT: Record<TelemetryGraphFinding["risk"], number> = {
  low: 15,
  medium: 35,
  high: 55,
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function includesAny(value: string, needles: string[]) {
  const normalized = value.toLowerCase();
  return needles.some((needle) => normalized.includes(needle));
}

function findingText(finding: TelemetryGraphFinding) {
  return [finding.id, finding.classification, finding.title, finding.recommendedNextAction, ...finding.affectedFiles].join(" ");
}

function extractEventOrMetricName(finding: TelemetryGraphFinding) {
  const titleName = /:\s*([a-z][a-z0-9_.:-]+)\s*$/iu.exec(finding.title)?.[1];
  if (titleName) return titleName;

  const idName = /(?:uncataloged|multi-event-metric|metric-event-without-validator|catalog-without-emitter|metric-bridge):([a-z0-9_.:-]+)/iu.exec(finding.id)?.[1];
  if (idName) return idName;

  const reportName = finding.affectedFiles.find((file) => file.startsWith("agent/state/"));
  if (reportName) return reportName.split("/").pop() ?? reportName;

  return "unknown";
}

function actorScopesForFinding(finding: TelemetryGraphFinding): ActorScope[] {
  const text = findingText(finding);
  const scopes = new Set<ActorScope>();

  if (includesAny(text, ["admin", "debug", "operator"])) scopes.add("admin_operator");
  if (includesAny(text, ["creator", "fan_pass", "broadcast", "creator_drop"])) scopes.add("creator_role");
  if (includesAny(text, ["guest", "anonymous", "session"])) scopes.add("guest");
  if (includesAny(text, ["signed", "auth", "user", "person_metrics", "person metric"])) scopes.add("signed_in_user");
  if (includesAny(text, ["person", "identity", "handoff", "linked"])) scopes.add("linked_person");
  if (finding.classification === "duplicate_intent" || finding.classification === "disconnected_materializer") {
    scopes.add("linked_person");
  }
  if (scopes.size === 0 || includesAny(text, ["catalog", "event", "telemetry", "analytics"])) scopes.add("global");

  return Array.from(scopes).sort();
}

function currentStateForFinding(finding: TelemetryGraphFinding): CurrentState {
  if (finding.classification === "duplicate_intent") return "duplicate_intent";
  if (finding.classification === "stale_generated_evidence") return "stale_evidence";
  if (finding.classification === "materializer_missing" || finding.classification === "disconnected_materializer") return "materializer_missing";
  if (finding.classification === "debug_lane_missing" || finding.classification === "missing_admin_debug_consumer") return "consumer_missing";
  if (finding.classification === "event_missing" || finding.classification === "disconnected_emitter") return "source_missing";
  if (finding.classification === "identity_link_missing" || finding.classification === "disconnected_ingestion" || finding.classification === "source_only_proof_risk") return "bridge_missing";
  if (finding.classification === "consent_blocked") return "permission_blocked";
  return "connected";
}

function canonicalOwnerForFinding(finding: TelemetryGraphFinding) {
  const text = findingText(finding);
  if (includesAny(text, ["person metric", "person_metrics", "metric consumes", "drop_opens", "drop_unlocks"])) {
    return "person_metrics: src/lib/analytics/person-metrics-contract.ts";
  }
  if (includesAny(text, ["drop_preview", "duplicate intent", "double-counting"])) {
    return "telemetry_intent_aliases: src/lib/analytics/telemetry-intent-aliases.ts";
  }
  if (includesAny(text, ["catalog", "uncataloged", "cataloged event"])) {
    return "telemetry_catalog: src/lib/telemetry-catalog.ts";
  }
  if (includesAny(text, ["debug", "evidence"])) {
    return "debug_evidence: src/lib/debug-evidence-contract.ts";
  }
  if (includesAny(text, ["identity", "handoff", "guest", "linked"])) {
    return "identity_handoff: src/lib/analytics/identity-handoff-contract.ts";
  }
  if (finding.affectedFiles.some((file) => file.startsWith("agent/state/"))) {
    return "agent_generated_state: agent/state";
  }
  return "unknown";
}

function likelyFixTypeForFinding(finding: TelemetryGraphFinding): RankedTelemetryDisconnect["likelyFixType"] {
  const text = findingText(finding);
  if (finding.classification === "duplicate_intent") return "dedupe_policy";
  if (finding.classification === "stale_generated_evidence") return "generated_evidence_refresh";
  if (finding.classification === "materializer_missing" || finding.classification === "disconnected_materializer") return "materializer_bridge";
  if (finding.classification === "debug_lane_missing" || finding.classification === "missing_admin_debug_consumer") return "admin_consumer_wiring";
  if (finding.classification === "identity_link_missing") return "identity_bridge";
  if (includesAny(text, ["identity", "guest", "linked", "person"])) return "identity_bridge";
  if (finding.classification === "source_only_proof_risk") return "provider_bypass_review";
  if (finding.classification === "disconnected_emitter" || finding.classification === "disconnected_ingestion") {
    return "catalog_or_alias_ownership";
  }
  return "manual_review";
}

function safeFirstFileToInspect(finding: TelemetryGraphFinding, canonicalOwner: string) {
  if (canonicalOwner.includes(": ")) return canonicalOwner.split(": ")[1];
  return finding.affectedFiles[0] ?? TELEMETRY_GRAPH_PATH;
}

function terminalRequirementForFinding(finding: TelemetryGraphFinding, scopes: ActorScope[], dimensions: RankedTelemetryDisconnect["dimensions"]): TerminalProofRequirement {
  if (finding.classification === "runtime_unproven" || finding.classification === "external_provider_unproven") return "signoff";
  if (finding.classification === "source_only_proof_risk") return "forbidden";
  if (dimensions.privacyRisk >= 55 || dimensions.identityBridgeRisk >= 55) return "signoff";
  if (dimensions.materializerGap >= 45 || dimensions.duplicateIntentRisk >= 45 || scopes.includes("linked_person")) return "targeted";
  if (finding.classification === "stale_generated_evidence") return "none";
  return finding.minimalVerification.length > 0 ? "targeted" : "none";
}

function dimensionsForFinding(finding: TelemetryGraphFinding) {
  const text = findingText(finding);
  const scopes = actorScopesForFinding(finding);
  const hasCanonicalOwner = canonicalOwnerForFinding(finding) !== "unknown";
  const minimalFixComplexity = clamp(
    100 -
      (finding.affectedFiles.length * 8) -
      (finding.risk === "high" ? 25 : 0) -
      (includesAny(text, ["payment", "unlock", "entitlement", "identity", "person"]) ? 20 : 0),
  );
  const validatorCoverage = clamp(
    (finding.minimalVerification.length > 0 ? 55 : 15) +
      (finding.minimalVerification.some((command) => /event-translation|telemetry|count-deduplication|agent:test|typecheck/u.test(command)) ? 25 : 0),
  );

  return {
    userLevelMetricImpact: clamp(
      (scopes.includes("linked_person") || scopes.includes("signed_in_user") ? 35 : 0) +
        (includesAny(text, ["person_metrics", "person metric", "user", "identity", "handoff"]) ? 35 : 0) +
        RISK_WEIGHT[finding.risk] / 2,
    ),
    adminTruthImpact: clamp(
      (scopes.includes("admin_operator") ? 35 : 0) +
        (includesAny(text, ["admin", "debug", "consumer", "generated", "report"]) ? 25 : 0) +
        (finding.classification === "missing_admin_debug_consumer" ? 30 : 0),
    ),
    privacyRisk: clamp(
      (includesAny(text, ["identity", "guest", "linked", "person", "user", "privacy"]) ? 35 : 0) +
        (finding.classification === "source_only_proof_risk" ? 25 : 0),
    ),
    sourceOnlyProofRisk: clamp(
      (finding.evidenceKind === "source" ? 25 : 0) +
        (finding.classification === "source_only_proof_risk" ? 45 : 0) +
        (finding.classification === "stale_generated_evidence" ? 25 : 0),
    ),
    duplicateIntentRisk: clamp(
      (finding.classification === "duplicate_intent" ? 50 : 0) +
        (includesAny(text, ["drop", "unlock", "payment", "purchase"]) ? 25 : 0),
    ),
    identityBridgeRisk: clamp(
      (includesAny(text, ["identity", "guest", "linked", "person", "person_metrics"]) ? 45 : 0) +
        (finding.classification === "disconnected_ingestion" || finding.classification === "disconnected_materializer" ? 20 : 0),
    ),
    materializerGap: clamp(
      (finding.classification === "disconnected_materializer" ? 65 : 0) +
        (includesAny(text, ["materializer", "person_metrics"]) ? 25 : 0),
    ),
    staleGeneratedEvidence: clamp(finding.classification === "stale_generated_evidence" || finding.evidenceKind === "generated_snapshot" ? 75 : 0),
    affectedSurfaceBreadth: clamp(
      (finding.affectedFiles.length * 10) +
        (new Set(finding.affectedFiles.map((file) => file.split("/").slice(0, 3).join("/"))).size * 10),
    ),
    canonicalOwnerExists: hasCanonicalOwner ? 80 : 20,
    minimalFixComplexity,
    validatorCoverage,
  };
}

function scoreDimensions(dimensions: RankedTelemetryDisconnect["dimensions"]) {
  return clamp(
    dimensions.userLevelMetricImpact * 0.17 +
      dimensions.adminTruthImpact * 0.13 +
      dimensions.privacyRisk * 0.11 +
      dimensions.sourceOnlyProofRisk * 0.1 +
      dimensions.duplicateIntentRisk * 0.13 +
      dimensions.identityBridgeRisk * 0.13 +
      dimensions.materializerGap * 0.12 +
      dimensions.staleGeneratedEvidence * 0.06 +
      dimensions.affectedSurfaceBreadth * 0.05 +
      dimensions.canonicalOwnerExists * 0.04 +
      dimensions.minimalFixComplexity * 0.04 +
      dimensions.validatorCoverage * 0.09,
  );
}

function sourceTruthCaveat(finding: TelemetryGraphFinding) {
  if (finding.evidenceKind === "generated_snapshot") {
    return "Generated snapshot evidence can guide triage but must be refreshed before any claim of current truth.";
  }
  if (finding.classification === "source_only_proof_risk") {
    return "This is source-only evidence of a possible proof boundary problem; provider/browser/deploy proof is forbidden unless explicitly promoted.";
  }
  return "Source-only evidence ranks likely disconnects; it does not prove runtime behavior or user activity.";
}

function minimalVerificationForFinding(finding: TelemetryGraphFinding, terminalRequirement: TerminalProofRequirement) {
  if (terminalRequirement === "forbidden") return [];
  if (finding.classification === "stale_generated_evidence") return ["Refresh only the owning generated artifact if consumed by the current task."];

  const selectorPlan = selectVerificationPlan({ paths: finding.affectedFiles });
  const selectorFast = selectorPlan.fastCommands.filter((command) =>
    !/npm run check$|playwright|cypress|lighthouse|firebase deploy|gcloud|provider/iu.test(command),
  );
  const commands = Array.from(new Set([...finding.minimalVerification, ...selectorFast])).filter((command) =>
    !/playwright|cypress|lighthouse|firebase deploy|gcloud|provider/iu.test(command),
  );

  if (commands.length > 0) return commands.slice(0, 5);
  if (terminalRequirement === "targeted" || terminalRequirement === "signoff") return ["npm run typecheck"];
  return [];
}

export function buildSignalTelemetryDisconnectReport(input: {
  telemetryGraph: SignalTelemetryGraphReport;
  packageScripts: Record<string, string>;
}): SignalTelemetryDisconnectReport {
  const rankedFindings = input.telemetryGraph.findings
    .map((finding) => {
      const dimensions = dimensionsForFinding(finding);
      const score = scoreDimensions(dimensions);
      const scopes = actorScopesForFinding(finding);
      const canonicalOwner = canonicalOwnerForFinding(finding);
      const terminalProofRequirement = terminalRequirementForFinding(finding, scopes, dimensions);

      return {
        rank: 0,
        findingId: finding.id,
        score,
        eventOrMetricName: extractEventOrMetricName(finding),
        affectedActorScope: scopes,
        currentState: currentStateForFinding(finding),
        canonicalOwner,
        likelyFixType: likelyFixTypeForFinding(finding),
        safeFirstFileToInspect: safeFirstFileToInspect(finding, canonicalOwner),
        minimalVerificationRecommendation: minimalVerificationForFinding(finding, terminalProofRequirement),
        terminalProofRequirement,
        sourceTruthCaveat: sourceTruthCaveat(finding),
        affectedFiles: finding.affectedFiles.slice(0, 8),
        dimensions,
      };
    })
    .sort((left, right) => right.score - left.score || left.findingId.localeCompare(right.findingId))
    .slice(0, MAX_RANKED_FINDINGS)
    .map((finding, index) => ({ ...finding, rank: index + 1 }));

  return {
    schemaVersion: "signal.telemetry-disconnect-rank.v1",
    generatedAtUtc: nowIso(),
    telemetryGraphPath: TELEMETRY_GRAPH_PATH,
    telemetryGraphGeneratedAtUtc: input.telemetryGraph.generatedAtUtc,
    reportPath: REPORT_PATH,
    commandBudget: {
      allowedCommands: ["npm run signal:telemetry-rank", "npm run typecheck", "npm run agent:test -- tests/unit/signal-telemetry-disconnect-rank.spec.ts"],
      forbiddenCommands: ["npm run check", "playwright", "cypress", "lighthouse", "firebase deploy", "gcloud", "provider API calls", "raw user activity fixtures"],
    },
    summary: {
      sourceFindingCount: input.telemetryGraph.summary.findingCount,
      rankedFindingCount: rankedFindings.length,
      topScore: rankedFindings[0]?.score ?? 0,
      sourceOnlyEvidenceCount: rankedFindings.filter((finding) => finding.sourceTruthCaveat.includes("Source-only")).length,
      staleEvidenceCount: rankedFindings.filter((finding) => finding.currentState === "stale_evidence").length,
      targetedTerminalCount: rankedFindings.filter((finding) => finding.terminalProofRequirement === "targeted").length,
      signoffTerminalCount: rankedFindings.filter((finding) => finding.terminalProofRequirement === "signoff").length,
      forbiddenTerminalCount: rankedFindings.filter((finding) => finding.terminalProofRequirement === "forbidden").length,
    },
    rankedFindings,
  };
}

function readTelemetryGraphReport() {
  if (!fileExists(TELEMETRY_GRAPH_PATH)) {
    throw new Error(`${TELEMETRY_GRAPH_PATH} is missing. Run npm run signal:telemetry-graph first.`);
  }
  return readJsonFile<SignalTelemetryGraphReport>(TELEMETRY_GRAPH_PATH);
}

export function buildSignalTelemetryDisconnectReportFromRepo() {
  return buildSignalTelemetryDisconnectReport({
    telemetryGraph: readTelemetryGraphReport(),
    packageScripts: getPackageScripts("package.json"),
  });
}

export function main() {
  const packageScripts = getPackageScripts("package.json");
  if (packageScripts["signal:telemetry-rank"] !== "tsx scripts/agent/rank-signal-telemetry-disconnects.ts") {
    throw new Error("package.json must expose signal:telemetry-rank before writing the SIGNAL telemetry disconnect report.");
  }

  const report = buildSignalTelemetryDisconnectReportFromRepo();
  writeJsonFile(REPORT_PATH, report as unknown as Json);
  console.log(
    `SIGNAL telemetry disconnect rank: ranked=${report.summary.rankedFindingCount}, topScore=${report.summary.topScore}, signoff=${report.summary.signoffTerminalCount}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
