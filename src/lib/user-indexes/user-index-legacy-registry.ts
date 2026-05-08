export type UserIndexLegacyStatus = "canonical" | "migrated" | "deprecated" | "blocked";

export type UserIndexLegacyEntry = {
  id: string;
  status: UserIndexLegacyStatus;
  reason: string;
};

export const USER_INDEX_LEGACY_REGISTRY: UserIndexLegacyEntry[] = [
  {
    id: "direct_ui_user_metric_writes",
    status: "blocked",
    reason: "UI emits events only and must never write canonical user indexes.",
  },
  {
    id: "admin_page_inline_user_metric_formulas",
    status: "blocked",
    reason: "Admin pages render index read models and cannot compute tracking truth inline.",
  },
  {
    id: "raw_event_name_parsing_outside_index_normalizer",
    status: "blocked",
    reason: "Event interpretation must route through runtime fact + user index normalizers.",
  },
  {
    id: "legacy_page_duration_as_watch_truth",
    status: "blocked",
    reason: "Page duration is diagnostic-only and not verified watch truth.",
  },
  {
    id: "ga_primary_user_metrics",
    status: "blocked",
    reason: "GA is optional evidence and cannot be canonical user tracking truth.",
  },
  {
    id: "client_only_purchase_revenue_truth",
    status: "blocked",
    reason: "Purchase truth must come from server transaction lanes.",
  },
  {
    id: "client_only_unlock_entitlement_truth",
    status: "blocked",
    reason: "Unlock truth must come from server entitlement/unlock facts.",
  },
];
