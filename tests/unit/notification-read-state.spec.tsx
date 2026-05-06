// @vitest-environment happy-dom

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildTestUser } from "./utils/kandydrops-test-states";

const mockState = vi.hoisted(() => ({
  user: { uid: "notify_user" },
  push: vi.fn(),
  authFetch: vi.fn(),
  trackEvent: vi.fn(),
  dispatchClientRuntimeEvent: vi.fn(),
  reportRealtimeIssue: vi.fn(),
  toastError: vi.fn(),
}));

function buildNotification(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: "Drop ready",
    message: "A new Drop is ready to unwrap. Open it before the timer closes.",
    type: "success",
    readBy: [],
    createdAtMs: new Date("2026-05-04T15:00:00.000Z").getTime(),
    link: "/drops/drop_1/preview",
    ...overrides,
  };
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockState.push }),
}));

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string }) => <img alt={alt} {...props} />,
}));

vi.mock("@/context/AuthContext", () => ({
  useAuthIdentity: () => ({ user: mockState.user }),
}));

vi.mock("@/hooks/useDeferredClientReady", () => ({
  useDeferredClientReady: () => true,
}));

vi.mock("@/hooks/useNetworkConditions", () => ({
  useNetworkConditions: () => ({ isConstrained: false, isVerySlow: false }),
}));

vi.mock("@/hooks/client-runtime", () => ({
  CLIENT_RUNTIME_EVENTS: {
    openNotifications: "kandydrops:open-notifications",
    notificationsSync: "kandydrops:notifications-sync",
  },
  dispatchClientRuntimeEvent: (...args: unknown[]) => mockState.dispatchClientRuntimeEvent(...args),
  listenForClientRuntimeEvent: vi.fn(() => () => undefined),
}));

vi.mock("@/lib/authFetch", () => ({
  authFetch: (...args: unknown[]) => mockState.authFetch(...args),
}));

vi.mock("@/lib/client-error-reporting", () => ({
  reportRealtimeIssue: (...args: unknown[]) => mockState.reportRealtimeIssue(...args),
}));

vi.mock("@/lib/telemetry", () => ({
  trackEvent: (...args: unknown[]) => mockState.trackEvent(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockState.toastError(...args),
  },
}));

import { NotificationBell } from "@/components/Navigation/NotificationBell";

describe("Notification read state", () => {
  beforeEach(() => {
    mockState.user = buildTestUser("notify_user");
    mockState.push.mockReset();
    mockState.authFetch.mockReset();
    mockState.trackEvent.mockReset();
    mockState.dispatchClientRuntimeEvent.mockReset();
    mockState.reportRealtimeIssue.mockReset();
    mockState.toastError.mockReset();
  });

  it("removes a notification from the visible list when marked read", async () => {
    mockState.authFetch.mockImplementation(async (_url: string, options?: RequestInit) => {
      if (options?.method === "PUT") {
        return {
          ok: true,
          json: async () => ({ successCount: 1, failedCount: 0, notificationIds: ["note_1"] }),
        };
      }

      return {
        ok: true,
        status: 200,
        headers: new Headers({ etag: "notifications-v1" }),
        json: async () => ({ success: true, notifications: [buildNotification("note_1")] }),
      };
    });

    render(<NotificationBell />);

    await userEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(await screen.findByText("Drop ready")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /mark as read/i }));

    await waitFor(() => {
      expect(screen.queryByText("Drop ready")).not.toBeInTheDocument();
    });
    expect(mockState.trackEvent).toHaveBeenCalledWith("notification_read", expect.objectContaining({
      notification_id: "note_1",
      recipient_id: "notify_user",
      actor_user_id: "notify_user",
      target_user_id: "notify_user",
      surface: "notifications_inbox",
      optimistic: true,
    }));
    expect(mockState.dispatchClientRuntimeEvent).toHaveBeenCalledWith("kandydrops:notifications-sync", true);
  });

  it("marks an expanded notification as viewed while preserving it visibly", async () => {
    mockState.authFetch.mockImplementation(async (_url: string, options?: RequestInit) => {
      if (options?.method === "PUT") {
        return {
          ok: true,
          json: async () => ({ successCount: 1, failedCount: 0, notificationIds: ["note_2"] }),
        };
      }

      return {
        ok: true,
        status: 200,
        headers: new Headers({ etag: "notifications-v2" }),
        json: async () => ({
          success: true,
          notifications: [
            buildNotification("note_2", {
              message: "Kandy just dropped. You can open it now and keep access after unwrapping.",
            }),
          ],
        }),
      };
    });

    render(<NotificationBell />);

    await userEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(await screen.findByText("Drop ready")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^details$/i }));

    await waitFor(() => {
      expect(screen.getByText("Drop ready")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /already read/i })).toHaveTextContent(/viewed/i);
    });
    expect(mockState.trackEvent).toHaveBeenCalledWith("notification_read", expect.objectContaining({
      notification_id: "note_2",
      recipient_id: "notify_user",
      actor_user_id: "notify_user",
      target_user_id: "notify_user",
      surface: "notifications_inbox",
      optimistic: true,
    }));
  });

  it("emits one canonical read fact when opening a notification destination", async () => {
    mockState.authFetch.mockImplementation(async (_url: string, options?: RequestInit) => {
      if (options?.method === "PUT") {
        return {
          ok: true,
          json: async () => ({ successCount: 1, failedCount: 0, notificationIds: ["note_3"] }),
        };
      }

      return {
        ok: true,
        status: 200,
        headers: new Headers({ etag: "notifications-v3" }),
        json: async () => ({ success: true, notifications: [buildNotification("note_3")] }),
      };
    });

    render(<NotificationBell />);

    await userEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(await screen.findByText("Drop ready")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /open details/i }));

    await waitFor(() => {
      expect(mockState.push).toHaveBeenCalledWith("/drops/drop_1/preview");
    });

    const readCalls = mockState.trackEvent.mock.calls.filter(([eventName]) => eventName === "notification_read");
    expect(readCalls).toHaveLength(1);
    expect(readCalls[0]?.[1]).toEqual(expect.objectContaining({
      notification_id: "note_3",
      recipient_id: "notify_user",
      actor_user_id: "notify_user",
      target_user_id: "notify_user",
      surface: "notifications_inbox",
      optimistic: true,
    }));
    expect(mockState.trackEvent).toHaveBeenCalledWith("notification_opened", expect.objectContaining({
      notification_id: "note_3",
      destination: "/drops/drop_1/preview",
      actor_user_id: "notify_user",
      target_user_id: "notify_user",
      surface: "notifications_dropdown",
    }));
    expect(mockState.trackEvent).toHaveBeenCalledWith("notification_action_clicked", expect.objectContaining({
      notification_id: "note_3",
      destination: "/drops/drop_1/preview",
      actor_user_id: "notify_user",
      target_user_id: "notify_user",
      surface: "notifications_dropdown",
    }));
  });
});
