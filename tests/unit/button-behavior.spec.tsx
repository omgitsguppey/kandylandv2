// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/Button";

describe("Button behavior", () => {
  it("blocks an action while pending even when the caller passes disabled false", () => {
    const action = vi.fn();
    render(<Button isLoading disabled={false} onClick={action}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });

    fireEvent.click(button);

    expect(action).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("allows the action again after pending work settles", () => {
    const action = vi.fn();
    const { rerender } = render(<Button onClick={action}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.click(button);
    expect(action).toHaveBeenCalledTimes(1);

    rerender(<Button isLoading onClick={action}>Save</Button>);
    fireEvent.click(button);
    expect(action).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();

    rerender(<Button isLoading={false} disabled={false} onClick={action}>Save</Button>);
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("preserves caller-provided native busy status when loading is false", () => {
    render(<Button isLoading={false} aria-busy={true}>Refresh</Button>);

    expect(screen.getByRole("button", { name: "Refresh" })).toHaveAttribute("aria-busy", "true");
  });

  it("forwards the ref to the stable native button so the caller can focus it", () => {
    const ref = createRef<HTMLButtonElement>();
    const { rerender } = render(<Button ref={ref} type="button">Continue</Button>);
    const button = screen.getByRole("button", { name: "Continue" });

    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute("type", "button");
    ref.current?.focus();
    expect(button).toHaveFocus();

    rerender(<Button ref={ref} type="button" isLoading>Continue</Button>);
    expect(ref.current).toBe(button);
    rerender(<Button ref={ref} type="button" isLoading={false}>Continue</Button>);
    expect(ref.current).toBe(button);
    ref.current?.focus();
    expect(button).toHaveFocus();
  });
});
