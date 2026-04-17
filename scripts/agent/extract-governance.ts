import { createMetadata, extractRepoPaths, fileExists, readText, toStableId } from "./shared";

export type GovernanceEntry = {
  stable_id: string;
  path: string;
  role: string;
  docType: "policy" | "ledger" | "exhaustive_companion" | "historical_evidence";
  startupRelevance: "always" | "broad_work_only" | "selective";
  consultMode: "full" | "selective" | "historical_only";
};

export type ParsedAuditPass = {
  stable_id: string;
  date: string;
  title: string;
  scopeSummary: string[];
  touchedSurfaces: string[];
  verificationCommandsRun: string[];
  resultSummary: string[];
  warnings: string[];
};

const GOVERNANCE_FILES: GovernanceEntry[] = [
  {
    stable_id: toStableId("governance", "FULL_SCALE_CODEBASE_AUDIT.md"),
    path: "FULL_SCALE_CODEBASE_AUDIT.md",
    role: "Canonical pass-by-pass audit record and verification ledger.",
    docType: "ledger",
    startupRelevance: "always",
    consultMode: "full",
  },
  {
    stable_id: toStableId("governance", "REPO_MEMORY_LEDGER.md"),
    path: "REPO_MEMORY_LEDGER.md",
    role: "Durable architecture and workflow decision ledger.",
    docType: "ledger",
    startupRelevance: "always",
    consultMode: "full",
  },
  {
    stable_id: toStableId("governance", "EVERY_FILE_FUNCTION_CHECKLIST.md"),
    path: "EVERY_FILE_FUNCTION_CHECKLIST.md",
    role: "Exhaustive historical file/function sweep companion.",
    docType: "exhaustive_companion",
    startupRelevance: "always",
    consultMode: "full",
  },
  {
    stable_id: toStableId("governance", "ANALYTICS_SYSTEM_AUDIT_2026-03-18.md"),
    path: "ANALYTICS_SYSTEM_AUDIT_2026-03-18.md",
    role: "Historical analytics evidence snapshot.",
    docType: "historical_evidence",
    startupRelevance: "selective",
    consultMode: "historical_only",
  },
  {
    stable_id: toStableId("governance", "FULL_CODEBASE_POST_AUDIT_2026-03-18.md"),
    path: "FULL_CODEBASE_POST_AUDIT_2026-03-18.md",
    role: "Historical post-audit evidence snapshot.",
    docType: "historical_evidence",
    startupRelevance: "selective",
    consultMode: "historical_only",
  },
  {
    stable_id: toStableId("governance", "STANDARDIZATION_AUDIT_CHECKLIST.md"),
    path: "STANDARDIZATION_AUDIT_CHECKLIST.md",
    role: "Historical standardization audit companion.",
    docType: "historical_evidence",
    startupRelevance: "selective",
    consultMode: "historical_only",
  },
];

function parseSectionLines(body: string, label: string) {
  const match = body.match(new RegExp(`${label}:\\r?\\n([\\s\\S]*?)(?:\\r?\\n## |\\r?\\n[A-Z][^\\n]+:|$)`));
  if (!match) {
    return [];
  }

  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^- /, "").trim());
}

export function parseAuditPasses(limit = 8): ParsedAuditPass[] {
  const audit = readText("FULL_SCALE_CODEBASE_AUDIT.md");
  const sections = audit.split(/\r?\n## /).slice(1, limit + 1);

  return sections.map((section) => {
    const [headingLine = "", ...bodyLines] = section.split(/\r?\n/);
    const body = bodyLines.join("\n");
    const dateMatch = headingLine.match(/\[([0-9-]{10})/);
    const title = headingLine.replace(/^\[[^\]]+\]\s*/, "").trim();

    const touchedSurfaces = extractRepoPaths(body);
    const verificationCommandsRun = parseSectionLines(body, "Verification Commands Run")
      .filter((line) => line.startsWith("`") && line.endsWith("`"))
      .map((line) => line.slice(1, -1));

    return {
      date: dateMatch?.[1] ?? "unknown",
      stable_id: toStableId("pass", `${dateMatch?.[1] ?? "unknown"}-${title}`),
      title,
      scopeSummary: parseSectionLines(body, "Scope for this pass"),
      touchedSurfaces,
      verificationCommandsRun,
      resultSummary: parseSectionLines(body, "Implementation Results").concat(parseSectionLines(body, "Results")),
      warnings: parseSectionLines(body, "Warnings and non-blocking notes"),
    };
  });
}

export function buildGovernanceTruth() {
  const files = GOVERNANCE_FILES.filter((entry) => fileExists(entry.path));
  return {
    ...createMetadata(files.map((entry) => entry.path)),
    files,
  };
}
