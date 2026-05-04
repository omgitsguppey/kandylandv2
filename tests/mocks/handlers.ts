import { http, HttpResponse } from "msw";

import {
  cloneKandyDropsMswScenario,
  getKandyDropsMswScenario,
  KANDYDROPS_MSW_NOW,
  kandyDropsMswScenarios,
  type KandyDropsMswScenario,
  type KandyDropsMswScenarioName,
} from "./scenarios";

let activeScenario = getKandyDropsMswScenario("guestBrowsingDrops");

function json(body: unknown, init: ResponseInit = {}) {
  return HttpResponse.json(body, {
    ...init,
    headers: {
      "x-kandydrops-msw-scenario": activeScenario.name,
      ...(init.headers ?? {}),
    },
  });
}

function unauthorized() {
  return json({ error: "Unauthorized", source: "msw" }, { status: 401 });
}

function getProfile() {
  return activeScenario.profile;
}

function requireProfile() {
  const profile = getProfile();
  return activeScenario.authState === "authenticated" && profile ? profile : null;
}

async function readJsonBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getRequestIds(payload: Record<string, unknown>) {
  return [
    ...(typeof payload.notificationId === "string" ? [payload.notificationId.trim()] : []),
    ...(Array.isArray(payload.notificationIds)
      ? payload.notificationIds.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim())
      : []),
  ].filter(Boolean);
}

function threadIdParam(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nextId(prefix: string, count: number) {
  return `${prefix}_${String(count + 1).padStart(2, "0")}`;
}

export function setKandyDropsMockScenario(
  scenario: KandyDropsMswScenarioName | KandyDropsMswScenario,
) {
  activeScenario = typeof scenario === "string"
    ? getKandyDropsMswScenario(scenario)
    : cloneKandyDropsMswScenario(scenario);
  return activeScenario;
}

export function resetKandyDropsMockScenario() {
  activeScenario = getKandyDropsMswScenario("guestBrowsingDrops");
  return activeScenario;
}

export function getActiveKandyDropsMockScenario() {
  return cloneKandyDropsMswScenario(activeScenario);
}

export const kandyDropsMswScenarioNames = Object.keys(kandyDropsMswScenarios) as KandyDropsMswScenarioName[];

export const kandyDropsMockHandlers = [
  http.get("*/api/drops", () => json({
    drops: activeScenario.drops,
    nextCursor: null,
  })),

  http.post("*/api/drops/unlock", async ({ request }) => {
    const profile = requireProfile();
    if (!profile) {
      return unauthorized();
    }

    const payload = await readJsonBody(request);
    const dropId = typeof payload.dropId === "string" ? payload.dropId : "";
    const drop = activeScenario.drops.find((entry) => entry.id === dropId)
      ?? activeScenario.creatorDrops.find((entry) => entry.id === dropId)
      ?? null;

    if (!drop) {
      return json({ error: "Drop not found", errorCode: "drop_not_found" }, { status: 404 });
    }

    const balance = Number(profile.gumDropsBalance ?? 0);
    if (balance < drop.unlockCost) {
      return json({
        error: "Insufficient GumDrops",
        errorCode: "insufficient_gumdrops",
        requiredGd: drop.unlockCost,
        currentBalance: balance,
        shortfallGd: drop.unlockCost - balance,
      }, { status: 402 });
    }

    profile.gumDropsBalance = balance - drop.unlockCost;
    profile.unlockedContent = Array.from(new Set([...(profile.unlockedContent ?? []), drop.id]));
    activeScenario.balance.totalGd = profile.gumDropsBalance;

    return json({
      success: true,
      dropId: drop.id,
      gumDropsBalance: profile.gumDropsBalance,
      unlockedContent: profile.unlockedContent,
    });
  }),

  http.get("*/api/wallet/packages", () => json({
    packages: activeScenario.walletPackages,
    basePackageId: "msw-fixed",
    timestamp: KANDYDROPS_MSW_NOW,
  })),

  http.post("*/api/paypal/create", async ({ request }) => {
    const payload = await readJsonBody(request);
    const expectedDrops = Number(payload.expectedDrops ?? 0);
    return json({
      id: `msw_paypal_order_${Math.max(0, expectedDrops)}`,
      expectedDrops,
      source: "msw",
    });
  }),

  http.post("*/api/paypal/capture", async ({ request }) => {
    const profile = requireProfile();
    if (!profile) {
      return unauthorized();
    }

    const payload = await readJsonBody(request);
    const expectedDrops = Math.max(0, Number(payload.expectedDrops ?? 0));
    profile.gumDropsBalance += expectedDrops;
    profile.gumDropsPurchasedBalance = Number(profile.gumDropsPurchasedBalance ?? 0) + expectedDrops;
    activeScenario.balance.totalGd = profile.gumDropsBalance;
    activeScenario.balance.paidGd = profile.gumDropsPurchasedBalance;

    return json({
      success: true,
      deliveredGumDrops: expectedDrops,
      gumDropsBalance: profile.gumDropsBalance,
      gumDropsPurchasedBalance: profile.gumDropsPurchasedBalance,
      gumDropsRewardBalance: profile.gumDropsRewardBalance ?? 0,
    });
  }),

  http.get("*/api/user/profile", () => {
    const profile = requireProfile();
    return profile ? json({ success: true, profile }) : unauthorized();
  }),

  http.get("*/api/user/data", () => {
    const profile = requireProfile();
    return profile ? json({ success: true, profile }) : unauthorized();
  }),

  http.get("*/api/creators/:username", ({ params }) => {
    const username = typeof params.username === "string" ? params.username.toLowerCase() : "";
    if (username !== activeScenario.creatorProfile.username) {
      return json({ error: "Creator not found" }, { status: 404 });
    }

    return json({
      success: true,
      creator: activeScenario.creatorProfile,
      drops: activeScenario.creatorDrops,
    });
  }),

  http.get("*/api/creator/relationships", () => {
    const profile = requireProfile();
    if (!profile) {
      return unauthorized();
    }

    return json({
      success: true,
      relationships: [
        {
          id: `relationship_${profile.uid}_${activeScenario.creatorProfile.uid}`,
          userId: profile.uid,
          creatorId: activeScenario.creatorProfile.uid,
          following: true,
          notificationsEnabled: true,
          createdAt: KANDYDROPS_MSW_NOW - 7 * 86_400_000,
          updatedAt: KANDYDROPS_MSW_NOW - 60_000,
          creatorDisplayName: activeScenario.creatorProfile.displayName,
          creatorUsername: activeScenario.creatorProfile.username,
          creatorPhotoURL: activeScenario.creatorProfile.photoURL,
        },
      ],
    });
  }),

  http.get("*/api/notifications", () => {
    const profile = requireProfile();
    if (!profile) {
      return unauthorized();
    }

    return json({
      success: true,
      notifications: activeScenario.notifications,
    }, {
      headers: {
        ETag: `"msw-${activeScenario.name}-${activeScenario.notifications.length}"`,
      },
    });
  }),

  http.put("*/api/notifications", async ({ request }) => {
    const profile = requireProfile();
    if (!profile) {
      return unauthorized();
    }

    const ids = getRequestIds(await readJsonBody(request));
    const successfulIds: string[] = [];
    activeScenario.notifications = activeScenario.notifications.map((notification) => {
      if (!ids.includes(notification.id)) {
        return notification;
      }

      successfulIds.push(notification.id);
      return {
        ...notification,
        readBy: Array.from(new Set([...notification.readBy, profile.uid])),
      };
    });

    return json({
      successCount: successfulIds.length,
      failedCount: ids.length - successfulIds.length,
      notificationIds: successfulIds,
    });
  }),

  http.get("*/api/chat/threads", () => {
    const profile = requireProfile();
    if (!profile) {
      return unauthorized();
    }

    return json({
      success: true,
      threads: activeScenario.chat.threads,
    });
  }),

  http.post("*/api/chat/threads/:threadId/messages", async ({ request, params }) => {
    const profile = requireProfile();
    if (!profile) {
      return unauthorized();
    }

    const threadId = threadIdParam(params.threadId);
    const thread = activeScenario.chat.threads.find((entry) => entry.id === threadId);
    if (!thread) {
      return json({ error: "Chat thread not found.", errorCode: "thread_not_found" }, { status: 404 });
    }

    const payload = await readJsonBody(request);
    const messageKind = payload.messageKind === "image" || payload.messageKind === "video" ? payload.messageKind : "text";
    const pricing = activeScenario.chat.pricingByThreadId[threadId];
    const costGd = messageKind === "video"
      ? pricing?.videoPriceGd ?? 0
      : messageKind === "image"
        ? pricing?.imagePriceGd ?? 0
        : pricing?.textPriceGd ?? 0;

    if ((pricing?.purchasedBalanceGd ?? 0) < costGd) {
      return json({
        error: "Insufficient paid GumDrops",
        errorCode: "insufficient_paid_gumdrops",
        requiredPriceGd: costGd,
        purchasedBalanceGd: pricing?.purchasedBalanceGd ?? 0,
        paidGdShortfall: costGd - (pricing?.purchasedBalanceGd ?? 0),
        subscriberFreeChatApplies: false,
        messageKind,
      }, { status: 402 });
    }

    const messages = activeScenario.chat.messagesByThreadId[threadId] ?? [];
    const message = {
      id: nextId("chat_message_msw", messages.length),
      threadId,
      creatorId: thread.creatorId,
      userId: thread.userId,
      senderRole: "user" as const,
      messageKind,
      text: typeof payload.text === "string" ? payload.text : "",
      costGd,
      createdAt: KANDYDROPS_MSW_NOW,
    };
    activeScenario.chat.messagesByThreadId[threadId] = [...messages, message];

    if (pricing) {
      pricing.purchasedBalanceGd = Math.max(0, pricing.purchasedBalanceGd - costGd);
    }

    return json({
      success: true,
      message,
      pricing,
    }, { status: 201 });
  }),

  http.post("*/api/chat/threads/:threadId/read", ({ params }) => {
    const profile = requireProfile();
    if (!profile) {
      return unauthorized();
    }

    const threadId = threadIdParam(params.threadId);
    const thread = activeScenario.chat.threads.find((entry) => entry.id === threadId);
    if (thread) {
      thread.lastReadByUserAt = KANDYDROPS_MSW_NOW;
      thread.unreadCountForUser = 0;
    }

    return json({ success: Boolean(thread), threadId });
  }),

  http.get("*/api/chat/threads/:threadId", ({ params }) => {
    const profile = requireProfile();
    if (!profile) {
      return unauthorized();
    }

    const threadId = threadIdParam(params.threadId);
    const thread = activeScenario.chat.threads.find((entry) => entry.id === threadId);
    if (!thread) {
      return json({ error: "Chat thread not found.", errorCode: "thread_not_found" }, { status: 404 });
    }

    return json({
      success: true,
      thread,
      messages: activeScenario.chat.messagesByThreadId[threadId] ?? [],
      pricing: activeScenario.chat.pricingByThreadId[threadId],
      threadExists: true,
    });
  }),

  http.delete("*/api/chat/threads/:threadId", ({ params }) => {
    const profile = requireProfile();
    if (!profile) {
      return unauthorized();
    }

    const threadId = threadIdParam(params.threadId);
    activeScenario.chat.threads = activeScenario.chat.threads.filter((thread) => thread.id !== threadId);
    return json({ success: true, hiddenThreadId: threadId });
  }),

  http.get("*/api/support/threads", () => {
    const profile = requireProfile();
    if (!profile) {
      return unauthorized();
    }

    return json({
      success: true,
      threads: activeScenario.support.threads,
    });
  }),

  http.post("*/api/support/threads", async ({ request }) => {
    const profile = requireProfile();
    if (!profile) {
      return unauthorized();
    }

    const payload = await readJsonBody(request);
    const thread = {
      id: nextId("support_thread_msw", activeScenario.support.threads.length),
      userId: profile.uid,
      userEmail: profile.email,
      userDisplayName: profile.displayName,
      subject: typeof payload.subject === "string" ? payload.subject : "Support request",
      category: payload.category === "bug" ? "bug" as const : "general" as const,
      status: "waiting_on_support" as const,
      sourcePath: typeof payload.sourcePath === "string" ? payload.sourcePath : null,
      unreadForUser: 0,
      unreadForAdmin: 1,
      createdAt: KANDYDROPS_MSW_NOW,
      updatedAt: KANDYDROPS_MSW_NOW,
    };
    activeScenario.support.threads = [thread, ...activeScenario.support.threads];
    activeScenario.support.messagesByThreadId[thread.id] = [{
      id: nextId("support_message_msw", 0),
      threadId: thread.id,
      senderRole: "user",
      senderId: profile.uid,
      senderLabel: profile.displayName ?? "User",
      body: typeof payload.message === "string" ? payload.message : "",
      createdAt: KANDYDROPS_MSW_NOW,
    }];

    return json({ success: true, thread });
  }),

  http.post("*/api/support/threads/guest", async ({ request }) => {
    const payload = await readJsonBody(request);
    const threadId = nextId("support_thread_guest_msw", activeScenario.support.threads.length);
    return json({
      success: true,
      threadId,
      email: typeof payload.email === "string" ? payload.email : null,
    });
  }),

  http.get("*/api/support/threads/:threadId", ({ params }) => {
    const profile = requireProfile();
    if (!profile) {
      return unauthorized();
    }

    const threadId = threadIdParam(params.threadId);
    const thread = activeScenario.support.threads.find((entry) => entry.id === threadId);
    return json({
      success: true,
      thread: thread ?? null,
      messages: activeScenario.support.messagesByThreadId[threadId] ?? [],
    });
  }),

  http.post("*/api/support/threads/:threadId", async ({ request, params }) => {
    const profile = requireProfile();
    if (!profile) {
      return unauthorized();
    }

    const threadId = threadIdParam(params.threadId);
    const thread = activeScenario.support.threads.find((entry) => entry.id === threadId);
    if (!thread) {
      return json({ error: "Support thread not found" }, { status: 404 });
    }

    const payload = await readJsonBody(request);
    const messages = activeScenario.support.messagesByThreadId[threadId] ?? [];
    const message = {
      id: nextId("support_message_msw", messages.length),
      threadId,
      senderRole: "user" as const,
      senderId: profile.uid,
      senderLabel: profile.displayName ?? "User",
      body: typeof payload.message === "string" ? payload.message : "",
      createdAt: KANDYDROPS_MSW_NOW,
    };
    activeScenario.support.messagesByThreadId[threadId] = [...messages, message];
    thread.updatedAt = KANDYDROPS_MSW_NOW;
    thread.status = "waiting_on_support";

    return json({ success: true, thread, messages: activeScenario.support.messagesByThreadId[threadId] });
  }),
];
