import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";

export const CHAT_THREAD_LISTENER_LIMIT = 250;
export const CHAT_MESSAGE_LISTENER_LIMIT = 250;

export const CHAT_REALTIME_PROPAGATION_STATES = [
  "send_attempted",
  "send_api_accepted",
  "optimistic_rendered",
  "listener_observed",
  "reconciled",
  "failed",
  "stale",
] as const;

export type ChatRealtimePropagationState = typeof CHAT_REALTIME_PROPAGATION_STATES[number];

export type ChatRealtimeListenerScope =
  | "viewer_scoped_thread_list"
  | "selected_thread_messages_only"
  | "rtdb_presence_member";

export type ChatRealtimeCostReadiness = "source_ready" | "degraded" | "failed";

export type ChatRealtimeDebugLane = {
  lane: "Chat realtime";
  listenersScoped: boolean;
  threadListLimit: number;
  messageListenerLimit: number;
  selectedThreadOnlyMessageListener: boolean;
  detachVerified: boolean;
  propagationStates: readonly ChatRealtimePropagationState[];
  openListenerRisk: "bounded" | "unbounded";
  costReadiness: ChatRealtimeCostReadiness;
  debugEvidenceLane: "admin_debug_chat_realtime";
  scoreDimensionsAffected: readonly PublicBetaHealthDimension[];
};

export const CHAT_REALTIME_CONTRACT = {
  threadListListener: {
    scope: "viewer_scoped_thread_list",
    collection: "messageThreads",
    queryFieldByRole: {
      creator: "creatorId",
      user: "userId",
    },
    limit: CHAT_THREAD_LISTENER_LIMIT,
    purpose: "Keep the visible thread list and unread counts current for the signed-in viewer only.",
  },
  selectedThreadMessageListener: {
    scope: "selected_thread_messages_only",
    collection: "messages",
    requiredWhereField: "threadId",
    requiredViewerWhereFields: ["creatorId", "userId"],
    limit: CHAT_MESSAGE_LISTENER_LIMIT,
    forbidsBroadAllMessageListener: true,
    purpose: "Observe only the active thread transcript so message reconciliation does not fan out across all chat messages.",
  },
  cleanup: {
    detachOnUnmount: true,
    detachOnThreadSwitch: true,
    staleRequestGuard: true,
    reconnectMarksStale: true,
    onDisconnectPresenceCleanup: true,
  },
  readUnreadSync: {
    markReadAfterCounterpartMessageObserved: true,
    threadUnreadUpdatesFromThreadListener: true,
    noReadWriteFromRawMessageDump: true,
  },
  costControls: {
    maxOpenFirestoreListenersPerMountedChat: 2,
    maxOpenRtdbListenersPerSelectedThread: 1,
    maxThreadDocuments: CHAT_THREAD_LISTENER_LIMIT,
    maxMessageDocuments: CHAT_MESSAGE_LISTENER_LIMIT,
    selectedThreadOnlyMessageListener: true,
    noBroadAllMessageListener: true,
    explicitDetachOnUnmountAndThreadSwitch: true,
  },
  debugLane: {
    label: "Chat realtime",
    noRawMessageDumps: true,
    defaultVisible: true,
  },
} as const;

export type ChatRealtimeSourceValidation = {
  threadListenerBounded: boolean;
  messageListenerSelectedThreadOnly: boolean;
  messageListenerBounded: boolean;
  detachOnUnmount: boolean;
  detachOnThreadSwitch: boolean;
  hasRealtimeErrorDebugVisibility: boolean;
  hasNoBroadAllMessageListener: boolean;
  failures: string[];
};

export function buildChatRealtimeDebugLane(): ChatRealtimeDebugLane {
  return {
    lane: "Chat realtime",
    listenersScoped: true,
    threadListLimit: CHAT_THREAD_LISTENER_LIMIT,
    messageListenerLimit: CHAT_MESSAGE_LISTENER_LIMIT,
    selectedThreadOnlyMessageListener: true,
    detachVerified: true,
    propagationStates: CHAT_REALTIME_PROPAGATION_STATES,
    openListenerRisk: "bounded",
    costReadiness: "source_ready",
    debugEvidenceLane: "admin_debug_chat_realtime",
    scoreDimensionsAffected: ["runtimeHealth", "evidenceCompleteness", "costRisk", "regressionRisk"],
  };
}

function contains(source: string, pattern: RegExp) {
  return pattern.test(source.replace(/\s+/gu, " "));
}

export function validateChatRealtimeSource(source: string): ChatRealtimeSourceValidation {
  const normalized = source.replace(/\r\n/gu, "\n");
  const threadListenerBounded = contains(normalized,
    /collection\(db,\s*CHAT_COLLECTIONS\.threads\).*?where\(viewerField,\s*["']==["'],\s*user\.uid\).*?limit\(CHAT_THREAD_LISTENER_LIMIT\)/u);
  const messageListenerSelectedThreadOnly = contains(normalized,
    /collection\(db,\s*CHAT_COLLECTIONS\.messages\).*?where\(["']threadId["'],\s*["']==["'],\s*selectedThreadId\).*?where\(viewerField,\s*["']==["'],\s*user\.uid\)/u);
  const messageListenerBounded = contains(normalized,
    /collection\(db,\s*CHAT_COLLECTIONS\.messages\).*?limit\(CHAT_MESSAGE_LISTENER_LIMIT\)/u);
  const cleanupBlocks = [...normalized.matchAll(/return\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\};/gu)]
    .map((match) => match[1] ?? "");
  const detachOnUnmount = cleanupBlocks.some((body) => body.includes("observerControl.cleanup()") && body.includes("active = false"));
  const detachOnThreadSwitch = detachOnUnmount && /\[liveViewerRole,\s*selectedThreadId,\s*user,\s*userProfile\]/u.test(normalized);
  const hasRealtimeErrorDebugVisibility = normalized.includes("deferChatRealtimeIssue(")
    && normalized.includes("reportRealtimeIssue(");
  const hasNoBroadAllMessageListener = !contains(normalized,
    /onSnapshot\(\s*(?:collection\(db,\s*)?CHAT_COLLECTIONS\.messages/u);

  const failures: string[] = [];
  if (!threadListenerBounded) failures.push("chat thread listener must be viewer scoped and bounded.");
  if (!messageListenerSelectedThreadOnly) failures.push("chat message listener must be selected-thread scoped.");
  if (!messageListenerBounded) failures.push("chat message listener must use the configured document limit.");
  if (!detachOnUnmount) failures.push("chat realtime listeners must detach on unmount.");
  if (!detachOnThreadSwitch) failures.push("selected thread switch must detach the stale message listener.");
  if (!hasRealtimeErrorDebugVisibility) failures.push("listener errors must report through debug-visible realtime diagnostics.");
  if (!hasNoBroadAllMessageListener) failures.push("broad all-message listeners are forbidden.");

  return {
    threadListenerBounded,
    messageListenerSelectedThreadOnly,
    messageListenerBounded,
    detachOnUnmount,
    detachOnThreadSwitch,
    hasRealtimeErrorDebugVisibility,
    hasNoBroadAllMessageListener,
    failures,
  };
}
