// @vitest-environment happy-dom

import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import type { UserProfile } from "@/types/db";
import { buildTestProfile, buildTestUser, buildTestDrop } from "./utils/kandydrops-test-states";

const state = vi.hoisted(() => ({
  user: null as User | null,
  profile: null as UserProfile | null,
  loading: false,
  setProfile: vi.fn(),
  authFetch: vi.fn(),
  activity: vi.fn(),
  track: vi.fn(),
  push: vi.fn(),
  signup: vi.fn(),
  purchase: vi.fn(),
  error: vi.fn(),
  confetti: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock("next/image", () => ({ default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} /> }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: state.user, userProfile: state.profile, loading: state.loading, setUserProfile: state.setProfile }) }));
vi.mock("@/context/AdminViewAsContext", () => ({ useAdminViewAs: () => ({ viewAsState: null }) }));
vi.mock("@/context/UIContext", () => ({ useUI: () => ({ openAuthModal: state.signup, openPurchaseModal: state.purchase }) }));
vi.mock("@/lib/authFetch", () => ({ authFetch: (...args: unknown[]) => state.authFetch(...args) }));
vi.mock("@/lib/activity-sync", () => ({ dispatchActivitySync: (...args: unknown[]) => state.activity(...args) }));
vi.mock("@/lib/client-diagnostics", () => ({ recordClientBreadcrumb: vi.fn(), recordClientDiagnostic: vi.fn() }));
vi.mock("@/lib/client-error-reporting", () => ({ reportClientIssue: vi.fn() }));
vi.mock("@/lib/telemetry", () => ({ trackEvent: (...args: unknown[]) => state.track(...args), startTimedFlow: vi.fn(), consumeTimedFlow: () => ({ mergedParams: {} }), clearTimedFlow: vi.fn() }));
vi.mock("@/hooks/useNow", () => ({ useNow: () => 1700000000000 }));
vi.mock("@/components/Feedback/ReportBugButton", () => ({ ReportBugButton: () => <button type="button">Report a bug</button> }));
vi.mock("@/components/ui/TitleMarquee", () => ({ TitleMarquee: ({ title }: { title: string }) => <span>{title}</span> }));
vi.mock("canvas-confetti", () => ({ default: (...args: unknown[]) => state.confetti(...args) }));
vi.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => state.error(...args), success: vi.fn(), message: vi.fn() } }));

import { LockedDropPreviewClient } from "@/components/Drops/LockedDropPreviewClient";
import { toLockedDropPreviewSafeDrop } from "@/lib/locked-drop-preview-truth";

function response(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

function pendingResponse() {
  let resolve!: (value: Response) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<Response>((settle, fail) => { resolve = settle; reject = fail; });
  return { promise, resolve, reject };
}

function safeDrop(id = "drop_1") {
  return toLockedDropPreviewSafeDrop(buildTestDrop({ id, validUntil: 1700086400000 }));
}

describe("Locked preview unwrap current-account acknowledgement and recovery", () => {
  beforeEach(() => {
    state.user = buildTestUser();
    state.profile = buildTestProfile();
    state.loading = false;
    for (const mock of [state.setProfile, state.authFetch, state.activity, state.track, state.push, state.signup, state.purchase, state.error, state.confetti]) mock.mockReset();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  });

  async function confirmUnwrap() {
    await userEvent.click(screen.getByRole("button", { name: /^unwrap for 500 gd$/i }));
    await userEvent.click(screen.getByRole("button", { name: /confirm 500 gd/i }));
  }

  it.each([{ success: false, error: "Not confirmed" }, {}])("does not publish success for incomplete HTTP200 acknowledgement %j and recovers", async (body) => {
    state.authFetch.mockResolvedValueOnce(response(body));
    render(<LockedDropPreviewClient drop={safeDrop()} creator={null} />);
    await confirmUnwrap();
    await waitFor(() => expect(state.error).toHaveBeenCalledTimes(1));
    expect(state.setProfile).not.toHaveBeenCalled();
    expect(state.activity).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /open in my kandydrops/i })).not.toBeInTheDocument();
    expect(state.track.mock.calls.filter(([name]) => name === "spend_virtual_currency" || name === "drop_preview_unlock_success_state_viewed")).toHaveLength(0);
    state.authFetch.mockResolvedValueOnce(response({ success: true, transactionId: "server_transaction", entitlementId: "server_entitlement", newBalance: 500, unwrappedAt: 1700000000001 }));
    await confirmUnwrap();
    expect(screen.getByRole("button", { name: /open in my kandydrops/i })).toBeEnabled();
    expect(state.activity).toHaveBeenCalledTimes(1);
  });

  it.each(["missing", "other-account", "auth-pending"])("does not use another or unresolved profile when readiness is %s", async (mode) => {
    const drop = safeDrop();
    state.user = buildTestUser("user_b");
    state.profile = mode === "missing" ? null : buildTestProfile({ uid: mode === "other-account" ? "user_a" : "user_b", unlockedContent: [drop.id], gumDropsBalance: 9000 });
    state.loading = mode === "auth-pending";
    const view = render(<LockedDropPreviewClient drop={drop} creator={null} />);
    expect.soft(screen.queryByRole("button", { name: /open in my kandydrops/i })).not.toBeInTheDocument();
    const checking = screen.queryByRole("button", { name: /checking access/i });
    const refill = screen.queryByRole("button", { name: /refill to unwrap/i });
    if (refill) await userEvent.click(refill);
    expect.soft(state.purchase).not.toHaveBeenCalled();
    expect(checking).toBeDisabled();
    state.profile = buildTestProfile({ uid: "user_b" });
    state.loading = false;
    view.rerender(<LockedDropPreviewClient drop={drop} creator={null} />);
    expect(screen.getByRole("button", { name: /^unwrap for 500 gd$/i })).toBeEnabled();
  });

  it("preserves acknowledged success IDs, guarded profile update and targeted Library/continue actions", async () => {
    const profile = state.profile!;
    const drop = safeDrop();
    state.authFetch.mockResolvedValue(response({ success: true, transactionId: "server_transaction", entitlementId: "server_entitlement", newBalance: 500, unwrappedAt: 1700000000001 }));
    render(<LockedDropPreviewClient drop={drop} creator={null} />);
    await confirmUnwrap();
    const update = state.setProfile.mock.calls[0][0] as (current: UserProfile) => UserProfile;
    expect(update(profile)).toMatchObject({ uid: "user_1", gumDropsBalance: 500, unlockedContent: [drop.id], unlockedContentTimestamps: { [drop.id]: 1700000000001 } });
    await userEvent.click(screen.getByRole("button", { name: /open in my kandydrops/i }));
    expect(state.push).toHaveBeenCalledWith("/dashboard/library?drop=" + encodeURIComponent(drop.id));
    await userEvent.click(screen.getByRole("button", { name: /keep unwrapping/i }));
    expect(state.push).toHaveBeenLastCalledWith("/drops");
    expect(state.track.mock.calls.find(([name]) => name === "drop_preview_unlock_success_state_viewed")?.[1]).toMatchObject({ transaction_id: "server_transaction", entitlement_id: "server_entitlement", sourceTruth: "client_supporting" });
    expect(screen.getAllByRole("img").every(image => image.getAttribute("src") === drop.imageUrl)).toBe(true);
  });

  it("retains already-unwrapped acknowledged access without inventing a transaction ID or new spend", async () => {
    state.authFetch.mockResolvedValue(response({ success: true, alreadyUnlocked: true, transactionId: "", entitlementId: "server_entitlement", newBalance: 1000 }));
    render(<LockedDropPreviewClient drop={safeDrop()} creator={null} />);
    await confirmUnwrap();
    expect(screen.getByRole("button", { name: /open in my kandydrops/i })).toBeEnabled();
    const event = state.track.mock.calls.find(([name]) => name === "drop_preview_unlock_success_state_viewed");
    expect(event?.[1]).toMatchObject({ transaction_id: "", entitlement_id: "server_entitlement" });
    expect(state.track.mock.calls.filter(([name]) => name === "spend_virtual_currency")).toHaveLength(0);
  });

  it("suppresses synchronous duplicate confirmations during a pending unwrap", async () => {
    const pending = pendingResponse();
    state.authFetch.mockReturnValue(pending.promise);
    render(<LockedDropPreviewClient drop={safeDrop()} creator={null} />);
    await userEvent.click(screen.getByRole("button", { name: /^unwrap for 500 gd$/i }));
    const confirm = screen.getByRole("button", { name: /confirm 500 gd/i });
    act(() => { confirm.click(); confirm.click(); });
    expect(state.authFetch).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(response({ success: true, newBalance: 500, transactionId: "server_transaction" })));
    expect(state.activity).toHaveBeenCalledTimes(1);
  });

  it.each(["account", "drop", "unmount", "logout-return"])("does not publish an old unwrap result after %s changes", async (change) => {
    const pending = pendingResponse();
    state.authFetch.mockReturnValue(pending.promise);
    const drop = safeDrop();
    const view = render(<LockedDropPreviewClient drop={drop} creator={null} />);
    await confirmUnwrap();
    if (change === "unmount") view.unmount();
    else if (change === "logout-return") {
      state.user = null; state.profile = null;
      view.rerender(<LockedDropPreviewClient drop={drop} creator={null} />);
      state.user = buildTestUser(); state.profile = buildTestProfile();
      view.rerender(<LockedDropPreviewClient drop={drop} creator={null} />);
    } else {
      if (change === "account") { state.user = buildTestUser("user_b"); state.profile = buildTestProfile({ uid: "user_b" }); }
      view.rerender(<LockedDropPreviewClient drop={change === "drop" ? safeDrop("drop_b") : drop} creator={null} />);
    }
    await act(async () => pending.resolve(response({ success: true, newBalance: 500, transactionId: "old_transaction", entitlementId: "old_entitlement" })));
    expect(state.setProfile).not.toHaveBeenCalled();
    expect(state.activity).not.toHaveBeenCalled();
    expect(state.error).not.toHaveBeenCalled();
    expect(state.track.mock.calls.filter(([name]) => name === "spend_virtual_currency" || name === "drop_preview_unlock_success_state_viewed")).toHaveLength(0);
    if (change !== "unmount") expect(screen.queryByRole("button", { name: /open in my kandydrops/i })).not.toBeInTheDocument();
  });

  it("does not apply a queued profile update to a replacement account", async () => {
    state.authFetch.mockResolvedValue(response({ success: true, newBalance: 500, transactionId: "server_transaction" }));
    const drop = safeDrop();
    const view = render(<LockedDropPreviewClient drop={drop} creator={null} />);
    await confirmUnwrap();
    const update = state.setProfile.mock.calls[0][0] as (current: UserProfile) => UserProfile;
    const profileB = buildTestProfile({ uid: "user_b", gumDropsBalance: 9000 });
    state.user = buildTestUser("user_b"); state.profile = profileB;
    view.rerender(<LockedDropPreviewClient drop={drop} creator={null} />);
    expect(update(profileB)).toBe(profileB);
    expect(screen.queryByRole("button", { name: /open in my kandydrops/i })).not.toBeInTheDocument();
  });

  it("rechecks account custody after delayed response body acknowledgement", async () => {
    let stream!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({ start(controller) { stream = controller; } });
    state.authFetch.mockResolvedValue(new Response(body, { status: 200, headers: { "content-type": "application/json" } }));
    const drop = safeDrop();
    const view = render(<LockedDropPreviewClient drop={drop} creator={null} />);
    await confirmUnwrap();
    expect(state.setProfile).not.toHaveBeenCalled();
    state.user = buildTestUser("user_b"); state.profile = buildTestProfile({ uid: "user_b" });
    view.rerender(<LockedDropPreviewClient drop={drop} creator={null} />);
    await act(async () => { stream.enqueue(new TextEncoder().encode(JSON.stringify({ success: true, newBalance: 500, transactionId: "old_transaction" }))); stream.close(); });
    expect(state.setProfile).not.toHaveBeenCalled();
    expect(state.activity).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /open in my kandydrops/i })).not.toBeInTheDocument();
  });

  it("does not let an old request finish or reset the new actor's pending unwrap", async () => {
    const oldRequest = pendingResponse(), nextRequest = pendingResponse();
    state.authFetch.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(nextRequest.promise);
    const drop = safeDrop();
    const view = render(<LockedDropPreviewClient drop={drop} creator={null} />);
    await confirmUnwrap();
    state.user = buildTestUser("user_b"); state.profile = buildTestProfile({ uid: "user_b", gumDropsBalance: 9000 });
    view.rerender(<LockedDropPreviewClient drop={drop} creator={null} />);
    await confirmUnwrap();
    await act(async () => oldRequest.resolve(response({ success: true, newBalance: 500, transactionId: "old_transaction" })));
    expect(screen.getByRole("button", { name: /unwrapping/i })).toBeDisabled();
    expect(state.setProfile).not.toHaveBeenCalled();
    await act(async () => nextRequest.resolve(response({ success: true, newBalance: 8500, transactionId: "new_transaction" })));
    expect(state.authFetch).toHaveBeenCalledTimes(2);
    expect(state.setProfile).toHaveBeenCalledTimes(1);
    expect(state.activity).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /open in my kandydrops/i })).toBeEnabled();
    const update = state.setProfile.mock.calls[0][0] as (current: UserProfile) => UserProfile;
    expect(update(state.profile!)).toMatchObject({ uid: "user_b", gumDropsBalance: 8500, unlockedContent: [drop.id] });
  });

  it("does not publish a retired actor's late failure and recovers the new actor's valid action", async () => {
    const oldRequest = pendingResponse();
    state.authFetch.mockReturnValueOnce(oldRequest.promise);
    const drop = safeDrop();
    const view = render(<LockedDropPreviewClient drop={drop} creator={null} />);
    await confirmUnwrap();
    state.user = buildTestUser("user_b"); state.profile = buildTestProfile({ uid: "user_b" });
    view.rerender(<LockedDropPreviewClient drop={drop} creator={null} />);
    await act(async () => oldRequest.reject(new Error("Old actor unwrap failed")));
    expect(state.error).not.toHaveBeenCalled();
    expect(state.track.mock.calls.filter(([name]) => name === "unlock_drop_failed")).toHaveLength(0);
    expect(screen.getByRole("button", { name: /^unwrap for 500 gd$/i })).toBeEnabled();
    state.authFetch.mockResolvedValueOnce(response({ success: true, newBalance: 500, transactionId: "new_transaction" }));
    await confirmUnwrap();
    expect(state.activity).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /open in my kandydrops/i })).toBeEnabled();
  });

  it.each(["missing", "other-account", "auth-pending"])("only emits visible action CTA facts after matching access readiness %s", (mode) => {
    const frames = new Map<number, FrameRequestCallback>();
    let sequence = 0;
    const schedule = vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { const id = ++sequence; frames.set(id, callback); return id; });
    const cancel = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(id => { frames.delete(id); });
    const paint = () => act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(Date.now())); });
    try {
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
      state.user = buildTestUser("user_b");
      state.profile = mode === "missing" ? null : buildTestProfile({ uid: mode === "other-account" ? "user_a" : "user_b" });
      state.loading = mode === "auth-pending";
      const drop = safeDrop();
      const view = render(<LockedDropPreviewClient drop={drop} creator={null} />);
      paint(); paint();
      expect(screen.getByRole("button", { name: /checking access/i })).toBeDisabled();
      expect(state.track.mock.calls.filter(([name]) => name === "drop_preview_page_viewed")).toHaveLength(1);
      expect(state.track.mock.calls.filter(([name]) => name === "drop_preview_cta_viewed" || String(name).endsWith("_cta_viewed"))).toHaveLength(0);
      state.profile = buildTestProfile({ uid: "user_b" });
      state.loading = false;
      view.rerender(<LockedDropPreviewClient drop={drop} creator={null} />);
      paint(); paint();
      expect(screen.getByRole("button", { name: /^unwrap for 500 gd$/i })).toBeEnabled();
      expect(state.track.mock.calls.filter(([name]) => name === "drop_preview_cta_viewed")).toHaveLength(1);
      expect(state.track.mock.calls.filter(([name]) => name === "drop_preview_unwrap_cta_viewed")).toHaveLength(1);
      expect(state.track.mock.calls.filter(([name]) => name === "drop_preview_topup_cta_viewed")).toHaveLength(0);
    } finally {
      schedule.mockRestore(); cancel.mockRestore();
    }
  });

});
