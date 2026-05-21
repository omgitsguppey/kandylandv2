export const LEGACY_BEHAVIOR_RECOVERY_START_DATE = "2026-03-01";

export type LegacyBehaviorRecoveryConfidence = "exact" | "probable" | "weak" | "unknown";
export type LegacyBehaviorDuplicateRisk = "low" | "medium" | "high";
export type LegacyBehaviorCurrentCategory =
  | "page_view"
  | "creator_interaction"
  | "drop_open"
  | "click"
  | "scroll"
  | "active_time"
  | "watch_link_candidate"
  | "purchase_intent"
  | "unknown";

export type LegacyBehaviorRecordInput = {
  id: string;
  eventName: string;
  timestampMs: number;
  sessionId?: string;
  anonymousVisitorId?: string;
  userId?: string;
  durationMs?: number;
};

export type LegacyBehaviorRecoveryRecord = LegacyBehaviorRecordInput & {
  currentCategory: LegacyBehaviorCurrentCategory;
  confidence: LegacyBehaviorRecoveryConfidence;
  duplicateRisk: LegacyBehaviorDuplicateRisk;
  action: "map_for_review" | "quarantine_unknown";
};

export type LegacyBehaviorRecoveryPlan = {
  mode: "dry_run_only";
  startDate: typeof LEGACY_BEHAVIOR_RECOVERY_START_DATE;
  readsProduction: false;
  mutationsAllowed: false;
  records: LegacyBehaviorRecoveryRecord[];
  summary: {
    inputRecords: number;
    inWindowRecords: number;
    exact: number;
    probable: number;
    weak: number;
    unknown: number;
  };
};

function classifyLegacyEvent(eventName: string): LegacyBehaviorCurrentCategory {
  const normalized = eventName.toLowerCase();
  if (normalized.includes("creator_profile") || normalized.includes("creator_rail") || normalized.includes("creator_follow")) return "creator_interaction";
  if (normalized.includes("drop_preview") || normalized.includes("drop_open")) return "drop_open";
  if (normalized.includes("page_view") || normalized.includes("home_page")) return "page_view";
  if (normalized.includes("click") || normalized.includes("cta") || normalized.includes("checkout")) return "click";
  if (normalized.includes("scroll")) return "scroll";
  if (normalized.includes("page_engaged") || normalized.includes("visibility")) return "active_time";
  if (normalized.includes("watch")) return "watch_link_candidate";
  if (normalized.includes("wallet") || normalized.includes("package_selected") || normalized.includes("begin_checkout")) return "purchase_intent";
  return "unknown";
}

function confidenceForCategory(category: LegacyBehaviorCurrentCategory, record: LegacyBehaviorRecordInput): LegacyBehaviorRecoveryConfidence {
  if (category === "unknown") return "unknown";
  if (category === "watch_link_candidate") return "weak";
  if (record.userId && record.sessionId && record.id) return "probable";
  if (record.userId || record.anonymousVisitorId || record.sessionId) return "weak";
  return "unknown";
}

function duplicateRiskForRecord(category: LegacyBehaviorCurrentCategory, record: LegacyBehaviorRecordInput): LegacyBehaviorDuplicateRisk {
  if (category === "unknown") return "high";
  if (record.userId && record.sessionId && record.id) return "medium";
  if (record.id && (record.userId || record.anonymousVisitorId)) return "medium";
  return "high";
}

export function buildLegacyBehaviorRecoveryPlan(input: {
  records: LegacyBehaviorRecordInput[];
}): LegacyBehaviorRecoveryPlan {
  const startMs = Date.parse(`${LEGACY_BEHAVIOR_RECOVERY_START_DATE}T00:00:00.000Z`);
  const records = input.records
    .filter((record) => record.timestampMs >= startMs)
    .map((record): LegacyBehaviorRecoveryRecord => {
      const currentCategory = classifyLegacyEvent(record.eventName);
      const confidence = confidenceForCategory(currentCategory, record);
      return {
        ...record,
        currentCategory,
        confidence,
        duplicateRisk: duplicateRiskForRecord(currentCategory, record),
        action: currentCategory === "unknown" ? "quarantine_unknown" : "map_for_review",
      };
    });

  return {
    mode: "dry_run_only",
    startDate: LEGACY_BEHAVIOR_RECOVERY_START_DATE,
    readsProduction: false,
    mutationsAllowed: false,
    records,
    summary: {
      inputRecords: input.records.length,
      inWindowRecords: records.length,
      exact: records.filter((record) => record.confidence === "exact").length,
      probable: records.filter((record) => record.confidence === "probable").length,
      weak: records.filter((record) => record.confidence === "weak").length,
      unknown: records.filter((record) => record.confidence === "unknown").length,
    },
  };
}
