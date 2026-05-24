import type { PersonMetricId } from "@/lib/analytics/person-metrics-contract";
import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import { normalizeTelemetryEventName, TELEMETRY_EVENT_NAME_SET } from "@/lib/telemetry-catalog";

export type ChatTelemetryEventName =
  | "chat_surface_viewed"
  | "chat_thread_list_loaded"
  | "chat_thread_opened"
  | "chat_compose_sheet_opened"
  | "chat_creator_selected"
  | "chat_message_send_attempted"
  | "chat_message_sent"
  | "chat_message_failed"
  | "chat_message_blocked"
  | "chat_attachment_upload_started"
  | "chat_attachment_upload_failed"
  | "chat_presence_connected"
  | "chat_typing_started"
  | "chat_typing_stopped"
  | "chat_read_marked"
  | "chat_unread_updated"
  | "chat_paid_gd_gate_viewed"
  | "chat_purchase_cta_clicked";

export type ChatTelemetryAdminMetric =
  | "activeChatUsers"
  | "sendAttempts"
  | "successfulSends"
  | "blockedSends"
  | "failedSends"
  | "paidGdGateViews"
  | "purchaseCtaClicks"
  | "attachmentAttempts"
  | "moderationBlocks";

export type ChatTelemetryMapping = {
  eventName: ChatTelemetryEventName;
  aliases: string[];
  adminMetric: ChatTelemetryAdminMetric;
  normalizedAction: "chat_thread_opened" | "chat_message_sent" | "chat_message_failed";
  personMetricIds: PersonMetricId[];
  userLevelMetric: boolean;
  creatorLevelMetric: boolean;
  inTelemetryCatalog: boolean;
  eventEnvelopeMapped: boolean;
  transcriptSourceConnected: boolean;
  adminDebugVisible: boolean;
  scoreDimensionsAffected: PublicBetaHealthDimension[];
  sourceRoute: string;
  sourceSurface: string;
  messageContentAllowedInSummary: false;
};

export type ChatTelemetrySourceValidation = {
  telemetryCatalogComplete: boolean;
  eventEnvelopePersonMetricMapped: boolean;
  adminSummaryNoRawMessageContent: boolean;
  transcriptTruthGuarded: boolean;
  blockedFailedAttemptsAdminVisible: boolean;
  userLevelChatMetricsVisible: boolean;
  creatorLevelChatMetricsVisible: boolean;
  scoreCoverageMapped: boolean;
  failures: string[];
};

export const CHAT_ADMIN_SUMMARY_METRICS = [
  "activeChatUsers",
  "sendAttempts",
  "successfulSends",
  "blockedSends",
  "failedSends",
  "paidGdGateViews",
  "purchaseCtaClicks",
  "attachmentAttempts",
  "moderationBlocks",
] as const satisfies readonly ChatTelemetryAdminMetric[];

export const CHAT_TRANSCRIPT_TRUTH_POLICY = {
  broadAdminSummaryIncludesMessageContent: false,
  transcriptDefaultOpen: false,
  transcriptSummarySource: "analytics_event_facts+creator_message_threads",
  drilldownRequiresPermissionGuard: true,
  sourceRoute: "src/app/api/admin/moderation/threads/[threadId]/route.ts",
  sourceHelper: "src/lib/server/admin-moderation.ts",
  rawMessageDumpPolicy: "permission_guarded_drilldown_only",
} as const;

const CHAT_TELEMETRY_EVENT_FAMILY_INPUTS = [
  {
    eventName: "chat_surface_viewed",
    aliases: [],
    adminMetric: "activeChatUsers",
    normalizedAction: "chat_thread_opened",
    personMetricIds: ["chat_actions"],
    userLevelMetric: true,
    creatorLevelMetric: false,
    sourceRoute: "src/components/Chat/ChatExperience.tsx",
    sourceSurface: "/dashboard/chat",
  },
  {
    eventName: "chat_thread_list_loaded",
    aliases: [],
    adminMetric: "activeChatUsers",
    normalizedAction: "chat_thread_opened",
    personMetricIds: ["chat_actions"],
    userLevelMetric: true,
    creatorLevelMetric: false,
    sourceRoute: "src/components/Chat/ChatExperience.tsx",
    sourceSurface: "/dashboard/chat",
  },
  {
    eventName: "chat_thread_opened",
    aliases: ["creator_private_chat_opened"],
    adminMetric: "activeChatUsers",
    normalizedAction: "chat_thread_opened",
    personMetricIds: ["chat_actions"],
    userLevelMetric: true,
    creatorLevelMetric: true,
    sourceRoute: "src/components/Chat/ChatExperience.tsx",
    sourceSurface: "/dashboard/chat",
  },
  {
    eventName: "chat_compose_sheet_opened",
    aliases: ["chat_new_message_sheet_opened"],
    adminMetric: "activeChatUsers",
    normalizedAction: "chat_thread_opened",
    personMetricIds: ["chat_actions"],
    userLevelMetric: true,
    creatorLevelMetric: false,
    sourceRoute: "src/components/Chat/ChatExperience.tsx",
    sourceSurface: "/dashboard/chat",
  },
  {
    eventName: "chat_creator_selected",
    aliases: ["chat_new_message_sheet_creator_selected"],
    adminMetric: "activeChatUsers",
    normalizedAction: "chat_thread_opened",
    personMetricIds: ["chat_actions"],
    userLevelMetric: true,
    creatorLevelMetric: true,
    sourceRoute: "src/components/Chat/ChatExperience.tsx",
    sourceSurface: "/dashboard/chat",
  },
  {
    eventName: "chat_message_send_attempted",
    aliases: [],
    adminMetric: "sendAttempts",
    normalizedAction: "chat_message_sent",
    personMetricIds: ["chat_actions"],
    userLevelMetric: true,
    creatorLevelMetric: true,
    sourceRoute: "src/components/Chat/ChatExperience.tsx",
    sourceSurface: "/dashboard/chat",
  },
  {
    eventName: "chat_message_sent",
    aliases: ["creator_message_sent", "creator_media_sent"],
    adminMetric: "successfulSends",
    normalizedAction: "chat_message_sent",
    personMetricIds: ["chat_actions"],
    userLevelMetric: true,
    creatorLevelMetric: true,
    sourceRoute: "src/components/Chat/ChatExperience.tsx",
    sourceSurface: "/dashboard/chat",
  },
  {
    eventName: "chat_message_failed",
    aliases: ["chat_message_send_failed", "chat_message_reconcile_failed"],
    adminMetric: "failedSends",
    normalizedAction: "chat_message_failed",
    personMetricIds: ["chat_actions"],
    userLevelMetric: true,
    creatorLevelMetric: true,
    sourceRoute: "src/components/Chat/ChatExperience.tsx",
    sourceSurface: "/dashboard/chat",
  },
  {
    eventName: "chat_message_blocked",
    aliases: ["chat_send_blocked", "chat_moderation_blocked"],
    adminMetric: "blockedSends",
    normalizedAction: "chat_message_failed",
    personMetricIds: ["chat_actions"],
    userLevelMetric: true,
    creatorLevelMetric: true,
    sourceRoute: "src/lib/server/chat.ts",
    sourceSurface: "/dashboard/chat",
  },
  {
    eventName: "chat_attachment_upload_started",
    aliases: [],
    adminMetric: "attachmentAttempts",
    normalizedAction: "chat_message_sent",
    personMetricIds: ["chat_actions"],
    userLevelMetric: true,
    creatorLevelMetric: true,
    sourceRoute: "src/components/Chat/ChatExperience.tsx",
    sourceSurface: "/dashboard/chat",
  },
  {
    eventName: "chat_attachment_upload_failed",
    aliases: ["chat_media_upload_blocked", "chat_media_file_rejected_size"],
    adminMetric: "attachmentAttempts",
    normalizedAction: "chat_message_failed",
    personMetricIds: ["chat_actions"],
    userLevelMetric: true,
    creatorLevelMetric: true,
    sourceRoute: "src/components/Chat/ChatExperience.tsx",
    sourceSurface: "/dashboard/chat",
  },
  {
    eventName: "chat_presence_connected",
    aliases: [],
    adminMetric: "activeChatUsers",
    normalizedAction: "chat_thread_opened",
    personMetricIds: ["chat_actions"],
    userLevelMetric: true,
    creatorLevelMetric: false,
    sourceRoute: "src/lib/chat/chat-presence-contract.ts",
    sourceSurface: "/dashboard/chat",
  },
  {
    eventName: "chat_typing_started",
    aliases: [],
    adminMetric: "activeChatUsers",
    normalizedAction: "chat_thread_opened",
    personMetricIds: ["chat_actions"],
    userLevelMetric: true,
    creatorLevelMetric: false,
    sourceRoute: "src/lib/chat/chat-typing-controller.ts",
    sourceSurface: "/dashboard/chat",
  },
  {
    eventName: "chat_typing_stopped",
    aliases: [],
    adminMetric: "activeChatUsers",
    normalizedAction: "chat_thread_opened",
    personMetricIds: ["chat_actions"],
    userLevelMetric: true,
    creatorLevelMetric: false,
    sourceRoute: "src/lib/chat/chat-typing-controller.ts",
    sourceSurface: "/dashboard/chat",
  },
  {
    eventName: "chat_read_marked",
    aliases: ["chat_thread_read_marked"],
    adminMetric: "activeChatUsers",
    normalizedAction: "chat_thread_opened",
    personMetricIds: ["chat_actions"],
    userLevelMetric: true,
    creatorLevelMetric: true,
    sourceRoute: "src/components/Chat/ChatExperience.tsx",
    sourceSurface: "/dashboard/chat",
  },
  {
    eventName: "chat_unread_updated",
    aliases: ["chat_thread_unread_updated"],
    adminMetric: "activeChatUsers",
    normalizedAction: "chat_thread_opened",
    personMetricIds: ["chat_actions"],
    userLevelMetric: true,
    creatorLevelMetric: true,
    sourceRoute: "src/components/Chat/ChatExperience.tsx",
    sourceSurface: "/dashboard/chat",
  },
  {
    eventName: "chat_paid_gd_gate_viewed",
    aliases: ["chat_insufficient_paid_gd_viewed"],
    adminMetric: "paidGdGateViews",
    normalizedAction: "chat_message_failed",
    personMetricIds: ["chat_actions"],
    userLevelMetric: true,
    creatorLevelMetric: true,
    sourceRoute: "src/components/Chat/ChatExperience.tsx",
    sourceSurface: "/dashboard/chat",
  },
  {
    eventName: "chat_purchase_cta_clicked",
    aliases: ["chat_paid_gd_gate_primary_clicked"],
    adminMetric: "purchaseCtaClicks",
    normalizedAction: "chat_message_sent",
    personMetricIds: ["chat_actions"],
    userLevelMetric: true,
    creatorLevelMetric: true,
    sourceRoute: "src/components/Chat/ChatExperience.tsx",
    sourceSurface: "/dashboard/chat",
  },
] as const satisfies ReadonlyArray<Omit<
  ChatTelemetryMapping,
  | "inTelemetryCatalog"
  | "eventEnvelopeMapped"
  | "transcriptSourceConnected"
  | "adminDebugVisible"
  | "scoreDimensionsAffected"
  | "messageContentAllowedInSummary"
>>;

export const CHAT_TELEMETRY_EVENT_FAMILIES: ChatTelemetryMapping[] = CHAT_TELEMETRY_EVENT_FAMILY_INPUTS.map((mapping): ChatTelemetryMapping => ({
  ...mapping,
  inTelemetryCatalog: TELEMETRY_EVENT_NAME_SET.has(mapping.eventName),
  eventEnvelopeMapped: true,
  transcriptSourceConnected: true,
  adminDebugVisible: true,
  scoreDimensionsAffected: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "regressionRisk"],
  messageContentAllowedInSummary: false,
}));

export function buildChatTelemetryEventMapping(eventName: ChatTelemetryEventName): ChatTelemetryMapping {
  const canonicalEventName = normalizeTelemetryEventName(eventName) as ChatTelemetryEventName;
  return CHAT_TELEMETRY_EVENT_FAMILIES.find((family) => family.eventName === canonicalEventName)
    ?? CHAT_TELEMETRY_EVENT_FAMILIES.find((family) => family.aliases.includes(eventName))
    ?? {
      ...CHAT_TELEMETRY_EVENT_FAMILIES[0],
      eventName,
      aliases: [],
      adminMetric: "activeChatUsers",
      normalizedAction: "chat_thread_opened",
      personMetricIds: [],
      inTelemetryCatalog: false,
      eventEnvelopeMapped: false,
      transcriptSourceConnected: false,
      adminDebugVisible: false,
      scoreDimensionsAffected: [],
    };
}

export function buildChatAdminTelemetrySummaryLane(input: {
  activeChatUsers?: number;
  sendAttempts?: number;
  successfulSends?: number;
  blockedSends?: number;
  failedSends?: number;
  paidGdGateViews?: number;
  purchaseCtaClicks?: number;
  attachmentAttempts?: number;
  moderationBlocks?: number;
} = {}) {
  const metric = (key: ChatTelemetryAdminMetric) => Math.max(0, Number(input[key] ?? 0) || 0);
  return {
    label: "Chat telemetry/admin truth",
    sourceOfTruth: "src/lib/chat/chat-telemetry-contract.ts",
    eventFactSource: "analytics_event_facts",
    threadSource: "creator_message_threads",
    transcriptTruth: "guarded_drilldown" as const,
    rawMessageContentDefault: false as const,
    transcriptDefaultOpen: false as const,
    permissionGuardRequired: true as const,
    blockedFailedVisible: true as const,
    userLevelMetricsVisible: true as const,
    creatorLevelMetricsVisible: true as const,
    metrics: {
      activeChatUsers: metric("activeChatUsers"),
      sendAttempts: metric("sendAttempts"),
      successfulSends: metric("successfulSends"),
      blockedSends: metric("blockedSends"),
      failedSends: metric("failedSends"),
      paidGdGateViews: metric("paidGdGateViews"),
      purchaseCtaClicks: metric("purchaseCtaClicks"),
      attachmentAttempts: metric("attachmentAttempts"),
      moderationBlocks: metric("moderationBlocks"),
    },
    sourceMissing: false as const,
    missingSource: null as string | null,
    drilldownTarget: "/admin/moderation",
  };
}

export function validateChatTelemetryAdminTruth(input: ChatTelemetrySourceValidation) {
  const failures: string[] = [];
  if (!input.telemetryCatalogComplete) failures.push("chat events are not in telemetry catalog.");
  if (!input.eventEnvelopePersonMetricMapped) failures.push("chat events lack event envelope/person metrics mapping.");
  if (!input.adminSummaryNoRawMessageContent) failures.push("admin chat summary exposes raw message content by default.");
  if (!input.transcriptTruthGuarded) failures.push("transcript tracking claims connected without source.");
  if (!input.blockedFailedAttemptsAdminVisible) failures.push("blocked/failed attempts are not visible to admin/debug.");
  if (!input.userLevelChatMetricsVisible) failures.push("user-level chat metrics missing.");
  if (!input.creatorLevelChatMetricsVisible) failures.push("creator-level chat metrics missing.");
  if (!input.scoreCoverageMapped) failures.push("score coverage missing.");
  return [...new Set([...failures, ...input.failures])];
}
