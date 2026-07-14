import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getSettingsValidatorAuthorityRecords } from "../../src/lib/debug/settings-debug-validator-authority";
import { LEGACY_REGISTRY } from "../../src/lib/legacy/legacy-registry";
import {
  createMetadata,
  getPackageScripts,
  listRepoFiles,
  readText,
  toAbsoluteRepoPath,
  toStableId,
  writeJsonFile,
  type Json,
} from "./shared";
export const COMPACT_AGENT_CONTEXT_DIR = "agent/context";
export const DOCTRINE_INDEX_PATH = `${COMPACT_AGENT_CONTEXT_DIR}/doctrine.index.json`;
export const DOCTRINE_CARDS_PATH = `${COMPACT_AGENT_CONTEXT_DIR}/doctrine.cards.jsonl`;
export const SURFACE_CONTRACTS_PATH = `${COMPACT_AGENT_CONTEXT_DIR}/surface-contracts.jsonl`;
export const VALIDATOR_MAP_PATH = `${COMPACT_AGENT_CONTEXT_DIR}/validator-map.json`;
export const LEGACY_REGISTRY_CONTEXT_PATH = `${COMPACT_AGENT_CONTEXT_DIR}/legacy-registry.json`;
export const FILE_SIZE_BUDGET_PATH = `${COMPACT_AGENT_CONTEXT_DIR}/file-size-budget.json`;
export const TASK_PACK_PATH = `${COMPACT_AGENT_CONTEXT_DIR}/task-pack.generated.json`;
export const REQUIRED_COMPACT_SURFACES = [
  "wallet",
  "drops",
  "viewer",
  "watch-time",
  "user-management",
  "behavioral-intelligence",
  "telemetry",
  "support",
  "moderation",
  "creator-dashboard",
  "admin-debug",
  "ai-panel",
  "device-ui",
  "image-policy",
  "speed-security",
  "google-cost",
  "legacy-phaseout",
] as const;
export type CompactSurface = (typeof REQUIRED_COMPACT_SURFACES)[number] | "agent-context" | "repo-governance";
export type DoctrinePriority = "critical" | "high" | "normal" | "low";
export type DoctrineCard = {
  id: string;
  title: string;
  surface: string;
  scope: string[];
  canonicalFiles: string[];
  rules: string[];
  blockedPatterns: string[];
  requiredValidators: string[];
  lastUpdated: string;
  sourceDoc: string;
  priority: DoctrinePriority;
  tokenEstimate: number;
};
type CompactSurfaceDefinition = {
  surface: CompactSurface;
  title: string;
  priority: DoctrinePriority;
  scope: string[];
  canonicalFiles: string[];
  sourceDocs: string[];
  rules: string[];
  blockedPatterns: string[];
  requiredValidators: string[];
  ownerSurface: string;
};
export const FILE_SIZE_BUDGETS = {
  markdownDoctrineMaxRecommendedLines: 300,
  generatedJsonReportMaxRecommendedLines: 500,
  generatedJsonReportMaxRecommendedLinesUnlessJsonl: 500,
  agentCardMaxChars: 1500,
  singleSourceFileWarningLoc: 800,
  singleSourceFileCriticalLoc: 1500,
  generatedStateFileWarningLines: 1000,
  generatedStateFileCriticalLines: 5000,
  generatedStateJsonlExempt: true,
} as const;
const SURFACE_DEFINITIONS: CompactSurfaceDefinition[] = [
  {
    surface: "wallet",
    title: "Wallet And Purchase Truth",
    priority: "critical",
    scope: ["src/components/PurchaseModal.tsx", "src/app/api/paypal/**", "src/lib/gumdrop-ledger.ts"],
    canonicalFiles: ["src/components/PurchaseModal.tsx", "src/app/api/paypal/capture/route.ts", "src/lib/gumdrop-ledger.ts"],
    sourceDocs: ["docs/agent-truth/payment-wallet-unlock-entitlement.md", "docs/agent-truth/gumdrop-economy-score.md", "docs/agent-truth/legal-payment-user-trust-copy.md"],
    rules: ["Revenue and paid value come from server purchase or ledger facts before client completion events.", "Wallet UI must preserve paid-vs-reward GumDrop source truth.", "PayPal checkout must use the canonical single-button wallet flow."],
    blockedPatterns: ["client-only revenue fact", "total-only balance chip", "CSS-hidden PayPal button"],
    requiredValidators: ["check:wallet-density", "check:wallet-single-paypal-button", "check:purchase-telemetry-truth", "check:gumdrop-economy"],
    ownerSurface: "wallet_density",
  },
  {
    surface: "drops",
    title: "Drop Discovery And Unlock Truth",
    priority: "critical",
    scope: ["src/app/drops/**", "src/components/DropCard.tsx", "src/components/Drops/**", "src/app/api/drops/**"],
    canonicalFiles: ["src/app/drops/DropsClient.tsx", "src/components/DropCard.tsx", "src/components/Drops/LockedDropPreviewView.tsx"],
    sourceDocs: ["docs/agent-truth/drop-preview-page.md", "docs/agent-truth/drop-cover-visibility-truth.md", "docs/agent-truth/content-protection-score.md"],
    rules: ["Locked previews expose safe metadata only until entitlement truth exists.", "Drop impressions require real exposure, not render-time spam.", "Unlock counts come from server entitlement facts only."],
    blockedPatterns: ["internal content URL before unlock", "client-only unlock success count", "modal-first locked preview canonical path"],
    requiredValidators: ["check:drop-preview-page", "check:unlock-telemetry-truth", "check:content-protection", "check:discovery-tracking-truth"],
    ownerSurface: "drops_discovery_to_preview",
  },
  {
    surface: "viewer",
    title: "Viewer File Tracking",
    priority: "critical",
    scope: ["src/app/dashboard/viewer/**", "src/hooks/useViewerWatchSession.ts", "src/lib/viewer-watch-session.ts"],
    canonicalFiles: ["src/app/dashboard/viewer/ViewerClient.tsx", "src/app/dashboard/viewer/components/MediaViewer.tsx", "src/hooks/useViewerWatchSession.ts"],
    sourceDocs: ["docs/agent-truth/watch-time-truth.md", "docs/agent-truth/content-protection-score.md"],
    rules: ["Every visible viewer file emits file_viewed with drop, file, media, and session ids.", "File view telemetry must not include internal content URLs.", "Viewer file views connect to watch session start/end facts."],
    blockedPatterns: ["raw storage URL in telemetry", "file view on render only", "watch session without viewer session id"],
    requiredValidators: ["check:viewer-file-tracking", "check:content-protection"],
    ownerSurface: "viewer_file_tracking",
  },
  {
    surface: "watch-time",
    title: "Watch Time Truth",
    priority: "critical",
    scope: ["src/hooks/useViewerWatchSession.ts", "src/lib/watch-time-scoring.ts", "src/app/api/viewer/watch-session/route.ts"],
    canonicalFiles: ["src/hooks/useViewerWatchSession.ts", "src/lib/watch-time-scoring.ts", "src/app/api/viewer/watch-session/route.ts"],
    sourceDocs: ["docs/agent-truth/watch-time-truth.md"],
    rules: ["Watch time is foreground visible engagement, not page duration.", "Hidden, idle, offscreen, or modal-covered intervals do not count.", "Behavioral intelligence prefers watch-session rollups over legacy duration fallbacks."],
    blockedPatterns: ["page duration as canonical watch time", "hidden tab credit", "raw content URL in watch payload"],
    requiredValidators: ["check:watch-time-truth", "check:watch-time-rollup-truth", "check:watch-time-truth-v2"],
    ownerSurface: "viewer_watch_time",
  },
  {
    surface: "user-management",
    title: "User Management Truth",
    priority: "critical",
    scope: ["src/app/admin/users/**", "src/app/api/admin/user/**", "src/lib/server/behavioral-intelligence.ts"],
    canonicalFiles: ["src/app/admin/users/page.tsx", "src/app/api/admin/user/[userId]/route.ts", "src/lib/server/event-fact-rollup.ts"],
    sourceDocs: ["docs/agent-truth/admin-user-behavior-truth.md", "docs/agent-truth/user-engagement-score.md", "docs/agent-truth/user-value-score.md"],
    rules: ["Admin user metrics read normalized user facts, not admin projection events.", "User engagement and value exclude admin or owner-only activity.", "Missing source truth must be shown as partial, stale, failed, or unknown."],
    blockedPatterns: ["admin QA counted as user behavior", "projection counted as creator activity", "fake healthy user metrics"],
    requiredValidators: ["check:admin-user-behavior-truth", "check:user-engagement-score", "check:user-value-score", "check:admin-user-metrics-snapshot"],
    ownerSurface: "admin_user_behavior_truth",
  },
  {
    surface: "behavioral-intelligence",
    title: "Behavioral Intelligence Facts",
    priority: "critical",
    scope: ["src/lib/behavioral/**", "src/lib/recommendations/**", "functions/src/behavioral-intelligence-runtime.ts"],
    canonicalFiles: ["src/lib/behavioral/event-fact-contract.ts", "src/lib/behavioral/normalize-event-fact.ts", "src/lib/recommendations/deterministic-ranker.ts"],
    sourceDocs: ["docs/agent-truth/event-fact-truth.md", "docs/agent-truth/behavioral-truth-source.md", "docs/agent-truth/recommendation-ranking.md"],
    rules: ["Raw events normalize into canonical event facts before scoring.", "Deterministic ranking remains the safety baseline unless validation promotes ML.", "Aliases must dedupe by user, entity, and time window."],
    blockedPatterns: ["unknown event as production count", "client retry counted twice", "ML artifact active without validation"],
    requiredValidators: ["check:event-fact-truth", "check:behavioral-truth-source", "check:recommendation-ranker", "check:math-goal-alignment"],
    ownerSurface: "behavioral_event_fact_truth",
  },
  {
    surface: "telemetry",
    title: "Telemetry Actor And Target Truth",
    priority: "critical",
    scope: ["src/lib/analytics/**", "src/lib/telemetry-catalog.ts", "src/app/api/analytics/**"],
    canonicalFiles: ["src/lib/analytics/analytics-event-contract.ts", "src/lib/telemetry-catalog.ts", "src/app/api/analytics/ingest-identified/route.ts"],
    sourceDocs: ["docs/agent-truth/telemetry-parity-score.md", "docs/agent-truth/analytics-truth-layer-v2.md", "docs/agent-truth/analytics-actor-taxonomy.md"],
    rules: ["Actor ids describe who performed the action; target ids describe the affected entity.", "Client events support context unless server truth owns the metric.", "Admin/projection events are excluded from user behavior."],
    blockedPatterns: ["creator_id mapped to actorCreatorId for fan action", "client-only purchase metric", "admin projection included in user behavior"],
    requiredValidators: ["check:analytics-event-contract", "check:actor-target-telemetry", "check:telemetry-identified-parity", "check:telemetry-parity-score"],
    ownerSurface: "telemetry_actor_target_truth",
  },
  {
    surface: "support",
    title: "Support And Bug Report Truth",
    priority: "high",
    scope: ["src/components/Support/**", "src/components/Feedback/**", "src/app/api/support/**", "src/app/api/admin/support/**"],
    canonicalFiles: ["src/components/Support/SupportInbox.tsx", "src/app/api/support/threads/route.ts"],
    sourceDocs: ["docs/agent-truth/support-recovery-flows.md"],
    rules: ["User support actions appear in user timelines without admin pollution.", "Bug reports include category, route, component, and severity.", "Support permission errors feed debug evidence."],
    blockedPatterns: ["admin support reply counted as user behavior", "generic support failure without evidence", "flat support messages as canonical truth"],
    requiredValidators: ["check:support-recovery-flows", "check:support-tracking-truth"],
    ownerSurface: "support_recovery_flows",
  },
  {
    surface: "moderation",
    title: "Moderation Real Risk",
    priority: "high",
    scope: ["src/components/Admin/AdminModerationConsole.tsx", "src/lib/moderation/**"],
    canonicalFiles: ["src/lib/moderation/scrape-risk-score.ts", "src/lib/moderation/moderation-evidence.ts"],
    sourceDocs: ["docs/agent-truth/admin-moderation-real-risk.md", "docs/agent-truth/theft-risk-score.md"],
    rules: ["Screenshot-like signals are weak context unless server/platform confirmation exists.", "Moderation decisions use evidence-weighted theft and scrape risk.", "Raw asset URLs stay out of casual admin preview paths."],
    blockedPatterns: ["confirmed screenshot from browser heuristic", "weak blur event as restriction reason", "raw asset URL in admin moderation preview"],
    requiredValidators: ["check:admin-moderation-real-risk", "check:theft-risk-score"],
    ownerSurface: "admin_moderation_real_risk",
  },
  {
    surface: "creator-dashboard",
    title: "Creator Dashboard And Experience Truth",
    priority: "high",
    scope: ["src/components/Creators/**", "src/app/creators/**", "src/app/api/creator/**"],
    canonicalFiles: ["src/components/Dashboard/CreatorWorkspacePanel.tsx", "src/app/api/creator/bookings/route.ts", "src/app/api/creator/subscriptions/route.ts"],
    sourceDocs: ["docs/agent-truth/creator-experience-transaction-truth.md", "docs/agent-truth/creator-fan-experience-settings.md", "docs/agent-truth/creator-booking-error-copy.md"],
    rules: ["Creator paid experiences spend paid-source GumDrops only where required.", "Expected booking and fan-pass failures return typed safe errors.", "Admin projection cannot become live creator behavior."],
    blockedPatterns: ["reward GumDrops for Fan Pass", "generic internal server error for expected booking failure", "projection write treated as live creator action"],
    requiredValidators: ["check:creator-experience-transaction-truth", "check:creator-booking-error-copy", "check:fan-pass-gumdrops-truth", "check:admin-projection-analytics-exclusion"],
    ownerSurface: "creator_dashboard_truth",
  },
  {
    surface: "admin-debug",
    title: "Admin Debug Control Tower",
    priority: "high",
    scope: ["src/app/admin/debug/**", "src/lib/admin-debug-control-tower.ts", "src/lib/route-runtime-health.ts"],
    canonicalFiles: ["src/lib/admin-debug-control-tower.ts", "src/app/api/admin/debug/control-tower/route.ts"],
    sourceDocs: ["docs/agent-truth/admin-debug-control-tower.md", "docs/agent-truth/debug-evidence-pipeline.md"],
    rules: ["Admin debug surfaces label live, cached, stale, fallback, partial, failed, or unknown truth.", "Missing or stale data must not render healthy.", "Heavy raw JSON stays collapsed behind operational summaries."],
    blockedPatterns: ["fake green healthy state", "missing data shown as live", "raw JSON as primary admin truth"],
    requiredValidators: ["check:debug-control-tower-cutover", "check:debug-evidence-pipeline", "check:admin-truth-replacement"],
    ownerSurface: "admin_debug_control_tower",
  },
  {
    surface: "ai-panel",
    title: "AI Panel Runtime Truth",
    priority: "high",
    scope: ["src/app/admin/ai/**", "src/app/api/admin/ai/**", "src/lib/ai-*.ts", "src/lib/server/ai-*.ts"],
    canonicalFiles: ["src/app/admin/ai/page.tsx", "src/lib/admin-ai-models.ts", "src/lib/server/ai-drop-covers.ts"],
    sourceDocs: ["docs/agent-truth/admin-debug-control-tower.md", "REPO_MEMORY_LEDGER.md"],
    rules: ["AI model metadata comes from the shared registry.", "Admin AI history remains canonical for prompt learning.", "Create Drop local history clearing must not delete canonical AI jobs."],
    blockedPatterns: ["hardcoded model alias outside registry", "modal clear deletes server AI history", "AI admin fallback shown healthy"],
    requiredValidators: ["check:admin-ai-control-tower", "check:admin-review-badges", "check:google-cost"],
    ownerSurface: "admin_ai_runtime_truth",
  },
  {
    surface: "device-ui",
    title: "Device UI And Layout Contract",
    priority: "critical",
    scope: ["src/lib/device-*.ts", "src/components/layout/**", "src/app/**", "src/components/**"],
    canonicalFiles: ["src/lib/device-layout-contract.ts", "src/lib/user-mobile-shell.ts", "src/lib/device-ui-dry-audit.ts"],
    sourceDocs: ["docs/agent-truth/device-layout-contract.md", "docs/agent-truth/device-ui-dry-audit.md", "docs/doctrine/kandydrops-ui-doctrine.md"],
    rules: ["Google owns structural breakpoints and viewport math; Apple owns cohesive shell styling.", "Use shared device helpers instead of freestyle layout physics.", "Device dry audits run before broad browser audits."],
    blockedPatterns: ["raw 100vh mobile shell", "duplicated mobile nav physics", "unsafe area padding by guess"],
    requiredValidators: ["check:device-layout-contract", "check:device-ui", "score:device-ui"],
    ownerSurface: "device_layout_contract",
  },
  {
    surface: "image-policy",
    title: "Image Loading And Content Safety",
    priority: "high",
    scope: ["src/lib/image-loading-policy.ts", "src/components/**", "src/app/**"],
    canonicalFiles: ["src/lib/image-loading-policy.ts"],
    sourceDocs: ["docs/agent-truth/sitewide-image-optimization.md"],
    rules: ["Above-fold LCP images are eager sparingly; grids and rails are lazy.", "Fill images require accurate sizes.", "Locked previews never render internal content thumbnails before unlock."],
    blockedPatterns: ["internal thumbnail before entitlement", "fill image without sizes", "repeated card preload"],
    requiredValidators: ["check:sitewide-image-optimization", "check:content-protection"],
    ownerSurface: "sitewide_image_loading_policy",
  },
  {
    surface: "speed-security",
    title: "Speed And Security Hardening",
    priority: "critical",
    scope: ["src/app/api/**", "src/lib/server/**", "firestore.rules", "storage.rules", "functions/src/**"],
    canonicalFiles: ["src/lib/server/route-cache-contract.ts", "src/lib/server/security-hardening-contract.ts"],
    sourceDocs: ["docs/agent-truth/speed-security-hardening.md", "docs/agent-truth/codebase-hardening.md", "docs/agent-truth/background-jobs-idempotency.md"],
    rules: ["API routes declare auth, origin, rate, idempotency, cache, cost, and failure contracts.", "User/payment/support/chat/security routes stay no-store where needed.", "Heavy browser audits are forbidden by default."],
    blockedPatterns: ["unbounded route cost", "silent catch block", "full suite as first audit"],
    requiredValidators: ["check:speed-security", "score:speed-security", "check:hardening"],
    ownerSurface: "speed_security_hardening",
  },
  {
    surface: "google-cost",
    title: "Google Cost Guardrails",
    priority: "critical",
    scope: ["src/lib/server/api-cost-contract.ts", "dataconnect/**", "functions/src/**"],
    canonicalFiles: ["src/lib/server/api-cost-contract.ts", "src/lib/server/cloud-cost-contract.ts"],
    sourceDocs: ["docs/agent-truth/google-cost-bleed.md", "docs/agent-truth/cloudrun-sql-bigquery-guardrails.md", "docs/doctrine/kandydrops-google-analytics-cloud-doctrine.md"],
    rules: ["Google cost-bearing surfaces must be declared before use.", "Data Connect remains an agent-context mirror unless explicitly promoted.", "Provider jobs and deploy commands are documentation-only unless a human promotes them."],
    blockedPatterns: ["undocumented Cloud SQL runtime path", "BigQuery mutates runtime balances", "gcloud deploy from audit lane"],
    requiredValidators: ["check:google-cost", "score:google-cost", "check:cloud-cost"],
    ownerSurface: "google_cost_guardrails",
  },
  {
    surface: "legacy-phaseout",
    title: "Legacy Phaseout Registry",
    priority: "critical",
    scope: ["src/lib/legacy/**", "scripts/agent/*legacy*", "agent/state/legacy-phaseout.generated.json"],
    canonicalFiles: ["src/lib/legacy/legacy-registry.ts", "scripts/agent/score-legacy-phaseout.ts", "scripts/agent/validate-legacy-phaseout.ts"],
    sourceDocs: ["docs/agent-truth/legacy-phaseout.md", "docs/agent-truth/orphaned-logic-score.md"],
    rules: ["Legacy systems need owner, replacement, deadline, and allowed/blocked references.", "Blocked legacy cannot re-enter canonical runtime paths.", "Old systems cannot become canonical without registry update."],
    blockedPatterns: ["blocked legacy imported by canonical code", "deprecated item without removeBy", "local projection treated as live behavior"],
    requiredValidators: ["check:legacy-phaseout", "score:legacy-phaseout", "check:orphaned-logic"],
    ownerSurface: "legacy_phaseout",
  },
  {
    surface: "agent-context",
    title: "Compact Agent Context",
    priority: "high",
    scope: ["agent/context/**", "scripts/agent/build-compact-agent-context.ts", "scripts/agent/validate-compact-agent-context.ts"],
    canonicalFiles: ["scripts/agent/build-compact-agent-context.ts", "scripts/agent/validate-compact-agent-context.ts"],
    sourceDocs: ["docs/agent-truth/compact-agent-context.md", "AGENTS.md"],
    rules: ["Agents read doctrine.index.json first, then relevant JSONL cards, then source docs only when needed.", "Append-only historical ledgers prefer JSONL.", "Task packs include only relevant cards, validators, and legacy warnings."],
    blockedPatterns: ["loading every doctrine markdown by default", "giant generated array as append-only ledger", "validator without surface mapping"],
    requiredValidators: ["check:agent-context", "build:agent-context", "check:affected-audit-router"],
    ownerSurface: "agent_context_efficiency",
  },
  {
    surface: "repo-governance",
    title: "Repo Governance Ledgers",
    priority: "normal",
    scope: ["AGENTS.md", "FULL_SCALE_CODEBASE_AUDIT.md", "REPO_MEMORY_LEDGER.md", "EVERY_FILE_FUNCTION_CHECKLIST.md"],
    canonicalFiles: ["AGENTS.md", "FULL_SCALE_CODEBASE_AUDIT.md", "REPO_MEMORY_LEDGER.md", "EVERY_FILE_FUNCTION_CHECKLIST.md"],
    sourceDocs: ["AGENTS.md", "FULL_SCALE_CODEBASE_AUDIT.md", "REPO_MEMORY_LEDGER.md"],
    rules: ["Verified runtime code outranks generated artifacts and chat.", "Broad tooling work updates governance ledgers before signoff.", "Generated context is a retrieval plane, not stronger truth."],
    blockedPatterns: ["chat memory over repo truth", "generated artifact as primary source", "governance edit without verification note"],
    requiredValidators: ["check:inventory", "check:agent-intelligence", "check:generated-artifacts"],
    ownerSurface: "repo_governance",
  },
];
type ParsedArgs = {
  files: string[];
  taskSummary: string;
};
function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = { files: [], taskSummary: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index] ?? "";
    const equalsIndex = current.indexOf("=");
    const flag = equalsIndex >= 0 ? current.slice(0, equalsIndex) : current;
    const inlineValue = equalsIndex >= 0 ? current.slice(equalsIndex + 1) : undefined;
    const nextValue = () => inlineValue ?? argv[++index] ?? "";
    if (flag === "--file") {
      parsed.files.push(nextValue());
      continue;
    }
    if (flag === "--files") {
      parsed.files.push(...splitList(nextValue()));
      continue;
    }
    if (flag === "--task" || flag === "--summary") {
      parsed.taskSummary = nextValue();
      continue;
    }
    if (current.trim()) {
      parsed.taskSummary = [parsed.taskSummary, current.trim()].filter(Boolean).join(" ");
    }
  }
  return parsed;
}
function splitList(value: string) {
  return value.split(",").map(normalizeRepoPath).filter(Boolean);
}
function normalizeRepoPath(value: string) {
  return value.replace(/\\/gu, "/").replace(/^\.\//u, "").trim();
}
function jsonLine(value: unknown) {
  return JSON.stringify(value);
}
function writeJsonlFile(repoPath: string, records: unknown[]) {
  const absolutePath = toAbsoluteRepoPath(repoPath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${records.map(jsonLine).join("\n")}\n`, "utf8");
}
function sourceExists(repoPath: string) {
  return existsSync(toAbsoluteRepoPath(repoPath));
}
function lineCount(repoPath: string) {
  try {
    return readText(repoPath).split(/\r?\n/u).length;
  } catch {
    return 0;
  }
}
function latestUpdated(paths: string[]) {
  const timestamps = paths
    .filter(sourceExists)
    .map((repoPath) => statSync(toAbsoluteRepoPath(repoPath)).mtimeMs);
  const latest = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
  return new Date(latest).toISOString();
}
function buildCard(definition: CompactSurfaceDefinition): DoctrineCard {
  const sourceDoc = definition.sourceDocs.find(sourceExists) ?? definition.sourceDocs[0] ?? "AGENTS.md";
  const withoutEstimate = {
    id: toStableId("doctrine_card", definition.surface),
    title: definition.title,
    surface: definition.surface,
    scope: definition.scope,
    canonicalFiles: definition.canonicalFiles,
    rules: definition.rules,
    blockedPatterns: definition.blockedPatterns,
    requiredValidators: definition.requiredValidators,
    lastUpdated: latestUpdated([...definition.sourceDocs, ...definition.canonicalFiles]),
    sourceDoc,
    priority: definition.priority,
  };
  return {
    ...withoutEstimate,
    tokenEstimate: Math.ceil(JSON.stringify(withoutEstimate).length / 4),
  };
}
function buildDoctrineCards() {
  return SURFACE_DEFINITIONS.map(buildCard);
}
function buildDoctrineIndex(cards: DoctrineCard[], warnings: string[]) {
  const cardsBySurface = Object.fromEntries(cards.map((card) => [card.surface, card.id]));
  const sourceDocs = Array.from(new Set(SURFACE_DEFINITIONS.flatMap((definition) => definition.sourceDocs))).sort();
  return {
    ...createMetadata(["docs/doctrine/**", "docs/agent-truth/**", "AGENTS.md", "REPO_MEMORY_LEDGER.md"]),
    version: 1,
    researchModel:
      "JSON Lines records are streamable and structured manifests are faster for deterministic lookup than narrative markdown.",
    loadPlan: [
      "Read agent/context/doctrine.index.json first.",
      "Select surfaces by changed files, task terms, or validator map.",
      "Stream agent/context/doctrine.cards.jsonl and keep only matching surfaces.",
      "Stream agent/context/surface-contracts.jsonl for canonical files and validators.",
      "Open source Markdown only when the compact card leaves uncertainty.",
    ],
    budgets: FILE_SIZE_BUDGETS,
    requiredSurfaces: [...REQUIRED_COMPACT_SURFACES],
    surfaces: cards.map((card) => ({
      id: card.id,
      title: card.title,
      surface: card.surface,
      sourceDoc: card.sourceDoc,
      priority: card.priority,
      tokenEstimate: card.tokenEstimate,
      cardJsonl: DOCTRINE_CARDS_PATH,
    })),
    cardsBySurface,
    sourceDocs,
    warnings,
  };
}
function buildSurfaceContracts(cards: DoctrineCard[]) {
  const bySurface = new Map(SURFACE_DEFINITIONS.map((definition) => [definition.surface, definition]));
  return cards.map((card) => {
    const definition = bySurface.get(card.surface as CompactSurface);
    return {
      id: toStableId("surface_contract", card.surface),
      surface: card.surface,
      title: card.title,
      priority: card.priority,
      ownerSurface: definition?.ownerSurface ?? card.surface,
      scope: card.scope,
      canonicalFiles: card.canonicalFiles,
      sourceDocs: definition?.sourceDocs ?? [card.sourceDoc],
      requiredValidators: card.requiredValidators,
      blockedPatterns: card.blockedPatterns,
      loadPlan: {
        first: DOCTRINE_INDEX_PATH,
        card: DOCTRINE_CARDS_PATH,
        contract: SURFACE_CONTRACTS_PATH,
        fallbackDocs: definition?.sourceDocs ?? [card.sourceDoc],
      },
    };
  });
}
function isValidatorScript(scriptName: string) {
  return scriptName.startsWith("check:") || scriptName.startsWith("score:") || scriptName.startsWith("validate:");
}
const SETTINGS_VALIDATOR_AUTHORITY_RECORDS = getSettingsValidatorAuthorityRecords();
const SETTINGS_VALIDATOR_PACKAGE_SCRIPTS = new Set(
  SETTINGS_VALIDATOR_AUTHORITY_RECORDS.map((record) => record.packageScript),
);
const ACTIVE_SETTINGS_VALIDATOR_PACKAGE_SCRIPTS = new Set(
  SETTINGS_VALIDATOR_AUTHORITY_RECORDS
    .filter((record) => record.status === "active")
    .map((record) => record.packageScript),
);
const KEYWORD_SURFACE_RULES: Array<{ surface: CompactSurface; keywords: string[]; reason: string }> = [
  { surface: "google-cost", keywords: ["google-cost", "cloud-cost", "bigquery", "cloudrun", "sql"], reason: "Google cost or cloud guardrail keyword." },
  { surface: "legacy-phaseout", keywords: ["legacy", "orphan"], reason: "Legacy or orphaned logic keyword." },
  { surface: "agent-context", keywords: ["agent-context", "agent-intelligence", "audit-runtime", "audit-cache", "affected-audit"], reason: "Agent context or audit tooling keyword." },
  { surface: "wallet", keywords: ["wallet", "paypal", "payment", "purchase", "gumdrop", "economy", "fan-pass", "booking", "legal-payment"], reason: "Wallet, payment, or GumDrop economy keyword." },
  { surface: "watch-time", keywords: ["watch-time", "watch-time-rollup"], reason: "Watch-time truth keyword." },
  { surface: "viewer", keywords: ["viewer", "file-tracking"], reason: "Viewer or file tracking keyword." },
  { surface: "drops", keywords: ["drop", "drops", "unlock", "content-protection", "media", "discovery", "carousel", "preview"], reason: "Drop, unlock, discovery, or content-protection keyword." },
  { surface: "moderation", keywords: ["moderation", "theft", "scrape"], reason: "Moderation risk keyword." },
  { surface: "support", keywords: ["support", "bug-report"], reason: "Support or bug-report keyword." },
  { surface: "ai-panel", keywords: ["admin-ai", "ai-drop", "drop-covers", "model", "prompt"], reason: "AI panel or model keyword." },
  { surface: "admin-debug", keywords: ["admin-debug", "debug", "runtime", "admin-truth", "review-badges", "evidence"], reason: "Admin debug or runtime evidence keyword." },
  { surface: "creator-dashboard", keywords: ["creator", "agreement", "roster", "projection", "subscription", "experience"], reason: "Creator dashboard or creator experience keyword." },
  { surface: "behavioral-intelligence", keywords: ["behavioral", "recommendation", "math-goal", "tracking-surface", "event-fact", "engagement", "value", "task", "notification-read", "notification-pipeline"], reason: "Behavioral fact, score, or recommendation keyword." },
  { surface: "telemetry", keywords: ["telemetry", "analytics", "actor-target", "identified", "identity-link", "event-catalog"], reason: "Telemetry or analytics keyword." },
  { surface: "user-management", keywords: ["user", "auth", "onboarding", "admin-users", "profile"], reason: "User management keyword." },
  { surface: "image-policy", keywords: ["image", "loading"], reason: "Image loading keyword." },
  { surface: "device-ui", keywords: ["device", "layout", "mobile", "hydration", "ui", "accessibility", "tap-target", "design-system"], reason: "Device UI or layout keyword." },
  { surface: "speed-security", keywords: ["speed", "security", "hardening", "background-job", "pwa", "ast-grep", "environment", "rollback", "launch", "beta"], reason: "Speed, security, launch, or hardening keyword." },
  { surface: "repo-governance", keywords: ["inventory", "architecture", "continuity", "generated-artifacts", "dependency", "cycles", "versions", "outdated", "deps"], reason: "Repo governance or inventory keyword." },
];
function inferValidatorSurface(scriptName: string, command: string) {
  if (SETTINGS_VALIDATOR_PACKAGE_SCRIPTS.has(scriptName)) {
    return { surface: "settings" as const, confidence: "high", reason: "Declared by canonical settings validator authority contract." };
  }
  const direct = SURFACE_DEFINITIONS.find((definition) => definition.requiredValidators.includes(scriptName));
  if (direct) {
    return { surface: direct.surface, confidence: "high", reason: "Listed as a required validator for the surface." };
  }
  const normalized = `${scriptName} ${command}`.toLowerCase();
  const keywordMatch = KEYWORD_SURFACE_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword)),
  );
  if (keywordMatch) {
    return { surface: keywordMatch.surface, confidence: "medium", reason: keywordMatch.reason };
  }
  if (command.includes("scripts/agent/")) {
    return { surface: "repo-governance" as const, confidence: "low", reason: "Generic agent validator fallback." };
  }
  return { surface: "repo-governance" as const, confidence: "low", reason: "Generic repository validator fallback." };
}
function buildValidatorMap() {
  const scripts = getPackageScripts("package.json");
  const validators = Object.entries(scripts)
    .filter(([scriptName]) => isValidatorScript(scriptName))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([scriptName, command]) => {
      const inference = inferValidatorSurface(scriptName, command);
      return [
        scriptName,
        {
          surface: inference.surface,
          confidence: inference.confidence,
          reason: inference.reason,
        },
      ] as const;
    });
  const bySurface = validators.reduce<Record<string, string[]>>((accumulator, [scriptName, value]) => {
    if (value.surface === "settings" && !ACTIVE_SETTINGS_VALIDATOR_PACKAGE_SCRIPTS.has(scriptName)) {
      return accumulator;
    }
    accumulator[value.surface] ??= [];
    accumulator[value.surface].push(scriptName);
    return accumulator;
  }, {});
  return {
    ...createMetadata(["package.json", "scripts/agent/**", DOCTRINE_INDEX_PATH]),
    validatorCount: validators.length,
    surfaces: Object.keys(bySurface).sort(),
    bySurface,
    validators: Object.fromEntries(validators.map(([scriptName, value]) => [scriptName, value.surface])),
    unmappedPackageScripts: [],
  };
}
function buildLegacyRegistryContext() {
  return {
    ...createMetadata(["src/lib/legacy/legacy-registry.ts", "docs/agent-truth/legacy-phaseout.md"]),
    items: LEGACY_REGISTRY.map((item) => ({
      id: item.id,
      name: item.name,
      paths: item.paths,
      status: item.status,
      phaseOutStage: item.phaseOutStage,
      ownerSurface: item.ownerSurface,
      canonicalReplacement: item.canonicalReplacement,
      reviewBy: item.reviewBy,
      removeBy: item.removeBy,
      riskIfKept: item.riskIfKept,
      allowedReferences: item.allowedReferences,
      blockedReferences: item.blockedReferences,
    })),
    summary: {
      total: LEGACY_REGISTRY.length,
      blocked: LEGACY_REGISTRY.filter((item) => item.status === "blocked").length,
      deprecated: LEGACY_REGISTRY.filter((item) => item.status === "deprecated").length,
      removeByDeadline: LEGACY_REGISTRY.filter((item) => item.status === "remove_by_deadline").length,
    },
  };
}
function buildFileSizeBudget(cards: DoctrineCard[]) {
  const files = listRepoFiles();
  const markdownFiles = files.filter((repoPath) =>
    repoPath.endsWith(".md") && (repoPath.startsWith("docs/doctrine/") || repoPath.startsWith("docs/agent-truth/")),
  );
  const generatedJsonFiles = files.filter((repoPath) =>
    repoPath.endsWith(".json") && (repoPath.startsWith("agent/state/") || repoPath.startsWith("agent/index/") || repoPath.startsWith("agent/context/")),
  );
  const sourceFiles = files.filter((repoPath) =>
    /\.(?:ts|tsx|js|jsx|mjs|cjs)$/u.test(repoPath)
    && (repoPath.startsWith("src/") || repoPath.startsWith("scripts/") || repoPath.startsWith("functions/src/")),
  );
  const markdownWarnings = markdownFiles
    .map((repoPath) => ({ path: repoPath, lines: lineCount(repoPath) }))
    .filter((entry) => entry.lines > FILE_SIZE_BUDGETS.markdownDoctrineMaxRecommendedLines)
    .sort((left, right) => right.lines - left.lines || left.path.localeCompare(right.path));
  const generatedJsonWarnings = generatedJsonFiles
    .map((repoPath) => ({ path: repoPath, lines: lineCount(repoPath) }))
    .filter((entry) => entry.lines > FILE_SIZE_BUDGETS.generatedJsonReportMaxRecommendedLines)
    .sort((left, right) => right.lines - left.lines || left.path.localeCompare(right.path));
  const sourceWarnings = sourceFiles
    .map((repoPath) => ({ path: repoPath, loc: lineCount(repoPath) }))
    .filter((entry) => entry.loc > FILE_SIZE_BUDGETS.singleSourceFileWarningLoc)
    .sort((left, right) => right.loc - left.loc || left.path.localeCompare(right.path));
  const cardWarnings = cards
    .map((card) => ({ id: card.id, surface: card.surface, chars: JSON.stringify(card).length }))
    .filter((entry) => entry.chars > FILE_SIZE_BUDGETS.agentCardMaxChars);
  return {
    ...createMetadata(["docs/doctrine/**", "docs/agent-truth/**", "agent/state/**", "agent/index/**", "src/**", "scripts/**"]),
    budgets: FILE_SIZE_BUDGETS,
    warnings: {
      markdownDoctrineOverBudget: markdownWarnings,
      generatedJsonOverBudget: generatedJsonWarnings,
      sourceFilesOverWarningBudget: sourceWarnings,
      cardsOverBudget: cardWarnings,
    },
    recommendations: [
      "Use doctrine.index.json before source Markdown.",
      "Use JSONL for append-only historical run ledgers.",
      "Shard generated arrays by surface when generated JSON exceeds the budget.",
    ],
  };
}
function parseGitNameOnly(output: string) {
  return output.split(/\r?\n/u).map(normalizeRepoPath).filter(Boolean);
}
function gitOutput(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" });
  } catch {
    return "";
  }
}
function parseGitStatus(output: string) {
  return output
    .split(/\r?\n/u)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const filePath = line.slice(3).trim();
      return filePath.includes(" -> ") ? filePath.split(" -> ").pop() ?? filePath : filePath;
    })
    .map(normalizeRepoPath)
    .filter(Boolean);
}
function readChangedFiles(explicitFiles: string[]) {
  if (explicitFiles.length > 0) {
    return Array.from(new Set(explicitFiles.map(normalizeRepoPath).filter(Boolean))).sort();
  }
  return Array.from(new Set([
    ...parseGitNameOnly(gitOutput(["diff", "--name-only"])),
    ...parseGitNameOnly(gitOutput(["diff", "--cached", "--name-only"])),
    ...parseGitStatus(gitOutput(["status", "--short"])),
  ])).sort();
}
function pathMatchesPattern(repoPath: string, pattern: string) {
  const normalizedPattern = normalizeRepoPath(pattern);
  if (normalizedPattern.endsWith("/**")) {
    return repoPath.startsWith(normalizedPattern.slice(0, -3));
  }
  if (normalizedPattern.includes("*")) {
    const escaped = normalizedPattern
      .replace(/[.+?^${}()|[\]\\]/gu, "\\$&")
      .replace(/\*\*/gu, "__DOUBLE_STAR__")
      .replace(/\*/gu, "[^/]*");
    return new RegExp(`^${escaped.replace(/__DOUBLE_STAR__/gu, ".*")}$`, "u").test(repoPath);
  }
  return repoPath === normalizedPattern || repoPath.startsWith(`${normalizedPattern.replace(/\/$/u, "")}/`);
}
function surfacesForFile(repoPath: string) {
  const surfaces = new Set<CompactSurface>();
  for (const definition of SURFACE_DEFINITIONS) {
    const candidates = [...definition.scope, ...definition.canonicalFiles, ...definition.sourceDocs];
    if (candidates.some((candidate) => pathMatchesPattern(repoPath, candidate))) {
      surfaces.add(definition.surface);
    }
  }
  if (repoPath.startsWith("scripts/agent/") || repoPath.startsWith("agent/context/") || repoPath.startsWith("agent/index/") || repoPath.startsWith("agent/state/")) {
    surfaces.add("agent-context");
  }
  if (repoPath === "package.json" || repoPath === "AGENTS.md" || repoPath === "FULL_SCALE_CODEBASE_AUDIT.md" || repoPath === "REPO_MEMORY_LEDGER.md" || repoPath === "EVERY_FILE_FUNCTION_CHECKLIST.md") {
    surfaces.add("repo-governance");
    surfaces.add("agent-context");
  }
  if (repoPath.includes("legacy-registry") || repoPath.includes("legacy-phaseout")) {
    surfaces.add("legacy-phaseout");
  }
  if (repoPath.startsWith("docs/doctrine/")) {
    REQUIRED_COMPACT_SURFACES.forEach((surface) => surfaces.add(surface));
  }
  return Array.from(surfaces).sort();
}
function legacyWarningsForFiles(changedFiles: string[]) {
  return LEGACY_REGISTRY.flatMap((item) => {
    const matchedFiles = changedFiles.filter((filePath) =>
      item.paths.includes(filePath)
      || item.allowedReferences.includes(filePath)
      || filePath.includes(item.id)
      || filePath.includes("legacy"),
    );
    if (matchedFiles.length === 0) return [];
    return [{
      id: item.id,
      name: item.name,
      status: item.status,
      ownerSurface: item.ownerSurface,
      canonicalReplacement: item.canonicalReplacement,
      reviewBy: item.reviewBy,
      removeBy: item.removeBy,
      riskIfKept: item.riskIfKept,
      matchedFiles,
    }];
  });
}
function buildTaskPack(input: {
  cards: DoctrineCard[];
  validatorMap: ReturnType<typeof buildValidatorMap>;
  changedFiles: string[];
  taskSummary: string;
}) {
  const surfaceSet = new Set<CompactSurface>();
  for (const filePath of input.changedFiles) {
    surfacesForFile(filePath).forEach((surface) => surfaceSet.add(surface));
  }
  if (surfaceSet.size === 0) {
    surfaceSet.add("agent-context");
  }
  const surfaces = Array.from(surfaceSet).sort();
  const relevantCards = input.cards.filter((card) => surfaces.includes(card.surface as CompactSurface));
  const validatorEntries = Object.entries(input.validatorMap.validators)
    .filter(([, surface]) => surfaces.includes(surface as CompactSurface))
    .sort((left, right) => left[1].localeCompare(right[1]) || left[0].localeCompare(right[0]));
  return {
    ...createMetadata([DOCTRINE_INDEX_PATH, DOCTRINE_CARDS_PATH, SURFACE_CONTRACTS_PATH, VALIDATOR_MAP_PATH, LEGACY_REGISTRY_CONTEXT_PATH]),
    taskSummary: input.taskSummary,
    changedFiles: input.changedFiles,
    affectedSurfaces: surfaces,
    loadPlan: [
      DOCTRINE_INDEX_PATH,
      `${DOCTRINE_CARDS_PATH} filtered to: ${surfaces.join(", ")}`,
      `${SURFACE_CONTRACTS_PATH} filtered to: ${surfaces.join(", ")}`,
      VALIDATOR_MAP_PATH,
      LEGACY_REGISTRY_CONTEXT_PATH,
    ],
    relevantCards,
    validators: validatorEntries.map(([scriptName]) => `npm run ${scriptName}`),
    validatorSurfaces: Object.fromEntries(validatorEntries),
    legacyWarnings: legacyWarningsForFiles(input.changedFiles),
    excludedByDesign: {
      sourceMarkdown: "Not loaded unless a compact card or validator leaves uncertainty.",
      unrelatedCards: input.cards.length - relevantCards.length,
    },
  };
}
function buildWarnings(cards: DoctrineCard[]) {
  const warnings: string[] = [];
  const markdownDocs = listRepoFiles().filter((repoPath) =>
    repoPath.endsWith(".md") && (repoPath.startsWith("docs/doctrine/") || repoPath.startsWith("docs/agent-truth/")),
  );
  for (const repoPath of markdownDocs) {
    const lines = lineCount(repoPath);
    if (lines > FILE_SIZE_BUDGETS.markdownDoctrineMaxRecommendedLines) {
      warnings.push(`${repoPath} is ${lines} lines; compact cards should be preferred before loading the source doc.`);
    }
  }
  for (const card of cards) {
    const chars = JSON.stringify(card).length;
    if (chars > FILE_SIZE_BUDGETS.agentCardMaxChars) {
      warnings.push(`${card.id} is ${chars} chars; shrink the card below ${FILE_SIZE_BUDGETS.agentCardMaxChars}.`);
    }
  }
  return warnings;
}
export function getCompactSurfaceDefinitions() {
  return SURFACE_DEFINITIONS;
}
export function buildCompactAgentContext(rawArgs = process.argv.slice(2)) {
  const args = parseArgs(rawArgs);
  const cards = buildDoctrineCards();
  const warnings = buildWarnings(cards);
  const index = buildDoctrineIndex(cards, warnings);
  const contracts = buildSurfaceContracts(cards);
  const validatorMap = buildValidatorMap();
  const changedFiles = readChangedFiles(args.files);
  const taskPack = buildTaskPack({ cards, validatorMap, changedFiles, taskSummary: args.taskSummary });
  writeJsonFile(DOCTRINE_INDEX_PATH, index as Json);
  writeJsonlFile(DOCTRINE_CARDS_PATH, cards);
  writeJsonlFile(SURFACE_CONTRACTS_PATH, contracts);
  writeJsonFile(VALIDATOR_MAP_PATH, validatorMap as Json);
  writeJsonFile(LEGACY_REGISTRY_CONTEXT_PATH, buildLegacyRegistryContext() as Json);
  writeJsonFile(FILE_SIZE_BUDGET_PATH, buildFileSizeBudget(cards) as Json);
  writeJsonFile(TASK_PACK_PATH, taskPack as Json);
  return { cards, contracts, validatorMap, taskPack, warnings };
}
if (require.main === module) {
  const result = buildCompactAgentContext();
  console.log(`Compact agent context generated at ${COMPACT_AGENT_CONTEXT_DIR} (${result.cards.length} cards, ${result.validatorMap.validatorCount} validators).`);
}
