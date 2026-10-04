// @vitest-environment happy-dom
// Component behavior proof; real viewport sizing is verified separately.
import React from "react";
import { fireEvent, render, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { push, trackEvent, navbarState } = vi.hoisted(() => ({
  push: vi.fn(),
  trackEvent: vi.fn(),
  navbarState: {
    pathname: "/drops",
    role: "admin",
    signedIn: true,
    loading: false,
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => navbarState.pathname,
}));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: navbarState.signedIn ? { uid: "admin_nav_fixture", displayName: "Admin", photoURL: null } : null,
    userProfile: navbarState.signedIn ? { role: navbarState.role, gumDropsBalance: 100 } : null,
    loading: navbarState.loading,
  }),
}));
vi.mock("@/context/UIContext", () => ({
  useUI: () => ({
    openPurchaseModal: vi.fn(),
    openAuthModal: vi.fn(),
    isProfileSidebarOpen: false,
    openProfileSidebar: vi.fn(),
    closeProfileSidebar: vi.fn(),
  }),
}));
vi.mock("@/lib/telemetry", () => ({ trackEvent }));
// Deferred header overlays are outside these role/destination cases.
// Navbar and its sourced primary-navigation component remain real.
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("next/image", () => ({ default: ({ preload: _preload, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { preload?: boolean }) => <img {...props} /> }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));

import { Navbar } from "@/components/Navbar";

import { AdminControlTowerNavigation } from "@/components/creative-tim/kandydrops/admin/AdminControlTowerNavigation";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";

const destinations = ["/admin", "/admin/analytics", "/admin/drops", "/admin/users", "/admin/roster", "/admin/support", "/admin/moderation", "/admin/content", "/admin/economy", "/admin/privacy", "/admin/debug", "/admin/ai"];

describe("Admin control tower navigation", () => {
  beforeEach(() => { push.mockClear(); });

  it("keeps all mobile options, desktop destinations and the site exit reachable", () => {
    const { container } = render(<AdminControlTowerNavigation pathname="/admin/users" />);
    const mobile = within(container.querySelector("nav") as HTMLElement);
    const chooser = mobile.getByRole("combobox", { name: "Admin section" }) as HTMLSelectElement;
    expect(within(chooser).getAllByRole("option").map((option) => option.getAttribute("value"))).toEqual(destinations);
    expect(chooser.value).toBe("/admin/users");
    const desktop = within(container.querySelector("aside") as HTMLElement);
    expect(desktop.getAllByRole("link").filter((link) => link.textContent !== "View site").map((link) => link.getAttribute("href"))).toEqual(destinations);
    expect(desktop.getByRole("link", { name: "Users" }).getAttribute("aria-current")).toBe("page");
    expect(desktop.getByRole("link", { name: "Home" }).hasAttribute("aria-current")).toBe(false);
    expect(within(container).getAllByRole("link", { name: "View site" }).every((link) => link.getAttribute("href") === "/")).toBe(true);
  });

  it("navigates once for a new section and does not replay the current destination", () => {
    const { container } = render(<AdminControlTowerNavigation pathname="/admin/users" />);
    const chooser = within(container).getByRole("combobox", { name: "Admin section" });
    fireEvent.change(chooser, { target: { value: "/admin/users" } });
    expect(push).not.toHaveBeenCalled();
    fireEvent.change(chooser, { target: { value: "/admin/analytics" } });
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/analytics");
  });

  it.each([
    ["/admin/analytics/details", "/admin/analytics", "Analytics"],
    ["/admin/user/redacted-user", "/admin/users", "Users"],
  ])("keeps the owning section selected on nested route %s", (pathname, href, label) => {
    const { container } = render(<AdminControlTowerNavigation pathname={pathname} />);
    expect((within(container).getByRole("combobox", { name: "Admin section" }) as HTMLSelectElement).value).toBe(href);
    expect(within(container.querySelector("aside") as HTMLElement).getByRole("link", { name: label }).getAttribute("aria-current")).toBe("page");
  });

  it("retains all destinations on an unrecognized route without inventing an active section", () => {
    const { container } = render(<AdminControlTowerNavigation pathname="/admin/unknown" />);
    const chooser = within(container).getByRole("combobox", { name: "Admin section" }) as HTMLSelectElement;
    expect(chooser.value).toBe("");
    expect(within(chooser).getAllByRole("option").filter((option) => !(option as HTMLOptionElement).disabled).map((option) => option.getAttribute("value"))).toEqual(destinations);
    expect(container.querySelectorAll("[aria-current=page]")).toHaveLength(0);
  });
});

describe("Admin page heading", () => {
  it("preserves one heading, actions and truth detail slots", () => {
    const activate = vi.fn();
    const { container } = render(<AdminPageHeader title="Analytics" subtitle="Selected range" eyebrow={null} actions={<button onClick={activate}>Refresh</button>} topSlot={<p>Source missing</p>} />);
    const view = within(container);
    expect(view.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(view.getByRole("heading", { name: "Analytics" })).toBeTruthy();
    expect(view.getByText("Selected range")).toBeTruthy();
    expect(view.getByText("Source missing")).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Refresh" }));
    expect(activate).toHaveBeenCalledOnce();
  });
});

const memberDestinations = ["/dashboard", "/drops", "/experiences", "/dashboard/chat"];

function primaryNavigation(container: HTMLElement) {
  return within(container).getByRole("navigation", { name: "Primary navigation" });
}

describe("Admin access to the member primary navigation", () => {
  beforeEach(() => {
    navbarState.pathname = "/drops";
    navbarState.role = "admin";
    navbarState.signedIn = true;
    navbarState.loading = false;
    trackEvent.mockReset();
  });

  it("keeps all member destinations alongside Control tower without changing the admin home target", () => {
    const { container } = render(<Navbar />);
    expect(within(primaryNavigation(container)).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([...memberDestinations, "/admin"]);
    expect(within(primaryNavigation(container)).getByRole("link", { name: "My KandyDrops" })).toHaveAttribute("href", "/dashboard");
    expect(within(container).getByRole("link", { name: "KandyDrops home" })).toHaveAttribute("href", "/admin");
  });

  it("selects the owning public or Control tower route once on nested destinations", () => {
    navbarState.pathname = "/dashboard/chat/thread";
    const { container, rerender } = render(<Navbar />);
    expect(primaryNavigation(container).querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(within(primaryNavigation(container)).getByRole("link", { name: "Chat" })).toHaveAttribute("aria-current", "page");
    expect(within(primaryNavigation(container)).getByRole("link", { name: "My KandyDrops" })).not.toHaveAttribute("aria-current");
    navbarState.pathname = "/admin/analytics";
    rerender(<Navbar />);
    expect(primaryNavigation(container).querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(within(primaryNavigation(container)).getByRole("link", { name: "Control tower" })).toHaveAttribute("aria-current", "page");
  });

  it("uses the existing navigation telemetry callback once for an admin member destination", () => {
    const { container } = render(<Navbar />);
    fireEvent.click(within(primaryNavigation(container)).getByRole("link", { name: "Chat" }));
    expect(trackEvent).toHaveBeenCalledExactlyOnceWith("navigation_click", {
      destination: "/dashboard/chat",
      source: "navbar_primary_navigation",
      source_component: "navbar",
    });
  });

  it.each([
    ["user", "/dashboard", "My KandyDrops"],
    ["creator", "/dashboard/creator", "Studio"],
  ])("preserves the existing %s destinations without granting Control tower", (role, firstHref, firstLabel) => {
    navbarState.role = role;
    const { container } = render(<Navbar />);
    const primary = within(primaryNavigation(container));
    expect(primary.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([firstHref, ...memberDestinations.slice(1)]);
    expect(primary.getByRole("link", { name: firstLabel })).toHaveAttribute("href", firstHref);
    expect(primary.queryByRole("link", { name: "Control tower" })).not.toBeInTheDocument();
  });

  it("keeps guests on the existing public destinations even with a stale admin role", () => {
    navbarState.signedIn = false;
    const { container } = render(<Navbar />);
    expect(within(primaryNavigation(container)).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/drops", "/experiences"]);
    expect(within(container).getByRole("link", { name: "KandyDrops home" })).toHaveAttribute("href", "/");
  });

  it("withholds primary navigation while auth loads, then settles and removes admin access on role change", () => {
    navbarState.loading = true;
    const { container, rerender } = render(<Navbar />);
    expect(within(container).queryByRole("navigation", { name: "Primary navigation" })).not.toBeInTheDocument();
    navbarState.loading = false;
    rerender(<Navbar />);
    expect(within(primaryNavigation(container)).getByRole("link", { name: "Control tower" })).toBeInTheDocument();
    navbarState.role = "user";
    rerender(<Navbar />);
    expect(within(primaryNavigation(container)).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(memberDestinations);
    expect(within(primaryNavigation(container)).queryByRole("link", { name: "Control tower" })).not.toBeInTheDocument();
  });
});
