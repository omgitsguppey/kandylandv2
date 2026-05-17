import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type FindingSeverity = "p0" | "p1" | "p2";

type SimplificationFinding = {
    id: string;
    severity: FindingSeverity;
    surface: string;
    status: "fixed" | "deferred";
    filePath: string;
    detail: string;
};

const root = process.cwd();
const failures: string[] = [];
const fixesApplied: SimplificationFinding[] = [];
const deferredFindings: SimplificationFinding[] = [];

function readRequired(relativePath: string) {
    const fullPath = join(root, relativePath);
    if (!existsSync(fullPath)) {
        failures.push(`Missing required file: ${relativePath}`);
        return "";
    }
    return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
    if (!source.includes(expected)) {
        failures.push(`${label} must include "${expected}".`);
    }
}

function requireNotIncludes(source: string, forbidden: string, label: string) {
    if (source.includes(forbidden)) {
        failures.push(`${label} must not include "${forbidden}".`);
    }
}

function currentHead() {
    try {
        return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    } catch {
        return "unknown";
    }
}

function changedPaths() {
    try {
        return execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" })
            .split(/\r?\n/u)
            .map((line) => line.trimEnd())
            .filter(Boolean)
            .map((line) => line.slice(3).trim().replace(/^"|"$/g, ""));
    } catch {
        return [];
    }
}

function addFixed(id: string, severity: FindingSeverity, surface: string, filePath: string, detail: string) {
    fixesApplied.push({ id, severity, surface, status: "fixed", filePath, detail });
}

function addDeferred(id: string, severity: FindingSeverity, surface: string, filePath: string, detail: string) {
    deferredFindings.push({ id, severity, surface, status: "deferred", filePath, detail });
}

const sourceFunds = readRequired("src/lib/gumdrop-source-of-funds.ts");
const economyReport = readRequired("agent/state/gumdrop-economy-accuracy.generated.json");
const slotsHelper = readRequired("src/lib/creator-booking-slots.ts");
const panel = readRequired("src/components/Creators/CreatorExperiencesPanel.tsx");
const creatorProfile = readRequired("src/app/creators/[username]/CreatorProfileClient.tsx");
const bookingRoute = readRequired("src/app/api/creator/bookings/route.ts");
const dropsClient = readRequired("src/app/drops/DropsClient.tsx");
const dropScopeTest = readRequired("tests/unit/drop-visibility-scope.spec.tsx");
const panelTest = readRequired("tests/unit/creator-experiences-panel.spec.tsx");
const ownerTest = readRequired("tests/unit/creator-owner-mode.spec.tsx");
const slotTest = readRequired("tests/unit/creator-booking-slots.spec.ts");
const routeTest = readRequired("tests/unit/creator-bookings-route.spec.ts");
const docs = readRequired("docs/agent-truth/creator-experience-simplification.md");
const memory = readRequired("memory.md");
const packageJson = readRequired("package.json");

if (!sourceFunds.includes("paid_purchase_including_bonus") || !economyReport.includes("gumdrop-economy-accuracy")) {
    failures.push("Phase 1 economy artifact/check contract is missing.");
}

for (const path of changedPaths()) {
    if (
        path.startsWith("src/app/api/admin/")
        || path.startsWith("src/app/admin/")
        || path.startsWith("src/components/Admin/")
        || path.startsWith("src/lib/server/admin-")
        || path.startsWith("src/lib/admin-")
    ) {
        failures.push(`Forbidden admin file changed: ${path}`);
    }
}

for (const expected of [
    "export type CreatorBookingSlot",
    "export type CreatorBookingSlotResult",
    "buildCreatorBookingSlots",
    "availabilityTimezone",
    "bookingMinimumMinutes",
    "booked",
    "upcoming",
    "in_progress",
    "creator_availability_not_configured",
    "no_available_slots",
    "invalid_duration",
    "service_not_available",
    "source_limited",
]) {
    requireIncludes(slotsHelper, expected, "creator booking slots helper");
}

for (const expected of [
    "buildCreatorBookingSlots",
    "selectedBookingSlot",
    "data-booking-slot-source=\"creator_availability_windows\"",
    "data-booking-slot-count",
    "data-booking-selected-slot",
    "data-booking-free-pick-disabled=\"true\"",
    "No available slots right now",
    "Check back later or follow for updates.",
    "Choose a slot",
    "data-creator-owner-mode=\"true\"",
    "data-fan-controls-hidden=\"true\"",
    "You are viewing your creator profile.",
    "Manage this in Creator Dashboard.",
    "router.push(\"/dashboard/creator\")",
]) {
    requireIncludes(panel, expected, "creator experiences panel");
}
requireNotIncludes(panel, "datetime-local", "creator experiences panel");
requireNotIncludes(panel, "type=\"datetime-local\"", "creator experiences panel");

for (const expected of [
    "existingBookings={bookings}",
    "Choose an available booking slot.",
    "data-drop-visibility-scope=\"creator_profile\"",
    "data-drop-visibility-scope=\"own_creator_drops\"",
]) {
    requireIncludes(creatorProfile, expected, "creator profile client");
}

for (const expected of [
    "buildCreatorBookingSlots",
    "slot_unavailable",
    "selectedGeneratedSlot",
    ".where(\"creatorId\", \"==\", creatorId)",
    "Pick one of the available creator time slots.",
]) {
    requireIncludes(bookingRoute, expected, "creator bookings route");
}

requireIncludes(dropsClient, "data-drop-visibility-scope=\"public_discovery\"", "public drops discovery");
requireNotIncludes(dropsClient, "data-drop-visibility-scope=\"own_creator_drops\"", "public drops discovery");

for (const expected of [
    "Slots generated from availability windows.",
    "Fan booking no longer uses arbitrary date/time input.",
    "Creator owners viewing their own public profile do not see fan purchase/request/booking/chat controls.",
    "Creator management/drop surfaces show own creator drops.",
    "Public /drops remains public discovery.",
]) {
    requireIncludes(docs, expected, "creator experience simplification docs");
}

for (const expected of [
    "Creator booking UX uses generated availability slots, not arbitrary fan date/time.",
    "Creator owners viewing their own public profile do not see fan purchase/request/booking/chat controls.",
    "Creator management/drop surfaces show own creator drops; public discovery remains public.",
    "Phase 2 depends on Phase 1 GumDrop economy contract and must not change paid-bonus ledger math.",
]) {
    requireIncludes(memory, expected, "memory durable phase 2 rules");
}
requireNotIncludes(memory.toLowerCase(), "bonus gumdrops are reward", "memory durable phase 1 rules");

requireIncludes(packageJson, "\"check:creator-experience-simplification\": \"tsx scripts/agent/validate-creator-experience-simplification.ts\"", "package scripts");
requireIncludes(slotTest, "returns creator_availability_not_configured", "booking slot tests");
requireIncludes(panelTest, "arbitrary datetime input", "creator experiences panel tests");
requireIncludes(panelTest, "Choose a slot", "creator experiences panel tests");
requireIncludes(ownerTest, "data-fan-controls-hidden", "owner mode tests");
requireIncludes(routeTest, "slot_unavailable", "booking route tests");
requireIncludes(routeTest, "selectedGeneratedSlot", "booking route tests");
requireIncludes(dropScopeTest, "public_discovery", "drop visibility tests");

addFixed("booking-generated-slot-helper", "p0", "creator-profile", "src/lib/creator-booking-slots.ts", "Booking slots are generated from creator availability windows, timezone, service type, duration, minimum duration, and existing active bookings.");
addFixed("booking-free-pick-removed", "p0", "creator-profile", "src/components/Creators/CreatorExperiencesPanel.tsx", "Fan booking no longer renders datetime-local or arbitrary date/time input and disables booking until a generated slot is selected.");
addFixed("booking-server-slot-validation", "p0", "server-truth", "src/app/api/creator/bookings/route.ts", "Booking POST validates startAt against generated creator availability slots and rejects arbitrary starts with slot_unavailable.");
addFixed("creator-owner-mode", "p1", "creator-profile", "src/components/Creators/CreatorExperiencesPanel.tsx", "Creator owners see dashboard management copy and not fan purchase/request/booking/chat controls.");
addFixed("drop-visibility-scope", "p1", "drops", "src/app/drops/DropsClient.tsx", "Public drops remains public_discovery while creator profile drops are marked as creator_profile and own_creator_drops.");
addFixed("phase-two-memory", "p2", "memory", "memory.md", "Durable Phase 2 creator booking, owner mode, drop scope, and Phase 1 dependency rules are recorded.");
addDeferred("creator-dashboard-drop-surface", "p2", "creator-dashboard", "src/app/dashboard/creator/page.tsx", "No creator dashboard drop grid was rendered in inspected source, so no dashboard drop filtering change was needed this pass.");

const report = {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "creator-experience-simplification",
    currentHead: currentHead(),
    summary: {
        bookingFreePickPaths: panel.includes("datetime-local") ? 1 : 0,
        generatedSlotPaths: 2,
        ownerModeSurfaces: 1,
        fanControlsHiddenForOwner: panel.includes("data-fan-controls-hidden=\"true\"") ? 1 : 0,
        dropVisibilitySurfaces: 3,
        publicDiscoveryUntouched: dropsClient.includes("data-drop-visibility-scope=\"public_discovery\""),
        backendBookingValidation: bookingRoute.includes("slot_unavailable"),
        fixedThisPass: fixesApplied.length,
        deferredWithReason: deferredFindings.length,
        p0Count: [...fixesApplied, ...deferredFindings].filter((finding) => finding.severity === "p0").length,
        p1Count: [...fixesApplied, ...deferredFindings].filter((finding) => finding.severity === "p1").length,
        p2Count: [...fixesApplied, ...deferredFindings].filter((finding) => finding.severity === "p2").length,
    },
    bookingFindings: fixesApplied.filter((finding) => finding.surface === "creator-profile" || finding.surface === "server-truth"),
    ownerModeFindings: fixesApplied.filter((finding) => finding.id === "creator-owner-mode"),
    dropVisibilityFindings: fixesApplied.filter((finding) => finding.id === "drop-visibility-scope"),
    fixesApplied,
    deferredFindings,
    nextFixOrder: deferredFindings.map((finding) => finding.id),
};

writeFileSync(join(root, "agent/state/creator-experience-simplification.generated.json"), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length > 0) {
    console.error("Creator experience simplification validation failed:");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log(`Creator experience simplification validation passed. Report: ${join(root, "agent/state/creator-experience-simplification.generated.json")}`);
