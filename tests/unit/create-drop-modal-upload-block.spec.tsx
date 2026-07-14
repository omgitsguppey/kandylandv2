// @vitest-environment happy-dom

import { type ReactNode, useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import { CreateDropModal } from "@/components/Admin/CreateDropModal";

const mockState = vi.hoisted(() => ({
  authFetch: vi.fn(),
  reportClientIssue: vi.fn(),
  dispatchAdminOverviewSync: vi.fn(),
  trackEvent: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  uploadMode: "uploading" as "uploading" | "success",
}));

vi.mock("@radix-ui/react-dialog", () => ({
  Root: ({ children }: { children: ReactNode }) => <>{children}</>,
  Portal: ({ children }: { children: ReactNode }) => <>{children}</>,
  Overlay: ({ children }: { children: ReactNode }) => <>{children}</>,
  Content: ({ children, ...props }: { children: ReactNode }) => <div {...props}>{children}</div>,
  Title: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  Close: ({ children }: { children: ReactNode }) => <>{children}</>,
  Description: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/Admin/AssetUploader", () => ({
  AssetUploader: ({
    label,
    onChange,
    onDraftStateChange,
  }: {
    label: string;
    onChange?: (assets: Array<{ id: string; url: string; type: string; size: number; fileName?: string }>) => void;
    onDraftStateChange?: (snapshot: {
      draftId: string;
      assets: Array<{
        id: string;
        kind: "image" | "video" | "file";
        uploadStatus: "queued" | "uploading" | "processing";
        uploadProgress: number;
        uploadType: string;
        uploadSize: number;
        uploadPath: "server" | "firebase_storage";
      }>;
      summary: {
        total: number;
        queued: number;
        uploading: number;
        processing: number;
        success: number;
        failed: number;
        blocked: number;
        canceled: number;
        allComplete: boolean;
      };
    }) => void;
  }) => {
    useEffect(() => {
      if (mockState.uploadMode === "success") {
        onChange?.([{
          id: `${label.toLowerCase()}-asset`,
          url: `https://example.com/${label.toLowerCase()}-asset.jpg`,
          type: label === "Cover" ? "image/jpeg" : "video/mp4",
          size: 1200,
          fileName: `${label.toLowerCase()}-asset.jpg`,
        }]);
        onDraftStateChange?.({
          draftId: "draft-session-1",
          assets: [],
          summary: {
            total: 1,
            queued: 0,
            uploading: 0,
            processing: 0,
            success: 1,
            failed: 0,
            blocked: 0,
            canceled: 0,
            allComplete: true,
          },
        });
        return;
      }

      onChange?.([]);
      onDraftStateChange?.({
        draftId: "draft-session-1",
        assets: [{
          id: `${label}-draft`,
          kind: "image",
          uploadStatus: "uploading",
          uploadProgress: 15,
          uploadType: "image/png",
          uploadSize: 12,
          uploadPath: "server",
        }],
        summary: {
          total: 1,
          queued: 0,
          uploading: 1,
          processing: 0,
          success: 0,
          failed: 0,
          blocked: 0,
          canceled: 0,
          allComplete: false,
        },
      });
    }, [label, onChange, onDraftStateChange]);

    return <div data-testid={`mock-${label.toLowerCase()}`} />;
  },
}));

vi.mock("@/components/Admin/AiDropCoverGeneratorPanel", () => ({
  AiDropCoverGeneratorPanel: () => null,
}));

vi.mock("@/components/Admin/AiDropDescriptionGeneratorPanel", () => ({
  AiDropDescriptionGeneratorPanel: () => null,
}));

vi.mock("@/lib/firebase-data", () => ({
  db: {},
}));

vi.mock("@/lib/authFetch", () => ({
  authFetch: mockState.authFetch,
}));

vi.mock("@/lib/client-error-reporting", () => ({
  reportClientIssue: mockState.reportClientIssue,
}));

vi.mock("@/hooks/client-runtime", () => ({
  dispatchAdminOverviewSync: mockState.dispatchAdminOverviewSync,
}));

vi.mock("@/lib/telemetry", () => ({
  trackEvent: mockState.trackEvent,
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockState.toastError,
    success: mockState.toastSuccess,
  },
}));

describe("CreateDropModal upload guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.uploadMode = "uploading";
    mockState.authFetch.mockImplementation(async (url: string) => {
      if (url === "/api/admin/creator-options") {
        return {
          ok: true,
          json: async () => ({ creators: [{ uid: "creator_1", displayName: "Creator One", username: "creator", photoURL: null, role: "creator" }] }),
        };
      }
      if (url === "/api/drops/duplicate-filenames") {
        return {
          ok: true,
          json: async () => ({ duplicates: [] }),
        };
      }
      return {
        ok: true,
        json: async () => ({ success: true, id: "drop_1" }),
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks submit while draft uploads are still active", async () => {
    render(
      <CreateDropModal
        isOpen
        onClose={() => undefined}
        onSuccess={() => undefined}
        mode="admin"
      />,
    );

    expect(document.querySelector('[data-admin-drop-form-presentation="inline"]')).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Files & Assets/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Create Drop/i })).toBeDisabled();
    });
    expect(screen.getAllByText(/Uploads are still finishing/i).length).toBeGreaterThan(0);
  });

  it("opens Basics on first render so creator required fields are visible", () => {
    mockState.uploadMode = "success";

    render(
      <CreateDropModal
        isOpen
        onClose={() => undefined}
        onSuccess={() => undefined}
        mode="creator"
        creatorIdOverride="creator_1"
      />,
    );

    const basicsButton = screen.getByRole("button", { name: /Basics/i });
    const assetsButton = screen.getByRole("button", { name: /Files & Assets/i });
    expect(screen.getByPlaceholderText(/Drop Title/i)).toBeInTheDocument();
    expect(basicsButton).toHaveAttribute("aria-expanded", "true");
    expect(assetsButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(assetsButton);

    expect(assetsButton).toHaveAttribute("aria-expanded", "true");
  });

  it("submits creator drops through the creator route and calls success reload callback", async () => {
    mockState.uploadMode = "success";
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(
      <CreateDropModal
        isOpen
        onClose={() => undefined}
        onSuccess={onSuccess}
        mode="creator"
        creatorIdOverride="creator_1"
      />,
    );

    await user.type(screen.getByPlaceholderText(/Drop Title/i), "Creator drop");
    await user.type(screen.getByPlaceholderText(/Describe what's inside/i), "A complete creator drop description.");
    await user.click(screen.getByRole("button", { name: /Files & Assets/i }));
    await screen.findByTestId("mock-cover");
    await user.click(screen.getByRole("button", { name: /Submit for review/i }));

    await waitFor(() => {
      expect(mockState.authFetch).toHaveBeenCalledWith("/api/creator/drops", expect.objectContaining({ method: "POST" }));
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(mockState.trackEvent).toHaveBeenCalledWith("creator_drop_submit_succeeded", expect.objectContaining({
      drop_id: "drop_1",
      source_component: "CreateDropModal",
    }));
  });

  it("submits admin drops through the admin route without changing the admin action design", async () => {
    mockState.uploadMode = "success";
    const user = userEvent.setup();

    render(
      <CreateDropModal
        isOpen
        onClose={() => undefined}
        onSuccess={() => undefined}
        mode="admin"
      />,
    );

    await user.type(screen.getByPlaceholderText(/Drop Title/i), "Admin drop");
    await user.type(screen.getByPlaceholderText(/Describe what's inside/i), "A complete admin drop description.");
    await user.click(screen.getByRole("button", { name: /Files & Assets/i }));
    await screen.findByTestId("mock-cover");
    await user.click(screen.getByRole("button", { name: /Create Drop/i }));

    await waitFor(() => {
      expect(mockState.authFetch).toHaveBeenCalledWith("/api/admin/drops", expect.objectContaining({ method: "POST" }));
    });
    expect(document.querySelector('[data-admin-drop-form-presentation="inline"]')).not.toBeNull();
  });

  it("opens the affected section and reports route diagnostics for API 422 responses", async () => {
    mockState.uploadMode = "success";
    mockState.authFetch.mockImplementation(async (url: string) => {
      if (url === "/api/drops/duplicate-filenames") {
        return {
          ok: true,
          json: async () => ({ duplicates: [] }),
        };
      }
      if (url === "/api/creator/drops") {
        return {
          ok: false,
          json: async () => ({
            error: "Add the required cover and locked content media before submitting.",
            errorClass: "media_required",
            recoveryAction: "Upload cover media and required locked content, then submit again.",
            details: ["cover media missing", "content asset missing"],
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ creators: [] }),
      };
    });
    const user = userEvent.setup();

    render(
      <CreateDropModal
        isOpen
        onClose={() => undefined}
        onSuccess={() => undefined}
        mode="creator"
        creatorIdOverride="creator_1"
      />,
    );

    await user.type(screen.getByPlaceholderText(/Drop Title/i), "Creator drop");
    await user.type(screen.getByPlaceholderText(/Describe what's inside/i), "A complete creator drop description.");
    await user.click(screen.getByRole("button", { name: /Files & Assets/i }));
    await screen.findByTestId("mock-cover");
    await user.click(screen.getByRole("button", { name: /Submit for review/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Upload cover media and required locked content/i).length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getByTestId("mock-cover")).toBeInTheDocument();
    expect(mockState.reportClientIssue).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({
        field: "imageUrl",
        section: "assets",
        route: "/api/creator/drops",
        errorClass: "media_required",
        recoveryAction: "Upload cover media and required locked content, then submit again.",
      }),
    }));
    expect(mockState.toastError).toHaveBeenCalledWith(expect.stringContaining("Add the required cover"));
  });

  it("shows inline diagnostics when the save request rejects before a response", async () => {
    mockState.uploadMode = "success";
    mockState.authFetch.mockImplementation(async (url: string) => {
      if (url === "/api/drops/duplicate-filenames") {
        return {
          ok: true,
          json: async () => ({ duplicates: [] }),
        };
      }
      if (url === "/api/creator/drops") {
        throw new Error("Network unavailable");
      }
      return {
        ok: true,
        json: async () => ({ creators: [] }),
      };
    });
    const user = userEvent.setup();

    render(
      <CreateDropModal
        isOpen
        onClose={() => undefined}
        onSuccess={() => undefined}
        mode="creator"
        creatorIdOverride="creator_1"
      />,
    );

    await user.type(screen.getByPlaceholderText(/Drop Title/i), "Creator drop");
    await user.type(screen.getByPlaceholderText(/Describe what's inside/i), "A complete creator drop description.");
    await user.click(screen.getByRole("button", { name: /Files & Assets/i }));
    await screen.findByTestId("mock-cover");
    await user.click(screen.getByRole("button", { name: /Submit for review/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Network unavailable/i).length).toBeGreaterThanOrEqual(2);
    });
    expect(mockState.reportClientIssue).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({
        section: "basics",
        route: "/api/creator/drops",
        errorClass: "unexpected_create_drop_submit_failure",
        recoveryAction: "Try again. If it keeps failing, check your permissions and upload status.",
      }),
    }));
    expect(mockState.toastError).toHaveBeenCalledWith("Network unavailable");
  });
});
