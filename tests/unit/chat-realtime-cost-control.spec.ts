import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  CHAT_MESSAGE_LISTENER_LIMIT,
  CHAT_REALTIME_CONTRACT,
  CHAT_REALTIME_PROPAGATION_STATES,
  CHAT_THREAD_LISTENER_LIMIT,
  buildChatRealtimeDebugLane,
  validateChatRealtimeSource,
} from "@/lib/chat/chat-realtime-contract";
import { resolveChatRequestedThreadActorTransition } from "@/lib/chat-realtime";
import {
  CHAT_REALTIME_TELEMETRY_EVENTS,
  buildChatRealtimeTelemetryPayload,
  validateChatRealtimeTelemetryContract,
} from "@/lib/chat/chat-realtime-telemetry";
import {
  buildChatRealtimeCostControlReport,
  validateChatRealtimeCostControlReport,
} from "../../scripts/agent/validate-chat-realtime-cost-control";

const REQUIRED_EVENTS = [
  "chat_realtime_listener_attached",
  "chat_realtime_listener_detached",
  "chat_realtime_listener_error",
  "chat_message_send_attempted",
  "chat_message_api_accepted",
  "chat_message_optimistic_rendered",
  "chat_message_listener_observed",
  "chat_message_reconciled",
  "chat_message_reconcile_failed",
  "chat_thread_unread_updated",
  "chat_thread_read_marked",
] as const;

describe("chat realtime cost control", () => {
  it("defines bounded listener scopes, cleanup, propagation states, and quiet cost controls", () => {
    expect(CHAT_THREAD_LISTENER_LIMIT).toBeGreaterThan(0);
    expect(CHAT_THREAD_LISTENER_LIMIT).toBeLessThanOrEqual(250);
    expect(CHAT_MESSAGE_LISTENER_LIMIT).toBeGreaterThan(0);
    expect(CHAT_MESSAGE_LISTENER_LIMIT).toBeLessThanOrEqual(250);

    expect(CHAT_REALTIME_PROPAGATION_STATES).toEqual([
      "send_attempted",
      "send_api_accepted",
      "optimistic_rendered",
      "listener_observed",
      "reconciled",
      "failed",
      "stale",
    ]);
    expect(CHAT_REALTIME_CONTRACT.threadListListener.scope).toBe("viewer_scoped_thread_list");
    expect(CHAT_REALTIME_CONTRACT.selectedThreadMessageListener.scope).toBe("selected_thread_messages_only");
    expect(CHAT_REALTIME_CONTRACT.selectedThreadMessageListener.forbidsBroadAllMessageListener).toBe(true);
    expect(CHAT_REALTIME_CONTRACT.cleanup.detachOnUnmount).toBe(true);
    expect(CHAT_REALTIME_CONTRACT.cleanup.detachOnThreadSwitch).toBe(true);
    expect(CHAT_REALTIME_CONTRACT.costControls.selectedThreadOnlyMessageListener).toBe(true);
    expect(CHAT_REALTIME_CONTRACT.costControls.noBroadAllMessageListener).toBe(true);

    expect(buildChatRealtimeDebugLane()).toMatchObject({
      lane: "Chat realtime",
      listenersScoped: true,
      detachVerified: true,
      openListenerRisk: "bounded",
      costReadiness: "source_ready",
    });
  });

  it("registers chat propagation telemetry as feature, identity, consent, and debug aware", () => {
    expect(CHAT_REALTIME_TELEMETRY_EVENTS.map((event) => event.eventName)).toEqual([...REQUIRED_EVENTS]);
    expect(validateChatRealtimeTelemetryContract()).toEqual([]);
    expect(CHAT_REALTIME_TELEMETRY_EVENTS.every((event) => event.featureId === "support")).toBe(true);
    expect(CHAT_REALTIME_TELEMETRY_EVENTS.every((event) => event.identityAware)).toBe(true);
    expect(CHAT_REALTIME_TELEMETRY_EVENTS.every((event) => event.consentAware)).toBe(true);
    expect(CHAT_REALTIME_TELEMETRY_EVENTS.every((event) => event.debugVisible)).toBe(true);

    expect(buildChatRealtimeTelemetryPayload({
      eventName: "chat_message_reconciled",
      userId: "user_1",
      threadId: "thread_1",
      messageId: "message_1",
      listenerScope: "selected_thread_messages_only",
      propagationState: "reconciled",
      sourceComponent: "chat_thread_composer",
    })).toMatchObject({
      event_name: "chat_message_reconciled",
      feature_id: "support",
      user_id_present: true,
      thread_id_present: true,
      listener_scope: "selected_thread_messages_only",
      propagation_state: "reconciled",
      debug_lane: "Chat realtime",
    });
  });

  it("keeps ChatExperience source bounded to selected thread listeners with cleanup", () => {
    const source = readFileSync("src/components/Chat/ChatExperience.tsx", "utf8");
    const validation = validateChatRealtimeSource(source);

    expect(validation.failures).toEqual([]);
    expect(validation.threadListenerBounded).toBe(true);
    expect(validation.messageListenerSelectedThreadOnly).toBe(true);
    expect(validation.messageListenerBounded).toBe(true);
    expect(validation.detachOnUnmount).toBe(true);
    expect(validation.detachOnThreadSwitch).toBe(true);
    expect(validation.hasRealtimeErrorDebugVisibility).toBe(true);
  });

  it("isolates drafts, loads, sends, and reconciliation by thread and signed-in actor", () => {
    const source = readFileSync("src/components/Chat/ChatExperience.tsx", "utf8");

    expect(source).toContain("const activeSendKey = buildChatActorThreadKey(sendUserId, sendThreadId)");
    expect(source).toContain("activeChatSendKeysRef.current.has(activeSendKey)");
    expect(source).toContain("chatStateOwnerUserId !== user.uid");
    expect(source).toContain("chatUserIdentityRef.current !== requestUserId");
    expect(source).toContain("chatUserIdentityRef.current === sendUserId");
    expect(source).toContain("setComposerText(\"\")");
    expect(source).toContain("setComposerFile(null)");
    expect(source).toContain("activeChatSendKeysRef.current.delete(activeSendKey)");
    expect(source).toContain("resolveChatRequestedThreadActorTransition");
    expect(source).toContain("blockedRequestedThreadIdRef.current = requestedThreadTransition.blockedRequestedThreadId");
    expect(source).toContain("blockedRequestedThreadIdRef.current === requestedThreadId");
    expect(source).toContain("chatStateOwnerUserId !== chatUserId");
    expect(source).toContain("if (!user || !userProfile || chatStateOwnerUserId !== user.uid)");
  });

  it("retains an initial deep-link but discards it across authenticated actor changes", () => {
    expect(resolveChatRequestedThreadActorTransition({
      previousOwnerUserId: null,
      nextUserId: "viewer_b",
      requestedThreadId: "thread_from_login_link",
      blockedRequestedThreadId: null,
    })).toEqual({
      blockedRequestedThreadId: null,
      retainedRequestedThreadId: "thread_from_login_link",
    });

    const signedOut = resolveChatRequestedThreadActorTransition({
      previousOwnerUserId: "viewer_a",
      nextUserId: null,
      requestedThreadId: "viewer_a_thread",
      blockedRequestedThreadId: null,
    });
    expect(signedOut).toEqual({
      blockedRequestedThreadId: "viewer_a_thread",
      retainedRequestedThreadId: null,
    });
    expect(resolveChatRequestedThreadActorTransition({
      previousOwnerUserId: null,
      nextUserId: "viewer_b",
      requestedThreadId: "viewer_a_thread",
      blockedRequestedThreadId: signedOut.blockedRequestedThreadId,
    })).toEqual({
      blockedRequestedThreadId: "viewer_a_thread",
      retainedRequestedThreadId: null,
    });
    expect(resolveChatRequestedThreadActorTransition({
      previousOwnerUserId: "viewer_a",
      nextUserId: "viewer_b",
      requestedThreadId: "viewer_a_thread",
      blockedRequestedThreadId: null,
    }).retainedRequestedThreadId).toBeNull();
  });

  it("builds a report with score impact and fails unbounded listener regressions", () => {
    const report = buildChatRealtimeCostControlReport({
      chatExperienceSource: readFileSync("src/components/Chat/ChatExperience.tsx", "utf8"),
      changedFiles: [
        "src/lib/chat/chat-realtime-contract.ts",
        "src/lib/chat/chat-realtime-telemetry.ts",
        "src/components/Chat/ChatExperience.tsx",
        "scripts/agent/validate-chat-realtime-cost-control.ts",
        "tests/unit/chat-realtime-cost-control.spec.ts",
        "package.json",
      ],
      currentHead: "HEAD",
      generatedAtUtc: "2026-05-23T00:00:00.000Z",
    });

    expect(report.debugLane).toMatchObject({
      label: "Chat realtime",
      listenersScoped: true,
      detachVerified: true,
      propagationStates: [...CHAT_REALTIME_PROPAGATION_STATES],
      openListenerRisk: "bounded",
      costReadiness: "source_ready",
    });
    expect(Object.keys(report.scoreImpactByDimension)).toEqual([
      "sourceHealth",
      "runtimeHealth",
      "evidenceCompleteness",
      "freshness",
      "costRisk",
      "regressionRisk",
    ]);
    expect(validateChatRealtimeCostControlReport(report)).toEqual([]);

    const badReport = buildChatRealtimeCostControlReport({
      chatExperienceSource: "onSnapshot(collection(db, CHAT_COLLECTIONS.messages), () => undefined)",
      changedFiles: ["src/components/BottomNav.tsx"],
    });
    expect(validateChatRealtimeCostControlReport(badReport)).toEqual(expect.arrayContaining([
      "chat message listener must be selected-thread scoped.",
      "chat message listener must use the configured document limit.",
      "chat UI redesign or forbidden surface file changed.",
    ]));
  });
});
