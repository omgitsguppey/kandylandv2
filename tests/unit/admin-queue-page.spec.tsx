// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { readAdminDropQueueConfig } from "@/lib/admin-drop-queue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  authFetch: vi.fn(),
  getDocs: vi.fn(),
  reportClientIssue: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  user: {
    uid: "admin-ui-smoke",
    providerData: [{ providerId: "admin-ui-test-session" }],
  } as { uid: string; providerData: Array<{ providerId: string }> } | null,
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: mockState.user }),
}));

vi.mock("@/lib/authFetch", () => ({
  authFetch: (...args: unknown[]) => mockState.authFetch(...args),
}));

vi.mock("@/lib/client-error-reporting", () => ({
  reportClientIssue: (...args: unknown[]) => mockState.reportClientIssue(...args),
}));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => ({ path: args.join("/") }),
  getDocs: (...args: unknown[]) => mockState.getDocs(...args),
}));

vi.mock("@/lib/firebase-data", () => ({
  db: {},
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockState.toastSuccess(...args),
    error: (...args: unknown[]) => mockState.toastError(...args),
  },
}));

vi.mock("@/components/Analytics/PageViewEvent", () => ({
  PageViewEvent: () => null,
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    return <img {...props} alt={props.alt ?? ""} />;
  },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import ManageQueuePage from "@/app/admin/queue/page";
import { buildTestDrop } from "./utils/kandydrops-test-states";

afterEach(cleanup);
const queueConfig = { queue: ["drop-one", "drop-two", "missing-record"], dropsPerDay: 2, timesPerDay: ["08:30", "16:45"], cooldownDays: 7 };
type RecordSnapshot = { id: string; data: () => unknown };
const queueDrops = [buildTestDrop({ id: "drop-one", title: "First record", status: "scheduled", imageUrl: "" }), buildTestDrop({ id: "drop-two", title: "Second record", status: "expired", imageUrl: "" })];
function dropSnapshot() { return { forEach: (callback: (record: RecordSnapshot) => void) => queueDrops.forEach(drop => callback({ id: drop.id, data: () => drop })) }; }
function queueResponse(status = 200, data: unknown = queueConfig) { return { ok: status >= 200 && status < 300, status, json: async () => data }; }
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; }
function useVerifiedQueue() {
  mockState.user = { uid: "admin-real", providerData: [{ providerId: "password" }] };
  mockState.authFetch.mockImplementation((_url, options) => Promise.resolve(queueResponse(200, options?.method === "PUT" ? { success: true, config: JSON.parse(options.body) } : structuredClone(queueConfig))));
  mockState.getDocs.mockResolvedValue(dropSnapshot());
}
function saveButton() { return screen.getAllByRole("button", { name: /^Save (?:Queue )?Settings$/u })[0]; }

describe("ManageQueuePage", () => {
  beforeEach(() => {
    mockState.authFetch.mockReset();
    mockState.getDocs.mockReset();
    mockState.reportClientIssue.mockReset();
    mockState.toastSuccess.mockReset();
    mockState.toastError.mockReset();
    mockState.user = {
      uid: "admin-ui-smoke",
      providerData: [{ providerId: "admin-ui-test-session" }],
    };
  });

  it("shows a source-missing fixture state instead of a raw auth failure", async () => {
    render(<ManageQueuePage />);

    expect(await screen.findByText("source_missing fixture.")).toBeInTheDocument();
    expect(screen.getByText(/source_missing: queue source is not loaded in this fixture/i)).toBeInTheDocument();
    expect(screen.queryByText("Queue data could not be loaded.")).not.toBeInTheDocument();
    expect(screen.queryByText("Retry Queue Load")).not.toBeInTheDocument();
    expect(mockState.authFetch).not.toHaveBeenCalled();
    expect(mockState.getDocs).not.toHaveBeenCalled();
  });

  it("keeps verified admin access connected to the canonical queue route", async () => {
    mockState.user = {
      uid: "admin-real",
      providerData: [{ providerId: "password" }],
    };
    mockState.authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        queue: [],
        dropsPerDay: 1,
        timesPerDay: ["12:00"],
        cooldownDays: 1,
      }),
    });
    mockState.getDocs.mockResolvedValue({
      forEach: () => undefined,
    });

    render(<ManageQueuePage />);

    await waitFor(() => expect(mockState.authFetch).toHaveBeenCalledWith("/api/admin/queue"));
    expect(await screen.findByText("Auto Queue")).toBeInTheDocument();
    expect(screen.queryByText("source_missing fixture.")).not.toBeInTheDocument();
  });
  it("settles a failed detail read while preserving edits and recovers through one detail-only request", async () => {
    useVerifiedQueue();
    const details = deferred<{ forEach: (callback: (record: RecordSnapshot) => void) => void }>();
    mockState.getDocs.mockReturnValueOnce(details.promise).mockResolvedValue(dropSnapshot());
    const { container } = render(<ManageQueuePage />);
    fireEvent.click(await screen.findByRole("button", { name: /^(?:Edit|Edit schedule)$/u }));
    fireEvent.change(container.querySelector('input[type="number"]')!, { target: { value: "3" } });
    await act(async () => details.reject(Object.assign(new Error("private detail transport"), { code: "unavailable" })));
    expect(await screen.findByText("Drop details could not be refreshed.")).toBeInTheDocument();
    expect(container.querySelector('[data-mobile-skeleton="admin-queue-drop-details"]')).toBeNull();
    expect((container.querySelector('input[type="number"]') as HTMLInputElement).value).toBe("3");
    expect(screen.queryByRole("button", { name: "Remove missing queue entry" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry Drop Details", exact: true }));
    expect(await screen.findByText("First record")).toBeInTheDocument();
    expect(mockState.getDocs).toHaveBeenCalledTimes(2);
    expect(mockState.authFetch).toHaveBeenCalledExactlyOnceWith("/api/admin/queue");
    fireEvent.click(saveButton());
    await waitFor(() => expect(mockState.toastSuccess).toHaveBeenCalledOnce());
    const payload = JSON.parse(mockState.authFetch.mock.calls.at(-1)![1].body);
    expect(payload.dropsPerDay).toBe(3);
    expect(payload.timesPerDay).toEqual(["08:30", "16:45", "16:45"]);
    expect(payload.queue).toEqual(queueConfig.queue);
  });

  it.each(["permission-denied", "resource-exhausted"])("settles %s details without a transient read recovery button", async code => {
    useVerifiedQueue();
    mockState.getDocs.mockRejectedValue(Object.assign(new Error("private detail transport"), { code }));
    const { container } = render(<ManageQueuePage />);
    expect(await screen.findByText("Drop details could not be refreshed.")).toBeInTheDocument();
    expect(container.querySelector('[data-mobile-skeleton="admin-queue-drop-details"]')).toBeNull();
    expect(screen.queryByRole("button", { name: "Retry Drop Details" })).not.toBeInTheDocument();
    expect(mockState.getDocs).toHaveBeenCalledOnce();
    expect(mockState.reportClientIssue).toHaveBeenCalledOnce();
  });

  it("settles a successful empty detail snapshot without claiming a failed or still-loading source", async () => {
    useVerifiedQueue();
    mockState.getDocs.mockResolvedValue({ forEach: () => undefined });
    const { container } = render(<ManageQueuePage />);
    expect((await screen.findAllByText(/Unknown drop ID:/u))).toHaveLength(3);
    expect(screen.queryByText("Drop details could not be refreshed.")).not.toBeInTheDocument();
    expect(container.querySelector('[data-mobile-skeleton="admin-queue-drop-details"]')).toBeNull();
    expect(screen.getByRole("heading", { name: "3 queued drops" })).toBeInTheDocument();
  });

  it("preserves native time field focus across an actual value edit", async () => {
    useVerifiedQueue();
    const { container } = render(<ManageQueuePage />);
    fireEvent.click(await screen.findByRole("button", { name: /^(?:Edit|Edit schedule)$/u }));
    const field = container.querySelector('input[type="time"]') as HTMLInputElement;
    field.focus();
    fireEvent.change(field, { target: { value: "09:45" } });
    expect(document.activeElement).toBe(field);
    expect(field.value).toBe("09:45");
  });

  it("reorders the current draft and keeps the focused action attached to its record", async () => {
    useVerifiedQueue();
    render(<ManageQueuePage />);
    await screen.findByText("First record");
    fireEvent.click(screen.getByRole("button", { name: "Edit queue", exact: true }));
    const action = screen.getAllByRole("button", { name: "Move down", exact: true })[0];
    action.focus();
    fireEvent.click(action);
    expect(document.activeElement).toBe(action);
    fireEvent.click(saveButton());
    await waitFor(() => expect(mockState.toastSuccess).toHaveBeenCalledOnce());
    expect(JSON.parse(mockState.authFetch.mock.calls.at(-1)![1].body).queue).toEqual(["drop-two", "drop-one", "missing-record"]);
  });

  it("restores focus to the existing edit control after removing its action row", async () => {
    useVerifiedQueue();
    render(<ManageQueuePage />);
    await screen.findByText("First record");
    fireEvent.click(screen.getByRole("button", { name: "Edit queue", exact: true }));
    const action = screen.getAllByRole("button", { name: "Remove from queue", exact: true })[0];
    action.focus();
    fireEvent.click(action);
    expect(screen.queryByText("First record")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /^(?:Done|Done editing queue)$/u }));
  });

  it("retains an edited draft after failed Save and sends it once in the next valid operation", async () => {
    useVerifiedQueue();
    const firstSave = deferred<ReturnType<typeof queueResponse>>();
    mockState.authFetch.mockImplementation((_url, options) => options?.method === "PUT" ? firstSave.promise : Promise.resolve(queueResponse()));
    render(<ManageQueuePage />);
    await screen.findByText("First record");
    fireEvent.click(screen.getByRole("button", { name: "Edit queue", exact: true }));
    fireEvent.click(screen.getAllByRole("button", { name: "Move down", exact: true })[0]);
    const save = saveButton();
    fireEvent.click(save);
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(mockState.authFetch.mock.calls.filter(([, options]) => options?.method === "PUT")).toHaveLength(1);
    await act(async () => firstSave.resolve(queueResponse(503, { error: "private save transport" })));
    expect(await screen.findByRole("alert")).not.toHaveTextContent("private save transport");
    expect(save).not.toBeDisabled();
    mockState.authFetch.mockImplementation((_url, options) => Promise.resolve(queueResponse(200, options?.method === "PUT" ? { success: true, config: JSON.parse(options.body) } : queueConfig)));
    fireEvent.click(save);
    await waitFor(() => expect(mockState.toastSuccess).toHaveBeenCalledOnce());
    const saves = mockState.authFetch.mock.calls.filter(([, options]) => options?.method === "PUT");
    expect(saves).toHaveLength(2);
    expect(JSON.parse(saves[0][1].body).queue).toEqual(["drop-two", "drop-one", "missing-record"]);
    expect(saves[1][1].body).toBe(saves[0][1].body);
  });

  it("retains a denied Save draft and suppresses a permanent write replay", async () => {
    useVerifiedQueue();
    mockState.authFetch.mockImplementation((_url, options) => Promise.resolve(options?.method === "PUT" ? queueResponse(403, { error: "forbidden" }) : queueResponse()));
    const { container } = render(<ManageQueuePage />);
    await screen.findByText("First record");
    fireEvent.click(saveButton());
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(container.querySelector('[data-admin-queue-error-key="forbidden"]')).not.toBeNull();
    const save = saveButton();
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(mockState.authFetch.mock.calls.filter(([, options]) => options?.method === "PUT")).toHaveLength(1);
    expect(screen.getByText("First record")).toBeInTheDocument();
  });

  it("classifies a denied configuration source without offering blind read retries", async () => {
    useVerifiedQueue();
    mockState.authFetch.mockResolvedValue(queueResponse(403, { error: "forbidden" }));
    const { container } = render(<ManageQueuePage />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(container.querySelector('[data-admin-queue-error-key="forbidden"]')).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Retry Queue Load" })).not.toBeInTheDocument();
    expect(mockState.getDocs).not.toHaveBeenCalled();
  });

  it("recovers a failed configuration read through one explicit next request", async () => {
    useVerifiedQueue();
    mockState.authFetch.mockResolvedValueOnce(queueResponse(503, { error: "private queue transport" }));
    render(<ManageQueuePage />);
    fireEvent.click(await screen.findByRole("button", { name: "Retry Queue Load", exact: true }));
    expect(await screen.findByText("First record")).toBeInTheDocument();
    expect(mockState.authFetch).toHaveBeenCalledTimes(2);
    expect(mockState.getDocs).toHaveBeenCalledOnce();
  });

  it("suppresses late configuration after promotion to a protected fixture session", async () => {
    useVerifiedQueue();
    const read = deferred<ReturnType<typeof queueResponse>>();
    mockState.authFetch.mockReturnValue(read.promise);
    const { rerender } = render(<ManageQueuePage />);
    await waitFor(() => expect(mockState.authFetch).toHaveBeenCalledOnce());
    mockState.user = { uid: "fixture-admin", providerData: [{ providerId: "admin-ui-test-session" }] };
    rerender(<ManageQueuePage />);
    await screen.findByText("source_missing fixture.");
    await act(async () => read.resolve(queueResponse()));
    expect(screen.getByText("source_missing fixture.")).toBeInTheDocument();
    expect(mockState.getDocs).not.toHaveBeenCalled();
  });

  it("suppresses late metadata diagnostics after the view leaves its source generation", async () => {
    useVerifiedQueue();
    const read = deferred<ReturnType<typeof dropSnapshot>>();
    mockState.getDocs.mockReturnValue(read.promise);
    const { rerender } = render(<ManageQueuePage />);
    await waitFor(() => expect(mockState.getDocs).toHaveBeenCalledOnce());
    mockState.user = { uid: "fixture-admin", providerData: [{ providerId: "admin-ui-test-session" }] };
    rerender(<ManageQueuePage />);
    await screen.findByText("source_missing fixture.");
    await act(async () => read.reject(Object.assign(new Error("private late detail transport"), { code: "unavailable" })));
    expect(mockState.reportClientIssue).not.toHaveBeenCalled();
    expect(mockState.toastError).not.toHaveBeenCalled();
  });

  it.each([200, 503])("suppresses a late Save %s callback after its fixture boundary changes", async status => {
    useVerifiedQueue();
    const save = deferred<ReturnType<typeof queueResponse>>();
    mockState.authFetch.mockImplementation((_url, options) => options?.method === "PUT" ? save.promise : Promise.resolve(queueResponse()));
    const { rerender } = render(<ManageQueuePage />);
    await screen.findByText("First record");
    fireEvent.click(saveButton());
    mockState.user = { uid: "fixture-admin", providerData: [{ providerId: "admin-ui-test-session" }] };
    rerender(<ManageQueuePage />);
    await screen.findByText("source_missing fixture.");
    await act(async () => save.resolve(queueResponse(status, status === 200 ? { success: true, config: queueConfig } : { error: "private late save transport" })));
    expect(screen.getByText("source_missing fixture.")).toBeInTheDocument();
    expect(mockState.toastSuccess).not.toHaveBeenCalled();
    expect(mockState.toastError).not.toHaveBeenCalled();
    expect(mockState.reportClientIssue).not.toHaveBeenCalled();
  });

  it("refreshes source for a replacement admin actor and discards stale Save settlement", async () => {
    useVerifiedQueue();
    const save = deferred<ReturnType<typeof queueResponse>>();
    mockState.authFetch.mockImplementation((_url, options) => options?.method === "PUT" ? save.promise : Promise.resolve(queueResponse()));
    const { rerender } = render(<ManageQueuePage />);
    await screen.findByText("First record");
    fireEvent.click(saveButton());
    mockState.user = { uid: "other-admin", providerData: [{ providerId: "password" }] };
    rerender(<ManageQueuePage />);
    await waitFor(() => expect(mockState.authFetch.mock.calls.filter(([, options]) => options?.method !== "PUT")).toHaveLength(2));
    await screen.findByText("First record");
    await act(async () => save.resolve(queueResponse(200, { success: true, config: queueConfig })));
    expect(mockState.toastSuccess).not.toHaveBeenCalled();
    expect(saveButton()).not.toBeDisabled();
  });

  it("displays the canonical Save acknowledgement before announcing success", async () => {
    useVerifiedQueue();
    const acknowledged = { ...queueConfig, timesPerDay: ["08:30", "16:45"] };
    mockState.authFetch.mockImplementation((_url, options) => Promise.resolve(queueResponse(200, options?.method === "PUT" ? { success: true, config: acknowledged } : queueConfig)));
    const { container } = render(<ManageQueuePage />);
    fireEvent.click(await screen.findByRole("button", { name: /^(?:Edit|Edit schedule)$/u }));
    const fields = container.querySelectorAll<HTMLInputElement>('input[type="time"]');
    fireEvent.change(fields[0], { target: { value: "16:45" } });
    fireEvent.change(fields[1], { target: { value: "08:30" } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(mockState.toastSuccess).toHaveBeenCalledOnce());
    expect(JSON.parse(mockState.authFetch.mock.calls.at(-1)![1].body).timesPerDay).toEqual(["16:45", "08:30"]);
    expect(Array.from(container.querySelectorAll<HTMLInputElement>('input[type="time"]'), field => field.value)).toEqual(acknowledged.timesPerDay);
  });

  it.each([
    null,
    { success: false, config: queueConfig },
    { success: true },
    { success: true, config: { ...queueConfig, queue: "not-an-array" } },
    { success: true, config: { ...queueConfig, queue: ["duplicate", "duplicate"] } },
    { success: true, config: { ...queueConfig, timesPerDay: ["08:30"] } },
  ])("retains the draft and requires source reconciliation for an unconfirmed acknowledgement %#", async acknowledgement => {
    useVerifiedQueue();
    let refreshed = false;
    mockState.authFetch.mockImplementation((_url, options) => Promise.resolve(options?.method === "PUT" ? queueResponse(200, acknowledgement) : refreshed ? queueResponse(503, { error: "private source transport" }) : queueResponse()));
    const { container } = render(<ManageQueuePage />);
    await screen.findByText("First record");
    fireEvent.click(screen.getByRole("button", { name: "Edit queue", exact: true }));
    fireEvent.click(screen.getAllByRole("button", { name: "Move down", exact: true })[0]);
    fireEvent.click(saveButton());
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(container.querySelector('[data-admin-queue-error-key="stale_data"]')).not.toBeNull();
    expect(mockState.toastSuccess).not.toHaveBeenCalled();
    expect(saveButton()).toBeDisabled();
    refreshed = true;
    fireEvent.click(screen.getByRole("button", { name: "Refresh Queue Source", exact: true }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("First record")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    expect(container.textContent!.indexOf("Second record")).toBeLessThan(container.textContent!.indexOf("First record"));
    mockState.authFetch.mockResolvedValue(queueResponse(200, { ...queueConfig, queue: ["drop-two", "drop-one", "missing-record"] }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh Queue Source", exact: true }));
    await waitFor(() => expect(saveButton()).not.toBeDisabled());
    expect(container.textContent!.indexOf("Second record")).toBeLessThan(container.textContent!.indexOf("First record"));
    expect(mockState.authFetch.mock.calls.filter(([, options]) => options?.method === "PUT")).toHaveLength(1);
  });

  it.each([
    { ...queueConfig, queue: "not-an-array" },
    { ...queueConfig, dropsPerDay: 0 },
    { ...queueConfig, timesPerDay: ["not-a-time", "16:45"] },
  ])("rejects an unverified configuration source before unsafe rendering %#", async source => {
    useVerifiedQueue();
    mockState.authFetch.mockResolvedValue(queueResponse(200, source));
    render(<ManageQueuePage />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("First record")).not.toBeInTheDocument();
    expect(mockState.getDocs).not.toHaveBeenCalled();
    expect(mockState.toastSuccess).not.toHaveBeenCalled();
  });

  it("preserves the supported authority marker and clones the public configuration", () => {
    const source = { ...structuredClone(queueConfig), queueAuthorityVersion: 1 };
    const decoded = readAdminDropQueueConfig(source);
    expect(decoded).toEqual(source);
    expect(decoded).not.toBe(source);
    source.queue.push("later-source-mutation");
    source.timesPerDay[0] = "22:00";
    expect(decoded?.queue).toEqual(queueConfig.queue);
    expect(decoded?.timesPerDay).toEqual(queueConfig.timesPerDay);
  });

  it("accepts a legacy public configuration without inventing an authority marker", () => {
    const decoded = readAdminDropQueueConfig(structuredClone(queueConfig));
    expect(decoded).toEqual(queueConfig);
    expect(Object.prototype.hasOwnProperty.call(decoded, "queueAuthorityVersion")).toBe(false);
  });

  it.each([undefined, "1", 0, {}, Number.NaN, []])("rejects a declared malformed public authority marker %#", marker => {
    expect(readAdminDropQueueConfig({ ...queueConfig, queueAuthorityVersion: marker })).toBeNull();
  });

  it.each([2, null])("rejects a false-200 source with unsupported authority marker %s and recovers by manual read", async marker => {
    useVerifiedQueue();
    const invalid = { ...queueConfig, queueAuthorityVersion: marker };
    mockState.authFetch.mockResolvedValue(queueResponse(200, invalid));
    render(<ManageQueuePage />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("First record")).not.toBeInTheDocument();
    expect(mockState.getDocs).not.toHaveBeenCalled();
    expect(mockState.toastSuccess).not.toHaveBeenCalled();
    expect(mockState.authFetch.mock.calls.filter(([, options]) => options?.method === "PUT")).toHaveLength(0);
    mockState.authFetch.mockResolvedValue(queueResponse(200, { ...queueConfig, queueAuthorityVersion: 1 }));
    fireEvent.click(screen.getByRole("button", { name: "Retry Queue Load", exact: true }));
    await screen.findByText("First record");
    expect(saveButton()).not.toBeDisabled();
    expect(mockState.authFetch.mock.calls.filter(([, options]) => options?.method === "PUT")).toHaveLength(0);
  });

  it.each([2, null])("retains the draft after a false-200 Save with unsupported authority marker %s without replay", async marker => {
    useVerifiedQueue();
    let readSource = { ...queueConfig, queueAuthorityVersion: 1 };
    mockState.authFetch.mockImplementation((_url, options) => Promise.resolve(queueResponse(200,
      options?.method === "PUT" ? { success: true, config: { ...queueConfig, queueAuthorityVersion: marker } } : readSource)));
    const { container } = render(<ManageQueuePage />);
    await screen.findByText("First record");
    fireEvent.click(screen.getByRole("button", { name: "Edit queue", exact: true }));
    fireEvent.click(screen.getAllByRole("button", { name: "Move down", exact: true })[0]);
    fireEvent.click(saveButton());
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(container.querySelector('[data-admin-queue-error-key="stale_data"]')).not.toBeNull();
    expect(mockState.toastSuccess).not.toHaveBeenCalled();
    expect(saveButton()).toBeDisabled();
    expect(container.textContent!.indexOf("Second record")).toBeLessThan(container.textContent!.indexOf("First record"));
    fireEvent.click(saveButton());
    expect(mockState.authFetch.mock.calls.filter(([, options]) => options?.method === "PUT")).toHaveLength(1);
    readSource = { ...readSource, queue: ["drop-two", "drop-one", "missing-record"] };
    fireEvent.click(screen.getByRole("button", { name: "Refresh Queue Source", exact: true }));
    await waitFor(() => expect(saveButton()).not.toBeDisabled());
    expect(container.textContent!.indexOf("Second record")).toBeLessThan(container.textContent!.indexOf("First record"));
    expect(mockState.authFetch.mock.calls.filter(([, options]) => options?.method === "PUT")).toHaveLength(1);
  });

  it("keeps version1 through the visible canonical acknowledgement and the next deliberate Save", async () => {
    useVerifiedQueue();
    const source = { ...queueConfig, queueAuthorityVersion: 1 };
    const acknowledged = { ...source, timesPerDay: ["08:30", "16:45"] };
    mockState.authFetch.mockImplementation((_url, options) => Promise.resolve(queueResponse(200,
      options?.method === "PUT" ? { success: true, config: acknowledged } : source)));
    const { container } = render(<ManageQueuePage />);
    fireEvent.click(await screen.findByRole("button", { name: /^(?:Edit|Edit schedule)$/u }));
    const fields = container.querySelectorAll<HTMLInputElement>('input[type="time"]');
    fireEvent.change(fields[0], { target: { value: "16:45" } });
    fireEvent.change(fields[1], { target: { value: "08:30" } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(mockState.toastSuccess).toHaveBeenCalledTimes(1));
    const firstPayload = JSON.parse(mockState.authFetch.mock.calls.find(([, options]) => options?.method === "PUT")![1].body);
    expect(firstPayload.queueAuthorityVersion).toBe(1);
    expect(firstPayload.timesPerDay).toEqual(["16:45", "08:30"]);
    expect(Array.from(container.querySelectorAll<HTMLInputElement>('input[type="time"]'), field => field.value)).toEqual(acknowledged.timesPerDay);
    fireEvent.click(saveButton());
    await waitFor(() => expect(mockState.toastSuccess).toHaveBeenCalledTimes(2));
    const saves = mockState.authFetch.mock.calls.filter(([, options]) => options?.method === "PUT");
    expect(saves).toHaveLength(2);
    expect(JSON.parse(saves[1][1].body)).toEqual(acknowledged);
  });

});
