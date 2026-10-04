// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import { StrictMode } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { MaintenanceAdminBootstrap } from "@/components/Maintenance/MaintenanceAdminBootstrap";
import { buildCanonicalUserFixture } from "@/lib/testing/canonical-test-factories";
import type { AuthModal } from "@/components/Auth/AuthModal";
import type { ComponentProps } from "react";

type Listener = { uid: string; next: (snapshot: unknown) => Promise<void>; unsubscribe: ReturnType<typeof vi.fn> };
const state = vi.hoisted(() => ({
  path: "/dashboard", router: { replace: vi.fn() },
  auth: { currentUser: null as User | null },
  authCallback: null as ((user: User | null) => void) | null,
  authUnsubscribe: vi.fn(), listeners: [] as Listener[],
  authFetch: vi.fn(), trackEvent: vi.fn(),
  syncConsent: false, redirect: null as Promise<null> | null,
  afterRegister: null as (() => void) | null,
}));
vi.mock("next/navigation", () => ({ usePathname: () => state.path, useRouter: () => state.router }));
// Source-only boundary fixture: the real bootstrap owns opening/dismissal and
// server acknowledgement; provider sign-in remains deployed/browser evidence.
vi.mock("next/dynamic", () => ({ default: () => function AuthModalBoundary(props: ComponentProps<typeof AuthModal>) {
  return props.isOpen ? <section role="dialog" aria-label="Canonical sign-in">
    <span>{props.mode}</span><button onClick={props.onClose}>Close sign-in</button>
  </section> : null;
} }));
vi.mock("@/lib/firebase", () => ({ auth: state.auth, firebaseClientConfigured: true }));
vi.mock("@/lib/firebase-data", () => ({ db: {} }));
vi.mock("firebase/auth", () => ({
  browserLocalPersistence: {}, setPersistence: vi.fn(async () => undefined),
  getRedirectResult: () => state.redirect ?? Promise.resolve(null),
  onAuthStateChanged: (_auth: unknown, callback: (user: User | null) => void) => {
    state.authCallback = callback; callback(state.auth.currentUser); return state.authUnsubscribe;
  },
}));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, _collection: string, uid: string) => ({ uid }),
  onSnapshot: (doc: { uid: string }, next: Listener["next"]) => {
    const listener = { uid: doc.uid, next, unsubscribe: vi.fn() };
    state.listeners.push(listener); state.afterRegister?.(); return listener.unsubscribe;
  },
}));
vi.mock("@/lib/self-healing", () => ({
  createAutoHealingObserver: (subscribe: () => () => void) => {
    const unsubscribe = subscribe(); return { cleanup: () => unsubscribe(), triggerReconnect: vi.fn() };
  },
}));
vi.mock("@/lib/authFetch", () => ({ authFetch: (...args: unknown[]) => state.authFetch(...args) }));
vi.mock("@/lib/client-error-reporting", () => ({ reportRealtimeIssue: vi.fn() }));
vi.mock("@/lib/navigation-persistence", () => ({ clearLastVisitedPath: vi.fn(), syncLastVisitedPathOwner: vi.fn() }));
vi.mock("@/lib/client-session", () => ({ getClientAnalyticsIdentitySnapshot: () => ({}), syncClientSessionOwnership: vi.fn() }));
vi.mock("@/lib/task-guidance", () => ({ clearTaskGuidanceStorage: vi.fn() }));
vi.mock("@/lib/telemetry", () => ({ syncIdentifiedTelemetryOwnership: vi.fn(), trackEvent: (...args: unknown[]) => state.trackEvent(...args), trackIdentityLinked: vi.fn() }));
vi.mock("@/lib/admin/admin-ui-test-session", () => ({ readAdminUiTestSession: () => ({ status: "absent" }), resolveAdminUiTestSession: () => ({ status: "absent" }), clearAdminUiTestSession: vi.fn() }));
vi.mock("@/lib/privacy-consent", () => ({
  readPrivacySettingsSnapshot: () => ({ consentMode: "none", consentDecision: "denied" }),
  canUseIdentifiedAnalytics: () => false,
  shouldSyncGuestConsentToAccount: () => state.syncConsent,
  buildAccountPrivacySettingsFromConsentSnapshot: () => ({ analyticsEnabled: false }),
  persistPrivacySettingsSnapshot: vi.fn(),
}));

function user(uid: string) { return { uid, email: null, displayName: uid, providerData: [] } as unknown as User; }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
function Probe() { const { userProfile, loading } = useAuth(); return <output data-testid="profile">{loading ? "loading" : userProfile?.uid ?? "absent"}</output>; }
function provider() { return <AuthProvider><Probe /></AuthProvider>; }
async function publish(listener: Listener) {
  await act(async () => { await listener.next({ exists: () => true, data: () => buildCanonicalUserFixture({ uid: listener.uid }) }); });
}
async function settled() {
  const view = render(provider());
  await waitFor(() => expect(state.listeners).toHaveLength(1));
  await publish(state.listeners[0]);
  expect(screen.getByTestId("profile").textContent).toBe("member-a");
  return view;
}

beforeEach(() => {
  state.path = "/dashboard"; state.auth.currentUser = user("member-a"); state.authCallback = null;
  state.listeners = []; state.redirect = null; state.afterRegister = null; state.syncConsent = false;
  state.authUnsubscribe.mockReset(); state.trackEvent.mockReset(); state.router.replace.mockReset();
  state.authFetch.mockReset().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
});
afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });

describe("actual maintenance bootstrap recovery", () => {
  beforeEach(() => {
    state.path = "/maintenance/admin";
    window.history.replaceState(null, "", "/maintenance/admin?next=%2Fadmin%2Fanalytics%3Frange%3D7d");
    state.authFetch.mockResolvedValue(Response.json({ success: true, role: "admin" }));
  });

  it("opens and dismisses canonical sign-in from a fresh session, then requires server admin acknowledgement", async () => {
    state.auth.currentUser = null;
    render(<MaintenanceAdminBootstrap />);
    expect(state.authFetch).not.toHaveBeenCalled();
    expect(state.router.replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sign in", exact: true }));
    expect(screen.getByRole("dialog", { name: "Canonical sign-in" }).textContent).toContain("signin");
    fireEvent.click(screen.getByRole("button", { name: "Close sign-in" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    const pending = deferred<Response>(); state.authFetch.mockReturnValue(pending.promise);
    act(() => { state.auth.currentUser = user("admin-a"); state.authCallback!(state.auth.currentUser); });
    expect(state.router.replace).not.toHaveBeenCalled();
    await act(async () => { pending.resolve(Response.json({ success: true, role: "admin" })); await pending.promise; });
    await waitFor(() => expect(state.router.replace).toHaveBeenCalledWith("/admin/analytics?range=7d"));
  });

  it("returns to the intended route only after a current admin acknowledgement", async () => {
    render(<MaintenanceAdminBootstrap />);
    await waitFor(() => expect(state.router.replace).toHaveBeenCalledWith("/admin/analytics?range=7d"));
    expect(state.authFetch).toHaveBeenCalledTimes(1);
    expect(state.authFetch).toHaveBeenCalledWith("/api/auth/navigation-session", { method: "POST" });
  });

  it.each([{ success: false }, {}, [], null, { success: true, role: "user" }])("does not navigate for HTTP200 without administrator acknowledgement: %j", async (body) => {
    state.authFetch.mockResolvedValue(Response.json(body));
    render(<MaintenanceAdminBootstrap />);
    await waitFor(() => expect(screen.getByText(/temporarily unavailable/)).toBeTruthy());
    expect(state.router.replace).not.toHaveBeenCalled();
    expect(state.authFetch).toHaveBeenCalledTimes(1);
  });

  it("reuses one pending parsed request across Strict Mode cleanup and setup", async () => {
    const pending = deferred<Response>(); state.authFetch.mockReturnValue(pending.promise);
    const view = render(<StrictMode><MaintenanceAdminBootstrap /></StrictMode>);
    expect(state.authUnsubscribe).toHaveBeenCalledTimes(1);
    expect(state.authFetch).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve(Response.json({ success: true, role: "admin" })); await pending.promise; });
    await waitFor(() => expect(state.router.replace).toHaveBeenCalledWith("/admin/analytics?range=7d"));
    expect(state.router.replace).toHaveBeenCalledTimes(1);
    view.unmount(); expect(state.authUnsubscribe).toHaveBeenCalledTimes(2);
  });

  it("rejects an old actor acknowledgement and lets the next actor recover", async () => {
    const first = deferred<Response>(); const second = deferred<Response>();
    state.authFetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(<MaintenanceAdminBootstrap />);
    act(() => { state.auth.currentUser = user("member-b"); state.authCallback!(state.auth.currentUser); });
    expect(state.authFetch).toHaveBeenCalledTimes(1);
    await act(async () => { first.resolve(Response.json({ success: true, role: "admin" })); await first.promise; });
    expect(state.router.replace).not.toHaveBeenCalled();
    await waitFor(() => expect(state.authFetch).toHaveBeenCalledTimes(2));
    await act(async () => { second.resolve(Response.json({ success: true, role: "admin" })); await second.promise; });
    await waitFor(() => expect(state.router.replace).toHaveBeenCalledTimes(1));
  });

  it("recovers on a fresh mount after a transport failure without retrying the failed mount", async () => {
    state.authFetch.mockRejectedValueOnce(new Error("offline"));
    const view = render(<MaintenanceAdminBootstrap />);
    await waitFor(() => expect(screen.getByText(/temporarily unavailable/)).toBeTruthy());
    act(() => { state.authCallback!(state.auth.currentUser); });
    expect(state.authFetch).toHaveBeenCalledTimes(1);
    view.unmount();
    state.authFetch.mockResolvedValueOnce(Response.json({ success: true, role: "admin" }));
    render(<MaintenanceAdminBootstrap />);
    await waitFor(() => expect(state.router.replace).toHaveBeenCalledWith("/admin/analytics?range=7d"));
    expect(state.authFetch).toHaveBeenCalledTimes(2);
  });

  it("uses the safe fallback when an external destination is supplied to the actual bootstrap", async () => {
    window.history.replaceState(null, "", "/maintenance/admin?next=%2F%2Fother.test");
    render(<MaintenanceAdminBootstrap />);
    await waitFor(() => expect(state.router.replace).toHaveBeenCalledWith("/admin"));
  });

  it("keeps sign-out authoritative and rejects an acknowledgement after unmount", async () => {
    const pending = deferred<Response>(); state.authFetch.mockReturnValue(pending.promise);
    const view = render(<MaintenanceAdminBootstrap />);
    act(() => { state.auth.currentUser = null; state.authCallback!(null); });
    expect(screen.getByText("Administrator sign-in is required")).toBeTruthy();
    view.unmount();
    await act(async () => { pending.resolve(Response.json({ success: true, role: "admin" })); await pending.promise; });
    expect(state.router.replace).not.toHaveBeenCalled();
  });

  it.each([[401, "Administrator sign-in is required"], [403, "This account does not have administrator access."]])("preserves denial %s without retry", async (status, copy) => {
    state.authFetch.mockResolvedValue(Response.json({ success: false }, { status: status as number }));
    render(<MaintenanceAdminBootstrap />);
    await waitFor(() => expect(screen.getByText(copy as string)).toBeTruthy());
    expect(state.router.replace).not.toHaveBeenCalled();
    expect(state.authFetch).toHaveBeenCalledTimes(1);
  });
});

describe("actual AuthProvider profile subscription lifecycle", () => {
  it("keeps one subscription and the settled profile through ordinary route changes", async () => {
    const view = await settled();
    for (const path of ["/drops", "/dashboard/library", "/experiences"]) {
      state.path = path; view.rerender(provider());
      expect(screen.getByTestId("profile").textContent).toBe("member-a");
      expect(state.listeners).toHaveLength(1);
      expect(state.listeners[0].unsubscribe).not.toHaveBeenCalled();
    }
    expect(state.authFetch.mock.calls.filter(([url]) => url === "/api/auth/navigation-session")).toHaveLength(1);
    view.unmount(); expect(state.listeners[0].unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("keeps the maintenance bootstrap bypass and restarts when leaving its boundary", async () => {
    state.path = "/maintenance/admin";
    const view = render(provider());
    await waitFor(() => expect(state.authCallback).not.toBeNull());
    expect(state.listeners).toHaveLength(0);
    state.path = "/admin"; view.rerender(provider());
    await waitFor(() => expect(state.listeners).toHaveLength(1)); await publish(state.listeners[0]);
    state.path = "/maintenance/admin"; view.rerender(provider());
    expect(state.listeners[0].unsubscribe).toHaveBeenCalledTimes(1);
    expect(state.listeners).toHaveLength(1);
    state.path = "/admin/users"; view.rerender(provider());
    await waitFor(() => expect(state.listeners).toHaveLength(2)); await publish(state.listeners[1]);
    expect(screen.getByTestId("profile").textContent).toBe("member-a");
  });

  it("replaces the subscription on a real actor change and rejects old callbacks", async () => {
    await settled(); const old = state.listeners[0];
    act(() => { state.auth.currentUser = user("member-b"); state.authCallback!(state.auth.currentUser); });
    await waitFor(() => expect(state.listeners).toHaveLength(2)); await publish(state.listeners[1]);
    expect(old.unsubscribe).toHaveBeenCalledTimes(1);
    await publish(old);
    expect(screen.getByTestId("profile").textContent).toBe("member-b");
  });

  it("rejects the old actor after deferred consent synchronization settles", async () => {
    const privacy = deferred<{ ok: boolean }>();
    state.authFetch.mockImplementation((url: string) => url === "/api/user/profile" ? privacy.promise : Promise.resolve({ ok: true, json: async () => ({ success: true }) }));
    render(provider()); await waitFor(() => expect(state.listeners).toHaveLength(1));
    state.syncConsent = true;
    const oldPending = state.listeners[0].next({ exists: () => true, data: () => buildCanonicalUserFixture({ uid: "member-a" }) });
    await waitFor(() => expect(state.authFetch).toHaveBeenCalledWith("/api/user/profile", expect.anything()));
    state.syncConsent = false;
    act(() => { state.auth.currentUser = user("member-b"); state.authCallback!(state.auth.currentUser); });
    await waitFor(() => expect(state.listeners).toHaveLength(2)); await publish(state.listeners[1]);
    await act(async () => { privacy.resolve({ ok: true }); await oldPending; });
    expect(screen.getByTestId("profile").textContent).toBe("member-b");
  });

  it("does not register an auth listener after a deferred initialization outlives unmount", async () => {
    const redirect = deferred<null>(); state.redirect = redirect.promise;
    const view = render(provider()); view.unmount();
    await act(async () => { redirect.resolve(null); await redirect.promise; });
    expect(state.authCallback).toBeNull(); expect(state.listeners).toHaveLength(0);
  });

  it("disposes a profile source whose registration settles after cleanup", async () => {
    let view: ReturnType<typeof render>;
    state.afterRegister = () => queueMicrotask(() => view.unmount());
    view = render(provider());
    await waitFor(() => expect(state.listeners).toHaveLength(1));
    await waitFor(() => expect(state.listeners[0].unsubscribe).toHaveBeenCalledTimes(1));
  });
});
