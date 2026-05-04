import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  mapDebugCategoryToAuditDomains,
  rankDebugEvidenceForAudit,
  type DebugEvidenceAuditSummary,
  type DebugEvidenceSeverity,
} from "../../src/lib/debug-evidence-contract";
import { DEBUG_EVIDENCE_INDEX_PATH, PRECATCH_RUNTIME_ISSUES_PATH, readDebugEvidenceIndex } from "./load-debug-evidence-for-audit";

const PRECATCH_RUNTIME_ISSUES_ARTIFACT = "precatch-runtime-issues.generated.json";

export type PrecatchIssue = {
  id: string;
  severity: "warn" | "error" | "critical";
  fingerprint: string;
  category: string;
  route?: string;
  component?: string;
  occurrenceCount: number;
  affectedUsersApprox?: number;
  firstSeenAt: number;
  lastSeenAt: number;
  likelyCause: string;
  recommendedFix: string;
  auditDomainsToInjectInto: string[];
  linkedEvidenceIds: string[];
};

type PrecatchArtifact = {
  generatedAt: string;
  evidenceSource: string;
  issues: PrecatchIssue[];
  rules: string[];
};

function toIssueSeverity(severity: DebugEvidenceSeverity, occurrenceCount: number): PrecatchIssue["severity"] {
  if (severity === "critical") {
    return "critical";
  }
  if (severity === "error" || occurrenceCount >= 5) {
    return "error";
  }
  return "warn";
}

function classifyLikelyCause(record: DebugEvidenceAuditSummary) {
  const message = `${record.message} ${record.humanMessage}`.toLowerCase();

  if (record.category === "support" || message.includes("support")) {
    if (message.includes("forbidden") || message.includes("blocked") || message.includes("permission")) {
      return {
        likelyCause: "Support admin read is being blocked by admin role, support API, or support_threads rules.",
        recommendedFix: "Verify the admin route uses auth: admin, reads nested support_messages through the server helper, and the admin dashboard consumes the admin API path.",
      };
    }
    return {
      likelyCause: "Support route or nested message loading is failing repeatedly.",
      recommendedFix: "Inspect the admin support list/detail routes and confirm the selected thread loads messages from support_threads/{threadId}/support_messages.",
    };
  }

  if (record.category === "layout" || message.includes("focus shifted") || message.includes("bottom navigation")) {
    return {
      likelyCause: "Mobile layout diagnostics detected repeated shell or safe-area instability.",
      recommendedFix: "Run the relevant shell validator and inspect shared viewport/bottom-nav tokens before any visual audit escalation.",
    };
  }

  if (record.category === "telemetry" || message.includes("unsupported telemetry")) {
    return {
      likelyCause: "Telemetry emitted an event or payload that the catalog does not accept.",
      recommendedFix: "Compare the event against the telemetry catalog and add source_component only through the canonical telemetry path.",
    };
  }

  if (record.category === "content_protection") {
    return {
      likelyCause: "Content protection diagnostics detected a locked-content safety warning.",
      recommendedFix: "Inspect the locked preview/content API payload and verify no internal content URLs are exposed before entitlement.",
    };
  }

  if (record.category === "wallet") {
    return {
      likelyCause: "Wallet, purchase, unlock, or GumDrops route diagnostics repeated.",
      recommendedFix: "Inspect source-of-funds and transaction route evidence without applying autofixes to economy or payment logic.",
    };
  }

  return {
    likelyCause: "Runtime diagnostics recorded repeated client, server, network, or route failures.",
    recommendedFix: "Inspect the linked evidence fingerprint and route before escalating to heavier runtime verification.",
  };
}

function shouldCreateIssue(record: DebugEvidenceAuditSummary) {
  return record.severity === "critical"
    || record.severity === "error"
    || record.occurrenceCount >= 2
    || record.message.toLowerCase().includes("permission")
    || record.message.toLowerCase().includes("forbidden");
}

export function buildPrecatchRuntimeIssues(root = process.cwd()): PrecatchArtifact {
  const evidenceIndex = readDebugEvidenceIndex(root);
  const records = evidenceIndex?.records ?? [];
  const issues = records
    .filter(shouldCreateIssue)
    .sort(rankDebugEvidenceForAudit)
    .map((record): PrecatchIssue => {
      const cause = classifyLikelyCause(record);
      return {
        id: `precatch_${record.fingerprint}`,
        severity: toIssueSeverity(record.severity, record.occurrenceCount),
        fingerprint: record.fingerprint,
        category: record.category,
        route: record.route,
        component: record.component,
        occurrenceCount: record.occurrenceCount,
        affectedUsersApprox: undefined,
        firstSeenAt: record.firstSeenAt,
        lastSeenAt: record.lastSeenAt,
        likelyCause: cause.likelyCause,
        recommendedFix: cause.recommendedFix,
        auditDomainsToInjectInto: mapDebugCategoryToAuditDomains(record.category),
        linkedEvidenceIds: [record.id],
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    evidenceSource: DEBUG_EVIDENCE_INDEX_PATH,
    issues,
    rules: [
      "repeated client layout warnings",
      "repeated chat input focus instability",
      "repeated API route 401/403/500",
      "repeated support permission denied",
      "repeated Firebase read failures",
      "repeated telemetry unsupported event warnings",
      "repeated failed purchase/unlock attempts",
      "repeated notification fetch errors",
      "repeated content protection warnings",
      "repeated hydration module failure",
    ],
  };
}

export function writePrecatchRuntimeIssues(root = process.cwd()) {
  const artifact = buildPrecatchRuntimeIssues(root);
  const fullPath = join(root, PRECATCH_RUNTIME_ISSUES_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return artifact;
}

const artifact = writePrecatchRuntimeIssues();
console.log(`Pre-catcher issues: ${artifact.issues.length} candidate(s) -> ${PRECATCH_RUNTIME_ISSUES_ARTIFACT}`);
