// @vitest-environment happy-dom

import { render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

  it("shows a source_missing local review state instead of a raw auth failure for the fixture", async () => {
    render(<ManageQueuePage />);

    expect(await screen.findByText("Local UI review only.")).toBeInTheDocument();
    expect(screen.getByText(/Queue data is source_missing in local review/i)).toBeInTheDocument();
    expect(screen.queryByText("Queue data could not be loaded.")).not.toBeInTheDocument();
    expect(screen.queryByText("Retry Queue Load")).not.toBeInTheDocument();
    expect(mockState.authFetch).not.toHaveBeenCalled();
    expect(mockState.getDocs).not.toHaveBeenCalled();
  });

  it("keeps real admin sessions connected to the canonical queue route", async () => {
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
    expect(screen.queryByText("Local UI review only.")).not.toBeInTheDocument();
  });
});
