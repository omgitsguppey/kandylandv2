import { execFileSync } from "node:child_process";
import {
  getPackageScripts,
  readText,
  writeJsonFile,
  writeTextFile,
} from "./shared";

type Severity = "p0" | "p1" | "p2";

export type IdentityTransferTelemetryClosureReport = {
  generatedAtUtc: string;
  reportKey: "identity-transfer-telemetry-closure";
  currentHead: string;
  summary: {
    identityStatesClosed: boolean;
    identityLinkRoutePresent: boolean;
    deterministicLinkIdShared: boolean;
    clientSubmitIdempotent: boolean;
    broadGuestReadsBlocked: boolean;
    individualUserSessionContinuity: boolean;
    linkedGuestNoDoubleCount: boolean;
    unknownLegacySeparated: boolean;
    creatorAdminProjectionSeparated: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  identityStates: string[];
  transferFindings: Array<{
    id: string;
    severity: Severity;
    status: string;
    evidence: string[];
    action: string;
  }>;
  continuityFindings: Array<{
    id: string;
    severity: Severity;
    status: string;
    evidence: string[];
    action: string;
  }>;
  fixesApplied: string[];
  nextFixOrder: string[];
};

type SourceMap = Record<string, string>;

const artifactPath = "agent/state/identity-transfer-telemetry-closure.generated.json";
const docsPath = "docs/agent-truth/identity-transfer-telemetry-closure.md";

const sourcePaths = [
  "src/lib/analytics/identity-transfer.ts",
  "src/lib/analytics/analytics-identity-link.ts",
  "src/lib/analytics/analytics-event-contract.ts",
  "src/lib/server/analytics-identity-linking.ts",
  "src/app/api/analytics/identity-link/route.ts",
  "src/app/api/analytics/ingest-identified/route.ts",
  "src/context/AuthContext.tsx",
  "tests/unit/identity-transfer-telemetry-closure.spec.ts",
];

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

function readSources(paths = sourcePaths): SourceMap {
  return Object.fromEntries(paths.map((path) => [path, readText(path)]));
}

function countSeverity(
  findings: Array<{ severity: Severity }>,
  severity: Severity,
) {
  return findings.filter((finding) => finding.severity === severity).length;
}

export function buildIdentityTransferTelemetryClosureReport(input: {
  currentHead: string;
  generatedAtUtc: string;
}): IdentityTransferTelemetryClosureReport {
  const transferFindings: IdentityTransferTelemetryClosureReport["transferFindings"] = [
    {
      id: "link-first-idempotent-transfer",
      severity: "p2",
      status: "closed",
      evidence: [
        "src/lib/analytics/analytics-identity-link.ts",
        "src/app/api/analytics/identity-link/route.ts",
        "src/context/AuthContext.tsx",
      ],
      action: "Auth transitions submit one bounded link association instead of scanning or rewriting guest history.",
    },
    {
      id: "shared-deterministic-link-id",
      severity: "p2",
      status: "closed",
      evidence: [
        "buildGuestUserIdentityLinkId",
        "src/lib/server/analytics-identity-linking.ts",
      ],
      action: "Client and server use the same deterministic identity link id source.",
    },
    {
      id: "creator-admin-identity-separation",
      severity: "p2",
      status: "closed",
      evidence: [
        "creator_user",
        "admin_projection",
        "resolveAnalyticsIdentityState",
      ],
      action: "Creator and admin projection telemetry no longer collapses into normal user identity states.",
    },
  ];
  const continuityFindings: IdentityTransferTelemetryClosureReport["continuityFindings"] = [
    {
      id: "individual-user-session-continuity",
      severity: "p2",
      status: "closed",
      evidence: [
        "sourceIdentity.sessionId",
        "sourceIdentity.userId",
        "resolveIdentityTransferTelemetryState",
      ],
      action: "Signed-in user facts keep session continuity and only carry guest lineage when an anonymous/link id exists.",
    },
    {
      id: "linked-guest-no-double-count",
      severity: "p2",
      status: "closed",
      evidence: ["buildIdentityTransferCountingKeys", "countAsAdditionalKnownUser: false"],
      action: "Linked guest history can be attributed through lineage without becoming a second known-user count.",
    },
    {
      id: "unknown-legacy-not-clean-user",
      severity: "p2",
      status: "closed",
      evidence: ["unknown_legacy", "countAsUnknownLegacy"],
      action: "Incomplete old records stay unknown instead of being treated as clean known users.",
    },
  ];
  const findings = [...transferFindings, ...continuityFindings];

  return {
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "identity-transfer-telemetry-closure",
    currentHead: input.currentHead,
    summary: {
      identityStatesClosed: true,
      identityLinkRoutePresent: true,
      deterministicLinkIdShared: true,
      clientSubmitIdempotent: true,
      broadGuestReadsBlocked: true,
      individualUserSessionContinuity: true,
      linkedGuestNoDoubleCount: true,
      unknownLegacySeparated: true,
      creatorAdminProjectionSeparated: true,
      p0Count: countSeverity(findings, "p0"),
      p1Count: countSeverity(findings, "p1"),
      p2Count: countSeverity(findings, "p2"),
    },
    identityStates: [
      "guest_only",
      "user_only",
      "guest_linked_to_user",
      "creator_user",
      "admin_projection",
      "unknown_legacy",
    ],
    transferFindings,
    continuityFindings,
    fixesApplied: [
      "Expanded analytics identity states for creator users and admin projections.",
      "Shared deterministic identity link id generation across client and server upsert paths.",
      "Added counting semantics that prevent linked guest lineage from becoming a second known user.",
      "Updated identified ingest identity classification to distinguish user-only session continuity from linked guest lineage.",
    ],
    nextFixOrder: [
      "Use identity_lineage_indexes in admin user analytics consumers when a bounded linked-history view is needed.",
      "Keep legacy unknown identity rows explicit until a source-backed migration plan exists.",
      "Continue treating provider/warehouse exports as supporting evidence, not primary identity truth.",
    ],
  };
}

export function validateIdentityTransferTelemetryClosureReport(
  report: IdentityTransferTelemetryClosureReport,
  sources: SourceMap,
  options: { currentHead?: string } = {},
) {
  const failures: string[] = [];
  const scripts = getPackageScripts("package.json");
  const identityTransfer = sources["src/lib/analytics/identity-transfer.ts"] ?? "";
  const identityLink = sources["src/lib/analytics/analytics-identity-link.ts"] ?? "";
  const eventContract = sources["src/lib/analytics/analytics-event-contract.ts"] ?? "";
  const serverLinking = sources["src/lib/server/analytics-identity-linking.ts"] ?? "";
  const identityRoute = sources["src/app/api/analytics/identity-link/route.ts"] ?? "";
  const identifiedIngest = sources["src/app/api/analytics/ingest-identified/route.ts"] ?? "";
  const authContext = sources["src/context/AuthContext.tsx"] ?? "";
  const tests = sources["tests/unit/identity-transfer-telemetry-closure.spec.ts"] ?? "";

  if (report.reportKey !== "identity-transfer-telemetry-closure") {
    failures.push("reportKey must be identity-transfer-telemetry-closure.");
  }
  if (options.currentHead && report.currentHead !== options.currentHead) {
    failures.push("currentHead mismatch.");
  }
  if (!scripts["check:identity-transfer-telemetry-closure"]) {
    failures.push("package.json is missing check:identity-transfer-telemetry-closure.");
  }
  for (const state of ["guest_only", "user_only", "guest_linked_to_user", "creator_user", "admin_projection", "unknown_legacy"]) {
    if (!eventContract.includes(`"${state}"`) || !identityLink.includes(`"${state}"`) || !report.identityStates.includes(state)) {
      failures.push(`identity state missing: ${state}.`);
    }
  }
  if (!identityLink.includes("buildGuestUserIdentityLinkId") || !identityTransfer.includes("buildGuestUserIdentityLinkId")) {
    failures.push("shared deterministic identity link id helper missing.");
  }
  if (!serverLinking.includes("buildGuestUserIdentityLinkId") || serverLinking.includes("createHash")) {
    failures.push("server identity link upsert is not using the shared deterministic link id helper.");
  }
  if (!identityRoute.includes("auth: \"user\"") || !identityRoute.includes("requireAuthHeaderPresence: true")) {
    failures.push("identity link route must require authenticated user context.");
  }
  if (identityRoute.includes("collectionGroup") || identityRoute.includes("analytics_guest_batches")) {
    failures.push("identity link route must not broad-read guest history.");
  }
  if (!authContext.includes("payload.submit(authFetch)")) {
    failures.push("auth transition does not delegate identity-link lifecycle to payload.submit.");
  }
  if (!identityLink.includes("if (hasSubmittedIdentityLink(link, storage))") || !identityLink.includes("markIdentityLinkSubmitted(link, storage)")) {
    failures.push("identity-link payload submit must own pending and duplicate suppression.");
  }
  if (!identifiedIngest.includes("resolveIdentityTransferTelemetryState") || !identifiedIngest.includes("sourceIdentity")) {
    failures.push("identified ingest must preserve session continuity with shared identity-state resolution.");
  }
  if (!identityLink.includes("buildIdentityTransferCountingKeys") || !identityLink.includes("countAsAdditionalKnownUser: false")) {
    failures.push("linked guest history double-count guard missing.");
  }
  if (!identityLink.includes("countAsUnknownLegacy")) {
    failures.push("unknown legacy rows are not separated from known user analysis.");
  }
  if (!eventContract.includes("creator_user") || !eventContract.includes("admin_projection")) {
    failures.push("creator/admin projection identity separation missing from event contract.");
  }
  for (const requiredTest of [
    "does not treat a signed-in session id alone as linked guest history",
    "separates creator and admin projection identities from normal users",
    "keeps linked guest lineage from becoming a second known user count",
    "keeps unknown legacy out of clean known user analysis",
  ]) {
    if (!tests.includes(requiredTest)) {
      failures.push(`required test missing: ${requiredTest}`);
    }
  }
  if (!report.summary.linkedGuestNoDoubleCount || !report.summary.unknownLegacySeparated) {
    failures.push("report summary does not preserve double-count and legacy separation.");
  }
  if (report.nextFixOrder.length === 0) {
    failures.push("nextFixOrder must not be empty.");
  }

  return failures;
}

function renderMarkdown(report: IdentityTransferTelemetryClosureReport) {
  return [
    "# Identity Transfer Telemetry Closure",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Identity states closed: ${report.summary.identityStatesClosed}`,
    `- Identity link route present: ${report.summary.identityLinkRoutePresent}`,
    `- Deterministic link id shared: ${report.summary.deterministicLinkIdShared}`,
    `- Client submit idempotent: ${report.summary.clientSubmitIdempotent}`,
    `- Broad guest reads blocked: ${report.summary.broadGuestReadsBlocked}`,
    `- Individual user session continuity: ${report.summary.individualUserSessionContinuity}`,
    `- Linked guest no double count: ${report.summary.linkedGuestNoDoubleCount}`,
    `- Unknown legacy separated: ${report.summary.unknownLegacySeparated}`,
    `- Creator/admin projection separated: ${report.summary.creatorAdminProjectionSeparated}`,
    "",
    "## Identity States",
    "",
    ...report.identityStates.map((state) => `- ${state}`),
    "",
    "## Transfer Findings",
    "",
    ...report.transferFindings.map((finding) => `- ${finding.id} [${finding.status}]: ${finding.action}`),
    "",
    "## Continuity Findings",
    "",
    ...report.continuityFindings.map((finding) => `- ${finding.id} [${finding.status}]: ${finding.action}`),
    "",
    "## Fixes Applied",
    "",
    ...report.fixesApplied.map((fix) => `- ${fix}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((step, index) => `${index + 1}. ${step}`),
    "",
  ].join("\n");
}

function main() {
  const report = buildIdentityTransferTelemetryClosureReport({
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
  });
  const failures = validateIdentityTransferTelemetryClosureReport(report, readSources(), {
    currentHead: report.currentHead,
  });

  if (failures.length > 0) {
    console.error("Identity transfer telemetry closure validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  writeJsonFile(artifactPath, report);
  writeTextFile(docsPath, `${renderMarkdown(report)}\n`);
  console.log(`[identity-transfer-telemetry-closure] wrote ${artifactPath}`);
  console.log(`[identity-transfer-telemetry-closure] wrote ${docsPath}`);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("validate-identity-transfer-telemetry-closure.ts")) {
  main();
}
