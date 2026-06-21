import { pathToFileURL } from "node:url";

import {
  fileExists,
  discoverRepoFiles,
  getPackageScripts,
  nowIso,
  readFileHash,
  readFileModifiedMarker,
  readJsonFile,
  readRepoToolchainState,
  readText,
  toStableId,
  writeJsonFile,
  type Json,
  type CurrentHeadSource,
  type GitToolStatus,
  type SourceFileDiscovery,
} from "./shared";
import {
  SIGNAL_FINDING_SCHEMA_VERSION,
  buildSignalSarifProjection,
  type SignalAffectedFile,
  type SignalFinding,
  type SignalOwnerLane,
  type SignalSeverity,
  type SignalSourceSurface,
  type SignalStaleEvidenceMarker,
} from "../../src/lib/agent-score/signal-finding-contract";
import {
  buildGeneratedReportCleanupMetadata,
  buildGeneratedReportCompleteness,
  type GeneratedReportBaselineStatus,
  type GeneratedReportCompletenessMetadata,
  type GeneratedReportCleanupMetadata,
  type GeneratedReportFreshness,
} from "../../src/lib/agent-governance/generated-reports/generated-report-contract";

const REPORT_PATH = "agent/state/signal-source-graph.generated.json";
const MAX_EXAMPLES = 25;
const MAX_EMITTED_FINDINGS = 100;
const MAX_WRITABLE_FINDING_EXAMPLES = 25;
const MAX_WRITABLE_TOP_RISK_EXAMPLES = 15;
const MAX_WRITABLE_WORKING_TREE_STATUS = 25;
const SOURCE_ROOTS = ["src/", "functions/src/", "shared/", "tests/", "scripts/agent/"] as const;
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"] as const;
const TS_SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts"] as const;
const SKIP_PATH_PARTS = [
  "/node_modules/",
  "/.next/",
  "/coverage/",
  "/playwright-report/",
  "/test-results/",
  "/lighthouse-results/",
  "/storybook-static/",
  "/dist/",
  "/build/",
  "/out/",
] as const;

type RepoInventoryItem = {
  path: string;
  file_class?: string;
  surface_category?: string;
  generated?: boolean;
  evidence_only?: boolean;
  likely_shared_helper?: boolean;
  likely_broad_signoff_relevant?: boolean;
  last_modified_or_hash?: string;
};

type RepoInventoryMetadata = {
  generatedAt?: string;
  currentHead?: string | null;
  currentHeadSource?: CurrentHeadSource;
  gitStatus?: GitToolStatus;
  sourceFileDiscovery?: SourceFileDiscovery;
  toolingDegraded?: boolean;
};

type CanonicalHelperEntry = {
  path: string;
  family: string;
  purpose: string;
  reuseBeforeNew?: boolean;
};

type SurfaceDomain = {
  name: string;
  path_prefixes: string[];
  runtime_sensitivity?: string;
};

type VerificationCommand = {
  command: string;
  scopeType: string;
  requiredWhen?: string[];
};

type SourceFileNode = {
  path: string;
  ownerLane: SignalOwnerLane;
  sourceSurface: SignalSourceSurface;
  imports: string[];
  resolvedImports: string[];
  exports: string[];
  packageScriptOwner?: string;
};

type SignalSourceGraphSummary = {
  trackedFileCount: number;
  sourceFileCount: number;
  touchedTrackedFileCount: number;
  baselineHashDriftCount: number;
  findingCount: number;
  emittedFindingCount: number;
  byRule: Record<string, number>;
  byOwnerLane: Record<string, number>;
  bySourceSurface: Record<string, number>;
};

type SignalSourceGraphReport = {
  schemaVersion: typeof SIGNAL_FINDING_SCHEMA_VERSION;
  generatedAtUtc: string;
  reportPath: typeof REPORT_PATH;
  gitStatus: GitToolStatus;
  sourceFileDiscovery: SourceFileDiscovery;
  currentHead: string | null;
  currentHeadSource: CurrentHeadSource;
  workingTreeStatus: string[] | "unavailable_git_missing";
  toolingDegraded: boolean;
  degradationReason: string | null;
  inventoryBaselineStatus: "current" | "stale" | "missing" | "unknown";
  reportCompleteness: GeneratedReportCompletenessMetadata["reportCompleteness"];
  totalFindingCount: number;
  emittedFindingCount: number;
  omittedFindingCount: number;
  capReason: string | null;
  capStrategy: GeneratedReportCompletenessMetadata["capStrategy"];
  capLimit: number | null;
  rankingInputCompleteness: GeneratedReportCompletenessMetadata["reportCompleteness"];
  highRiskCounts: NonNullable<GeneratedReportCompletenessMetadata["highRiskCounts"]>;
  sourceCommit: string | null;
  freshness: GeneratedReportFreshness;
  baselineStatus: GeneratedReportBaselineStatus;
  owner: string;
  safetyClass: GeneratedReportCleanupMetadata["safetyClass"];
  costClass: GeneratedReportCleanupMetadata["costClass"];
  rollback: string;
  cleanupPolicy: GeneratedReportCleanupMetadata["cleanupPolicy"];
  cleanupCommand: string | null;
  sourceTruthRole: GeneratedReportCleanupMetadata["sourceTruthRole"];
  sourceInputs: string[];
  commandBudget: {
    allowedCommands: string[];
    forbiddenCommands: string[];
  };
  summary: SignalSourceGraphSummary;
  touchedFiles: {
    count: number;
    examples: string[];
  };
  baselineHashDrift: {
    count: number;
    classification: "normal_touched_files" | "baseline_stale_hash_drift" | "review";
    examples: string[];
  };
  nodes: {
    count: number;
    examples: SourceFileNode[];
  };
  importGraph: {
    edgeCount: number;
    unresolvedImportCount: number;
    staleReferenceCount: number;
    routeNoncanonicalImportCount: number;
    uiServerImportCount: number;
  };
  generatedReportFreshness: {
    freshnessSignal: "current" | "stale" | "review";
    staleRelativeToTouchedCount: number;
    staleExamples: string[];
  };
  validatorOwnership: {
    scriptCount: number;
    noPackageScriptOwnerCount: number;
    byClassification: Record<"owned_by_package_script" | "imported_helper" | "legacy_orphan_candidate" | "manual_review", number>;
    examples: Array<{ path: string; classification: "owned_by_package_script" | "imported_helper" | "legacy_orphan_candidate" | "manual_review" }>;
  };
  duplicateOwnerCandidates: {
    count: number;
    examples: Array<{ family: string; paths: string[] }>;
  };
  findings: {
    totalCount: number;
    emittedCount: number;
    examples: SignalFinding[];
    topRiskExamples: SignalFinding[];
  };
  rankInputFindings: SignalFinding[];
};

type SourceGraphInput = {
  trackedFiles: string[];
  toolchain?: ReturnType<typeof readRepoToolchainState>;
  inventoryMetadata?: RepoInventoryMetadata;
  inventoryItems: RepoInventoryItem[];
  canonicalHelpers: CanonicalHelperEntry[];
  surfaceDomains: SurfaceDomain[];
  verificationCommands: VerificationCommand[];
  packageScripts: Record<string, string>;
};

function normalizePath(repoPath: string) {
  return repoPath.replace(/\\/g, "/").replace(/^\.\//u, "");
}

function isSkippedPath(repoPath: string) {
  const normalized = `/${normalizePath(repoPath)}`;
  return SKIP_PATH_PARTS.some((part) => normalized.includes(part));
}

function isSourcePath(repoPath: string) {
  const normalized = normalizePath(repoPath);
  return SOURCE_ROOTS.some((root) => normalized.startsWith(root)) && SOURCE_EXTENSIONS.some((extension) => normalized.endsWith(extension)) && !isSkippedPath(normalized);
}

function cap<T>(values: T[], max = MAX_EXAMPLES) {
  return values.slice(0, max);
}

function riskWeightForFinding(finding: SignalFinding) {
  const severityWeight: Record<SignalSeverity, number> = {
    info: 1,
    minor: 2,
    moderate: 4,
    major: 7,
    critical: 10,
  };
  const text = [
    finding.ruleId,
    finding.title,
    finding.rootCauseHypothesis,
    finding.sourceSurface,
    finding.ownerLane,
    ...finding.affectedFiles.map((file) => file.path),
  ].join(" ").toLowerCase();
  return (
    severityWeight[finding.severity] * 10 +
    (finding.confidence === "high" ? 12 : finding.confidence === "medium" ? 6 : 0) +
    (finding.terminalProof === "signoff" ? 12 : finding.terminalProof === "targeted" ? 6 : 0) +
    (/payment|paypal|gumdrop|wallet|entitlement|auth|privacy|server|provider|locked|unlock/u.test(text) ? 20 : 0) +
    (finding.staleEvidence === "stale" ? 5 : 0)
  );
}

function topRiskFindings(findings: SignalFinding[], max = MAX_EXAMPLES) {
  return [...findings].sort((left, right) => riskWeightForFinding(right) - riskWeightForFinding(left) || left.id.localeCompare(right.id)).slice(0, max);
}

function highRiskCounts(findings: SignalFinding[]): NonNullable<GeneratedReportCompletenessMetadata["highRiskCounts"]> {
  const textFor = (finding: SignalFinding) => [
    finding.ruleId,
    finding.title,
    finding.rootCauseHypothesis,
    finding.sourceSurface,
    finding.ownerLane,
    ...finding.affectedFiles.map((file) => file.path),
  ].join(" ").toLowerCase();
  return {
    critical: findings.filter((finding) => finding.severity === "critical").length,
    major: findings.filter((finding) => finding.severity === "major").length,
    signoff: findings.filter((finding) => finding.terminalProof === "signoff").length,
    privacy: findings.filter((finding) => /privacy|consent|auth|identity/u.test(textFor(finding))).length,
    payment: findings.filter((finding) => /payment|paypal|gumdrop|wallet|billing|entitlement/u.test(textFor(finding))).length,
    lockedContent: findings.filter((finding) => /locked|unlock|private media|content_protection|entitlement/u.test(textFor(finding))).length,
    sourceTruth: findings.filter((finding) => /source-truth|server-truth|ui-server-import|route-noncanonical|server_truth/u.test(textFor(finding))).length,
  };
}

function increment(record: Record<string, number>, key: string) {
  record[key] = (record[key] ?? 0) + 1;
}

function safeReadFileHash(repoPath: string) {
  try {
    return readFileHash(repoPath);
  } catch {
    return null;
  }
}

function safeReadFileModifiedMs(repoPath: string) {
  try {
    const markerMs = Number(readFileModifiedMarker(repoPath).split(":")[0]);
    return Number.isFinite(markerMs) ? markerMs : null;
  } catch {
    return null;
  }
}

function ownerLaneForPath(repoPath: string): SignalOwnerLane {
  if (repoPath.startsWith("scripts/agent/") || repoPath.startsWith("agent/")) return "agent_context";
  if (repoPath.startsWith("tests/")) return "test_fixture";
  if (repoPath.startsWith("src/app/") && /\/route\.ts$/u.test(repoPath)) return "backend";
  if (repoPath.includes("/telemetry") || repoPath.includes("/analytics") || repoPath.includes("event-")) return "telemetry";
  if (repoPath.includes("/debug") || repoPath.includes("debug-")) return "debug_evidence";
  if (repoPath.includes("/privacy") || repoPath.includes("consent")) return "privacy";
  if (repoPath.includes("/cost") || repoPath.includes("billing")) return "cost";
  if (repoPath.includes("/type") || repoPath.includes("schema") || repoPath.includes("contract")) return "type_schema";
  if (repoPath.startsWith("src/components/") || repoPath.startsWith("src/hooks/") || repoPath.endsWith(".tsx")) return "frontend";
  if (repoPath.startsWith("src/app/api/") || repoPath.startsWith("src/lib/server/") || repoPath.startsWith("functions/src/")) return "backend";
  if (repoPath.startsWith("src/lib/code-organization/")) return "code_organization";
  return "unknown";
}

function sourceSurfaceForPath(repoPath: string, surfaceDomains: SurfaceDomain[]): SignalSourceSurface {
  const domain = surfaceDomains.find((entry) => entry.path_prefixes.some((prefix) => repoPath.startsWith(prefix)));
  const name = domain?.name ?? "";
  if (repoPath.startsWith("tests/")) return "test_fixture";
  if (repoPath.startsWith("agent/") || repoPath.startsWith("scripts/agent/")) return "repo_intelligence";
  if (repoPath.startsWith("src/app/api") || repoPath.startsWith("functions/src/") || /\/route\.ts$/u.test(repoPath) || name.includes("app_routes")) return "server_truth";
  if (repoPath.startsWith("src/app/admin") || name.includes("admin")) return "admin_ui";
  if (name.includes("creator")) return "creator_ui";
  if (name.includes("analytics") || repoPath.includes("telemetry") || repoPath.includes("analytics")) return "analytics_telemetry";
  if (repoPath.includes("identity") || repoPath.includes("auth")) return "identity_auth";
  if (repoPath.includes("wallet") || repoPath.includes("payment") || repoPath.includes("entitlement")) return "wallet_economy_payment";
  if (repoPath.includes("drop") || repoPath.includes("unlock")) return "drop_content_unlock";
  if (repoPath.includes("chat") || repoPath.includes("support")) return "chat_support";
  if (repoPath.startsWith("src/app/") || repoPath.startsWith("src/components/") || repoPath.startsWith("src/hooks/")) return "user_ui";
  if (repoPath.startsWith("agent/state/") || repoPath.startsWith("agent/index/") || repoPath.startsWith("agent/context/")) return "generated_artifact";
  return "unknown";
}

function extractImportSpecifiers(source: string) {
  const specifiers = new Set<string>();
  const patterns = [
    /import\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?["']([^"']+)["']/gu,
    /export\s+(?:type\s+)?[^'"]*?\s+from\s+["']([^"']+)["']/gu,
    /import\s*\(\s*["']([^"']+)["']\s*\)/gu,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      specifiers.add(match[1]);
    }
  }

  return Array.from(specifiers).sort();
}

function extractExportNames(source: string) {
  const names = new Set<string>();
  const patterns = [
    /export\s+(?:async\s+)?(?:function|class|const|let|var|type|interface)\s+([A-Za-z0-9_]+)/gu,
    /export\s*\{\s*([^}]+)\s*\}/gu,
  ];

  let declarationMatch: RegExpExecArray | null;
  while ((declarationMatch = patterns[0].exec(source)) !== null) {
    names.add(declarationMatch[1]);
  }

  let namedMatch: RegExpExecArray | null;
  while ((namedMatch = patterns[1].exec(source)) !== null) {
    for (const candidate of namedMatch[1].split(",")) {
      const name = candidate.trim().split(/\s+as\s+/u)[0]?.trim();
      if (name && /^[A-Za-z0-9_]+$/u.test(name)) {
        names.add(name);
      }
    }
  }

  return Array.from(names).sort();
}

function resolveImport(fromPath: string, specifier: string, trackedSet: Set<string>) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/") && !specifier.startsWith("@shared/")) {
    return null;
  }

  const base = specifier.startsWith("@/")
    ? `src/${specifier.slice(2)}`
    : specifier.startsWith("@shared/")
      ? `shared/${specifier.slice("@shared/".length)}`
      : normalizePath(`${fromPath.split("/").slice(0, -1).join("/")}/${specifier}`);

  const normalizedBase = normalizeRelativePath(base);
  const jsToTsCandidates = specifier.endsWith(".js")
    ? TS_SOURCE_EXTENSIONS.flatMap((extension) => [
        `${normalizedBase.slice(0, -3)}${extension}`,
        `${normalizedBase.slice(0, -3)}/index${extension}`,
      ])
    : [];
  const candidates = [
    normalizedBase,
    ...jsToTsCandidates,
    ...SOURCE_EXTENSIONS.map((extension) => `${normalizedBase}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => `${normalizedBase}/index${extension}`),
  ];

  return candidates.find((candidate) => trackedSet.has(candidate)) ?? null;
}

function normalizeRelativePath(repoPath: string) {
  const parts: string[] = [];
  for (const part of normalizePath(repoPath).split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

function isRouteHandler(repoPath: string) {
  return repoPath.startsWith("src/app/") && repoPath.endsWith("/route.ts");
}

function isAppRouterServerCapableFile(repoPath: string) {
  if (!repoPath.startsWith("src/app/")) return false;
  if (repoPath.startsWith("src/app/api/")) return true;
  return /\/(route|page|layout|loading|error|not-found|template|default|opengraph-image|twitter-image|icon|apple-icon|sitemap|robots|manifest)\.(ts|tsx)$/u.test(repoPath);
}

function hasUseClientDirective(source: string) {
  const firstStatements = source.slice(0, 300);
  return /^(?:\s|;|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*["']use client["']/u.test(firstStatements);
}

function usesBrowserClientRuntime(source: string) {
  return /\b(useEffect|useLayoutEffect|useState|useReducer|useRef|window|document|localStorage|sessionStorage|navigator|addEventListener|removeEventListener)\b/u.test(source);
}

function isDefinitelyClientFile(repoPath: string, source: string) {
  if (hasUseClientDirective(source)) return true;
  if (repoPath.startsWith("src/hooks/")) return usesBrowserClientRuntime(source);
  if (repoPath.startsWith("src/components/")) return usesBrowserClientRuntime(source);
  if (repoPath.startsWith("src/app/") && !isAppRouterServerCapableFile(repoPath)) return usesBrowserClientRuntime(source);
  return false;
}

function isPotentialUiFile(repoPath: string) {
  return repoPath.startsWith("src/components/") || repoPath.startsWith("src/hooks/") || repoPath.startsWith("src/app/");
}

function isSensitiveServerHelper(repoPath: string) {
  return repoPath.startsWith("src/lib/server/") && /\b(auth|payment|paypal|provider|entitlement|privacy|admin|firebase|ledger|wallet|gumdrop)\b/iu.test(repoPath);
}

function isGeneratedReportPath(repoPath: string) {
  return (
    (repoPath.startsWith("agent/state/") && repoPath.endsWith(".generated.json")) ||
    (repoPath.startsWith("agent/context/") && repoPath.endsWith(".generated.json")) ||
    (repoPath.startsWith("agent/index/") && repoPath.endsWith(".json"))
  );
}

function parseWorkingTreeFiles(toolchain: ReturnType<typeof readRepoToolchainState>) {
  return Array.isArray(toolchain.workingTreeStatus)
    ? toolchain.workingTreeStatus.map((line) => normalizePath(line.replace(/^.../u, "").trim())).filter(Boolean)
    : [];
}

function inventoryBaselineStatus(input: {
  metadata?: RepoInventoryMetadata;
  itemCount: number;
  toolchain: ReturnType<typeof readRepoToolchainState>;
}) {
  if (input.itemCount === 0) return "missing" as const;
  const generatedAtMs = input.metadata?.generatedAt ? Date.parse(input.metadata.generatedAt) : Number.NaN;
  if (!Number.isFinite(generatedAtMs)) return "unknown" as const;
  const isOlderThanOneDay = Date.now() - generatedAtMs > 24 * 60 * 60 * 1000;
  if (isOlderThanOneDay) return "stale" as const;
  if (input.toolchain.gitStatus !== "available" || input.toolchain.currentHeadSource !== "git") return "unknown" as const;
  if (input.metadata?.currentHead && input.toolchain.currentHead && input.metadata.currentHead !== input.toolchain.currentHead) return "stale" as const;
  return "current" as const;
}

function scriptNameFromPath(repoPath: string) {
  return repoPath.replace(/^scripts\/agent\//u, "").replace(/\.ts$/u, "");
}

function buildFinding(input: {
  ruleId: string;
  title: string;
  severity: SignalSeverity;
  sourceSurface: SignalSourceSurface;
  ownerLane: SignalOwnerLane;
  affectedFiles: SignalAffectedFile[];
  rootCauseHypothesis: string;
  staleEvidence?: SignalStaleEvidenceMarker;
  recommendedNextAction: string;
  minimalVerificationCommands?: string[];
  confidence?: SignalFinding["confidence"];
  sourceTruthCaveat?: string;
  toolchain?: ReturnType<typeof readRepoToolchainState>;
}): SignalFinding {
  const degraded = input.toolchain?.toolingDegraded ?? false;
  const confidence = input.confidence ?? (degraded ? "low" : "medium");
  const minimalVerificationCommands = input.minimalVerificationCommands ?? [];
  const hasOwnedTargetedValidator = minimalVerificationCommands.some((command) =>
    /npm run (agent:test|signal:|check:[a-z0-9:-]+|score:[a-z0-9:-]+)|npx vitest/iu.test(command) && !/^npm run typecheck$/u.test(command) && !/^npm run lint$/u.test(command),
  );
  const caveat = input.sourceTruthCaveat ?? (degraded
    ? `Source discovery is degraded (${input.toolchain?.sourceFileDiscovery ?? "unknown"} fallback: ${input.toolchain?.degradationReason ?? "unknown"}); treat this as source-only triage, not Git-backed proof.`
    : input.rootCauseHypothesis);
  const base = {
    id: toStableId("signal", `${input.ruleId}:${input.affectedFiles.map((file) => file.path).join(",")}:${input.title}`),
    ruleId: input.ruleId,
    title: input.title,
    severity: input.severity,
    confidence,
    sourceSurface: input.sourceSurface,
    ownerLane: input.ownerLane,
    evidence: [
      {
        kind: "source" as const,
        source: "signal-source-graph",
        summary: caveat,
        freshness: input.staleEvidence ?? "current",
        redacted: false,
      },
    ],
    affectedFiles: input.affectedFiles,
    rootCauseHypothesis: input.rootCauseHypothesis,
    staleEvidence: input.staleEvidence ?? "current",
    terminalProof: minimalVerificationCommands.length > 0 && (!degraded || hasOwnedTargetedValidator) ? "targeted" as const : "none" as const,
    recommendedNextAction: input.recommendedNextAction,
  };

  return {
    schemaVersion: SIGNAL_FINDING_SCHEMA_VERSION,
    ...base,
    minimalVerificationCommands,
    sarif: buildSignalSarifProjection(base),
  };
}

export function buildSignalSourceGraphReport(input: SourceGraphInput): SignalSourceGraphReport {
  const toolchain = input.toolchain ?? readRepoToolchainState();
  const baselineStatus = inventoryBaselineStatus({
    metadata: input.inventoryMetadata,
    itemCount: input.inventoryItems.length,
    toolchain,
  });
  const trackedFiles = input.trackedFiles.map(normalizePath).filter((file) => !isSkippedPath(file));
  const trackedSet = new Set(trackedFiles);
  const packageScriptCommands = Object.entries(input.packageScripts);
  const canonicalHelperPaths = new Set(input.canonicalHelpers.map((entry) => normalizePath(entry.path)));
  const inventoryByPath = new Map(input.inventoryItems.map((item) => [normalizePath(item.path), item]));
  const sourceFiles = trackedFiles.filter(isSourcePath);
  const baselineHashDriftFiles = trackedFiles.filter((file) => {
    const inventoryMarker = inventoryByPath.get(file)?.last_modified_or_hash;
    if (!inventoryMarker || !fileExists(file)) return false;
    const inventoryHash = inventoryMarker.split(":")[1];
    const currentHash = safeReadFileHash(file);
    return Boolean(inventoryHash && currentHash) && currentHash !== inventoryHash;
  });
  const workingTreeTouchedFiles = parseWorkingTreeFiles(toolchain).filter((file) => trackedSet.has(file) || fileExists(file)).sort();
  const touchedFiles = baselineStatus === "current"
    ? Array.from(new Set([...workingTreeTouchedFiles, ...baselineHashDriftFiles])).sort()
    : workingTreeTouchedFiles;
  const baselineHashDriftClassification = baselineStatus === "current"
    ? "normal_touched_files" as const
    : baselineStatus === "stale"
      ? "baseline_stale_hash_drift" as const
      : "review" as const;
  const touchedMaxMarker = Math.max(0, ...touchedFiles.map(safeReadFileModifiedMs).filter((value): value is number => typeof value === "number"));

  const nodes: SourceFileNode[] = [];
  const findings: SignalFinding[] = [];
  const inboundByPath = new Map<string, string[]>();
  let edgeCount = 0;
  const unresolvedImports: Array<{ file: string; specifier: string }> = [];
  const staleReferences: Array<{ file: string; specifier: string }> = [];
  const routeNoncanonicalImports: Array<{ file: string; imported: string }> = [];
  const uiServerImports: Array<{ file: string; imported: string }> = [];

  for (const file of sourceFiles) {
    if (!fileExists(file)) continue;
    const source = readText(file);
    const imports = extractImportSpecifiers(source);
    const resolvedImports = imports
      .map((specifier) => {
        const resolved = resolveImport(file, specifier, trackedSet);
        if (resolved) {
          const inbound = inboundByPath.get(resolved) ?? [];
          inbound.push(file);
          inboundByPath.set(resolved, inbound);
          edgeCount += 1;
        } else if (specifier.startsWith(".") || specifier.startsWith("@/") || specifier.startsWith("@shared/")) {
          unresolvedImports.push({ file, specifier });
          if (/legacy|deprecated|old|moved|route|helper|normalizer/iu.test(specifier)) {
            staleReferences.push({ file, specifier });
          }
        }
        return resolved;
      })
      .filter((resolved): resolved is string => Boolean(resolved));

    if (isRouteHandler(file)) {
      for (const imported of resolvedImports) {
        if (
          imported.startsWith("src/lib/") &&
          !canonicalHelperPaths.has(imported) &&
          !imported.startsWith("src/lib/server/") &&
          !imported.includes("/legacy/")
        ) {
          routeNoncanonicalImports.push({ file, imported });
        }
      }
    }

    const definitelyClientFile = isDefinitelyClientFile(file, source);
    const potentialUiFile = isPotentialUiFile(file);

    if (definitelyClientFile) {
      for (const imported of resolvedImports) {
        if (imported.startsWith("src/lib/server/") || imported.startsWith("functions/src/")) {
          uiServerImports.push({ file, imported });
        }
      }
      if (/\b(adminDb|adminAuth|getFirestore|FieldValue|verifyIdToken|createCustomToken|entitlement|payment|providerCallback)\b/u.test(source)) {
        findings.push(buildFinding({
          ruleId: "signal.source-graph.server-truth-in-ui",
          title: "UI file contains server-truth or provider-owned terms.",
          severity: "major",
          sourceSurface: sourceSurfaceForPath(file, input.surfaceDomains),
          ownerLane: ownerLaneForPath(file),
          affectedFiles: [{ path: file, role: "primary" }],
          rootCauseHypothesis: "UI code may be carrying server truth, provider, entitlement, or payment responsibility inline.",
          recommendedNextAction: "Review whether this should delegate to a canonical server/helper owner before changing behavior.",
          minimalVerificationCommands: ["npm run typecheck"],
          toolchain,
        }));
      }
    } else if (potentialUiFile && isAppRouterServerCapableFile(file)) {
      for (const imported of resolvedImports) {
        if (isSensitiveServerHelper(imported)) {
          findings.push(buildFinding({
            ruleId: "signal.source-graph.server-component-sensitive-helper-review",
            title: "Server-capable App Router file imports a sensitive server helper.",
            severity: "minor",
            sourceSurface: sourceSurfaceForPath(file, input.surfaceDomains),
            ownerLane: ownerLaneForPath(file),
            affectedFiles: [
              { path: file, role: "primary" },
              { path: imported, role: "adjacent" },
            ],
            rootCauseHypothesis: "Server components may import server helpers, but sensitive auth/payment/privacy helpers should keep clear ownership.",
            recommendedNextAction: "Review only if the selected task crosses auth, payment, privacy, or entitlement boundaries.",
            minimalVerificationCommands: ["npm run typecheck"],
            toolchain,
          }));
        }
      }
    }

    const packageScriptOwner = file.startsWith("scripts/agent/")
      ? packageScriptCommands.find(([, command]) => command.includes(file))?.[0]
      : undefined;

    nodes.push({
      path: file,
      ownerLane: ownerLaneForPath(file),
      sourceSurface: sourceSurfaceForPath(file, input.surfaceDomains),
      imports: imports.filter((specifier) => specifier.startsWith(".") || specifier.startsWith("@/") || specifier.startsWith("@shared/")),
      resolvedImports,
      exports: extractExportNames(source),
      ...(packageScriptOwner ? { packageScriptOwner } : {}),
    });
  }

  for (const entry of cap(unresolvedImports)) {
    findings.push(buildFinding({
      ruleId: "signal.source-graph.unresolved-import",
      title: `Unresolved local import: ${entry.specifier}`,
      severity: "moderate",
      sourceSurface: sourceSurfaceForPath(entry.file, input.surfaceDomains),
      ownerLane: ownerLaneForPath(entry.file),
      affectedFiles: [{ path: entry.file, role: "primary" }],
      rootCauseHypothesis: "A local import did not resolve to a tracked source file and may point at a moved or deleted module.",
      recommendedNextAction: "Check the import target and update it only if the referenced module was moved.",
      minimalVerificationCommands: ["npm run typecheck"],
      toolchain,
    }));
  }

  for (const entry of cap(routeNoncanonicalImports)) {
    findings.push(buildFinding({
      ruleId: "signal.source-graph.route-noncanonical-helper",
      title: "API route imports a noncanonical shared helper.",
      severity: "minor",
      sourceSurface: "server_truth",
      ownerLane: "backend",
      affectedFiles: [
        { path: entry.file, role: "primary" },
        { path: entry.imported, role: "adjacent" },
      ],
      rootCauseHypothesis: "A route handler imports shared lib logic that is not registered as a canonical helper.",
      recommendedNextAction: "Confirm the helper owner before extracting or rewriting route logic.",
      minimalVerificationCommands: ["npm run typecheck"],
      toolchain,
    }));
  }

  for (const entry of cap(uiServerImports)) {
    findings.push(buildFinding({
      ruleId: "signal.source-graph.ui-server-import",
      title: "UI file imports server-only logic.",
      severity: "critical",
      sourceSurface: sourceSurfaceForPath(entry.file, input.surfaceDomains),
      ownerLane: "frontend",
      affectedFiles: [
        { path: entry.file, role: "primary" },
        { path: entry.imported, role: "adjacent" },
      ],
      rootCauseHypothesis: "A UI surface imports server-only code, which can break bundle boundaries or leak server truth into UI.",
      recommendedNextAction: "Move the call behind a route/server action boundary or canonical client projection.",
      minimalVerificationCommands: ["npm run typecheck"],
      toolchain,
    }));
  }

  const duplicateOwnerCandidates = Array.from(
    input.canonicalHelpers.reduce((map, helper) => {
      const entries = map.get(helper.family) ?? [];
      entries.push(normalizePath(helper.path));
      map.set(helper.family, entries);
      return map;
    }, new Map<string, string[]>()),
  )
    .map(([family, paths]) => ({ family, paths: paths.sort() }))
    .filter((entry) => entry.paths.length > 1)
    .sort((left, right) => right.paths.length - left.paths.length || left.family.localeCompare(right.family));

  for (const entry of cap(duplicateOwnerCandidates, 10)) {
    findings.push(buildFinding({
      ruleId: "signal.source-graph.duplicate-owner-candidate",
      title: `Canonical helper family has ${entry.paths.length} registered owners: ${entry.family}`,
      severity: "info",
      sourceSurface: "repo_intelligence",
      ownerLane: "agent_context",
      affectedFiles: cap(entry.paths, 5).map((repoPath) => ({ path: repoPath, role: "adjacent" as const })),
      rootCauseHypothesis: "Multiple helpers share a family; this may be valid layering or a consolidation candidate.",
      recommendedNextAction: "Use the canonical helper registry notes before adding another helper in this family.",
      toolchain,
    }));
  }

  const orphanCandidates = nodes
    .filter((node) => node.exports.length > 0)
    .filter((node) => !inboundByPath.has(node.path))
    .filter((node) => !/\/(page|layout|route|middleware|index)\.(ts|tsx)$/u.test(node.path))
    .filter((node) => !node.path.endsWith(".spec.ts") && !node.path.endsWith(".test.ts") && !node.path.endsWith(".d.ts"))
    .sort((left, right) => left.path.localeCompare(right.path));

  for (const node of cap(orphanCandidates)) {
    findings.push(buildFinding({
      ruleId: "signal.source-graph.orphan-candidate",
      title: "Exporting source file has no resolved inbound imports.",
      severity: node.path.startsWith("scripts/agent/") ? "minor" : "moderate",
      sourceSurface: node.sourceSurface,
      ownerLane: node.ownerLane,
      affectedFiles: [{ path: node.path, role: "primary" }],
      rootCauseHypothesis: "The source graph found exports but no tracked source import points at this file.",
      recommendedNextAction: "Review dynamic references, package scripts, route conventions, or docs before considering removal.",
      minimalVerificationCommands: node.path.startsWith("scripts/agent/") ? [] : ["npm run typecheck"],
      toolchain,
    }));
  }

  const noOwnerLane = nodes.filter((node) => node.ownerLane === "unknown" || node.sourceSurface === "unknown");
  for (const node of cap(noOwnerLane)) {
    findings.push(buildFinding({
      ruleId: "signal.source-graph.unknown-owner-lane",
      title: "Source file has no obvious owner lane or surface.",
      severity: "minor",
      sourceSurface: node.sourceSurface,
      ownerLane: node.ownerLane,
      affectedFiles: [{ path: node.path, role: "primary" }],
      rootCauseHypothesis: "Path and surface indexes do not classify this file clearly.",
      recommendedNextAction: "Review whether the file belongs under an existing owner or should be registered in repo-intelligence indexes.",
      toolchain,
    }));
  }

  const generatedReports = trackedFiles.filter(isGeneratedReportPath);
  const staleGeneratedReports = baselineStatus === "current" && touchedMaxMarker > 0
    ? generatedReports.filter((file) => {
        if (!fileExists(file)) return false;
        const markerMs = safeReadFileModifiedMs(file);
        return typeof markerMs === "number" && markerMs < touchedMaxMarker;
      })
    : [];

  for (const file of cap(staleGeneratedReports, 10)) {
    findings.push(buildFinding({
      ruleId: "signal.source-graph.stale-generated-report",
      title: "Generated report is older than touched tracked files.",
      severity: "info",
      sourceSurface: "generated_artifact",
      ownerLane: "agent_context",
      affectedFiles: [{ path: file, role: "generated" }],
      rootCauseHypothesis: "A generated snapshot predates currently touched tracked source or workflow files.",
      staleEvidence: "stale",
      recommendedNextAction: "Refresh only if this generated artifact is consumed by the current task.",
      toolchain,
    }));
  }

  const scriptFiles = nodes.filter((node) => node.path.startsWith("scripts/agent/"));
  const scriptOwnership = scriptFiles.map((node) => {
    const importers = Array.from(inboundByPath.get(node.path) ?? []).filter((importer) => importer.startsWith("scripts/agent/"));
    const source = fileExists(node.path) ? readText(node.path) : "";
    const hasExecutableMain = /import\.meta\.url\s*===|process\.argv|main\(\)/u.test(source);
    const classification = node.packageScriptOwner
      ? "owned_by_package_script" as const
      : importers.length > 0 || !hasExecutableMain || /shared|helper|contract|envelope|schema|types?/iu.test(node.path)
        ? "imported_helper" as const
        : /^scripts\/agent\/validate-|^scripts\/agent\/score-|^scripts\/agent\/collect-|^scripts\/agent\/rank-/u.test(node.path)
          ? "legacy_orphan_candidate" as const
          : "manual_review" as const;
    return { path: node.path, classification };
  }).sort((left, right) => left.path.localeCompare(right.path));
  const scriptsWithoutPackageOwner = scriptOwnership.filter((entry) => entry.classification === "legacy_orphan_candidate" || entry.classification === "manual_review");
  const scriptOwnershipCounts = scriptOwnership.reduce<Record<"owned_by_package_script" | "imported_helper" | "legacy_orphan_candidate" | "manual_review", number>>((counts, entry) => {
    counts[entry.classification] += 1;
    return counts;
  }, {
    owned_by_package_script: 0,
    imported_helper: 0,
    legacy_orphan_candidate: 0,
    manual_review: 0,
  });

  for (const entry of cap(scriptsWithoutPackageOwner)) {
    findings.push(buildFinding({
      ruleId: "signal.source-graph.validator-without-package-owner",
      title: `Agent script ownership needs review: ${entry.classification}`,
      severity: "minor",
      sourceSurface: "repo_intelligence",
      ownerLane: "agent_context",
      affectedFiles: [{ path: entry.path, role: "validator" }],
      rootCauseHypothesis: `A validator or collector script is classified as ${entry.classification}; helper-only scripts are not treated as executable validator gaps.`,
      recommendedNextAction: "Confirm whether the script is helper-only, legacy, or should be wired to package.json.",
      toolchain,
    }));
  }

  const byRule: Record<string, number> = {};
  const byOwnerLane: Record<string, number> = {};
  const bySourceSurface: Record<string, number> = {};
  for (const finding of findings) {
    increment(byRule, finding.ruleId);
    increment(byOwnerLane, finding.ownerLane);
    increment(bySourceSurface, finding.sourceSurface);
  }
  const emittedFindings = cap(findings, MAX_EMITTED_FINDINGS);
  const findingCompleteness = buildGeneratedReportCompleteness({
    totalFindingCount: findings.length,
    emittedFindingCount: emittedFindings.length,
    capLimit: MAX_EMITTED_FINDINGS,
    capStrategy: findings.length > emittedFindings.length ? "deterministic_first" : "none",
    capReason: findings.length > emittedFindings.length ? "compact default report emits examples only; rankers rebuild the full source graph in-process" : null,
    degraded: toolchain.toolingDegraded,
    rankingInputCompleteness: "complete",
    highRiskCounts: highRiskCounts(findings),
  });
  const cleanupMetadata = buildGeneratedReportCleanupMetadata({
    owner: "scripts/agent/collect-signal-source-graph.ts",
    safetyClass: "source_safe",
    costClass: "local_free",
    rollback: "Revert the generated report and rerun npm run signal:source-graph after restoring the collector.",
    cleanupPolicy: "regenerate",
    cleanupCommand: "npm run signal:source-graph",
    sourceTruthRole: "generated_snapshot",
  });

  return {
    schemaVersion: SIGNAL_FINDING_SCHEMA_VERSION,
    generatedAtUtc: nowIso(),
    reportPath: REPORT_PATH,
    gitStatus: toolchain.gitStatus,
    sourceFileDiscovery: toolchain.sourceFileDiscovery,
    currentHead: toolchain.currentHead,
    currentHeadSource: toolchain.currentHeadSource === "generated_artifact" ? "unknown" : toolchain.currentHeadSource,
    workingTreeStatus: toolchain.workingTreeStatus,
    toolingDegraded: toolchain.toolingDegraded,
    degradationReason: toolchain.degradationReason,
    inventoryBaselineStatus: baselineStatus,
    ...findingCompleteness,
    sourceCommit: toolchain.currentHead,
    freshness: toolchain.toolingDegraded ? "degraded" : "fresh",
    baselineStatus,
    ...cleanupMetadata,
    sourceInputs: [
      toolchain.sourceFileDiscovery === "git" ? "git ls-files" : `${toolchain.sourceFileDiscovery} fallback`,
      "agent/index/repo-inventory.json",
      "agent/index/canonical-helpers.json",
      "agent/index/surface-map.json",
      "agent/index/verification-commands.json",
      "source imports/exports from src, functions/src, shared, tests, scripts/agent",
    ],
    commandBudget: {
      allowedCommands: ["npm run signal:source-graph", "npm run typecheck", "npm run agent:test -- tests/unit/signal-source-graph.spec.ts"],
      forbiddenCommands: ["npm run check", "playwright", "cypress", "lighthouse", "firebase deploy", "gcloud"],
    },
    summary: {
      trackedFileCount: trackedFiles.length,
      sourceFileCount: sourceFiles.length,
      touchedTrackedFileCount: touchedFiles.length,
      baselineHashDriftCount: baselineHashDriftFiles.length,
      findingCount: findings.length,
      emittedFindingCount: emittedFindings.length,
      byRule,
      byOwnerLane,
      bySourceSurface,
    },
    touchedFiles: {
      count: touchedFiles.length,
      examples: cap(touchedFiles.sort()),
    },
    baselineHashDrift: {
      count: baselineHashDriftFiles.length,
      classification: baselineHashDriftClassification,
      examples: cap(baselineHashDriftFiles.sort()),
    },
    nodes: {
      count: nodes.length,
      examples: cap(nodes.map((node) => ({
        ...node,
        imports: cap(node.imports, 8),
        resolvedImports: cap(node.resolvedImports, 8),
        exports: cap(node.exports, 8),
      }))),
    },
    importGraph: {
      edgeCount,
      unresolvedImportCount: unresolvedImports.length,
      staleReferenceCount: staleReferences.length,
      routeNoncanonicalImportCount: routeNoncanonicalImports.length,
      uiServerImportCount: uiServerImports.length,
    },
    generatedReportFreshness: {
      freshnessSignal: baselineStatus === "current" ? (staleGeneratedReports.length > 0 ? "stale" : "current") : "review",
      staleRelativeToTouchedCount: staleGeneratedReports.length,
      staleExamples: cap(staleGeneratedReports.sort()),
    },
    validatorOwnership: {
      scriptCount: scriptFiles.length,
      noPackageScriptOwnerCount: scriptsWithoutPackageOwner.length,
      byClassification: scriptOwnershipCounts,
      examples: cap(scriptOwnership),
    },
    duplicateOwnerCandidates: {
      count: duplicateOwnerCandidates.length,
      examples: cap(duplicateOwnerCandidates, 15),
    },
    findings: {
      totalCount: findings.length,
      emittedCount: emittedFindings.length,
      examples: emittedFindings,
      topRiskExamples: topRiskFindings(findings, MAX_EXAMPLES),
    },
    rankInputFindings: findings,
  };
}

export function buildSignalSourceGraphReportFromRepo() {
  const inventory = readJsonFile<RepoInventoryMetadata & { items: RepoInventoryItem[] }>("agent/index/repo-inventory.json");
  const discovery = discoverRepoFiles();
  const toolchain = readRepoToolchainState();
  if (discovery.toolingDegraded) {
    console.warn(`SIGNAL source graph: ${discovery.sourceFileDiscovery} fallback active (${discovery.degradationReason}).`);
  }

  return buildSignalSourceGraphReport({
    trackedFiles: discovery.files,
    toolchain,
    inventoryMetadata: inventory,
    inventoryItems: inventory.items,
    canonicalHelpers: readJsonFile<{ entries: CanonicalHelperEntry[] }>("agent/index/canonical-helpers.json").entries,
    surfaceDomains: readJsonFile<{ domains: SurfaceDomain[] }>("agent/index/surface-map.json").domains,
    verificationCommands: readJsonFile<{ commands: VerificationCommand[] }>("agent/index/verification-commands.json").commands,
    packageScripts: getPackageScripts("package.json"),
  });
}

export function buildWritableSignalSourceGraphReport(report: SignalSourceGraphReport) {
  const { rankInputFindings: _rankInputFindings, ...compactReport } = report;
  const workingTreeStatus = Array.isArray(report.workingTreeStatus)
    ? cap(report.workingTreeStatus, MAX_WRITABLE_WORKING_TREE_STATUS)
    : report.workingTreeStatus;
  const workingTreeStatusTotalCount = Array.isArray(report.workingTreeStatus)
    ? report.workingTreeStatus.length
    : 0;
  const findingExamples = cap(report.findings.examples, MAX_WRITABLE_FINDING_EXAMPLES);
  const topRiskExamples = cap(report.findings.topRiskExamples, MAX_WRITABLE_TOP_RISK_EXAMPLES);

  return {
    ...compactReport,
    workingTreeStatus,
    workingTreeStatusTotalCount,
    workingTreeStatusEmittedCount: Array.isArray(workingTreeStatus) ? workingTreeStatus.length : 0,
    workingTreeStatusOmittedCount: Array.isArray(report.workingTreeStatus)
      ? Math.max(0, report.workingTreeStatus.length - workingTreeStatus.length)
      : 0,
    workingTreeStatusCapReason: Array.isArray(report.workingTreeStatus) && report.workingTreeStatus.length > MAX_WRITABLE_WORKING_TREE_STATUS
      ? "Full working tree status is read in memory; generated artifact keeps a capped sample plus counts."
      : null,
    findings: {
      ...report.findings,
      examples: findingExamples,
      topRiskExamples,
      emittedCount: findingExamples.length,
      emittedTopRiskCount: topRiskExamples.length,
      omittedExampleCount: Math.max(0, report.findings.examples.length - findingExamples.length),
      omittedTopRiskExampleCount: Math.max(0, report.findings.topRiskExamples.length - topRiskExamples.length),
    },
  };
}

export function main() {
  const report = buildSignalSourceGraphReportFromRepo();
  writeJsonFile(REPORT_PATH, buildWritableSignalSourceGraphReport(report) as unknown as Json);
  console.log(
    `SIGNAL source graph: findings=${report.summary.findingCount}, emitted=${report.summary.emittedFindingCount}, sourceFiles=${report.summary.sourceFileCount}, unresolvedImports=${report.importGraph.unresolvedImportCount}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
