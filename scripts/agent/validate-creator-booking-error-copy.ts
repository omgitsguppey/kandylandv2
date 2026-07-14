import { existsSync, readFileSync } from "fs";
import path from "path";

const repoRoot = process.cwd();
const failures: string[] = [];

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function requireFile(relativePath: string) {
  if (!existsSync(path.join(repoRoot, relativePath))) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return read(relativePath);
}

function requireIncludes(content: string, needle: string, label: string) {
  if (!content.includes(needle)) {
    failures.push(`${label} is missing ${needle}`);
  }
}

function requireNotIncludes(content: string, needle: string, label: string) {
  if (content.includes(needle)) {
    failures.push(`${label} must not include ${needle}`);
  }
}

const route = requireFile("src/app/api/creator/bookings/route.ts");
const profileClient = requireFile("src/app/creators/[username]/CreatorProfileClient.tsx");
const problemCopy = requireFile("src/lib/problem-state-copy.ts");
const serverExperience = requireFile("src/lib/server/creator-experiences.ts");
const packageJson = JSON.parse(requireFile("package.json")) as { scripts?: Record<string, string> };

[
  "creator_or_user_not_found",
  "creator_unavailable",
  "bookings_unavailable",
  "creator_availability_not_configured",
  "slot_outside_availability",
  "slot_already_booked",
  "insufficient_paid_gumdrops",
  "invalid_booking_request",
  "unauthorized",
].forEach((code) => {
  requireIncludes(route, code, "Creator.Bookings.POST typed error responses");
});

requireIncludes(route, "class CreatorBookingProblem extends Error", "Creator.Bookings.POST typed error implementation");
requireIncludes(route, "buildBookingProblemResponse", "Creator.Bookings.POST typed response builder");
requireIncludes(route, "requiredPaidGd", "Creator.Bookings.POST insufficient paid GumDrops response");
requireIncludes(route, "paidBalanceGd", "Creator.Bookings.POST insufficient paid GumDrops response");
requireIncludes(route, "shortfallGd", "Creator.Bookings.POST insufficient paid GumDrops response");
requireIncludes(route, "windows.length === 0", "Creator.Bookings.POST availability configuration guard");
requireIncludes(route, "spendCreatorExperienceGumdrops", "Creator.Bookings.POST paid-only spend policy");

[
  'throw new Error("Creator or user not found")',
  'throw new Error("Creator unavailable")',
  'throw new Error("Bookings are unavailable for this creator.")',
  'throw new Error("That slot is outside the creator',
  'throw new Error("That slot was already booked.")',
  "throw new Error(spend.error)",
].forEach((pattern) => {
  requireNotIncludes(route, pattern, "Creator.Bookings.POST expected booking failures");
});

requireIncludes(problemCopy, "getCreatorBookingProblemCopy", "booking problem copy helper");
[
  "Pick a time inside the creator's booking hours.",
  "This creator has not opened booking hours yet.",
  "That time was just booked. Pick another slot.",
  "Bookings are not available for this creator right now.",
  "Open Wallet to add ${shortfallGd} more paid GD, then book this again.",
  "Booking could not be completed. Try again or report the issue.",
].forEach((copy) => {
  requireIncludes(problemCopy, copy, "booking problem copy helper");
});

requireIncludes(profileClient, "getCreatorBookingProblemCopy", "CreatorProfileClient booking handler");
requireIncludes(profileClient, "openPurchaseModal", "CreatorProfileClient paid GumDrops refill path");
requireIncludes(profileClient, "selectedExperience: \"bookings\"", "CreatorProfileClient booking debug detail");
requireIncludes(profileClient, "route: \"/api/creator/bookings\"", "CreatorProfileClient booking debug detail");
requireNotIncludes(profileClient, 'toast.error(error.message || "Booking failed.")', "CreatorProfileClient booking user-facing fallback");
requireNotIncludes(profileClient, '"Internal server error"', "CreatorProfileClient booking user-facing fallback");

requireIncludes(serverExperience, "booking_phone", "creator booking paid spend policy");
requireIncludes(serverExperience, "booking_video", "creator booking paid spend policy");
requireIncludes(serverExperience, "purchasedOnly: true", "creator booking paid spend policy");

if (packageJson.scripts?.["check:creator-booking-error-copy"] !== "tsx scripts/agent/validate-creator-booking-error-copy.ts") {
  failures.push("package.json is missing check:creator-booking-error-copy script");
}

if (failures.length > 0) {
  console.error("Creator booking error copy validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Creator booking error copy validation passed.");
