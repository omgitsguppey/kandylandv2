import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  kandyDropsMswScenarios,
  type KandyDropsMswScenarioName,
} from "../mocks/scenarios";
import {
  kandyDropsMswScenarioNames,
  resetKandyDropsMockScenario,
  server,
  setKandyDropsMockScenario,
} from "../mocks/server";

const apiOrigin = "https://msw.kandydrops.test";

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiOrigin}${path}`, init);
  return await response.json() as T;
}

describe("KandyDrops MSW user-flow scenarios", () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
  });

  afterEach(() => {
    server.resetHandlers();
    resetKandyDropsMockScenario();
  });

  afterAll(() => {
    server.close();
  });

  it("registers every required deterministic scenario name", () => {
    const requiredScenarioNames: KandyDropsMswScenarioName[] = [
      "guestBrowsingDrops",
      "loggedInEnoughGumDrops",
      "loggedInInsufficientGumDrops",
      "paidRewardBalanceSplit",
      "creatorProfileWithDropsAndExperiences",
      "notificationInboxReadStates",
      "chatThreadWithPaidBalance",
      "supportTicketBugReportStates",
    ];

    expect(kandyDropsMswScenarioNames).toEqual(requiredScenarioNames);
    for (const scenarioName of requiredScenarioNames) {
      expect(kandyDropsMswScenarios[scenarioName].name).toMatch(/^[a-z0-9-]+$/);
      expect(kandyDropsMswScenarios[scenarioName].drops.length).toBeGreaterThan(0);
    }
  });

  it("serves guest Drop browsing without authenticated profile access", async () => {
    setKandyDropsMockScenario("guestBrowsingDrops");

    const dropsResponse = await fetch(`${apiOrigin}/api/drops`);
    const dropsBody = await dropsResponse.json() as { drops: Array<{ id: string; unlockCost: number }> };

    expect(dropsResponse.status).toBe(200);
    expect(dropsBody.drops.map((drop) => drop.id)).toEqual(["drop_affordable", "drop_refill_needed"]);
    expect(dropsBody.drops[0]?.unlockCost).toBe(500);

    const profileResponse = await fetch(`${apiOrigin}/api/user/profile`);
    expect(profileResponse.status).toBe(401);
  });

  it("models enough, insufficient, and paid/reward GumDrops balance states", async () => {
    setKandyDropsMockScenario("loggedInEnoughGumDrops");
    const enoughProfile = await json<{ profile: { gumDropsBalance: number; gumDropsPurchasedBalance: number } }>("/api/user/profile");
    expect(enoughProfile.profile.gumDropsBalance).toBe(2_500);
    expect(enoughProfile.profile.gumDropsPurchasedBalance).toBe(2_500);

    const unlockResponse = await fetch(`${apiOrigin}/api/drops/unlock`, {
      method: "POST",
      body: JSON.stringify({ dropId: "drop_affordable" }),
    });
    expect(unlockResponse.status).toBe(200);
    await expect(unlockResponse.json()).resolves.toMatchObject({
      success: true,
      dropId: "drop_affordable",
      gumDropsBalance: 2_000,
    });

    setKandyDropsMockScenario("loggedInInsufficientGumDrops");
    const refillResponse = await fetch(`${apiOrigin}/api/drops/unlock`, {
      method: "POST",
      body: JSON.stringify({ dropId: "drop_affordable" }),
    });
    expect(refillResponse.status).toBe(402);
    await expect(refillResponse.json()).resolves.toMatchObject({
      errorCode: "insufficient_gumdrops",
      currentBalance: 125,
      shortfallGd: 375,
    });

    setKandyDropsMockScenario("paidRewardBalanceSplit");
    const splitProfile = await json<{
      profile: {
        gumDropsBalance: number;
        gumDropsPurchasedBalance: number;
        gumDropsRewardBalance: number;
      };
    }>("/api/user/profile");
    expect(splitProfile.profile).toMatchObject({
      gumDropsBalance: 1_500,
      gumDropsPurchasedBalance: 1_000,
      gumDropsRewardBalance: 500,
    });
  });

  it("serves creator profile Drops and enabled Experiences settings", async () => {
    setKandyDropsMockScenario("creatorProfileWithDropsAndExperiences");

    const body = await json<{
      success: boolean;
      creator: {
        username: string;
        creatorSettings: {
          messagingEnabled: boolean;
          subscriptionsEnabled: boolean;
          bookingsEnabled: boolean;
          customRequestsEnabled: boolean;
        };
      };
      drops: Array<{ id: string; creatorId: string }>;
    }>("/api/creators/caramelkandy");

    expect(body.success).toBe(true);
    expect(body.creator.username).toBe("caramelkandy");
    expect(body.creator.creatorSettings).toMatchObject({
      messagingEnabled: true,
      subscriptionsEnabled: true,
      bookingsEnabled: true,
      customRequestsEnabled: true,
    });
    expect(body.drops.map((drop) => drop.creatorId)).toEqual(["creator_caramel", "creator_caramel"]);
  });

  it("serves notification unread/read states and marks notifications read", async () => {
    setKandyDropsMockScenario("notificationInboxReadStates");

    const inbox = await json<{
      notifications: Array<{ id: string; readBy: string[] }>;
    }>("/api/notifications");
    expect(inbox.notifications).toHaveLength(2);
    expect(inbox.notifications.find((note) => note.id === "notification_unread_drop")?.readBy).toEqual([]);
    expect(inbox.notifications.find((note) => note.id === "notification_read_creator")?.readBy).toContain("user_enough_gumdrops");

    const markResponse = await fetch(`${apiOrigin}/api/notifications`, {
      method: "PUT",
      body: JSON.stringify({ notificationIds: ["notification_unread_drop"] }),
    });
    expect(markResponse.status).toBe(200);
    await expect(markResponse.json()).resolves.toMatchObject({
      successCount: 1,
      failedCount: 0,
      notificationIds: ["notification_unread_drop"],
    });

    const refreshedInbox = await json<{
      notifications: Array<{ id: string; readBy: string[] }>;
    }>("/api/notifications");
    expect(refreshedInbox.notifications.find((note) => note.id === "notification_unread_drop")?.readBy).toContain("user_enough_gumdrops");
  });

  it("serves paid-balance chat thread detail and appends sent messages", async () => {
    setKandyDropsMockScenario("chatThreadWithPaidBalance");

    const threads = await json<{
      threads: Array<{ id: string; unreadCountForUser: number }>;
    }>("/api/chat/threads");
    const threadId = threads.threads[0]?.id;
    expect(threadId).toBe("creator_creator_caramel__user_user_enough_gumdrops");
    expect(threads.threads[0]?.unreadCountForUser).toBe(1);

    const detail = await json<{
      threadExists: boolean;
      messages: Array<{ id: string }>;
      pricing: { purchasedBalanceGd: number; textPriceGd: number };
    }>(`/api/chat/threads/${threadId}`);
    expect(detail.threadExists).toBe(true);
    expect(detail.messages).toHaveLength(2);
    expect(detail.pricing).toMatchObject({
      purchasedBalanceGd: 2_500,
      textPriceGd: 25,
    });

    const sendResponse = await fetch(`${apiOrigin}/api/chat/threads/${threadId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        text: "Testing the paid chat path.",
        messageKind: "text",
      }),
    });
    expect(sendResponse.status).toBe(201);
    await expect(sendResponse.json()).resolves.toMatchObject({
      success: true,
      message: {
        threadId,
        senderRole: "user",
        costGd: 25,
      },
      pricing: {
        purchasedBalanceGd: 2_475,
      },
    });
  });

  it("serves support ticket and guest bug-report submission states", async () => {
    setKandyDropsMockScenario("supportTicketBugReportStates");

    const supportList = await json<{
      threads: Array<{ id: string; category: string; status: string }>;
    }>("/api/support/threads");
    expect(supportList.threads[0]).toMatchObject({
      id: "support_thread_bug_report",
      category: "bug",
      status: "waiting_on_support",
    });

    const detail = await json<{
      thread: { id: string };
      messages: Array<{ body: string }>;
    }>("/api/support/threads/support_thread_bug_report");
    expect(detail.thread.id).toBe("support_thread_bug_report");
    expect(detail.messages[0]?.body).toContain("Drop preview CTA");

    const createResponse = await fetch(`${apiOrigin}/api/support/threads`, {
      method: "POST",
      body: JSON.stringify({
        subject: "Bug report from wallet",
        category: "bug",
        message: "The wallet confirmation did not update the visible balance.",
        sourcePath: "/dashboard",
      }),
    });
    expect(createResponse.status).toBe(200);
    await expect(createResponse.json()).resolves.toMatchObject({
      success: true,
      thread: {
        category: "bug",
        status: "waiting_on_support",
      },
    });

    setKandyDropsMockScenario("guestBrowsingDrops");
    const guestResponse = await fetch(`${apiOrigin}/api/support/threads/guest`, {
      method: "POST",
      body: JSON.stringify({
        email: "guest@example.com",
        subject: "Bug report from guest",
        category: "bug",
        message: "The public Drop page did not open the preview.",
        sourcePath: "/drops",
      }),
    });
    expect(guestResponse.status).toBe(200);
    await expect(guestResponse.json()).resolves.toMatchObject({
      success: true,
      email: "guest@example.com",
    });
  });
});
