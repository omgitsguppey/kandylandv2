// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HumanErrorNotice } from "@/components/errors/HumanErrorNotice";
import { resolveHumanErrorFromCode } from "@/lib/errors/resolve-human-error";

describe("HumanErrorNotice", () => {
  it("renders human copy and a Send bug CTA when eligible", () => {
    const onSubmitBug = vi.fn();
    const descriptor = resolveHumanErrorFromCode("internal_server_error", "runtime");

    render(<HumanErrorNotice descriptor={descriptor} onSubmitBug={onSubmitBug} />);

    expect(screen.getByText("This hit a platform snag")).toBeTruthy();
    expect(screen.getByText(/Something ain't connected right on our side/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Send bug + get 10 GD" }));
    expect(onSubmitBug).toHaveBeenCalledTimes(1);
  });

  it("does not render debug-only details by default", () => {
    const descriptor = {
      ...resolveHumanErrorFromCode("internal_server_error", "runtime"),
      debugOnlyDetails: ["FirebaseError: raw detail", "stack trace line"],
      operatorMessage: "Operator-only diagnostic.",
    };

    render(<HumanErrorNotice descriptor={descriptor} />);

    expect(screen.queryByText(/FirebaseError/i)).toBeNull();
    expect(screen.queryByText(/stack trace/i)).toBeNull();
    expect(screen.queryByText(/Operator-only diagnostic/i)).toBeNull();
  });
});
