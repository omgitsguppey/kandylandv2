// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HumanErrorNotice } from "@/components/errors/HumanErrorNotice";
import { resolveHumanErrorFromCode } from "@/lib/errors/resolve-human-error";

describe("HumanErrorNotice bug report reward state", () => {
  it("renders reward CTA when bug rewards are eligible", () => {
    const descriptor = {
      ...resolveHumanErrorFromCode("internal_server_error", "runtime"),
      rewardEligible: true,
    };

    render(<HumanErrorNotice descriptor={descriptor} onSubmitBug={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Send bug + get 10 GD" })).toBeTruthy();
  });

  it("shows reward-balance success copy after submit", async () => {
    const descriptor = {
      ...resolveHumanErrorFromCode("internal_server_error", "runtime"),
      rewardEligible: true,
    };
    const onSubmitBug = vi.fn().mockResolvedValue({
      success: true,
      status: "rewarded",
      rewardGranted: true,
      rewardGd: 10,
    });

    render(<HumanErrorNotice descriptor={descriptor} onSubmitBug={onSubmitBug} />);

    fireEvent.click(screen.getByRole("button", { name: "Send bug + get 10 GD" }));

    await waitFor(() => {
      expect(screen.getByText(/10 reward GumDrops added/i)).toBeTruthy();
    });
    expect(screen.queryByText(/purchased GumDrops/i)).toBeNull();
  });

  it("does not render raw debug details", () => {
    const descriptor = {
      ...resolveHumanErrorFromCode("internal_server_error", "runtime"),
      debugOnlyDetails: ["FirebaseError raw provider detail", "stack trace"],
      operatorMessage: "Operator raw detail",
    };

    render(<HumanErrorNotice descriptor={descriptor} onSubmitBug={vi.fn()} />);

    expect(screen.queryByText(/FirebaseError/i)).toBeNull();
    expect(screen.queryByText(/stack trace/i)).toBeNull();
    expect(screen.queryByText(/Operator raw/i)).toBeNull();
  });
});
