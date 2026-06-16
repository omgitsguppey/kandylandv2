// @vitest-environment happy-dom

import { render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  authFetch: vi.fn(),
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

import ContentManagerPage from "@/app/admin/content/page";

describe("ContentManagerPage", () => {
  beforeEach(() => {
    mockState.authFetch.mockReset();
    mockState.reportClientIssue.mockReset();
    mockState.toastSuccess.mockReset();
    mockState.toastError.mockReset();
    mockState.user = {
      uid: "admin-ui-smoke",
      providerData: [{ providerId: "admin-ui-test-session" }],
    };
  });

  it("labels storage truth as source_missing and disables mutations for the local admin UI fixture", async () => {
    render(<ContentManagerPage />);

    expect(await screen.findByText(/Source missing/i)).toBeInTheDocument();
    expect(screen.getByText(/No storage sample is loaded for this local review/i)).toBeInTheDocument();
    expect(screen.getByText(/Storage samples, uploads, and deletes need a verified admin session/i)).toHaveAttribute("data-admin-content-source-state", "source_missing");
    expect(screen.getByRole("button", { name: /Upload unavailable/i })).toBeDisabled();
    expect(screen.getByLabelText("Upload content file")).toBeDisabled();
    expect(mockState.authFetch).not.toHaveBeenCalled();
  });

  it("keeps real admin sessions on the canonical content route", async () => {
    mockState.user = {
      uid: "admin-real",
      providerData: [{ providerId: "password" }],
    };
    mockState.authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ files: [] }),
    });

    render(<ContentManagerPage />);

    await waitFor(() => expect(mockState.authFetch).toHaveBeenCalledWith("/api/admin/content", { cache: "no-store" }));
    expect(screen.queryByText(/Source missing/i)).not.toBeInTheDocument();
    expect(await screen.findByText(/No drop assets found/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Upload file/i })).toBeEnabled();
  });
});
