import { existsSync, readFileSync } from "fs";
import path from "path";

const repoRoot = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function fail(message: string) {
  failures.push(message);
}

function includesAll(content: string, needles: string[], label: string) {
  needles.forEach((needle) => {
    if (!content.includes(needle)) {
      fail(`${label} is missing ${needle}`);
    }
  });
}

const failures: string[] = [];

const requiredFiles = [
  "src/lib/server/creator-experiences.ts",
  "src/app/api/creator/subscriptions/route.ts",
  "src/app/api/creator/requests/route.ts",
  "src/app/api/creator/bookings/route.ts",
  "src/lib/server/chat.ts",
  "src/app/api/chat/threads/[threadId]/messages/route.ts",
  "src/components/Chat/ChatExperience.tsx",
  "src/app/creators/[username]/CreatorProfileClient.tsx",
  "docs/agent-truth/creator-experience-transaction-truth.md",
];

requiredFiles.forEach((relativePath) => {
  if (!existsSync(path.join(repoRoot, relativePath))) {
    fail(`Required file missing: ${relativePath}`);
  }
});

const serverHelper = read("src/lib/server/creator-experiences.ts");
includesAll(serverHelper, [
  "CREATOR_EXPERIENCE_PAID_EVENTS",
  "creator_fan_pass_started",
  "creator_private_chat_opened",
  "creator_custom_request_created",
  "creator_live_time_booked",
  "buildCreatorExperienceIdempotencyKey",
  "buildCreatorExperienceRecordIds",
  "buildCreatorExperienceTransactionDebug",
  "buildCreatorExperienceTelemetryPayload",
  "CREATOR_REVENUE_SHARE",
], "creator experience server helper");

const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
includesAll(telemetryCatalog, [
  "creator_fan_pass_started",
  "creator_private_chat_opened",
  "creator_custom_request_created",
  "creator_live_time_booked",
  "creator_ledger_accrual_created",
], "telemetry catalog");

const paidRoutes = [
  {
    label: "Fan Pass",
    path: "src/app/api/creator/subscriptions/route.ts",
    event: "CREATOR_EXPERIENCE_PAID_EVENTS.fan_pass",
    recordCollection: "CREATOR_COLLECTIONS.subscriptions",
  },
  {
    label: "Custom Requests",
    path: "src/app/api/creator/requests/route.ts",
    event: "CREATOR_EXPERIENCE_PAID_EVENTS.custom_request",
    recordCollection: "CREATOR_COLLECTIONS.requests",
  },
  {
    label: "Live Time",
    path: "src/app/api/creator/bookings/route.ts",
    event: "CREATOR_EXPERIENCE_PAID_EVENTS.live_time",
    recordCollection: "CREATOR_COLLECTIONS.bookings",
  },
];

paidRoutes.forEach((route) => {
  const content = read(route.path);
  includesAll(content, [
    "auth: \"user\"",
    "requireTrustedOrigin: true",
    "idempotencyKey",
    "buildCreatorExperienceIdempotencyKey",
    "buildCreatorExperienceRecordIds",
    "readSourceAwareBalance",
    "spendCreatorExperienceGumdrops",
    "buildSourceAwareBalancePatch",
    "buildCompletedGumdropTransaction",
    "buildCreatorAccrual",
    "buildCreatorExperienceTransactionDebug",
    "buildCreatorExperienceTelemetryPayload",
    "actorMarker",
    "duplicatePrevented",
    "creatorAccrualId",
    "userTransactionId",
    "sourceAwareBalanceBefore",
    "sourceAwareBalanceAfter",
    route.event,
    route.recordCollection,
  ], `${route.label} route`);
});

const chatServer = read("src/lib/server/chat.ts");
includesAll(chatServer, [
  "idempotencyKey",
  "buildCreatorExperienceIdempotencyKey",
  "buildCreatorExperienceRecordIds",
  "CREATOR_COLLECTIONS.ledgerAccruals",
  "CREATOR_EXPERIENCE_PAID_EVENTS.private_chat",
  "spendCreatorExperienceGumdrops",
  "buildCompletedGumdropTransaction",
  "buildCreatorAccrual",
  "duplicatePrevented",
  "sourceAwareBalanceBefore",
  "sourceAwareBalanceAfter",
], "private chat server transaction path");

const chatRoute = read("src/app/api/chat/threads/[threadId]/messages/route.ts");
includesAll(chatRoute, ["idempotencyKey", "...body"], "chat message API route");

const legacyCreatorMessageRoute = read("src/app/api/creator/messages/route.ts");
includesAll(legacyCreatorMessageRoute, ["idempotencyKey", "safeSendChatMessageForViewer"], "creator messages compatibility route");

const creatorProfile = read("src/app/creators/[username]/CreatorProfileClient.tsx");
includesAll(creatorProfile, [
  "buildCreatorExperienceClientIdempotencyKey",
  "idempotencyKey",
  "/api/creator/subscriptions",
  "/api/creator/requests",
  "/api/creator/bookings",
], "creator profile CTA wiring");

const chatClient = read("src/components/Chat/ChatExperience.tsx");
includesAll(chatClient, [
  "buildChatMessageIdempotencyKey",
  "idempotencyKey",
  "/api/chat/threads/",
], "chat send client wiring");

if (/setUserProfile\([\s\S]*gumDropsBalance/.test(creatorProfile) || /setUserProfile\([\s\S]*gumDropsBalance/.test(chatClient)) {
  fail("Client UI appears to mutate GumDrop balance directly for creator experiences.");
}

const docs = read("docs/agent-truth/creator-experience-transaction-truth.md");
includesAll(docs, [
  "Fan Pass",
  "Private chat",
  "Custom Requests",
  "Live Time",
  "idempotency",
  "creator_ledger_accruals",
  "CREATOR_REVENUE_SHARE",
  "No client-only balance deduction",
], "creator experience transaction truth docs");

if (failures.length > 0) {
  console.error("Creator experience transaction truth validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Creator experience transaction truth validation passed.");
