// @vitest-environment happy-dom

import { type ReactNode, useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CreateDropModal } from "@/components/Admin/CreateDropModal";

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
    onChange?: (assets: Array<{ id: string; url: string; type: string; size: number }>) => void;
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
  authFetch: vi.fn(async () => ({
    ok: true,
    json: async () => ({ creators: [] }),
  })),
}));

vi.mock("@/lib/client-error-reporting", () => ({
  reportClientIssue: vi.fn(),
}));

vi.mock("@/hooks/client-runtime", () => ({
  dispatchAdminOverviewSync: vi.fn(),
}));

vi.mock("@/lib/telemetry", () => ({
  trackEvent: vi.fn(),
}));

describe("CreateDropModal upload guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    fireEvent.click(screen.getByRole("button", { name: /Files & Assets/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Create Drop/i })).toBeDisabled();
    });
  });
});
