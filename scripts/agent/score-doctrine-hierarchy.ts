import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { pathToFileURL } from "node:url";

type AuthorityLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type DoctrineStatus = "canonical" | "supporting" | "generated" | "legacy" | "deprecated";

type DoctrineRegistryEntry = {
  id: string;
  title: string;
  path: string;
  authorityLevel: AuthorityLevel;
  surface: string;
  status: DoctrineStatus;
  supersedes: string[];
  supersededBy: string | null;
  owner: string;
  lastReviewed: string;
  reviewBy: string;
  removeBy: string | null;
  requiredValidators: string[];
  canonicalRules: string[];
  blockedPatterns: string[];
};

type DoctrineCard = {
  id: string;
  surface: string;
  authorityLevel: number;
  canonicalDoc: string;
  summary: string;
  must: string[];
  mustNot: string[];
  sourceTruth: string[];
  validators: string[];
  legacyWarnings: string[];
  tokenEstimate: number;
};

type DoctrineConflict = {
  surface: string;
  conflict: string;
  docs: string[];
  winningRule: string;
  authorityReason: string;
  action: "update_legacy_doc" | "mark_superseded" | "manual_review";
};

const root = process.cwd();
const today = "2026-05-05";
const reviewBy = "2026-06-05";
const legacyRemoveBy = "2026-08-01";
const registryPath = "agent/context/doctrine-registry.json";
const cardsPath = "agent/context/doctrine-cards.jsonl";
const conflictsPath = "agent/context/doctrine-conflicts.generated.json";

const surfaces = [
  "wallet",
  "drops",
  "viewer",
  "watch-time",
  "telemetry",
  "user-management",
  "behavioral-intelligence",
  "creator-profile",
  "creator-dashboard",
  "support",
  "moderation",
  "admin-debug",
  "admin-ai",
  "device-ui",
  "image-loading",
  "security/cost",
  "cloud/sql/bigquery",
] as const;

const surfaceDocBySurface: Record<string, string> = {
  wallet: "docs/doctrine/surfaces/wallet.md",
  drops: "docs/doctrine/surfaces/drops.md",
  viewer: "docs/doctrine/surfaces/viewer.md",
  "watch-time": "docs/doctrine/surfaces/watch-time.md",
  telemetry: "docs/doctrine/surfaces/telemetry.md",
  "user-management": "docs/doctrine/surfaces/user-management.md",
  "behavioral-intelligence": "docs/doctrine/surfaces/behavioral-intelligence.md",
  "creator-profile": "docs/doctrine/surfaces/creator-profile.md",
  "creator-dashboard": "docs/doctrine/surfaces/creator-dashboard.md",
  support: "docs/doctrine/surfaces/support.md",
  moderation: "docs/doctrine/surfaces/moderation.md",
  "admin-debug": "docs/doctrine/surfaces/admin-debug.md",
  "admin-ai": "docs/doctrine/surfaces/admin-ai.md",
  "device-ui": "docs/doctrine/surfaces/device-ui.md",
  "image-loading": "docs/doctrine/surfaces/image-loading.md",
  "security/cost": "docs/doctrine/surfaces/security-cost.md",
  "cloud/sql/bigquery": "docs/doctrine/surfaces/cloud-sql-bigquery.md",
};

const surfaceValidators: Record<string, string[]> = {
  wallet: ["check:wallet-density", "check:wallet-single-paypal-button", "check:purchase-telemetry-truth", "check:gumdrop-economy"],
  drops: ["check:drop-preview-page", "check:unlock-telemetry-truth", "check:content-protection", "check:discovery-tracking-truth"],
  viewer: ["check:viewer-file-tracking", "check:watch-time-truth", "check:content-protection"],
  "watch-time": ["check:watch-time-truth", "check:watch-time-rollup-truth", "check:watch-time-truth-v2"],
  telemetry: ["check:analytics-event-contract", "check:actor-target-telemetry", "check:purchase-telemetry-truth", "check:unlock-telemetry-truth", "check:admin-projection-analytics-exclusion"],
  "user-management": ["check:admin-user-behavior-truth", "check:user-engagement-score", "check:user-value-score", "check:admin-user-metrics-snapshot"],
  "behavioral-intelligence": ["check:event-fact-truth", "check:behavioral-truth-source", "check:recommendation-ranker", "check:math-goal-alignment"],
  "creator-profile": ["check:creator-profile-routing", "check:creator-identity-markers", "check:actor-target-telemetry"],
  "creator-dashboard": ["check:creator-experience-transaction-truth", "check:creator-booking-error-copy", "check:fan-pass-gumdrops-truth", "check:admin-projection-analytics-exclusion"],
  support: ["check:support-recovery-flows", "check:support-tracking-truth"],
  moderation: ["check:admin-moderation-real-risk", "check:theft-risk-score"],
  "admin-debug": ["check:debug-control-tower-cutover", "check:debug-evidence-pipeline", "check:admin-truth-replacement"],
  "admin-ai": ["check:admin-ai-control-tower", "check:admin-review-badges", "check:google-cost"],
  "device-ui": ["check:device-layout-contract", "check:device-ui", "score:device-ui"],
  "image-loading": ["check:sitewide-image-optimization", "check:content-protection"],
  "security/cost": ["check:speed-security", "score:speed-security", "check:hardening", "check:google-cost"],
  "cloud/sql/bigquery": ["check:cloud-cost", "score:cloud-cost", "check:google-cost"],
};

const surfaceRules: Record<string, { must: string[]; mustNot: string[]; sourceTruth: string[]; blocked: string[] }> = {
  wallet: {
    must: ["Revenue and user value read server purchase or ledger transaction truth.", "Wallet preserves paid vs reward GumDrop source accounting."],
    mustNot: ["Client-only purchase completion cannot inflate revenue.", "Total-only balance chips are not canonical."],
    sourceTruth: ["PayPal capture", "GumDrop ledger", "transaction_id", "sourceTruth"],
    blocked: ["client-only revenue fact", "total-only balance chip", "green bonus chip"],
  },
  drops: {
    must: ["Full-page locked preview is canonical.", "Unlocks count server entitlement facts only."],
    mustNot: ["Preview modal cannot become canonical.", "Client unlock success cannot count as canonical unlock."],
    sourceTruth: ["server unlock route", "entitlementId", "sourceTruth=server"],
    blocked: ["modal preview canonical", "client unlock success counts", "internal content URL before unlock"],
  },
  viewer: {
    must: ["Visible media emits file_viewed with viewerSessionId.", "File views connect to watch sessions."],
    mustNot: ["No internal content URLs in telemetry.", "Render-time media mapping is not a view."],
    sourceTruth: ["viewer session", "media visibility", "watch session"],
    blocked: ["raw storage URL in telemetry", "file view on render"],
  },
  "watch-time": {
    must: ["Watch time is foreground visible engagement.", "Behavioral intelligence prefers watch-session rollups."],
    mustNot: ["Page duration is not canonical watch time.", "Hidden or idle time is excluded."],
    sourceTruth: ["visibility state", "playback state", "server rollup"],
    blocked: ["page duration as canonical watch time", "hidden tab credit"],
  },
  telemetry: {
    must: ["Actor ids identify performer and target ids identify affected entity.", "Server truth anchors purchase and unlock metrics."],
    mustNot: ["Admin/projection events cannot contaminate user metrics.", "notification_opened and notification_read are not separate behavior scores."],
    sourceTruth: ["analytics event contract", "identified ingest", "event-fact normalizer"],
    blocked: ["creator_id as actorCreatorId for fan action", "client-only purchase metric", "notification opened/read split"],
  },
  "user-management": {
    must: ["Admin user metrics read normalized user facts.", "Admin cards label source state honestly."],
    mustNot: ["Admin QA cannot count as user behavior.", "Missing data cannot render healthy."],
    sourceTruth: ["event facts", "behavioral rollups", "admin user snapshot"],
    blocked: ["admin QA counted as user behavior", "fake healthy user metrics", "pure realtime admin users"],
  },
  "behavioral-intelligence": {
    must: ["Raw events normalize before scoring.", "Deterministic ranking remains safety baseline."],
    mustNot: ["Unknown events cannot become production facts.", "ML artifacts cannot activate without validation."],
    sourceTruth: ["event-fact contract", "rollups", "behavioral runtime"],
    blocked: ["unknown event as production count", "client retry counted twice"],
  },
  "creator-profile": {
    must: ["Fan profile actions target creators without becoming creator behavior."],
    mustNot: ["Admin projection cannot be public profile truth."],
    sourceTruth: ["creator profile route", "identity markers", "actor/target telemetry"],
    blocked: ["fan action as actor creator", "projection as public truth"],
  },
  "creator-dashboard": {
    must: ["Creator paid experiences use paid-source GumDrops where required.", "Expected failures return typed safe errors."],
    mustNot: ["Reward GumDrops cannot start or renew Fan Pass.", "Projection writes cannot become live creator behavior."],
    sourceTruth: ["creator server helpers", "transaction facts", "actor/target telemetry"],
    blocked: ["reward GumDrops for Fan Pass", "generic booking internal server error"],
  },
  support: {
    must: ["Bug reports and support tickets feed user timeline and debug evidence."],
    mustNot: ["Admin support actions cannot count as user behavior."],
    sourceTruth: ["support routes", "thread model", "debug evidence"],
    blocked: ["admin support reply counted as user behavior", "flat support messages canonical"],
  },
  moderation: {
    must: ["Screenshot-like signals remain weak heuristic context unless confirmed by platform/server evidence."],
    mustNot: ["Browser/PWA screenshot heuristics cannot be confirmed facts."],
    sourceTruth: ["moderation evidence", "scrape-risk score", "content-protection server evidence"],
    blocked: ["Screenshot detected", "screenshotConfirmed", "confirmedScreenshot"],
  },
  "admin-debug": {
    must: ["Admin debug labels live/cached/stale/fallback/partial/failed/unknown.", "Generated reports remain snapshots."],
    mustNot: ["Generated reports cannot be canonical doctrine.", "Missing data cannot render healthy."],
    sourceTruth: ["admin debug control tower", "debug evidence", "generated snapshots"],
    blocked: ["generated report canonical", "fake green healthy state"],
  },
  "admin-ai": {
    must: ["Admin AI uses shared model registry and budget controls."],
    mustNot: ["Hardcoded model aliases outside registry are blocked."],
    sourceTruth: ["AI model registry", "admin AI routes", "cost controls"],
    blocked: ["hardcoded model alias", "AI fallback healthy"],
  },
  "device-ui": {
    must: ["Use shared device layout and mobile shell helpers."],
    mustNot: ["Do not freestyle viewport math or raw shell 100vh."],
    sourceTruth: ["device layout contract", "user mobile shell", "device UI dry audit"],
    blocked: ["raw 100vh mobile shell", "freestyle layout physics"],
  },
  "image-loading": {
    must: ["Use surface-based image policy and accurate sizes."],
    mustNot: ["No internal thumbnails before entitlement truth."],
    sourceTruth: ["image loading policy", "content protection contracts"],
    blocked: ["internal thumbnail before entitlement", "fill image without sizes"],
  },
  "security/cost": {
    must: ["API routes declare auth, origin, rate, idempotency, cache, cost, and failure contracts."],
    mustNot: ["Broad browser audits are not first-line security checks."],
    sourceTruth: ["API cost contract", "route cache contract", "security hardening contract"],
    blocked: ["unbounded route cost", "silent catch block"],
  },
  "cloud/sql/bigquery": {
    must: ["Data Connect and Cloud SQL remain agent-context mirror unless explicitly promoted."],
    mustNot: ["SQL/Data Connect cannot serve runtime user/payment/drop/chat/support/creator flows without ApiCostContract."],
    sourceTruth: ["Data Connect config", "cloud cost contract", "SQL mirror status"],
    blocked: ["runtime SQL without ApiCostContract", "BigQuery mutates runtime balances"],
  },
};

const supersededDoctrine: Record<string, string> = {
  "docs/doctrine/kandydrops-product-doctrine.md": "docs/doctrine/00-product-constitution.md",
  "docs/doctrine/kandydrops-copy-doctrine.md": "docs/doctrine/00-product-constitution.md",
  "docs/doctrine/kandydrops-vocabulary-index.md": "docs/doctrine/00-product-constitution.md",
  "docs/doctrine/kandydrops-decision-checklist.md": "docs/doctrine/02-engineering-constitution.md",
  "docs/doctrine/kandydrops-code-organization.md": "docs/doctrine/02-engineering-constitution.md",
  "docs/doctrine/kandydrops-ui-doctrine.md": "docs/doctrine/01-source-of-truth-constitution.md",
  "docs/doctrine/kandydrops-google-analytics-cloud-doctrine.md": "docs/doctrine/surfaces/cloud-sql-bigquery.md",
  "docs/doctrine/kandydrops-banned-patterns.md": "docs/doctrine/02-engineering-constitution.md",
  "docs/doctrine/kandydrops-surface-matrix.md": "docs/doctrine/surfaces/README.md",
};

const supportingDocSurfaceRules: Array<{ pattern: RegExp; surface: string }> = [
  { pattern: /wallet|paypal|payment|gumdrop|fan-pass|booking|legal-payment/u, surface: "wallet" },
  { pattern: /drop|unlock|content-protection|discovery|carousel|preview/u, surface: "drops" },
  { pattern: /viewer|file-tracking/u, surface: "viewer" },
  { pattern: /watch-time/u, surface: "watch-time" },
  { pattern: /telemetry|analytics|actor|identified|event-catalog/u, surface: "telemetry" },
  { pattern: /admin-user|user-engagement|user-value|user-management/u, surface: "user-management" },
  { pattern: /behavioral|recommendation|event-fact|tracking-surface|math-goal/u, surface: "behavioral-intelligence" },
  { pattern: /creator-profile|identity-marker/u, surface: "creator-profile" },
  { pattern: /creator|fan-experience|agreement|roster|projection/u, surface: "creator-dashboard" },
  { pattern: /support|bug-report/u, surface: "support" },
  { pattern: /moderation|theft|scrape/u, surface: "moderation" },
  { pattern: /admin-debug|debug-evidence|admin-truth/u, surface: "admin-debug" },
  { pattern: /admin-ai|ai-drop|model|prompt/u, surface: "admin-ai" },
  { pattern: /device|layout|mobile|hydration|accessibility|tap-target|design-system/u, surface: "device-ui" },
  { pattern: /image|loading|media/u, surface: "image-loading" },
  { pattern: /security|hardening|ast-grep|background|pwa|launch|rollback/u, surface: "security/cost" },
  { pattern: /google|cloud|sql|bigquery|dataconnect/u, surface: "cloud/sql/bigquery" },
];

function toRepoPath(filePath: string) {
  return filePath.replace(/\\/gu, "/").replace(/^\.\//u, "");
}

function read(filePath: string) {
  return existsSync(join(root, filePath)) ? readFileSync(join(root, filePath), "utf8") : "";
}

function titleFromPath(filePath: string) {
  const firstHeading = read(filePath).split(/\r?\n/u).find((line) => line.startsWith("# "));
  if (firstHeading) return firstHeading.replace(/^#\s+/u, "").trim();
  return filePath.split("/").pop()?.replace(/\.(?:md|json|jsonl)$/u, "").replace(/[-_]/gu, " ") ?? filePath;
}

function idFromPath(filePath: string) {
  return filePath.replace(/\.[^.]+$/u, "").replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "").toLowerCase();
}

function lineCount(filePath: string) {
  const content = read(filePath);
  return content ? content.split(/\r?\n/u).length : 0;
}

function walkFiles(directory: string): string[] {
  const start = join(root, directory);
  if (!existsSync(start)) return [];
  const output: string[] = [];
  for (const entry of readdirSync(start)) {
    const fullPath = join(start, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      output.push(...walkFiles(toRepoPath(join(directory, entry))));
    } else {
      output.push(toRepoPath(join(directory, entry)));
    }
  }
  return output.sort();
}

function inferSurface(filePath: string) {
  const normalized = filePath.toLowerCase();
  const direct = Object.entries(surfaceDocBySurface).find(([, docPath]) => docPath === filePath);
  if (direct) return direct[0];
  return supportingDocSurfaceRules.find((rule) => rule.pattern.test(normalized))?.surface ?? "repo-governance";
}

function entry(input: Partial<DoctrineRegistryEntry> & Pick<DoctrineRegistryEntry, "path" | "authorityLevel" | "surface" | "status">): DoctrineRegistryEntry {
  const path = input.path;
  const surface = input.surface;
  return {
    id: input.id ?? idFromPath(path),
    title: input.title ?? titleFromPath(path),
    path,
    authorityLevel: input.authorityLevel,
    surface,
    status: input.status,
    supersedes: input.supersedes ?? [],
    supersededBy: input.supersededBy ?? null,
    owner: input.owner ?? surface,
    lastReviewed: input.lastReviewed ?? today,
    reviewBy: input.reviewBy ?? reviewBy,
    removeBy: input.removeBy ?? null,
    requiredValidators: input.requiredValidators ?? surfaceValidators[surface] ?? ["check:doctrine"],
    canonicalRules: input.canonicalRules ?? surfaceRules[surface]?.must ?? [],
    blockedPatterns: input.blockedPatterns ?? surfaceRules[surface]?.blocked ?? [],
  };
}

function buildRegistry(): DoctrineRegistryEntry[] {
  const registry: DoctrineRegistryEntry[] = [
    entry({
      id: "product-constitution",
      title: "Product Constitution",
      path: "docs/doctrine/00-product-constitution.md",
      authorityLevel: 1,
      surface: "product",
      status: "canonical",
      supersedes: [
        "docs/doctrine/kandydrops-product-doctrine.md",
        "docs/doctrine/kandydrops-copy-doctrine.md",
        "docs/doctrine/kandydrops-vocabulary-index.md",
      ],
      requiredValidators: ["check:doctrine", "check:human-readable-admin-copy"],
      canonicalRules: ["Product, business, user-loop, trust, and brand constraints live here."],
      blockedPatterns: ["generic SaaS filler", "fake urgency", "old economy iconography as user-facing GumDrop value"],
    }),
    entry({
      id: "source-of-truth-constitution",
      title: "Source-Of-Truth Constitution",
      path: "docs/doctrine/01-source-of-truth-constitution.md",
      authorityLevel: 2,
      surface: "source-of-truth",
      status: "canonical",
      supersedes: ["docs/doctrine/kandydrops-ui-doctrine.md"],
      requiredValidators: ["check:doctrine", "check:analytics-event-contract", "check:event-fact-truth"],
      canonicalRules: ["contract -> server truth -> client projection -> UI display -> telemetry -> validator -> docs"],
      blockedPatterns: ["client fact as server truth", "generated report as doctrine"],
    }),
    entry({
      id: "engineering-constitution",
      title: "Engineering Constitution",
      path: "docs/doctrine/02-engineering-constitution.md",
      authorityLevel: 3,
      surface: "engineering",
      status: "canonical",
      supersedes: ["docs/doctrine/kandydrops-code-organization.md", "docs/doctrine/kandydrops-decision-checklist.md"],
      requiredValidators: ["check:doctrine", "check:code-organization", "check:human-dev-readiness"],
      canonicalRules: ["Agents read compact context first.", "Do not read every Markdown file by default.", "Broad audits are forbidden by default."],
      blockedPatterns: ["read every md file by default", "full npm run check as first command"],
    }),
    entry({
      id: "surface-doctrine-index",
      title: "Surface Doctrine Index",
      path: "docs/doctrine/surfaces/README.md",
      authorityLevel: 4,
      surface: "surface-index",
      status: "supporting",
      requiredValidators: ["check:doctrine"],
      canonicalRules: ["Each surface has exactly one canonical authority-level-4 doctrine doc."],
      blockedPatterns: ["two canonical docs for one surface"],
    }),
  ];

  for (const surface of surfaces) {
    registry.push(entry({
      id: `surface-${surface.replace(/\//gu, "-")}`,
      title: `${surface} surface doctrine`,
      path: surfaceDocBySurface[surface],
      authorityLevel: 4,
      surface,
      status: "canonical",
      supersedes: [],
      owner: surface,
      requiredValidators: surfaceValidators[surface],
      canonicalRules: surfaceRules[surface].must,
      blockedPatterns: surfaceRules[surface].blocked,
    }));
  }

  for (const filePath of walkFiles("docs/doctrine").filter((candidate) => candidate.endsWith(".md"))) {
    if (registry.some((item) => item.path === filePath)) continue;
    const supersededBy = supersededDoctrine[filePath] ?? "docs/doctrine/02-engineering-constitution.md";
    registry.push(entry({
      path: filePath,
      authorityLevel: 7,
      surface: inferSurface(filePath),
      status: "legacy",
      supersededBy,
      removeBy: legacyRemoveBy,
      requiredValidators: ["check:doctrine"],
      canonicalRules: [],
      blockedPatterns: surfaceRules[inferSurface(filePath)]?.blocked ?? [],
    }));
  }

  for (const filePath of [
    "README.md",
    "AGENTS.md",
    "REPO_MEMORY_LEDGER.md",
    "FULL_SCALE_CODEBASE_AUDIT.md",
    "EVERY_FILE_FUNCTION_CHECKLIST.md",
    ...walkFiles("control-tower").filter((candidate) => candidate.endsWith(".md") || candidate.endsWith(".yaml")),
    ...walkFiles("docs/agent-truth").filter((candidate) => candidate.endsWith(".md")),
    ...walkFiles("docs/adr").filter((candidate) => candidate.endsWith(".md")),
    ...walkFiles("docs/runbooks").filter((candidate) => candidate.endsWith(".md")),
  ]) {
    if (registry.some((item) => item.path === filePath)) continue;
    const authorityLevel: AuthorityLevel = filePath.startsWith("docs/adr/") || filePath.startsWith("docs/runbooks/") ? 5 : 5;
    const surface = inferSurface(filePath);
    registry.push(entry({
      path: filePath,
      authorityLevel,
      surface,
      status: "supporting",
      requiredValidators: surfaceValidators[surface] ?? ["check:doctrine"],
      canonicalRules: [],
      blockedPatterns: surfaceRules[surface]?.blocked ?? [],
    }));
  }

  for (const filePath of walkFiles("agent/state").filter((candidate) => candidate.endsWith(".generated.json"))) {
    registry.push(entry({
      path: filePath,
      authorityLevel: 6,
      surface: inferSurface(filePath),
      status: "generated",
      requiredValidators: ["check:doctrine"],
      canonicalRules: [],
      blockedPatterns: ["generated report marked canonical"],
    }));
  }

  return registry.sort((left, right) => left.authorityLevel - right.authorityLevel || left.surface.localeCompare(right.surface) || left.path.localeCompare(right.path));
}

function makeCard(item: DoctrineRegistryEntry): DoctrineCard {
  const rules = surfaceRules[item.surface] ?? {
    must: item.canonicalRules.length > 0 ? item.canonicalRules : ["Use this doc as classified by doctrine-registry.json."],
    mustNot: ["Do not treat lower-authority docs as winners over constitutions."],
    sourceTruth: ["doctrine-registry.json"],
    blocked: item.blockedPatterns,
  };
  const cardWithoutEstimate = {
    id: `doctrine-card-${item.id}`,
    surface: item.surface,
    authorityLevel: item.authorityLevel,
    canonicalDoc: item.path,
    summary: `${item.title} is ${item.status} doctrine at authority level ${item.authorityLevel}.`,
    must: rules.must,
    mustNot: rules.mustNot,
    sourceTruth: rules.sourceTruth,
    validators: item.requiredValidators,
    legacyWarnings: item.status === "legacy" || item.status === "deprecated"
      ? [`Superseded by ${item.supersededBy}; review by ${item.reviewBy}; remove by ${item.removeBy ?? "not scheduled"}.`]
      : [],
  };
  return {
    ...cardWithoutEstimate,
    tokenEstimate: Math.ceil(JSON.stringify(cardWithoutEstimate).length / 4),
  };
}

function buildCards(registry: DoctrineRegistryEntry[]) {
  const overBudgetDocs = registry.filter((item) => extname(item.path) === ".md" && lineCount(item.path) > 300);
  const canonicalDocs = registry.filter((item) => item.status === "canonical");
  const required = new Map<string, DoctrineRegistryEntry>();
  for (const item of [...canonicalDocs, ...overBudgetDocs]) {
    required.set(item.id, item);
  }
  return Array.from(required.values()).map(makeCard);
}

function buildConflicts(): DoctrineConflict[] {
  return [
    {
      surface: "user-management",
      conflict: "Realtime admin/users route vs hot-cache/materialized admin user metrics.",
      docs: ["docs/agent-truth/admin-analytics-realtime-to-hot-cache-audit.md", "docs/doctrine/surfaces/user-management.md"],
      winningRule: "Admin user metrics use hot-cache/materialized snapshots where realtime reads create cost or truth drift.",
      authorityReason: "Surface doctrine authority level 4 wins over historical audit commentary.",
      action: "mark_superseded",
    },
    {
      surface: "drops",
      conflict: "Preview modal canonical vs full-page locked preview canonical.",
      docs: ["docs/doctrine/kandydrops-product-doctrine.md", "docs/doctrine/surfaces/drops.md"],
      winningRule: "Full-page locked Drop preview is canonical; modal preview is legacy fallback only.",
      authorityReason: "Drops surface doctrine and product constitution supersede older duplicated product notes.",
      action: "update_legacy_doc",
    },
    {
      surface: "telemetry",
      conflict: "Notification opened/read split vs notification_read as one behavioral fact.",
      docs: ["docs/agent-truth/notification-pipeline.md", "docs/doctrine/surfaces/telemetry.md"],
      winningRule: "notification_read is the canonical behavioral fact; opened/clicked remain UI diagnostics.",
      authorityReason: "Telemetry surface doctrine and source-of-truth constitution define behavioral fact ownership.",
      action: "mark_superseded",
    },
    {
      surface: "drops",
      conflict: "Client unlock success counts vs server entitlement truth wins.",
      docs: ["docs/agent-truth/payment-wallet-unlock-entitlement.md", "docs/doctrine/surfaces/drops.md"],
      winningRule: "Unlocked counts come from server entitlement facts only.",
      authorityReason: "Source-of-truth constitution gives server truth authority over UI display state.",
      action: "mark_superseded",
    },
    {
      surface: "moderation",
      conflict: "Screenshot detected vs screenshot-like heuristic context.",
      docs: ["docs/agent-truth/admin-moderation-security-alerts.md", "docs/doctrine/surfaces/moderation.md"],
      winningRule: "Screenshot-like browser/PWA events are weak heuristic context unless confirmed by platform/server evidence.",
      authorityReason: "Moderation surface doctrine supersedes legacy wording that implied certainty.",
      action: "update_legacy_doc",
    },
    {
      surface: "cloud/sql/bigquery",
      conflict: "SQL forbidden vs Data Connect allowed mirror.",
      docs: ["docs/agent-truth/cloudrun-sql-bigquery-guardrails.md", "docs/doctrine/surfaces/cloud-sql-bigquery.md"],
      winningRule: "Data Connect and Cloud SQL are allowed only as agent-context mirror unless explicitly promoted by contract.",
      authorityReason: "Cloud SQL surface doctrine reconciles absolute runtime ban with approved mirror use.",
      action: "mark_superseded",
    },
    {
      surface: "wallet",
      conflict: "Wallet total balance only vs split free/paid source-aware balance.",
      docs: ["docs/agent-truth/wallet-density.md", "docs/doctrine/surfaces/wallet.md"],
      winningRule: "Wallet preserves paid vs reward GumDrop source accounting and source-aware balance display.",
      authorityReason: "Wallet surface doctrine and source-of-truth constitution win over old UI density fragments.",
      action: "update_legacy_doc",
    },
    {
      surface: "wallet",
      conflict: "Green bonus chip vs purple bonus chip.",
      docs: ["docs/agent-truth/wallet-density.md", "docs/doctrine/surfaces/wallet.md"],
      winningRule: "Old green bonus chips are blocked; wallet density uses current brand/source-aware presentation.",
      authorityReason: "Wallet surface doctrine and legacy phase-out registry classify green chips as blocked legacy.",
      action: "update_legacy_doc",
    },
  ];
}

function scoreHealth(registry: DoctrineRegistryEntry[], cards: DoctrineCard[], conflicts: DoctrineConflict[]) {
  const canonicalDocsExist = registry.filter((item) => item.status === "canonical").every((item) => existsSync(join(root, item.path)));
  const hierarchyCompleteness = canonicalDocsExist && surfaces.every((surface) => registry.some((item) => item.surface === surface && item.status === "canonical")) ? 25 : 10;
  const unresolvedConflicts = conflicts.filter((conflict) => conflict.action === "manual_review").length;
  const conflictResolution = unresolvedConflicts === 0 ? 25 : Math.max(0, 25 - unresolvedConflicts * 5);
  const overBudgetDocs = registry.filter((item) => extname(item.path) === ".md" && lineCount(item.path) > 300);
  const cardDocs = new Set(cards.map((card) => card.canonicalDoc));
  const agentContextEfficiency = overBudgetDocs.every((item) => cardDocs.has(item.path)) ? 20 : 10;
  const legacyItems = registry.filter((item) => item.status === "legacy" || item.status === "deprecated");
  const legacyPhaseOut = legacyItems.every((item) => item.supersededBy && item.reviewBy && item.removeBy) ? 15 : 5;
  const validatorLinkage = registry.filter((item) => item.status === "canonical").every((item) => item.requiredValidators.length > 0) ? 15 : 5;
  return {
    overallScore: hierarchyCompleteness + conflictResolution + agentContextEfficiency + legacyPhaseOut + validatorLinkage,
    buckets: {
      hierarchyCompleteness,
      conflictResolution,
      agentContextEfficiency,
      legacyPhaseOut,
      validatorLinkage,
    },
  };
}

function writeJson(filePath: string, value: unknown) {
  const absolutePath = join(root, filePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(value)}\n`, "utf8");
}

function writeJsonl(filePath: string, values: unknown[]) {
  const absolutePath = join(root, filePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${values.map((value) => JSON.stringify(value)).join("\n")}\n`, "utf8");
}

export function scoreDoctrineHierarchy() {
  const registry = buildRegistry();
  const cards = buildCards(registry);
  const conflicts = buildConflicts();
  const score = scoreHealth(registry, cards, conflicts);
  const generatedAt = new Date().toISOString();

  writeJson(registryPath, {
    generatedAt,
    authorityOrder: [
      "1 Product Constitution",
      "2 Source-of-Truth Constitution",
      "3 Engineering Constitution",
      "4 Surface Doctrine Cards",
      "5 Runbooks and ADRs",
      "6 Generated Reports",
      "7 Legacy Docs",
    ],
    score,
    entries: registry,
  });
  writeJsonl(cardsPath, cards);
  writeJson(conflictsPath, {
    generatedAt,
    status: conflicts.some((conflict) => conflict.action === "manual_review") ? "manual_review" : "resolved_by_authority",
    conflicts,
  });

  return { registry, cards, conflicts, score };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = scoreDoctrineHierarchy();
  console.log(`Doctrine hierarchy score: ${result.score.overallScore}/100`);
  console.log(`Registry entries: ${result.registry.length}; cards: ${result.cards.length}; conflicts: ${result.conflicts.length}`);
}
