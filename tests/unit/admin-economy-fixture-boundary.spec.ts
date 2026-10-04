// @vitest-environment happy-dom
import { readFileSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, delimiter, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { createElement } from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlatformEconomyConsole } from "@/app/admin/economy/components/PlatformEconomyConsole";
import { collectEconomyWarnings, type PlatformEconomyDashboardState } from "@/app/admin/economy/components/types";
import { KandyTreasuryOperationsCanvas } from "@/components/creative-tim/kandydrops/admin-economy/KandyTreasuryOperationsCanvas";
import type { PlatformEconomyTreasurySummary, PlatformEconomyWarning } from "@/lib/platform-economy";

const mocks = vi.hoisted(() => ({
  authFetch: vi.fn(),
  user: { uid: "admin-a", providerData: [] as Array<{ providerId: string }> },
}));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/lib/authFetch", () => ({ authFetch: mocks.authFetch }));

function treasury(): PlatformEconomyTreasurySummary {
  return {
    generatedAtUtc: "2026-10-02T00:00:00.000Z", sourceTruth: "platform_economy", freshnessState: "live",
    outstandingGd: 100, paidGd: 80, paidBonusGd: 10, rewardFreeGd: 20,
    paidSourceAvgUsdPer100Gd: 1, floorState: "healthy", warnings: [], walletRows: [],
    walletPage: 1, walletPageSize: 20, walletHasMore: false,
  };
}
function readyState(): PlatformEconomyDashboardState {
  return {
    treasury: { loading: false, error: null, data: treasury() },
    packages: { loading: false, error: null, data: [] },
    promos: { loading: false, error: null, data: [] },
    offers: { loading: false, error: null, data: [] },
    redemptions: { loading: false, error: null, data: [] },
    drift: { loading: false, error: null, data: [] },
  };
}
function canvas(state: PlatformEconomyDashboardState, fixture = false) {
  return createElement(KandyTreasuryOperationsCanvas, {
    state, warningSummary: collectEconomyWarnings(state), isLocalAdminUiTestSession: fixture,
    treasurySourceState: fixture ? "source_missing" : state.treasury.error ? "failed"
      : state.treasury.data === null ? "source_missing" : "live",
  });
}
function raisedWarnings() {
  const term = screen.getByText("Raised warnings");
  return term.parentElement!.querySelector("dd")!;
}
function stripWarnings() {
  const term = screen.getByText("Warnings");
  return term.closest("dt")?.nextElementSibling ?? term.parentElement!.lastElementChild!;
}
function installResponses(overrides: Record<string, unknown> = {}) {
  mocks.authFetch.mockImplementation(async (url: string) => {
    const key = url.split("/").at(-1)!;
    return new Response(JSON.stringify(key in overrides ? overrides[key] : {
      success: true, [key]: key === "treasury" ? treasury() : [],
    }), { status: 200, headers: { "content-type": "application/json" } });
  });
}

beforeEach(() => {
  mocks.user = { uid: "admin-a", providerData: [] };
  mocks.authFetch.mockReset();
});
afterEach(cleanup);

describe("economy warning source truth", () => {
  it("keeps pending totals unknown and recovers to verified empty only after the final source settles", () => {
    const state = readyState();
    state.redemptions = { loading: true, error: null, data: null };
    const view = render(canvas(state));
    expect(raisedWarnings()).toHaveTextContent("--");
    expect(stripWarnings()).toHaveTextContent("--");
    expect(screen.getByText(/Warnings are still loading/)).toBeInTheDocument();
    expect(screen.queryByText("No economy warnings are currently raised.")).not.toBeInTheDocument();
    view.rerender(canvas(readyState()));
    expect(raisedWarnings()).toHaveTextContent(/^0$/);
    expect(stripWarnings()).toHaveTextContent(/^0$/);
    expect(screen.getByText("No economy warnings are currently raised.")).toBeInTheDocument();
  });

  it.each(["treasury", "packages", "promos", "offers", "redemptions"] as const)(
    "does not declare a healthy zero when %s fails", (key) => {
      const state = readyState();
      state[key] = { loading: false, error: "Permission is unavailable.", data: null };
      render(canvas(state));
      expect(raisedWarnings()).toHaveTextContent("--");
      expect(stripWarnings()).toHaveTextContent("--");
      expect(screen.getByText(/The warning source is incomplete/)).toBeInTheDocument();
      expect(screen.queryByText("No economy warnings are currently raised.")).not.toBeInTheDocument();
    },
  );

  it("retains known partial warnings in both projections even when Treasury is missing", () => {
    const state = readyState();
    const warning: PlatformEconomyWarning = {
      code: "package_below_floor", severity: "warn", label: "A package requires review",
      detail: "The authoritative package flagged its rate.", sourceSurface: "packages",
    };
    state.treasury = { loading: false, error: null, data: null };
    state.packages.data = [{ packageId: "example", label: "Example", priceUsd: 1, basePaidGd: 200,
      bonusPaidGd: 0, totalGd: 200, effectiveUsdPer100Gd: 0.5, active: true, featured: false,
      sortOrder: 0, createdAtUtc: "", updatedAtUtc: "", version: 1, source: "admin_config", warnings: [warning] }];
    render(canvas(state));
    expect(raisedWarnings()).toHaveTextContent(/^≥1$/);
    expect(stripWarnings()).toHaveTextContent(/^≥1$/);
    expect(screen.getByText(warning.label)).toBeInTheDocument();
    expect(screen.getByText(warning.detail)).toBeInTheDocument();
    expect(screen.getByText(/The warning source is incomplete/)).toBeInTheDocument();
  });

  it("distinguishes a missing drift source from a verified empty drift result", () => {
    const state = readyState();
    state.drift.data = null;
    const view = render(canvas(state));
    const section = screen.getByRole("heading", { name: "Drift review" }).closest("section")!;
    expect(within(section).getByText("Source is unavailable for this section.")).toBeInTheDocument();
    expect(screen.queryByText(/No current economy drift detected/)).not.toBeInTheDocument();
    view.rerender(canvas(readyState()));
    expect(screen.getByText(/No current economy drift detected/)).toBeInTheDocument();
    expect(raisedWarnings()).toHaveTextContent(/^0$/);
  });

  it("keeps the real local fixture source missing and performs no protected reads across remount", async () => {
    mocks.user.providerData = [{ providerId: "admin-ui-test-session" }];
    const view = render(createElement(PlatformEconomyConsole));
    await screen.findByText(/Economy source is not loaded here/);
    expect(raisedWarnings()).toHaveTextContent("--");
    expect(stripWarnings()).toHaveTextContent("--");
    expect(screen.getByText("source_missing: economy warning source is not loaded in this fixture.")).toBeInTheDocument();
    expect(screen.queryByText("No economy warnings are currently raised.")).not.toBeInTheDocument();
    expect(mocks.authFetch).not.toHaveBeenCalled();
    view.unmount();
    render(createElement(PlatformEconomyConsole));
    await screen.findByText(/Economy source is not loaded here/);
    expect(mocks.authFetch).not.toHaveBeenCalled();
  });

  it.each([
    ["unsuccessful envelope", { success: false, packages: [] }],
    ["missing data", { success: true }],
    ["missing record warnings", { success: true, packages: [{ packageId: "broken" }] }],
  ])("rejects %s as unavailable instead of an empty success", async (_label, response) => {
    installResponses({ packages: response });
    render(createElement(PlatformEconomyConsole));
    await waitFor(() => expect(mocks.authFetch).toHaveBeenCalledTimes(6));
    await screen.findByText(/Failed to load packages|No verified packages source was returned/);
    expect(raisedWarnings()).toHaveTextContent("--");
    expect(screen.getByText(/The warning source is incomplete/)).toBeInTheDocument();
    expect(screen.queryByText("No economy warnings are currently raised.")).not.toBeInTheDocument();
  });

  it("accepts verified source results through the actual transport and labels confirmed zero", async () => {
    installResponses();
    render(createElement(PlatformEconomyConsole));
    await screen.findByText("No economy warnings are currently raised.");
    expect(mocks.authFetch).toHaveBeenCalledTimes(6);
    expect(raisedWarnings()).toHaveTextContent(/^0$/);
    expect(stripWarnings()).toHaveTextContent(/^0$/);
    expect(screen.getByText("100 GD")).toBeInTheDocument();
  });
});


function loadedState(): PlatformEconomyDashboardState {
  const state = readyState();
  state.treasury.data!.walletRows = [{ userId: "synthetic-economy-record", shortUserId: "synt...cord",
    displayName: "Synthetic Treasury Record With A Long Readable Name", totalGd: 120, paidGd: 95, rewardFreeGd: 25,
    pendingGd: null, heldGd: null, spentGd: null, sourceWarnings: [], adminUserHref: "/admin/user/synthetic-economy-record" }];
  state.packages.data = [{ packageId: "synthetic-package", label: "Synthetic Package With A Long Readable Label",
    priceUsd: 1.25, basePaidGd: 100, bonusPaidGd: 25, totalGd: 125, effectiveUsdPer100Gd: 1,
    active: true, featured: false, sortOrder: 0, createdAtUtc: "2026-10-02T00:00:00.000Z",
    updatedAtUtc: "2026-10-02T00:00:00.000Z", version: 1, source: "admin_config", warnings: [] }];
  state.promos.data = [{ promoId: "synthetic-promo", code: "SYNTHETIC", title: "Synthetic Promo With A Long Readable Label",
    promoType: "bonus_gd", discountValue: 0, bonusGd: 5, appliesToPackageIds: ["synthetic-package"],
    startsAtUtc: null, endsAtUtc: null, maxRedemptions: 20, maxPerUser: 1, minPurchaseUsd: null,
    active: true, stackable: false, createdByUid: null, createdAtUtc: "2026-10-02T00:00:00.000Z",
    updatedAtUtc: "2026-10-02T00:00:00.000Z", reason: null, sourceTruth: "platform_economy", version: 1,
    warnings: [], effectiveUsdPer100GdImpact: 0.95, bonusClassification: "paid_source_bonus" }];
  state.offers.data = [{ offerId: "synthetic-offer", offerType: "Synthetic Offer With A Long Readable Label",
    eligibleAudience: "Synthetic audience whose readable label is intentionally wider than a narrow column",
    packageIds: ["synthetic-package"], promoId: "synthetic-promo", startsAtUtc: null, endsAtUtc: null,
    active: false, sourceTruth: "platform_economy", createdAtUtc: "2026-10-02T00:00:00.000Z",
    updatedAtUtc: "2026-10-02T00:00:00.000Z", version: 1, warnings: [] }];
  state.redemptions.data = [{ redemptionId: "synthetic-redemption", createdAtUtc: "2026-10-02T00:00:00.000Z",
    userId: "synthetic-economy-record", shortUserId: "synt...cord", packageId: "synthetic-package",
    packageLabel: "Synthetic Redeemed Package With A Long Readable Label", promoId: "synthetic-promo", promoCode: "SYNTHETIC",
    offerId: "synthetic-offer", priceUsdBeforeDiscount: 1.5, discountUsd: 0.25, priceUsdPaid: 1.25,
    basePaidGd: 100, bonusPaidGd: 25, rewardPromoGd: 0, totalIssuedGd: 125, effectiveUsdPer100Gd: 1, warnings: [] }];
  state.drift.data = [{ driftId: "synthetic-drift", surface: "wallet", severity: "warn",
    expected: "Expected paid-source balance is 95 GD", actual: "Actual source requires reconciliation",
    validator: "check:platform-economy-treasury", nextAction: "Review the existing source record" }];
  return state;
}

describe("economy sourced body and record access", () => {
  function sourceSection(name: string) { return screen.getByRole("heading", { name }).closest("section")!; }
  function field(section: Element, label: string) { return within(section as HTMLElement).getByText(label).closest("dt")!.nextElementSibling!; }

  it("keeps the real six slice records, paid bonus meaning and canonical user destination accessible", () => {
    render(canvas(loadedState()));
    const packageSection = sourceSection("Package mix and rate floor");
    expect(field(packageSection, "Price")).toHaveTextContent("$1.25");
    expect(field(packageSection, "Bonus paid-source GD")).toHaveTextContent(/^25$/);
    expect(field(packageSection, "Effective rate")).toHaveTextContent("$1.00 / 100 GD");
    const redemptionSection = sourceSection("Recent redemptions");
    expect(field(redemptionSection, "Paid")).toHaveTextContent("$1.25");
    expect(field(redemptionSection, "Discount")).toHaveTextContent("$0.25");
    expect(field(redemptionSection, "Issued")).toHaveTextContent("125 GD");
    expect(within(redemptionSection).getByText("synthetic-package / SYNTHETIC / synthetic-offer")).toBeInTheDocument();
    expect(field(sourceSection("Promo guardrails"), "Stacking")).toHaveTextContent("non-stackable");
    expect(field(sourceSection("Audience and timing"), "Promo")).toHaveTextContent("promo synthetic-promo");
    expect(field(sourceSection("Drift review"), "Expected")).toHaveTextContent("Expected paid-source balance is 95 GD");
    expect(field(sourceSection("Drift review"), "Actual")).toHaveTextContent("Actual source requires reconciliation");
    expect(screen.getByRole("link", { name: /Synthetic Treasury Record With A Long Readable Name Open record/ }))
      .toHaveAttribute("href", "/admin/user/synthetic-economy-record");
    expect(screen.queryByRole("button", { name: /charge|capture|save|activate|refund/i })).not.toBeInTheDocument();
  });

  it.each([
    ["treasury", "Treasury ledger"], ["packages", "Package mix and rate floor"], ["promos", "Promo guardrails"],
    ["offers", "Audience and timing"], ["redemptions", "Recent redemptions"], ["drift", "Drift review"],
  ] as const)("exposes the %s failure at its disclosure and preserves a next valid record", (key, title) => {
    const state = loadedState();
    state[key] = { loading: false, error: "Permission unavailable for " + key, data: null };
    const view = render(canvas(state));
    const section = sourceSection(title);
    const summary = section.querySelector("summary")!;
    expect(summary).toHaveTextContent("failed");
    expect(within(section).getByRole("alert", { hidden: true })).toHaveTextContent("Permission unavailable for " + key);
    view.rerender(canvas(loadedState()));
    expect(sourceSection(title).querySelector("summary")).not.toHaveTextContent("failed");
    expect(within(sourceSection(title)).queryByRole("alert", { hidden: true })).not.toBeInTheDocument();
  });

  it("keeps disclosed missing and collecting source states distinct from a confirmed empty result", () => {
    const state = readyState();
    state.offers = { loading: true, error: null, data: null };
    const view = render(canvas(state));
    expect(sourceSection("Audience and timing").querySelector("summary")).toHaveTextContent("collecting");
    state.offers = { loading: false, error: null, data: null };
    view.rerender(canvas(state));
    expect(sourceSection("Audience and timing").querySelector("summary")).toHaveTextContent("source_missing");
    expect(within(sourceSection("Audience and timing")).getByText("Source is unavailable for this section.")).toBeInTheDocument();
    view.rerender(canvas(readyState()));
    expect(sourceSection("Audience and timing").querySelector("summary")).toHaveTextContent("0 records");
    expect(within(sourceSection("Audience and timing")).queryByText("Source is unavailable for this section.")).not.toBeInTheDocument();
  });

  it("keeps observed treasury zero separate from missing source and retains the source state", () => {
    const state = readyState();
    state.treasury.data!.outstandingGd = 0;
    const view = render(canvas(state));
    const strip = document.querySelector("[data-admin-economy-strip-source-state]")!;
    expect(field(strip, "Outstanding GD")).toHaveTextContent(/^0 GD$/);
    state.treasury = { loading: false, error: "Treasury denied", data: null };
    view.rerender(canvas(state));
    expect(field(strip, "Outstanding GD")).toHaveTextContent(/^--$/);
    expect(strip).toHaveAttribute("data-admin-economy-strip-source-state", "failed");
  });

  it("uses native supporting-section disclosure without hiding treasury and redemptions by default", () => {
    render(canvas(loadedState()));
    expect(sourceSection("Treasury ledger").querySelector("details")).toHaveAttribute("open");
    expect(sourceSection("Recent redemptions").querySelector("details")).toHaveAttribute("open");
    for (const title of ["Package mix and rate floor", "Promo guardrails", "Audience and timing", "Drift review"]) {
      const detail = sourceSection(title).querySelector("details")!;
      expect(detail).not.toHaveAttribute("open");
      expect(detail.querySelector("summary")).toHaveTextContent(title);
    }
  });
});


const commerceRepositoryRoot = process.cwd();
const commerceReaderPath = "scripts/agent/validate-platform-economy-commerce-controls.ts";
const commerceCanvasPath = "src/components/creative-tim/kandydrops/admin-economy/KandyTreasuryOperationsCanvas.tsx";
const commerceConsolePath = "src/app/admin/economy/components/PlatformEconomyConsole.tsx";
const commerceStripPath = "src/app/admin/economy/components/PlatformEconomyStrip.tsx";

function runActualCommerceReaderFixture(mutations: Record<string, (source: string) => string> = {}, importOnly = false) {
  const fixture = mkdtempSync(join(tmpdir(), "kandydrops-commerce-reader-"));
  const sourcePaths = new Set([
    commerceReaderPath, "scripts/agent/validate-behavioral-truth-source.ts",
    "src/app/admin/economy/page.tsx", commerceConsolePath, commerceCanvasPath, commerceStripPath,
  ]);
  const reader = readFileSync(join(commerceRepositoryRoot, commerceReaderPath), "utf8");
  for (const match of reader.matchAll(/readRequired\("([^"]+)"\)/g)) sourcePaths.add(match[1]);
  try {
    for (const relativePath of sourcePaths) {
      const destination = join(fixture, relativePath);
      mkdirSync(dirname(destination), { recursive: true });
      const source = readFileSync(join(commerceRepositoryRoot, relativePath), "utf8").replaceAll("\r\n", "\n");
      writeFileSync(destination, mutations[relativePath]?.(source) ?? source);
    }
    const owner = join(fixture, commerceReaderPath);
    const args = importOnly ? [require.resolve("tsx/cli"), "-e", "require(" + JSON.stringify(owner) + ")"]
      : [require.resolve("tsx/cli"), owner];
    const result = spawnSync(process.execPath, args, {
      cwd: fixture, encoding: "utf8", windowsHide: true, timeout: 20_000,
      env: { ...process.env, NODE_PATH: [dirname(dirname(require.resolve("typescript/package.json"))), process.env.NODE_PATH].filter(Boolean).join(delimiter) },
    });
    if (result.error) throw result.error;
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  } finally {
    const target = resolve(fixture);
    if (dirname(target) !== resolve(tmpdir())) throw new Error("Commerce fixture cleanup escaped its temporary parent.");
    rmSync(target, { recursive: true, force: true });
  }
}

function changeCommerceOnce(source: string, before: string, after: string) {
  expect(source.split(before)).toHaveLength(2);
  return source.replace(before, after);
}
function changeCommerceProjection(source: string, attribute: string, after: string, component = "PlatformEconomyStrip") {
  const pattern = new RegExp("(<" + component + "\\s[\\s\\S]*?\\b" + attribute + "=)\\{[^}]+\\}", "g");
  expect([...source.matchAll(pattern)]).toHaveLength(1);
  return source.replace(pattern, (_match, prefix) => prefix + after);
}
function expectCommerceReaderFailure(result: ReturnType<typeof runActualCommerceReaderFixture>, message: string) {
  expect(result.status).toBe(1);
  expect(result.stderr).toContain(message);
  expect(result.stderr).not.toContain("Cannot find module");
  expect(result.stderr).not.toContain("Transform failed");
}

describe("commerce reader canonical render and protected safeguards", () => {
  it("runs the actual existing CLI against all current canonical source owners", () => {
    expect(runActualCommerceReaderFixture()).toEqual({ status: 0, stdout: "Platform economy commerce controls validation passed.\n", stderr: "" });
  });
  it("keeps the shared inspection import safe without executing the CLI", () => {
    expect(runActualCommerceReaderFixture({}, true)).toEqual({ status: 0, stdout: "", stderr: "" });
  });
  it("accepts canonical import aliases and matching rendered names", () => {
    const result = runActualCommerceReaderFixture({
      "src/app/admin/economy/page.tsx": source => changeCommerceOnce(changeCommerceOnce(source,
        "import { PlatformEconomyConsole }", "import { PlatformEconomyConsole as EconomyScreen }"),
        "<PlatformEconomyConsole />", "<EconomyScreen />"),
      [commerceConsolePath]: source => changeCommerceOnce(changeCommerceOnce(source,
        "import { KandyTreasuryOperationsCanvas }", "import { KandyTreasuryOperationsCanvas as EconomyBody }"),
        "<KandyTreasuryOperationsCanvas", "<EconomyBody"),
    });
    expect({ status: result.status, errors: result.stderr }).toEqual({ status: 0, errors: "" });
  });
  it("rejects a disconnected page despite a canonical JSX comment", () => {
    expectCommerceReaderFailure(runActualCommerceReaderFixture({
      "src/app/admin/economy/page.tsx": source => changeCommerceOnce(source, "<PlatformEconomyConsole />", "null /* <PlatformEconomyConsole /> */"),
    }), "Economy page must render its imported canonical Console.");
  });
  it("rejects a foreign Canvas import even when Console comments contain every old section token", () => {
    expectCommerceReaderFailure(runActualCommerceReaderFixture({
      [commerceConsolePath]: source => "// Packages Promos Offers Redemptions Drift Warnings\n" + changeCommerceOnce(source,
        '"@/components/creative-tim/kandydrops/admin-economy/KandyTreasuryOperationsCanvas"', '"@/components/foreign-economy-body"'),
    }), "Economy Console must render its imported canonical Canvas.");
  });
  it("rejects a wrong packages projection despite an unused correct render", () => {
    expectCommerceReaderFailure(runActualCommerceReaderFixture({
      [commerceConsolePath]: source => "// Packages Promos Offers Redemptions Drift Warnings\n" + source,
      [commerceCanvasPath]: source => (source.includes("slice={state.packages}")
        ? changeCommerceOnce(source, "slice={state.packages}", "slice={state.offers}")
        : changeCommerceOnce(source, "slice: state.packages", "slice: state.offers"))
        + '\nfunction UnusedCommerceDecoy() { return <section>{renderSliceState({ slice: state.packages, emptyMessage: "", children: () => null })}</section>; }\n',
    }), "Economy Canvas must render canonical packages slice state.");
  });
  it("rejects a substituted Console dashboard state", () => {
    expectCommerceReaderFailure(runActualCommerceReaderFixture({
      [commerceConsolePath]: source => changeCommerceOnce(source, "state={state}", "state={createSourceMissingState()}"),
    }), "Economy Canvas must receive canonical state.");
  });
  it("rejects a warning collector attached to a different dashboard state", () => {
    expectCommerceReaderFailure(runActualCommerceReaderFixture({
      [commerceConsolePath]: source => changeCommerceOnce(source, "collectEconomyWarnings(state)", "collectEconomyWarnings(createSourceMissingState())"),
    }), "Economy warning summary must derive from the canonical current dashboard state.");
  });
  it("rejects a replaced Strip warning projection", () => {
    expectCommerceReaderFailure(runActualCommerceReaderFixture({
      [commerceCanvasPath]: source => changeCommerceProjection(source, "warningSummary", "{emptyWarningSummary}"),
    }), "Economy Strip must receive canonical warningSummary.");
  });
  it("rejects a hardcoded live Strip source projection", () => {
    expectCommerceReaderFailure(runActualCommerceReaderFixture({
      [commerceCanvasPath]: source => changeCommerceProjection(source, "sourceState", '"live"'),
    }), "Economy Strip must receive canonical sourceState.");
  });
  it("rejects a warning rail attached to another warning inventory", () => {
    expectCommerceReaderFailure(runActualCommerceReaderFixture({
      [commerceCanvasPath]: source => changeCommerceProjection(source, "warningSummary", "{emptyWarningSummary}", "SourceTruthRail"),
    }), "Economy warning inventory must render canonical warning and Treasury source projections.");
  });
  it("rejects a null warning count rendered as a confirmed zero", () => {
    expectCommerceReaderFailure(runActualCommerceReaderFixture({
      [commerceStripPath]: source => changeCommerceOnce(source, 'warningSummary.count === null ? "--"', 'warningSummary.count === null ? "0"'),
    }), "Economy Strip must render canonical warning availability and partial lower bounds.");
  });
  it("rejects a failed source removed from unavailable value masking", () => {
    expectCommerceReaderFailure(runActualCommerceReaderFixture({
      [commerceStripPath]: source => changeCommerceOnce(source, ' || sourceState === "failed"', ""),
    }), "Economy Strip must retain unavailable source masking.");
  });
  it("rejects a slice renderer that skips the missing source boundary", () => {
    expectCommerceReaderFailure(runActualCommerceReaderFixture({
      [commerceCanvasPath]: source => changeCommerceOnce(source, "if (slice.data == null)", "if (false)"),
    }), "Economy slice rendering must retain source boundary: slice.data == null.");
  });
  it("rejects unconditional verified warning completion", () => {
    expectCommerceReaderFailure(runActualCommerceReaderFixture({
      [commerceCanvasPath]: source => changeCommerceOnce(source,
        '!isLocalAdminUiTestSession && sourceState === "verified"', "true"),
    }), "Economy warning inventory must not promote an incomplete source to verified zero.");
  });
  it("retains the existing provider ledger paid-price metadata guard", () => {
    expectCommerceReaderFailure(runActualCommerceReaderFixture({
      "src/app/api/paypal/capture/route.ts": source => source.replaceAll("priceUsdPaid", "unverifiedPaidPrice"),
    }), 'PayPal capture ledger metadata must include "priceUsdPaid".');
  });
  it("retains the existing admin-only package mutation guard", () => {
    expectCommerceReaderFailure(runActualCommerceReaderFixture({
      "src/app/api/admin/economy/packages/route.ts": source => source.replaceAll('auth: "admin"', 'auth: "user"'),
    }), 'Packages route must include "auth: \\"admin\\"".'.replaceAll('\\"', '"'));
  });
  it("retains the existing canonical economic warning floor guard", () => {
    expectCommerceReaderFailure(runActualCommerceReaderFixture({
      "src/lib/platform-economy.ts": source => changeCommerceOnce(source,
        "PLATFORM_ECONOMY_WARNING_FLOOR_USD_PER_100_GD = 0.5", "PLATFORM_ECONOMY_WARNING_FLOOR_USD_PER_100_GD = 0.25"),
    }), 'Platform Economy contract must include "PLATFORM_ECONOMY_WARNING_FLOOR_USD_PER_100_GD = 0.5".');
  });
});
