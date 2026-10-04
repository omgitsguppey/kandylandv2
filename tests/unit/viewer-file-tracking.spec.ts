// @vitest-environment happy-dom
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { createElement, useEffect } from "react";
import { afterEach, beforeEach, vi } from "vitest";
import type { Drop } from "@/types/db";
import { buildTestDrop, ownedDropState } from "./utils/kandydrops-test-states";
import { useViewerState } from "@/app/dashboard/viewer/hooks/useViewerState";
import { ViewerClient } from "@/app/dashboard/viewer/ViewerClient";

const mediaHarness = vi.hoisted(() => ({
  requests: [] as Array<{ url: string; signal: AbortSignal; resolve: (response: Response) => void }>,
  auth: null as unknown,
  loaded: vi.fn(),
  assetSwitch: vi.fn(),
  refresh: vi.fn(),
  mediaMounts: 0,
  mediaUnmounts: 0,
  createdUrls: [] as string[],
  revoke: vi.fn(),
}));

vi.mock("@/lib/authFetch", () => ({ authFetch: (url: string, options: RequestInit) => new Promise<Response>((resolve) => {
  mediaHarness.requests.push({ url, signal: options.signal as AbortSignal, resolve });
}) }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => mediaHarness.auth }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mediaHarness.refresh, push: vi.fn() }) }));
vi.mock("@/lib/telemetry", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/client-diagnostics", () => ({ recordClientBreadcrumb: vi.fn(), recordClientDiagnostic: vi.fn() }));
vi.mock("@/app/dashboard/viewer/adapters/ViewerTelemetryAdapter", () => ({ useViewerTelemetry: () => ({
  trackContentLoaded: mediaHarness.loaded,
  handleAssetSwitch: mediaHarness.assetSwitch,
  flushSessionTelemetry: vi.fn(),
  watchSessionId: null,
}) }));
vi.mock("@/app/dashboard/viewer/hooks/useViewerSecurity", () => ({ useViewerSecurity: () => ({ isSecurityTriggered: false, securityWarning: null, preventContextMenu: vi.fn() }) }));
vi.mock("@/app/dashboard/viewer/hooks/useViewerFeedback", () => ({ useViewerFeedback: () => ({ following: false, submittingFollow: false, feedbackComplete: false, submittingFeedback: false, feedbackValue: null, retentionDrops: [], handleFollow: vi.fn(), handleFeedback: vi.fn() }) }));
vi.mock("@/app/dashboard/viewer/components/ViewerSkeleton", () => ({ ViewerSkeleton: () => createElement("div", { role: "status" }, "Loading media") }));
vi.mock("@/app/dashboard/viewer/components/MediaViewer", () => ({ MediaViewer: (props: { contentBlobUrl: string; contentLoading: boolean }) => {
  useEffect(() => { mediaHarness.mediaMounts += 1; return () => { mediaHarness.mediaUnmounts += 1; }; }, []);
  return createElement("div", { "data-testid": "loaded-media", "data-url": props.contentBlobUrl, "data-loading": String(props.contentLoading) }, "Controlled media");
} }));
vi.mock("@/app/dashboard/viewer/components/DropInfoOverlay", () => ({ DropInfoOverlay: () => null }));
vi.mock("@/app/dashboard/viewer/components/ThumbnailsSlider", () => ({ ThumbnailsSlider: () => null }));
vi.mock("@/components/Feedback/ContentSatisfactionPrompt", () => ({ ContentSatisfactionPrompt: () => null }));
vi.mock("@/components/Feedback/ReportBugButton", () => ({ ReportBugButton: () => null }));

const createDescriptor = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
let viewerDrop: Drop;
async function settleMedia() { await act(async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); }); }
function imageResponse() { return new Response(new Blob(["controlled-image"], { type: "image/png" }), { status: 200, headers: { "content-type": "image/png" } }); }

beforeEach(() => {
  vi.useFakeTimers();
  mediaHarness.requests.length = 0;
  mediaHarness.loaded.mockClear(); mediaHarness.assetSwitch.mockClear(); mediaHarness.refresh.mockClear(); mediaHarness.revoke.mockClear();
  mediaHarness.mediaMounts = 0; mediaHarness.mediaUnmounts = 0; mediaHarness.createdUrls.length = 0;
  viewerDrop = buildTestDrop({ fileMetadata: { type: "image/png", size: 16 } });
  mediaHarness.auth = { ...ownedDropState(viewerDrop.id), loading: false };
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: () => { const url = "blob:viewer-fixture-" + (mediaHarness.createdUrls.length + 1); mediaHarness.createdUrls.push(url); return url; } });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: mediaHarness.revoke });
});
afterEach(() => {
  cleanup(); vi.useRealTimers();
  if (createDescriptor) Object.defineProperty(URL, "createObjectURL", createDescriptor); else Reflect.deleteProperty(URL, "createObjectURL");
  if (revokeDescriptor) Object.defineProperty(URL, "revokeObjectURL", revokeDescriptor); else Reflect.deleteProperty(URL, "revokeObjectURL");
});

import { describe, expect, it } from "vitest";

import {
  buildViewerFileTelemetryContext,
  buildViewerFileTelemetryParams,
  shouldEmitViewerFileView,
  VIEWER_FILE_VIEW_DEDUPE_WINDOW_MS,
} from "@/lib/viewer-watch-session";

describe("viewer file tracking", () => {
  it("builds file telemetry context without leaking internal URLs", () => {
    const context = buildViewerFileTelemetryContext({
      dropId: "drop_1",
      contentFileNames: ["secret-video.mp4"],
      activeAssetIndex: 0,
      activeContentKind: "video",
      viewerSessionId: "watch_session_1",
    });

    expect(context).toMatchObject({
      dropId: "drop_1",
      fileId: "secret-video.mp4",
      assetKey: "drop_1:0",
      mediaIndex: 1,
      mediaType: "video",
      viewerSessionId: "watch_session_1",
    });
    expect(buildViewerFileTelemetryParams(context!)).toMatchObject({
      drop_id: "drop_1",
      file_id: "secret-video.mp4",
      asset_key: "drop_1:0",
      media_index: 1,
      media_type: "video",
      viewer_session_id: "watch_session_1",
      watch_session_id: "watch_session_1",
    });
  });

  it("dedupes repeat file views within the 30 second continuity window", () => {
    expect(VIEWER_FILE_VIEW_DEDUPE_WINDOW_MS).toBe(30_000);
    expect(shouldEmitViewerFileView({ lastEmittedAtMs: 1_000, nextEmittedAtMs: 20_000 })).toBe(false);
    expect(shouldEmitViewerFileView({ lastEmittedAtMs: 1_000, nextEmittedAtMs: 31_000 })).toBe(true);
  });
});


describe("Viewer media request lifecycle", () => {
  it("keeps one actual Client request alive while its loading and thumbnail state commits", async () => {
    render(createElement(ViewerClient, { drop: viewerDrop }));
    await settleMedia();
    expect(screen.getByRole("status")).toHaveTextContent("Loading media");
    expect(mediaHarness.requests).toHaveLength(1);
    expect(mediaHarness.requests[0].signal.aborted).toBe(false);
    expect(mediaHarness.requests[0].url).toContain("/api/drops/content?id=drop_1&index=0");
  });

  it("uses the latest reporting callback without cancelling the same pending asset", async () => {
    const first = vi.fn(), latest = vi.fn();
    const hook = renderHook(({ report }) => useViewerState({ drop: viewerDrop, isAuthorized: true, trackContentLoaded: (...args) => report(...args) }), { initialProps: { report: first } });
    await settleMedia(); const request = mediaHarness.requests.at(-1)!;
    hook.rerender({ report: latest }); await settleMedia();
    expect(request.signal.aborted).toBe(false); expect(mediaHarness.requests).toHaveLength(1);
    request.resolve(imageResponse()); await settleMedia();
    expect(hook.result.current.contentLoading).toBe(false); expect(hook.result.current.resolvedContent.kind).toBe("image");
    expect(first).not.toHaveBeenCalled(); expect(latest).toHaveBeenCalledTimes(1); expect(latest).toHaveBeenCalledWith(expect.any(Number), false, "image");
  });

  it("settles a real failed response without an automatic loading retry and accepts the next valid Drop projection", async () => {
    const hook = renderHook(({ drop }) => useViewerState({ drop, isAuthorized: true, trackContentLoaded: (...args) => mediaHarness.loaded(...args) }), { initialProps: { drop: viewerDrop } });
    await settleMedia(); const request = mediaHarness.requests.at(-1)!; const initialCount = mediaHarness.requests.length;
    request.resolve(new Response(JSON.stringify({ error: "fixture_source_unavailable" }), { status: 503, headers: { "content-type": "application/json" } })); await settleMedia();
    expect(hook.result.current.contentError).toBe("fixture_source_unavailable"); expect(hook.result.current.contentLoading).toBe(false); expect(mediaHarness.requests).toHaveLength(initialCount);
    hook.rerender({ drop: { ...viewerDrop } }); await settleMedia();
    const next = mediaHarness.requests.at(-1)!; expect(next).not.toBe(request); next.resolve(imageResponse()); await settleMedia();
    expect(hook.result.current.contentError).toBeNull(); expect(hook.result.current.contentLoading).toBe(false); expect(hook.result.current.contentBlobUrl).toBe("blob:viewer-fixture-1"); expect(mediaHarness.loaded).toHaveBeenCalledTimes(1);
  });

  it("keeps loaded actual Client media mounted without duplicate cached-load facts on unrelated rerenders", async () => {
    const view = render(createElement(ViewerClient, { drop: viewerDrop })); await settleMedia();
    mediaHarness.requests.at(-1)!.resolve(imageResponse()); await settleMedia();
    expect(screen.getByTestId("loaded-media")).toHaveAttribute("data-url", "blob:viewer-fixture-1"); expect(screen.queryByRole("status")).toBeNull();
    view.rerender(createElement(ViewerClient, { drop: viewerDrop })); await settleMedia();
    expect(mediaHarness.loaded).toHaveBeenCalledTimes(1); expect(mediaHarness.requests).toHaveLength(1); expect(mediaHarness.mediaMounts).toBe(1); expect(mediaHarness.mediaUnmounts).toBe(0);
  });

  it("still cancels a changed asset and discards its late blob before publishing the newly selected asset", async () => {
    const twoFiles = buildTestDrop({ contentUrls: ["fixture-a", "fixture-b"], mediaCounts: { images: 2, videos: 0 }, fileMetadata: { type: "image/png", size: 16 } });
    const hook = renderHook(() => useViewerState({ drop: twoFiles, isAuthorized: true, trackContentLoaded: mediaHarness.loaded })); await settleMedia();
    const old = mediaHarness.requests[0]; act(() => hook.result.current.setActiveIndex(1)); await settleMedia(); const next = mediaHarness.requests.at(-1)!;
    expect(old.signal.aborted).toBe(true); expect(next.url).toContain("index=1"); old.resolve(imageResponse()); await settleMedia();
    expect(mediaHarness.revoke).toHaveBeenCalledWith("blob:viewer-fixture-1"); expect(hook.result.current.contentBlobUrl).toBeNull(); expect(mediaHarness.loaded).not.toHaveBeenCalled();
    next.resolve(imageResponse()); await settleMedia(); expect(hook.result.current.contentBlobUrl).toBe("blob:viewer-fixture-2"); expect(hook.result.current.activeIndex).toBe(1); expect(mediaHarness.loaded).toHaveBeenCalledTimes(1);
  });

  it("still aborts on unmount and revokes a late response without publishing a load fact", async () => {
    const hook = renderHook(() => useViewerState({ drop: viewerDrop, isAuthorized: true, trackContentLoaded: mediaHarness.loaded })); await settleMedia(); const request = mediaHarness.requests[0];
    hook.unmount(); expect(request.signal.aborted).toBe(true); request.resolve(imageResponse()); await settleMedia();
    expect(mediaHarness.revoke).toHaveBeenCalledWith("blob:viewer-fixture-1"); expect(mediaHarness.loaded).not.toHaveBeenCalled();
  });
});


describe("Viewer visible failure and authorization recovery", () => {
  it("keeps the actual Client error and Refresh action visible after a failed media response", async () => {
    const view = render(createElement(ViewerClient, { drop: viewerDrop })); await settleMedia();
    const request = mediaHarness.requests.at(-1)!; const count = mediaHarness.requests.length;
    request.resolve(new Response(JSON.stringify({ error: "fixture_source_unavailable" }), { status: 503, headers: { "content-type": "application/json" } })); await settleMedia();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeVisible(); expect(mediaHarness.requests).toHaveLength(count);
    act(() => screen.getByRole("button", { name: "Refresh" }).click()); expect(mediaHarness.refresh).toHaveBeenCalledTimes(1);
    view.rerender(createElement(ViewerClient, { drop: { ...viewerDrop } })); await settleMedia();
    const next = mediaHarness.requests.at(-1)!; expect(next).not.toBe(request); next.resolve(imageResponse()); await settleMedia();
    expect(screen.getByTestId("loaded-media")).toHaveAttribute("data-url", "blob:viewer-fixture-1"); expect(screen.queryByRole("status")).toBeNull(); expect(mediaHarness.loaded).toHaveBeenCalledTimes(1);
  });

  it("keeps the authorization gate, cancels a revoked request and recovers only after access is allowed again", async () => {
    const hook = renderHook(({ allowed }) => useViewerState({ drop: viewerDrop, isAuthorized: allowed, trackContentLoaded: mediaHarness.loaded }), { initialProps: { allowed: false } });
    await settleMedia(); expect(mediaHarness.requests).toHaveLength(0);
    hook.rerender({ allowed: true }); await settleMedia(); const old = mediaHarness.requests[0];
    hook.rerender({ allowed: false }); await settleMedia(); expect(old.signal.aborted).toBe(true); old.resolve(imageResponse()); await settleMedia();
    expect(hook.result.current.contentBlobUrl).toBeNull(); expect(mediaHarness.loaded).not.toHaveBeenCalled(); expect(mediaHarness.revoke).toHaveBeenCalledWith("blob:viewer-fixture-1");
    hook.rerender({ allowed: true }); await settleMedia(); const next = mediaHarness.requests.at(-1)!;
    expect(next).not.toBe(old); next.resolve(imageResponse()); await settleMedia(); expect(hook.result.current.contentBlobUrl).toBe("blob:viewer-fixture-2"); expect(mediaHarness.loaded).toHaveBeenCalledTimes(1);
  });
});
