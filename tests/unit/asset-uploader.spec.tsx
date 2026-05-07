// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AssetUploader } from "@/components/Admin/AssetUploader";

const mockState = vi.hoisted(() => {
  let progressHandler: ((snapshot: { bytesTransferred: number; totalBytes: number }) => void) | null = null;
  let errorHandler: ((error: unknown) => void) | null = null;
  let completeHandler: (() => void) | null = null;

  return {
    authFetch: vi.fn(),
    reportClientIssue: vi.fn(),
    trackEvent: vi.fn(),
    uploadBytesResumable: vi.fn((_ref: unknown, _blob: Blob, _metadata?: Record<string, unknown>) => ({
      snapshot: { ref: { fullPath: "avatars/upload.jpg" } },
      on: (_event: string, progress?: typeof progressHandler, error?: typeof errorHandler, complete?: typeof completeHandler) => {
        progressHandler = progress ?? null;
        errorHandler = error ?? null;
        completeHandler = complete ?? null;
      },
      cancel: vi.fn(() => {
        errorHandler?.({ code: "storage/canceled" });
      }),
    })),
    getDownloadURL: vi.fn(async (_ref?: unknown) => "https://cdn.example/upload.jpg"),
    ref: vi.fn((_storage: unknown, path: string) => ({ fullPath: path })),
    emitProgress(bytesTransferred: number, totalBytes = 100) {
      progressHandler?.({ bytesTransferred, totalBytes });
    },
    emitError(error: unknown) {
      errorHandler?.(error);
    },
    emitComplete() {
      completeHandler?.();
    },
    reset() {
      this.authFetch.mockReset();
      this.reportClientIssue.mockReset();
      this.trackEvent.mockReset();
      this.uploadBytesResumable.mockClear();
      this.getDownloadURL.mockClear();
      this.ref.mockClear();
      progressHandler = null;
      errorHandler = null;
      completeHandler = null;
    },
  };
});

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { alt = "", src = "", fill: _fill, unoptimized: _unoptimized, sizes: _sizes, ...rest } = props;
    return <img alt={String(alt)} src={String(src)} {...rest} />;
  },
}));

vi.mock("react-easy-crop", () => ({
  default: () => <div data-testid="cropper" />,
}));

vi.mock("@/lib/authFetch", () => ({
  authFetch: (...args: unknown[]) => mockState.authFetch(...args),
}));

vi.mock("@/lib/client-error-reporting", () => ({
  reportClientIssue: (...args: unknown[]) => mockState.reportClientIssue(...args),
}));

vi.mock("@/lib/telemetry", () => ({
  trackEvent: (...args: unknown[]) => mockState.trackEvent(...args),
}));

vi.mock("@/lib/firebase-data", () => ({
  storage: {},
}));

vi.mock("firebase/storage", () => ({
  getDownloadURL: (refValue: unknown) => mockState.getDownloadURL(refValue),
  ref: (storageValue: unknown, path: string) => mockState.ref(storageValue, path),
  uploadBytesResumable: (refValue: unknown, blob: Blob, metadata?: Record<string, unknown>) =>
    mockState.uploadBytesResumable(refValue, blob, metadata),
}));

describe("AssetUploader", () => {
  beforeEach(() => {
    mockState.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("queues multiple selected files without showing a fake pending label", async () => {
    mockState.authFetch.mockImplementation(async (_url: string, options: RequestInit) => {
      const formData = options.body as FormData;
      const file = formData.get("file") as File;
      return {
        ok: true,
        json: async () => ({
          file: {
            url: `https://cdn.example/${file.name}`,
            contentType: file.type,
            size: file.size,
            name: file.name,
          },
        }),
      };
    });

    const onChange = vi.fn();
    render(
      <AssetUploader
        label="Content"
        folder="drops/content"
        multiple
        aspectRatio="1:1"
        onAspectRatioChange={() => undefined}
        onChange={onChange}
        accept="image/*,video/*,application/zip"
        disableCrop={true}
        serverUploadEndpoint="/api/admin/content"
      />,
    );

    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    const files = [
      new File(["a"], "first.zip", { type: "application/zip" }),
      new File(["b"], "second.mp4", { type: "video/mp4" }),
    ];

    fireEvent.change(input, { target: { files } });

    await waitFor(() => {
      expect(screen.queryByText("Pending...")).toBeNull();
      expect(document.querySelectorAll("[data-upload-status]").length).toBe(2);
      expect(mockState.authFetch).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith([
        expect.objectContaining({ url: "https://cdn.example/first.zip" }),
        expect.objectContaining({ url: "https://cdn.example/second.mp4" }),
      ]);
    });

    expect(document.querySelector("[data-upload-mobile-density='compact-v2']")).toBeTruthy();
  });

  it("shows measured firebase upload progress and emits success only after completion", async () => {
    const onChange = vi.fn();
    render(
      <AssetUploader
        label="Avatar"
        folder="avatars/uploads"
        aspectRatio="1:1"
        onAspectRatioChange={() => undefined}
        onChange={onChange}
        accept="image/*"
        disableCrop={true}
      />,
    );

    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["avatar"], "avatar.png", { type: "image/png" })],
      },
    });

    await waitFor(() => {
      expect(mockState.uploadBytesResumable).toHaveBeenCalledTimes(1);
    });

    mockState.emitProgress(42, 100);

    await waitFor(() => {
      expect(screen.getByText("Uploading 42%")).toBeTruthy();
      expect(mockState.trackEvent).toHaveBeenCalledWith("asset_upload_progress_checkpoint", expect.objectContaining({
        progress_checkpoint: 25,
      }));
    });

    mockState.emitComplete();

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith([
        expect.objectContaining({ url: "https://cdn.example/upload.jpg" }),
      ]);
      expect(screen.getByText("Uploaded")).toBeTruthy();
    });
  });

  it("shows retry controls after a failed upload", async () => {
    mockState.authFetch.mockRejectedValueOnce(new Error("permission denied"));

    render(
      <AssetUploader
        label="Content"
        folder="drops/content"
        multiple
        aspectRatio="1:1"
        onAspectRatioChange={() => undefined}
        onChange={() => undefined}
        accept="application/zip"
        disableCrop={true}
        serverUploadEndpoint="/api/admin/content"
      />,
    );

    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["bad"], "broken.zip", { type: "application/zip" })],
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeTruthy();
      expect(screen.getByText("Admin upload session expired. Sign in again.")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(mockState.trackEvent).toHaveBeenCalledWith("asset_upload_retry_clicked", expect.any(Object));
    });
  });

  it("accepts admin uploads when only persistedUrl is available", async () => {
    const onChange = vi.fn();
    mockState.authFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        file: {
          url: null,
          persistedUrl: "https://firebasestorage.googleapis.com/v0/b/test/o/drops%2Fasset.png?alt=media&token=abc",
          safePreview: {
            url: null,
          },
          contentType: "image/png",
          size: 4,
          name: "asset.png",
        },
      }),
    });

    render(
      <AssetUploader
        label="Cover"
        folder="drops/images"
        aspectRatio="1:1"
        onAspectRatioChange={() => undefined}
        onChange={onChange}
        accept="image/*"
        disableCrop={true}
        serverUploadEndpoint="/api/admin/content"
      />,
    );

    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["img"], "asset.png", { type: "image/png" })],
      },
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith([
        expect.objectContaining({
          url: "https://firebasestorage.googleapis.com/v0/b/test/o/drops%2Fasset.png?alt=media&token=abc",
        }),
      ]);
      expect(screen.getByText("Uploaded")).toBeTruthy();
    });
  });
});
