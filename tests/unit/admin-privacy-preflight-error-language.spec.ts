// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useAdminPrivacyPreflight } from "@/hooks/useAdminPrivacyPreflight";
import { readPrivacyConsoleState, type PrivacyConsoleRange } from "@/lib/admin-privacy-console";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";

const fixture = vi.hoisted(() => ({ uid: "admin_a" as string | null, role: "admin", loading: false, local: false, fetch: vi.fn() }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: fixture.uid ? { uid: fixture.uid, providerData: fixture.local ? [{ providerId: "admin-ui-test-session" }] : [] } : null, userProfile: { role: fixture.role }, loading: fixture.loading }) }));
vi.mock("@/lib/authFetch", () => ({ authFetch: (...args: unknown[]) => fixture.fetch(...args) }));
const snapshot = (range: PrivacyConsoleRange = "24h", count: number | null = 7) => ({ generatedAtUtc: "2026-10-02T12:00:00Z", range, overallState: "review", checks: [{ id: "event_pipeline", label: "Event pipeline", state: "review", severity: "warn", evidenceState: "observed", source: "controlled_fixture", sampleCount: count, lastSeenAtUtc: "2026-10-02T12:00:00Z", reasonCode: "observed_fixture", explanation: "Observed bounded source", nextAction: "Review source" }] });
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const deferred = () => { let resolve!: (value: Response) => void; const promise = new Promise<Response>((next) => { resolve = next; }); return { promise, resolve }; };
beforeEach(() => { fixture.uid = "admin_a"; fixture.role = "admin"; fixture.loading = false; fixture.local = false; fixture.fetch.mockReset(); });
afterEach(cleanup);

const source = readFileSync(join(process.cwd(), "src/app/admin/AdminPrivacyPreflight.tsx"), "utf8");

describe("admin privacy preflight error language", () => {
  it("renders canonical safe error language instead of raw hook errors", () => {
    expect(source).toContain("sanitizeErrorForUser");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).toContain('data-privacy-console-safe-error="true"');
    expect(source).not.toContain("{error.message}");
  });
});

describe("Privacy protected-read recovery and actor custody", () => {
  it.each([[401, "auth_required"], [403, "forbidden"], [429, "rate_limited"], [503, "service_unavailable"]])("preserves HTTP %s for the existing safe operator error reader", async (status, key) => {
    fixture.fetch.mockResolvedValue(response({ success: false, error: "permission-denied: private transport detail" }, status as number));
    const { result } = renderHook(() => useAdminPrivacyPreflight());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(sanitizeErrorForUser(result.current.error, "admin_truth", "admin_truth_unavailable").errorKey).toBe(key);
    expect(result.current.error).toMatchObject({ status });
    expect(result.current.error?.message).not.toContain("private transport detail");
    expect(result.current.data).toBeNull();
  });
  it.each([null, { success: false, error: "Not acknowledged" }, { ...snapshot(), checks: {} }, { ...snapshot(), range: "7d" }])("rejects unsuccessful or malformed HTTP200 source %#", async (body) => {
    fixture.fetch.mockResolvedValue(response(body));
    const { result } = renderHook(() => useAdminPrivacyPreflight());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data).toBeNull();
  });
  it("clears a loaded actor's source and rejects its late refresh after admin-to-admin handoff", async () => {
    const oldRefresh = deferred(), nextActor = deferred();
    fixture.fetch.mockResolvedValueOnce(response(snapshot())).mockReturnValueOnce(oldRefresh.promise).mockReturnValueOnce(nextActor.promise);
    const { result, rerender } = renderHook(() => useAdminPrivacyPreflight());
    await waitFor(() => expect(result.current.data?.checks[0].sampleCount).toBe(7));
    act(() => result.current.setRange("7d"));
    await waitFor(() => expect(fixture.fetch).toHaveBeenCalledTimes(2));
    fixture.uid = "admin_b"; rerender();
    expect(result.current.data).toBeNull(); expect(result.current.error).toBeNull(); expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(fixture.fetch).toHaveBeenCalledTimes(3));
    await act(async () => { nextActor.resolve(response(snapshot("7d", 23))); await nextActor.promise; });
    await waitFor(() => expect(result.current.data?.checks[0].sampleCount).toBe(23));
    await act(async () => { oldRefresh.resolve(response(snapshot("7d", 99))); await oldRefresh.promise; });
    expect(result.current.data?.checks[0].sampleCount).toBe(23);
  });
  it("retains verified same-actor source through denied range refresh and accepts the next valid operation", async () => {
    fixture.fetch.mockResolvedValueOnce(response(snapshot())).mockResolvedValueOnce(response({ success: false, error: "Forbidden" }, 403)).mockResolvedValueOnce(response(snapshot("30d", 31)));
    const { result } = renderHook(() => useAdminPrivacyPreflight());
    await waitFor(() => expect(result.current.data?.checks[0].sampleCount).toBe(7));
    act(() => result.current.setRange("7d"));
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error)); expect(result.current.data?.range).toBe("24h");
    act(() => result.current.setRange("30d"));
    await waitFor(() => expect(result.current.data?.range).toBe("30d"));
    expect(result.current.error).toBeNull(); expect(result.current.data?.checks[0].sampleCount).toBe(31); expect(fixture.fetch).toHaveBeenCalledTimes(3);
  });
  it.each(["signed_out", "non_admin", "auth_pending"])("blocks protected reads and hides prior source when %s", async (state) => {
    fixture.fetch.mockResolvedValue(response(snapshot()));
    const { result, rerender } = renderHook(() => useAdminPrivacyPreflight());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    if (state === "signed_out") fixture.uid = null;
    if (state === "non_admin") fixture.role = "user";
    if (state === "auth_pending") fixture.loading = true;
    rerender();
    expect(result.current.data).toBeNull(); expect(result.current.adminSessionState).toBe("waiting_for_admin_session"); expect(fixture.fetch).toHaveBeenCalledTimes(1);
  });
  it("preserves observed zero versus missing count without accepting malformed check fields", () => {
    expect(readPrivacyConsoleState(snapshot("24h", 0))?.checks[0].sampleCount).toBe(0);
    expect(readPrivacyConsoleState(snapshot("24h", null))?.checks[0].sampleCount).toBeNull();
    const valid = snapshot();
    expect(readPrivacyConsoleState({ ...valid, checks: [{ ...valid.checks[0], evidenceState: null }] })).toBeNull();
    expect(readPrivacyConsoleState({ ...valid, checks: [valid.checks[0], valid.checks[0]] })).toBeNull();
  });
  it("hides loaded evidence and performs no protected refresh after entering a local fixture session", async () => {
    fixture.fetch.mockResolvedValue(response(snapshot()));
    const { result, rerender } = renderHook(() => useAdminPrivacyPreflight());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    fixture.local = true; rerender();
    expect(result.current.data).toBeNull(); expect(result.current.error).toBeNull();
    expect(result.current.adminSessionState).toBe("local_fixture_source_missing");
    expect(result.current.isLoading).toBe(false); expect(fixture.fetch).toHaveBeenCalledTimes(1);
  });
});
