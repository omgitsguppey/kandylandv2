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
