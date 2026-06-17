import { fileExists, type SharedTypeDomain, type ValidationResult } from "./type-hardening-shared";

export type CanonicalTypeOwnerEntry = {
  domain: Exclude<SharedTypeDomain, "unknown">;
  label: string;
  canonicalFiles: string[];
  adapterFiles: string[];
  rule: string;
  validator: string;
};

export const CANONICAL_TYPE_OWNER_MAP: CanonicalTypeOwnerEntry[] = [
  {
    domain: "user",
    label: "User/Profile/Account",
    canonicalFiles: ["src/types/db.ts", "src/lib/user/user-profile-contract.ts"],
    adapterFiles: ["src/types/admin-analytics.ts"],
    rule: "User, profile, and account shapes import or alias UserProfile and user-profile contracts.",
    validator: "check:type-schema-inventory",
  },
  {
    domain: "creator",
    label: "Creator/Profile/Settings",
    canonicalFiles: ["src/types/db.ts", "src/lib/creator-settings/creator-settings-contract.ts", "src/lib/creator-monetization/creator-monetization-contract.ts"],
    adapterFiles: ["src/lib/creator/dashboard/creator-settings-contract.ts"],
    rule: "Creator profile/settings/monetization shapes stay in creator contracts or db aliases.",
    validator: "check:canonical-type-owner-map",
  },
  {
    domain: "wallet",
    label: "Wallet/GumDrop/Ledger",
    canonicalFiles: ["src/lib/gumdrop-ledger.ts", "src/lib/gumdrop-source-of-funds.ts", "src/lib/commerce/transaction-source-of-funds-contract.ts"],
    adapterFiles: ["src/types/db.ts"],
    rule: "Wallet and GumDrop balance shapes must preserve source-of-funds truth and reuse ledger contracts.",
    validator: "check:type-schema-gut-consolidation",
  },
  {
    domain: "gumdrop",
    label: "GumDrop Source Of Funds",
    canonicalFiles: ["src/lib/gumdrop-ledger.ts", "src/lib/gumdrop-source-of-funds.ts", "src/lib/math/gumdrop-ledger-math.ts"],
    adapterFiles: ["src/types/db.ts"],
    rule: "GumDrop source, ledger, and math shapes remain canonical; this pass does not change GumDrop math.",
    validator: "check:final-math-normalization-lock",
  },
  {
    domain: "payment",
    label: "Payment/Entitlement/Revenue",
    canonicalFiles: ["src/lib/commerce/commerce-parity-contract.ts", "src/lib/creator-monetization/creator-entitlement-contract.ts"],
    adapterFiles: ["src/types/db.ts"],
    rule: "Payment, entitlement, and revenue DTOs import commerce/entitlement contracts and do not change runtime payment code.",
    validator: "check:type-schema-gut-consolidation",
  },
  {
    domain: "event_envelope",
    label: "Event Envelope/Event Fact",
    canonicalFiles: ["src/lib/analytics/event-envelope-contract.ts", "src/lib/behavioral/event-fact-contract.ts"],
    adapterFiles: ["src/lib/analytics/event-envelope-builder.ts"],
    rule: "Telemetry envelopes and event facts use canonical analytics and behavioral contracts.",
    validator: "check:event-translation-bridge",
  },
  {
    domain: "person_metrics",
    label: "Person/Global Metrics",
    canonicalFiles: ["src/lib/analytics/person-metrics-contract.ts", "src/lib/analytics/person-metrics-hydration.ts"],
    adapterFiles: ["src/types/analytics.ts"],
    rule: "Metric and hydration status types map to person metrics and liveness owners.",
    validator: "check:person-metrics-hydration",
  },
  {
    domain: "journey",
    label: "Journey",
    canonicalFiles: ["src/lib/behavioral/user-journey-contract.ts", "src/lib/admin-analytics-journey-funnel.ts"],
    adapterFiles: ["src/types/admin-analytics.ts"],
    rule: "Journey event shapes live in behavioral journey contracts and admin journey funnels.",
    validator: "check:type-schema-inventory",
  },
  {
    domain: "debug",
    label: "Debug Finding",
    canonicalFiles: ["src/lib/product-integrity/interpretive-brain-contract.ts", "src/lib/debug/debug-backlog-contract.ts"],
    adapterFiles: ["src/lib/debug/debug-panel-tracking-summary.ts"],
    rule: "Root cause and debug finding shapes route through the interpretive brain/debug backlog.",
    validator: "check:type-schema-gut-consolidation",
  },
  {
    domain: "release_readiness",
    label: "Release Evidence",
    canonicalFiles: ["src/lib/release-readiness/final-release-readiness.ts", "src/lib/release-readiness/live-evidence-gate-contract.ts"],
    adapterFiles: ["src/lib/agent-governance/generated-reports/generated-report-contract.ts"],
    rule: "Release evidence statuses and reports use release-readiness contracts and compact generated report schema.",
    validator: "check:generated-report-schema-contract",
  },
  {
    domain: "cost",
    label: "Cost",
    canonicalFiles: ["src/lib/cost/billing-spike-contract.ts", "src/lib/server/global-cost-surface-contract.ts", "src/lib/config-hardening/config-hardening-shared.ts"],
    adapterFiles: ["src/lib/backend-hardening/backend-cost-consolidation.ts"],
    rule: "Cost status and evidence shapes use cost/export/backend/config guardrail contracts.",
    validator: "check:type-schema-gut-consolidation",
  },
  {
    domain: "legacy_recovery",
    label: "Legacy",
    canonicalFiles: ["src/lib/legacy/legacy-normalization-contract.ts", "src/lib/codebase-hardening/legacy-canonical-recovery-plan.ts"],
    adapterFiles: ["src/lib/analytics/legacy-recovery-contract.ts"],
    rule: "Legacy candidates are explicitly modeled as recovery/adapters, not new source truth.",
    validator: "check:mega-legacy-pipeline-hardening",
  },
  {
    domain: "surface_feature_telemetry",
    label: "Surface/Feature/Telemetry",
    canonicalFiles: ["src/lib/features/feature-registration-contract.ts", "src/lib/parity/surface-parity-contract.ts", "src/lib/analytics/telemetry/surface-telemetry-contract.ts"],
    adapterFiles: ["src/lib/telemetry-catalog.ts"],
    rule: "Surface, feature, and telemetry types import registry contracts instead of local duplicates.",
    validator: "check:feature-registration-gate",
  },
  {
    domain: "analytics",
    label: "Analytics",
    canonicalFiles: ["src/types/analytics.ts", "src/lib/admin-analytics-contracts.ts", "src/lib/analytics/person-metrics-contract.ts"],
    adapterFiles: ["src/lib/admin-analytics/panel-hydration-contract.ts"],
    rule: "Analytics status and metric shapes remain thin adapters over analytics contracts.",
    validator: "check:type-schema-inventory",
  },
  {
    domain: "auth",
    label: "Auth",
    canonicalFiles: ["src/lib/auth/email-password-auth-contract.ts", "src/lib/auth/auth-telemetry-contract.ts"],
    adapterFiles: ["src/types/db.ts"],
    rule: "Auth/session DTOs use auth contracts and never redefine token or provider secret shapes.",
    validator: "check:type-schema-inventory",
  },
  {
    domain: "chat",
    label: "Chat",
    canonicalFiles: ["src/lib/chat/chat-realtime-contract.ts", "src/lib/chat/chat-gating-contract.ts", "src/types/db.ts"],
    adapterFiles: ["src/lib/chat.ts"],
    rule: "Chat thread/message DTOs use chat contracts and db aliases.",
    validator: "check:type-schema-inventory",
  },
  {
    domain: "drop",
    label: "Drop",
    canonicalFiles: ["src/types/db.ts", "src/lib/drops/drop-form-contract.ts", "src/lib/drops/drop-submission-contract.ts"],
    adapterFiles: ["src/lib/commerce/unlock-watch-parity-contract.ts"],
    rule: "Drop and unlock/watch DTOs use db and drop contracts.",
    validator: "check:type-schema-inventory",
  },
  {
    domain: "watch",
    label: "Watch",
    canonicalFiles: ["src/lib/watch-time-rollup-contract.ts", "src/lib/analytics/watch-capture-quality-contract.ts", "src/lib/math/drop-watch-unlock-math.ts"],
    adapterFiles: ["src/lib/commerce/unlock-watch-parity-contract.ts"],
    rule: "Watch time shapes use watch/session contracts; page duration is not canonical.",
    validator: "check:final-math-normalization-lock",
  },
  {
    domain: "task",
    label: "Task",
    canonicalFiles: ["src/lib/tasks/daily-task-contract.ts", "src/lib/tasks/task-catalog.ts"],
    adapterFiles: ["src/types/db.ts"],
    rule: "Daily task and reward DTOs use task catalog and reset/reward contracts.",
    validator: "check:type-schema-inventory",
  },
  {
    domain: "notification",
    label: "Notification",
    canonicalFiles: ["src/lib/notifications/notification-permission-contract.ts", "src/lib/notifications/push-token-contract.ts", "src/lib/notification-contracts.ts"],
    adapterFiles: ["src/lib/notifications.ts"],
    rule: "Notification and PWA DTOs use notification contracts and never expose raw tokens in report schemas.",
    validator: "check:type-schema-inventory",
  },
  {
    domain: "media",
    label: "Media",
    canonicalFiles: ["src/lib/media/media-access-contract.ts", "src/lib/media/media-upload-contract.ts", "src/lib/uploads/asset-upload-draft-contract.ts"],
    adapterFiles: ["src/lib/chat-attachments.ts"],
    rule: "Media/upload DTOs use media contracts and do not expose raw private storage paths.",
    validator: "check:type-schema-inventory",
  },
  {
    domain: "search",
    label: "Search",
    canonicalFiles: ["src/lib/discovery/search-telemetry-contract.ts", "src/lib/discovery/search-cost-contract.ts"],
    adapterFiles: [],
    rule: "Search DTOs use discovery telemetry/cost contracts.",
    validator: "check:type-schema-inventory",
  },
  {
    domain: "support",
    label: "Support",
    canonicalFiles: ["src/lib/support-policy/support-policy-surface-contract.ts", "src/lib/errors/bug-report-contract.ts"],
    adapterFiles: [],
    rule: "Support/account-safety and bug report shapes use support policy/error contracts.",
    validator: "check:type-schema-inventory",
  },
  {
    domain: "config",
    label: "Config",
    canonicalFiles: ["src/lib/config-hardening/config-env-contract.ts", "src/lib/config-hardening/security-rules-contract.ts"],
    adapterFiles: [],
    rule: "Config/env/CI schemas remain in config-hardening contracts.",
    validator: "check:config-env-contract",
  },
];

export function canonicalFilesForDomain(domain: SharedTypeDomain) {
  return CANONICAL_TYPE_OWNER_MAP.find((entry) => entry.domain === domain)?.canonicalFiles ?? [];
}

export function validateCanonicalTypeOwnerMap(entries = CANONICAL_TYPE_OWNER_MAP): ValidationResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  const domains = new Set<string>();

  for (const entry of entries) {
    if (domains.has(entry.domain)) failures.push(`duplicate canonical owner for ${entry.domain}`);
    domains.add(entry.domain);
    if (entry.canonicalFiles.length === 0) failures.push(`${entry.domain} lacks canonical files`);
    if (entry.canonicalFiles.every((path) => !fileExists(path))) failures.push(`${entry.domain} has no existing canonical file`);
    if (!entry.rule || !entry.validator) failures.push(`${entry.domain} lacks rule or validator`);
  }

  return { ok: failures.length === 0, failures, warnings };
}
