import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  CHAT_PRESENCE_CONTRACT,
  CHAT_PRESENCE_TELEMETRY_EVENTS,
  buildChatPresenceDebugLane,
  buildChatPresencePayload,
  isChatPresenceFresh,
  validateChatPresenceSource,
} from "@/lib/chat/chat-presence-contract";
import {
  createChatTypingControllerState,
  resolveChatTypingIntent,
} from "@/lib/chat/chat-typing-controller";
import {
  buildChatPresenceTypingReport,
  validateChatPresenceTypingReport,
} from "../../scripts/agent/validate-chat-presence-typing";

describe("chat presence and typing hardening", () => {
  it("defines ephemeral RTDB presence, typing expiry, disconnect cleanup, throttle, and debug status", () => {
    expect(CHAT_PRESENCE_CONTRACT.storage.root).toBe("chat_presence");
    expect(CHAT_PRESENCE_CONTRACT.storage.presencePathPattern).toBe("chat_presence/{creatorId}/{userId}/{uid}");
    expect(CHAT_PRESENCE_CONTRACT.payloadFields).toEqual(["typing", "activeAt", "role", "threadId", "userId"]);
    expect(CHAT_PRESENCE_CONTRACT.cleanup.onDisconnectRemove).toBe(true);
    expect(CHAT_PRESENCE_CONTRACT.typing.writeThrottleMs).toBeGreaterThanOrEqual(3000);
    expect(CHAT_PRESENCE_CONTRACT.typing.stopTimeoutMs).toBeGreaterThanOrEqual(3000);
    expect(CHAT_PRESENCE_CONTRACT.typing.maxStaleTypingMs).toBeGreaterThan(CHAT_PRESENCE_CONTRACT.typing.stopTimeoutMs);
    expect(CHAT_PRESENCE_CONTRACT.costControls.noDurableTypingMessages).toBe(true);

    expect(buildChatPresenceDebugLane()).toMatchObject({
      lane: "Chat presence/typing",
      onDisconnectAttached: true,
      writeThrottleActive: true,
      staleTypingCleanupActive: true,
      costRisk: "bounded",
    });
  });

  it("normalizes presence payloads and treats stale typing as inactive", () => {
    const payload = buildChatPresencePayload({
      typing: true,
      activeAt: 1_000,
      role: "creator",
      threadId: "creator_creator1__user_user1",
      userId: "creator1",
      displayName: "Creator",
    });

    expect(payload).toEqual({
      typing: true,
      activeAt: 1_000,
      role: "creator",
      threadId: "creator_creator1__user_user1",
      userId: "creator1",
      displayName: "Creator",
    });
    expect(isChatPresenceFresh(payload, 1_000 + CHAT_PRESENCE_CONTRACT.presence.ttlMs - 1)).toBe(true);
    expect(isChatPresenceFresh(payload, 1_000 + CHAT_PRESENCE_CONTRACT.presence.ttlMs + 1)).toBe(false);
  });

  it("throttles typing start writes and forces stop writes on timeout, blur, send, close, and unmount", () => {
    const state = createChatTypingControllerState();

    const firstStart = resolveChatTypingIntent({
      state,
      nextTyping: true,
      nowMs: 10_000,
      reason: "input",
    });
    expect(firstStart.shouldWrite).toBe(true);
    expect(firstStart.telemetryEvent).toBe("chat_typing_started");

    const repeatedKeystroke = resolveChatTypingIntent({
      state,
      nextTyping: true,
      nowMs: 10_500,
      reason: "input",
    });
    expect(repeatedKeystroke.shouldWrite).toBe(false);
    expect(repeatedKeystroke.suppressedReason).toBe("typing_start_throttled");

    const stillTypingHeartbeat = resolveChatTypingIntent({
      state,
      nextTyping: true,
      nowMs: 14_000,
      reason: "input",
    });
    expect(stillTypingHeartbeat.shouldWrite).toBe(true);
    expect(stillTypingHeartbeat.telemetryEvent).toBeNull();

    for (const reason of ["timeout", "blur", "send", "close", "unmount"] as const) {
      state.currentTyping = true;
      const stop = resolveChatTypingIntent({
        state,
        nextTyping: false,
        nowMs: 20_000,
        reason,
      });
      expect(stop.shouldWrite).toBe(true);
      expect(stop.telemetryEvent).toBe("chat_typing_stopped");
      expect(stop.writePayload?.typing).toBe(false);
    }
  });

  it("registers sampled non-keystroke telemetry for presence and typing health", () => {
    expect(CHAT_PRESENCE_TELEMETRY_EVENTS.map((event) => event.eventName)).toEqual([
      "chat_typing_started",
      "chat_typing_stopped",
      "chat_presence_connected",
      "chat_presence_disconnected",
      "chat_presence_error",
    ]);
    expect(CHAT_PRESENCE_TELEMETRY_EVENTS.every((event) => event.sampled === true)).toBe(true);
    expect(CHAT_PRESENCE_TELEMETRY_EVENTS.every((event) => event.perKeystrokeAllowed === false)).toBe(true);
    expect(CHAT_PRESENCE_TELEMETRY_EVENTS.every((event) => event.debugVisible === true)).toBe(true);
  });

  it("validates ChatExperience source avoids per-keystroke writes and clears typing on lifecycle exits", () => {
    const source = readFileSync("src/components/Chat/ChatExperience.tsx", "utf8");
    const validation = validateChatPresenceSource(source);

    expect(validation.failures).toEqual([]);
    expect(validation.onDisconnectAttached).toBe(true);
    expect(validation.usesTypingController).toBe(true);
    expect(validation.noPerKeystrokeTypingWrites).toBe(true);
    expect(validation.timeoutStopsTyping).toBe(true);
    expect(validation.blurStopsTyping).toBe(true);
    expect(validation.sendStopsTyping).toBe(true);
    expect(validation.unmountStopsTyping).toBe(true);
    expect(validation.presenceErrorsDebugVisible).toBe(true);
  });

  it("builds a validator report with score impact and dirty file classification", () => {
    const report = buildChatPresenceTypingReport({
      chatExperienceSource: readFileSync("src/components/Chat/ChatExperience.tsx", "utf8"),
      changedFiles: [
        "agent/state/chat-presence-typing.generated.json",
        "docs/agent-truth/chat-presence-typing.md",
        "scripts/agent/validate-chat-presence-typing.ts",
        "src/components/Chat/ChatExperience.tsx",
        "src/lib/chat/chat-presence-contract.ts",
        "src/lib/chat/chat-typing-controller.ts",
        "src/lib/telemetry-catalog.ts",
        "tests/unit/chat-presence-typing.spec.ts",
        "package.json",
      ],
      currentHead: "HEAD",
      generatedAtUtc: "2026-05-23T00:00:00.000Z",
    });

    expect(Object.keys(report.scoreImpactByDimension)).toEqual([
      "sourceHealth",
      "runtimeHealth",
      "evidenceCompleteness",
      "freshness",
      "costRisk",
      "regressionRisk",
    ]);
    expect(report.debugLane).toMatchObject({
      label: "Chat presence/typing",
      onDisconnectAttached: true,
      writeThrottleActive: true,
      staleTypingCleanupActive: true,
      costRisk: "bounded",
    });
    expect(validateChatPresenceTypingReport(report)).toEqual([]);

    const badReport = buildChatPresenceTypingReport({
      chatExperienceSource: "const pushTypingState = () => set(ref(rtdb, path), { typing: true }); onChange={pushTypingState}",
      changedFiles: ["src/components/BottomNav.tsx"],
    });
    expect(validateChatPresenceTypingReport(badReport)).toEqual(expect.arrayContaining([
      "typing writes can fire every keystroke.",
      "onDisconnect cleanup is missing.",
      "chat UI broadly redesigned or forbidden surface changed.",
    ]));
  });
});
