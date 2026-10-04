// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { StrictMode, type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LibraryClient } from "@/app/dashboard/library/LibraryClient";
import { CollectionList } from "@/components/Dashboard/CollectionList";
import { OwnedDropGalleryCard } from "@/components/Dashboard/OwnedDropGalleryCard";
import { buildCanonicalUserFixture } from "@/lib/testing/canonical-test-factories";
import type { Drop, UserProfile } from "@/types/db";
import { buildTestDrop } from "./utils/kandydrops-test-states";

const state = vi.hoisted(() => ({
  user: null as { uid: string } | null,
  userProfile: null as UserProfile | null,
  loading: false,
  target: "",
  trackEvent: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  cardCallbacks: new Map<string, (() => void | boolean) | undefined>(),
}));

vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: state.user, userProfile: state.userProfile, loading: state.loading }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push, replace: state.replace }), useSearchParams: () => new URLSearchParams(state.target ? { drop: state.target } : {}) }));
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: ComponentProps<"a">) => <a href={href} {...props}>{children}</a> }));
vi.mock("next/image", () => ({ default: ({ fill: _fill, preload: _preload, quality: _quality, ...props }: ComponentProps<"img"> & { fill?: boolean; preload?: boolean; quality?: number }) => <img {...props} /> }));
vi.mock("@/lib/telemetry", () => ({ trackEvent: (...args: unknown[]) => state.trackEvent(...args) }));
vi.mock("@/components/Dashboard/OwnedDropGalleryCard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/Dashboard/OwnedDropGalleryCard")>();
  return { OwnedDropGalleryCard: (props: ComponentProps<typeof actual.OwnedDropGalleryCard>) => {
    state.cardCallbacks.set(props.drop.id, props.onOpen);
    return <actual.OwnedDropGalleryCard {...props} />;
  } };
});

const drops: Drop[] = [
  buildTestDrop({ id: "owned-a", title: "Sunset letters", creatorId: "creator-alex", validUntil: undefined, mediaCounts: { images: 2, videos: 1 } }),
  buildTestDrop({ id: "owned-b", title: "Morning notes", creatorId: "creator-bri", validUntil: undefined }),
  buildTestDrop({ id: "unowned", title: "Public discovery", creatorId: "creator-alex", validUntil: undefined }),
];

function account(uid = "member-a", owned = ["owned-a", "owned-b"]) {
  state.user = { uid };
  state.userProfile = buildCanonicalUserFixture({ uid, unlockedContent: owned });
  state.loading = false;
}

function changeCreator(value: string) {
  const select = screen.queryByRole("combobox", { name: "Filter your KandyDrops" });
  if (select) fireEvent.change(select, { target: { value } });
  else fireEvent.click(screen.getByRole("button", { name: value }));
}

function events(name: string) { return state.trackEvent.mock.calls.filter(([event]) => event === name); }

beforeEach(() => {
  account();
  state.target = "";
  state.trackEvent.mockReset();
  state.push.mockReset();
  state.replace.mockReset();
  state.cardCallbacks.clear();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Library actor, ownership and catalog readiness", () => {
  it("masks retained profile content while auth is unresolved", () => {
    state.loading = true;
    render(<LibraryClient drops={drops} />);
    expect(screen.queryByText("Sunset letters")).not.toBeInTheDocument();
    expect(screen.queryByText("No unwrapped Drops yet")).not.toBeInTheDocument();
    expect(events("library_viewed")).toHaveLength(0);
    expect(document.querySelector('[data-user-library-loading-stable="true"]')).toBeInTheDocument();
  });

  it("offers actual reload recovery for a resolved missing profile instead of claiming zero", () => {
    state.userProfile = null;
    const reload = vi.spyOn(window.location, "reload").mockImplementation(() => undefined);
    render(<LibraryClient drops={drops} />);
    expect(screen.getByRole("heading", { name: "Collection unavailable" })).toBeInTheDocument();
    expect(screen.queryByText("No unwrapped Drops yet")).not.toBeInTheDocument();
    expect(screen.queryByText("0 Drops are ready to revisit.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reload collection" }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(events("library_viewed")).toHaveLength(0);
  });

  it("rejects stale A ownership and target under B, then recovers when B's profile arrives", () => {
    state.user = { uid: "member-b" };
    state.target = "owned-a";
    const view = render(<LibraryClient drops={drops} />);
    expect(screen.queryByText("Sunset letters")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Collection unavailable" })).toBeInTheDocument();
    expect(state.replace).not.toHaveBeenCalled();
    account("member-b", ["owned-b"]);
    view.rerender(<LibraryClient drops={drops} />);
    expect(screen.getByText("Morning notes")).toBeInTheDocument();
    expect(screen.queryByText("Sunset letters")).not.toBeInTheDocument();
    expect(state.replace).not.toHaveBeenCalled();
    expect(events("library_viewed")).toHaveLength(1);
  });

  it("distinguishes missing ownership from a known empty ownership array", () => {
    state.userProfile = buildCanonicalUserFixture({ uid: "member-a", unlockedContent: undefined });
    const view = render(<LibraryClient drops={drops} />);
    expect(screen.getByRole("heading", { name: "Collection unavailable" })).toBeInTheDocument();
    expect(screen.queryByText("No unwrapped Drops yet")).not.toBeInTheDocument();
    account("member-a", []);
    view.rerender(<LibraryClient drops={drops} />);
    expect(screen.getByText("No unwrapped Drops yet")).toBeInTheDocument();
    const browse = screen.getByRole("link", { name: "Browse Drops" });
    expect(browse).toHaveAttribute("href", "/drops");
    expect(within(browse).queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps nonempty ownership unavailable while catalog details are absent, and recovers on valid metadata", () => {
    account("member-a", ["owned-a"]);
    const view = render(<LibraryClient drops={[]} />);
    expect(screen.getByRole("heading", { name: "Collection unavailable" })).toBeInTheDocument();
    expect(screen.queryByText("No unwrapped Drops yet")).not.toBeInTheDocument();
    view.rerender(<LibraryClient drops={drops} />);
    expect(screen.getByText("Sunset letters")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Collection unavailable" })).not.toBeInTheDocument();
  });

  it("preserves valid partial metadata and identifies the unavailable remainder", () => {
    account("member-a", ["owned-a", "catalog-missing"]);
    render(<LibraryClient drops={drops} />);
    expect(screen.getByText("Sunset letters")).toBeInTheDocument();
    expect(screen.queryByText("Public discovery")).not.toBeInTheDocument();
    expect(screen.getByText("One Drop is ready to revisit.")).toBeInTheDocument();
    expect(screen.getByText("Some owned Drops are unavailable in this collection.")).toBeInTheDocument();
  });
});

describe("Library scoped browsing controls", () => {
  it("filters by actual creator and query, emits the existing query fact, and resets a no-results state", () => {
    render(<LibraryClient drops={drops} />);
    changeCreator("creator-bri");
    expect(screen.getByText("Morning notes")).toBeInTheDocument();
    expect(screen.queryByText("Sunset letters")).not.toBeInTheDocument();
    const search = screen.getByRole("searchbox", { name: "Search your KandyDrops" });
    fireEvent.change(search, { target: { value: "no" } });
    expect(events("library_search")).toHaveLength(0);
    fireEvent.change(search, { target: { value: "missing" } });
    expect(events("library_search")).toEqual([["library_search", { query: "missing" }]]);
    expect(screen.getByText("No Drops match that search or filter.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search and filters" }));
    expect(search).toHaveValue("");
    expect(screen.getByText("Sunset letters")).toBeInTheDocument();
    expect(screen.getByText("Morning notes")).toBeInTheDocument();
    expect(events("library_search")).toHaveLength(1);
  });

  it("matches creator text in the existing scoped query and retains the two layout choices", () => {
    render(<LibraryClient drops={drops} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search your KandyDrops" }), { target: { value: "CREATOR-ALEX" } });
    expect(screen.getByText("Sunset letters")).toBeInTheDocument();
    expect(screen.queryByText("Morning notes")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use compact collection wall" }));
    expect(screen.getByRole("button", { name: "Use compact collection wall" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Use spacious collection wall" }));
    expect(screen.getByRole("button", { name: "Use spacious collection wall" })).toHaveAttribute("aria-pressed", "true");
    expect(events("library_viewed")).toHaveLength(1);
  });

  it("retains browsing choices through profile-only updates without making another visit", () => {
    const view = render(<LibraryClient drops={drops} />);
    changeCreator("creator-bri");
    fireEvent.change(screen.getByRole("searchbox", { name: "Search your KandyDrops" }), { target: { value: "Morning" } });
    fireEvent.click(screen.getByRole("button", { name: "Use compact collection wall" }));
    state.userProfile = { ...state.userProfile!, gumDropsBalance: 500, displayName: "Updated name" };
    view.rerender(<LibraryClient drops={drops} />);
    expect(screen.getByRole("searchbox", { name: "Search your KandyDrops" })).toHaveValue("Morning");
    expect(screen.getByRole("button", { name: "Use compact collection wall" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Morning notes")).toBeInTheDocument();
    expect(events("library_viewed")).toHaveLength(1);
  });

  it("resets actor-bound browsing choices when a same-role account changes", () => {
    const view = render(<LibraryClient drops={drops} />);
    changeCreator("creator-alex");
    fireEvent.change(screen.getByRole("searchbox", { name: "Search your KandyDrops" }), { target: { value: "Sunset" } });
    fireEvent.click(screen.getByRole("button", { name: "Use compact collection wall" }));
    account("member-b", ["owned-b"]);
    view.rerender(<LibraryClient drops={drops} />);
    expect(screen.getByRole("searchbox", { name: "Search your KandyDrops" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "Use spacious collection wall" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Morning notes")).toBeInTheDocument();
    expect(screen.queryByText("Sunset letters")).not.toBeInTheDocument();
  });
});

describe("Library target and retained action custody", () => {
  it("waits for matching ownership before opening a requested target, including absent catalog metadata", () => {
    const target = "owned target/one?";
    state.target = target;
    state.userProfile = null;
    const view = render(<LibraryClient drops={[]} />);
    expect(state.replace).not.toHaveBeenCalled();
    account("member-a", [target]);
    view.rerender(<LibraryClient drops={[]} />);
    expect(state.replace).toHaveBeenCalledExactlyOnceWith(`/dashboard/viewer?id=${encodeURIComponent(target)}`);
  });

  it("keeps StrictMode replay and profile refresh from duplicating the same target, while allowing a new target and remount", () => {
    state.target = "owned-a";
    const view = render(<StrictMode><LibraryClient drops={drops} /></StrictMode>);
    expect(state.replace).toHaveBeenCalledTimes(1);
    state.userProfile = { ...state.userProfile!, unlockedContent: ["owned-a", "owned-b"] };
    view.rerender(<StrictMode><LibraryClient drops={drops} /></StrictMode>);
    expect(state.replace).toHaveBeenCalledTimes(1);
    state.target = "owned-b";
    view.rerender(<StrictMode><LibraryClient drops={drops} /></StrictMode>);
    expect(state.replace).toHaveBeenCalledTimes(2);
    view.unmount();
    render(<LibraryClient drops={drops} />);
    expect(state.replace).toHaveBeenCalledTimes(3);
  });

  it.each(["account switch", "logout and same account", "unmount"] as const)("declines a retained old open callback after %s", (transition) => {
    const view = render(<LibraryClient drops={drops} />);
    const oldOpen = state.cardCallbacks.get("owned-a");
    expect(oldOpen).toBeTypeOf("function");
    if (transition === "account switch") {
      account("member-b", ["owned-b"]);
      view.rerender(<LibraryClient drops={drops} />);
    } else if (transition === "logout and same account") {
      state.user = null;
      state.userProfile = null;
      view.rerender(<LibraryClient drops={drops} />);
      account();
      view.rerender(<LibraryClient drops={drops} />);
    } else view.unmount();
    let accepted: void | boolean;
    act(() => { accepted = oldOpen?.(); });
    expect(accepted!).toBe(false);
    expect(state.push).not.toHaveBeenCalled();
  });

  it("declines retained ownership removed by the current matching profile", () => {
    const view = render(<LibraryClient drops={drops} />);
    const oldOpen = state.cardCallbacks.get("owned-a");
    account("member-a", ["owned-b"]);
    view.rerender(<LibraryClient drops={drops} />);
    expect(oldOpen?.()).toBe(false);
    expect(state.push).not.toHaveBeenCalled();
  });
});

describe("Shared sourced collection card and member sibling", () => {
  it("opens owned content once using the existing route and click fact without rendering internal media", () => {
    render(<LibraryClient drops={drops} />);
    fireEvent.click(screen.getByRole("button", { name: /Sunset letters/ }));
    expect(state.push).toHaveBeenCalledExactlyOnceWith("/dashboard/viewer?id=owned-a");
    expect(events("owned_drop_clicked")).toEqual([["owned_drop_clicked", { drop_id: "owned-a", drop_category: "content" }]]);
    expect(document.querySelector('img[src="/locked-content.jpg"]')).not.toBeInTheDocument();
    expect(screen.getByLabelText("2 images, 1 video")).toBeInTheDocument();
  });

  it("uses the actual public-cover fallback on image failure and accepts a replacement cover", () => {
    const view = render(<OwnedDropGalleryCard drop={drops[0]} isUnlocked onOpen={() => undefined} />);
    const cover = screen.getByRole("img", { name: "Sunset letters" });
    fireEvent.error(cover);
    expect(cover.getAttribute("src")).not.toBe("/test-cover.jpg");
    expect(cover.getAttribute("src")).not.toBe("/locked-content.jpg");
    view.rerender(<OwnedDropGalleryCard drop={{ ...drops[0], imageUrl: "/replacement-cover.jpg" }} isUnlocked onOpen={() => undefined} />);
    expect(cover).toHaveAttribute("src", "/replacement-cover.jpg");
    expect(cover).toHaveAttribute("loading", "lazy");
  });

  it("keeps legacy void callbacks but suppresses a declined stale card action fact", () => {
    const declined = vi.fn(() => false);
    const view = render(<OwnedDropGalleryCard drop={drops[0]} isUnlocked onOpen={declined} />);
    fireEvent.click(screen.getByRole("button", { name: /Sunset letters/ }));
    expect(declined).toHaveBeenCalledTimes(1);
    expect(events("owned_drop_clicked")).toHaveLength(0);
    const legacy = vi.fn(() => undefined);
    view.rerender(<OwnedDropGalleryCard drop={drops[0]} isUnlocked onOpen={legacy} />);
    fireEvent.click(screen.getByRole("button", { name: /Sunset letters/ }));
    expect(legacy).toHaveBeenCalledTimes(1);
    expect(events("owned_drop_clicked")).toHaveLength(1);
    view.rerender(<OwnedDropGalleryCard drop={drops[0]} isUnlocked />);
    expect(screen.getByRole("button", { name: /Sunset letters/ })).toBeDisabled();
  });

  it("preserves member collection math, expired owned access, locked discovery and filter facts", () => {
    const now = 1_700_000_010_000;
    const rows = [
      { ...drops[0], status: "expired" as const, validUntil: now - 1 },
      { ...drops[1], validFrom: now - 100, validUntil: now + 100 },
      { ...drops[2], status: "scheduled" as const, validFrom: now + 100 },
    ];
    const profile = buildCanonicalUserFixture({ unlockedContent: ["owned-a"] });
    render(<CollectionList drops={rows} userProfile={profile} currentTimeMs={now} />);
    expect(screen.getByText("Sunset letters")).toBeInTheDocument();
    expect(screen.getByText("Morning notes")).toBeInTheDocument();
    expect(screen.queryByText("Public discovery")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^owned$/i }));
    expect(screen.queryByText("Morning notes")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Sunset letters/ }));
    expect(state.push).toHaveBeenLastCalledWith("/dashboard/viewer?id=owned-a");
    fireEvent.click(screen.getByRole("button", { name: /^locked$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Morning notes/ }));
    expect(state.push).toHaveBeenLastCalledWith("/drops");
    expect(events("collection_filter_changed")).toEqual([
      ["collection_filter_changed", { filter_value: "owned" }],
      ["collection_filter_changed", { filter_value: "locked" }],
    ]);
    expect(events("owned_drop_clicked")).toHaveLength(2);
  });
});

