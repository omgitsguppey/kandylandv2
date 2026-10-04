// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { AdminSupportQueue } from "@/components/Admin/AdminSupportQueue";
import { useAdminSupportRealtime } from "@/hooks/useAdminSupportRealtime";

const transport = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/authFetch", () => ({ authFetch: transport.fetch }));
afterEach(() => { cleanup(); transport.fetch.mockReset(); });

vi.mock("@/context/AuthContext", () => ({ useAuth:() => ({ user:{uid:"fixture-only",providerData:[{providerId:"admin-ui-test-session"}]} }) }));
vi.mock("next/navigation", () => ({useSearchParams:()=>new URLSearchParams(),useRouter:()=>({push:vi.fn()})}));
vi.mock("@/components/Analytics/PageViewEvent",()=>({PageViewEvent:()=>null}));
const queueSource = readFileSync(join(process.cwd(), "src/components/Admin/AdminSupportQueue.tsx"), "utf8");

describe("admin support fixture boundary", () => {
  it("labels local admin UI fixture support evidence as unavailable and blocks visible recovery actions", () => {
    render(React.createElement(AdminSupportQueue));
    expect(screen.getByRole("alert")).toHaveTextContent("source_missing: support source is not loaded in this fixture");
    expect(screen.getByRole("alert")).toHaveTextContent("Protected reads and writes stay blocked until verified admin access provides the source");
    expect(screen.getByText("No source")).toBeInTheDocument();
    expect(screen.getByText("Inbox unavailable")).toBeInTheDocument();
    expect(screen.getAllByText("--")).toHaveLength(3);
    expect(screen.getByRole("button",{name:"Refresh inbox"})).toBeDisabled();
    expect(screen.queryByRole("button",{name:"Send Reply"})).not.toBeInTheDocument();
    expect(screen.queryByText("API Verified")).not.toBeInTheDocument();
    expect(transport.fetch).not.toHaveBeenCalled();
  });

  it("disables list, selected detail and explicit refresh reads while fixture mode is active", async () => {
    expect(queueSource).toContain("useAdminSupportRealtime(selectedThreadId, { enabled: !isLocalAdminUiTestSession })");
    const { result } = renderHook(() => useAdminSupportRealtime("fixture-thread", { enabled: false }));
    await act(async () => { await result.current.refreshAll(); });
    expect(transport.fetch).not.toHaveBeenCalled();
    expect(result.current.summary).toBeNull();
    expect(result.current.threads).toEqual([]);
    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoadingThreads).toBe(false);
    expect(result.current.isLoadingMessages).toBe(false);
  });
});
