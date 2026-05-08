import { readFileSync, writeFileSync } from "fs";
import { execFileSync } from "child_process";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

type ValidationCheck = {
  key: string;
  label: string;
  ok: boolean;
  evidence: string[];
};

type LockReport = {
  generatedAt: string;
  status: "pass" | "fail";
  criticalBlockers: string[];
  warnings: string[];
  changedFilesSinceLastCreatorMonetizationGatesLock: string[];
  requiredTargetedChecks: string[];
  forbiddenBroadChecks: string[];
  promoReadinessNotes: string[];
  checks: ValidationCheck[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const reportPath = join(repoRoot, "agent", "state", "creator-monetization-gates-lock.generated.json");

const files = {
  chatExperience: join(repoRoot, "src", "components", "Chat", "ChatExperience.tsx"),
  creatorExperiencesPanel: join(repoRoot, "src", "components", "Creators", "CreatorExperiencesPanel.tsx"),
  creatorPaidGdGuidanceCard: join(repoRoot, "src", "components", "Creators", "CreatorPaidGdGuidanceCard.tsx"),
  creatorProfileClient: join(repoRoot, "src", "app", "creators", "[username]", "CreatorProfileClient.tsx"),
  creatorMessagesRoute: join(repoRoot, "src", "app", "api", "creator", "messages", "route.ts"),
  creatorSubscriptionsRoute: join(repoRoot, "src", "app", "api", "creator", "subscriptions", "route.ts"),
  creatorBookingsRoute: join(repoRoot, "src", "app", "api", "creator", "bookings", "route.ts"),
  creatorRequestsRoute: join(repoRoot, "src", "app", "api", "creator", "requests", "route.ts"),
  chatSendFeedback: join(repoRoot, "src", "lib", "chat-send-feedback.ts"),
  creatorExperiences: join(repoRoot, "src", "lib", "creator-experiences.ts"),
  serverCreatorExperiences: join(repoRoot, "src", "lib", "server", "creator-experiences.ts"),
  serverChat: join(repoRoot, "src", "lib", "server", "chat.ts"),
  problemStateCopy: join(repoRoot, "src", "lib", "problem-state-copy.ts"),
  packageJson: join(repoRoot, "package.json"),
};

function read(path: string) {
  return readFileSync(path, "utf8");
}

function includesAll(source: string, snippets: string[]) {
  return snippets.every((snippet) => source.includes(snippet));
}

function collectChangedFiles() {
  const output = execFileSync("git", ["status", "--porcelain=v1", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  const relevantPrefixes = [
    "package.json",
    "src/components/Chat/",
    "src/components/Creators/",
    "src/app/creators/",
    "src/app/api/creator/messages/",
    "src/app/api/creator/subscriptions/",
    "src/app/api/creator/bookings/",
    "src/app/api/creator/requests/",
    "src/lib/chat-send-feedback.ts",
    "src/lib/problem-state-copy.ts",
    "src/lib/creator-experiences.ts",
    "src/lib/server/creator-experiences.ts",
    "src/lib/server/chat.ts",
    "scripts/agent/validate-creator-monetization-gates-lock.ts",
    "docs/agent-truth/creator-monetization-gates-lock.md",
    "agent/state/creator-monetization-gates-lock.generated.json",
  ];

  return output
    .split("\0")
    .filter(Boolean)
    .map((entry) => entry.slice(3))
    .filter((filePath) => relevantPrefixes.some((prefix) => filePath.startsWith(prefix)));
}

function validate(): LockReport {
  const chatExperience = read(files.chatExperience);
  const creatorExperiencesPanel = read(files.creatorExperiencesPanel);
  const creatorPaidGdGuidanceCard = read(files.creatorPaidGdGuidanceCard);
  const creatorProfileClient = read(files.creatorProfileClient);
  const creatorMessagesRoute = read(files.creatorMessagesRoute);
  const creatorSubscriptionsRoute = read(files.creatorSubscriptionsRoute);
  const creatorBookingsRoute = read(files.creatorBookingsRoute);
  const creatorRequestsRoute = read(files.creatorRequestsRoute);
  const chatSendFeedback = read(files.chatSendFeedback);
  const creatorExperiences = read(files.creatorExperiences);
  const serverCreatorExperiences = read(files.serverCreatorExperiences);
  const serverChat = read(files.serverChat);
  const problemStateCopy = read(files.problemStateCopy);
  const packageJson = read(files.packageJson);

  const checks: ValidationCheck[] = [
    {
      key: "shared-guidance-card",
      label: "Shared compact paid-GD guidance card exists",
      ok: includesAll(creatorPaidGdGuidanceCard, [
        "Open Wallet",
        "Go unwrap drops",
        "Free GumDrops are only for unwrapping Drops",
        "Paid creator media needs paid GumDrops",
      ]),
      evidence: [
        "The shared creator guidance card explains the wallet-first next action and keeps unwrap as the secondary path.",
      ],
    },
    {
      key: "creator-panel-guidance",
      label: "Creator experience panel renders the guidance card on low balance",
      ok: includesAll(creatorExperiencesPanel, [
        "CreatorPaidGdGuidanceCard",
        "guidanceReasonByView",
        "Paid GumDrops only. Reward GD do not count toward Fan Pass.",
      ]),
      evidence: [
        "Fan Pass, chat, request, and booking lanes now share the compact paid-GD guidance component.",
      ],
    },
    {
      key: "profile-guidance",
      label: "Creator profile surfaces the guidance card for monetization failures",
      ok: includesAll(creatorProfileClient, [
        "CreatorPaidGdGuidanceCard",
        "monetizationGuidance",
        "setMonetizationGuidance",
        "reason: \"chat\"",
        "reason: \"fan_pass\"",
        "reason: \"request\"",
        "reason: \"booking\"",
        "openPurchaseModal(monetizationGuidance.requiredPaidGd)",
      ]),
      evidence: [
        "Profile actions now surface a compact guidance card instead of dead-ending on wallet-only toasts.",
      ],
    },
    {
      key: "chat-guidance",
      label: "Chat keeps proactive and reactive paid-GD guidance",
      ok: includesAll(chatExperience, [
        "ChatPaidGdGuidanceCard",
        "proactivePaidGdGateVisible",
        "goUnwrapDropsForChat",
        "openChatPaidGdPurchaseModal",
        "chat_paid_gd_gate_viewed",
      ]),
      evidence: [
        "The chat shell already shows the paid-GD gate before send-time errors and keeps unwrap as the secondary action.",
      ],
    },
    {
      key: "problem-copy",
      label: "Expected creator monetization failures use human copy",
      ok: includesAll(problemStateCopy, [
        "Open Wallet to add",
        "book this again",
        "start this Fan Pass again",
        "send this request again",
        "Bookings are not available for this creator right now.",
      ]),
      evidence: [
        "Subscription, request, and booking failures now point to Wallet instead of technical jargon.",
      ],
    },
    {
      key: "typed-errors",
      label: "Typed backend errors exist for expected monetization blocks",
      ok: includesAll(creatorMessagesRoute, [
        "toChatClientError",
        "safeSendChatMessageForViewer",
        "malformed_body",
        "invalid_message_request",
      ]) && includesAll(creatorSubscriptionsRoute, [
        "CreatorSubscriptionProblem",
        "insufficient_paid_gumdrops",
        "buildSubscriptionProblemResponse",
      ]) && includesAll(creatorBookingsRoute, [
        "CreatorBookingProblem",
        "insufficient_paid_gumdrops",
        "buildBookingProblemResponse",
      ]) && includesAll(creatorRequestsRoute, [
        "CreatorRequestProblem",
        "insufficient_paid_gumdrops",
        "buildRequestProblemResponse",
      ]) && includesAll(chatSendFeedback, [
        "insufficient_paid_gumdrops",
        "You need more paid GumDrops to message this creator.",
      ]),
      evidence: [
        "The API surface returns typed, user-facing problems for the creator monetization flows.",
      ],
    },
    {
      key: "low-balance-reminder",
      label: "Low paid-GD reminder fires once per cycle and resets on paid refill",
      ok: includesAll(serverChat, [
        "buildChatPaidGdLowBalanceReminderAfterSend",
        "buildChatPaidGdLowBalanceReminderAfterPaidRefill",
        "normalizeChatPaidGdLowBalanceReminderState",
        "eligibleAgain",
        "reminderCycleId",
        "chat_paid_gd_low_balance",
      ]),
      evidence: [
        "Chat reminder state tracks the paid-balance cycle and re-arms after paid refill, not free balance changes.",
      ],
    },
    {
      key: "paid-only-policies",
      label: "Paid-source GumDrops remain the spend policy for creator monetization",
      ok: includesAll(creatorExperiences, [
        "CREATOR_MESSAGE_COSTS",
        "CREATOR_BOOKING_RATES",
        "CREATOR_SUBSCRIPTION_MIN_GD",
        "DEFAULT_CREATOR_SETTINGS",
      ]) && includesAll(serverCreatorExperiences, [
        "Creator chat",
        "Creator subscriptions",
        "Custom requests",
        "Phone bookings",
        "Video bookings",
        "purchasedOnly: true",
        "spendCreatorExperienceGumdrops",
        "CREATOR_SPEND_POLICIES",
      ]),
      evidence: [
        "Creator spend policies remain purchased-only and keep free GumDrops limited to unwrap flows.",
      ],
    },
    {
      key: "package-script",
      label: "Package script is wired",
      ok: packageJson.includes("\"check:creator-monetization-gates-lock\""),
      evidence: [
        "package.json exposes the creator monetization gates lock command.",
      ],
    },
  ];

  const criticalBlockers = checks
    .filter((check) => !check.ok)
    .map((check) => `${check.key}: ${check.label}`);

  const warnings: string[] = [];
  const status: LockReport["status"] = criticalBlockers.length > 0 ? "fail" : "pass";
  const report: LockReport = {
    generatedAt: new Date().toISOString(),
    status,
    criticalBlockers,
    warnings,
    changedFilesSinceLastCreatorMonetizationGatesLock: collectChangedFiles(),
    requiredTargetedChecks: [
      "npm run check:creator-monetization-gates-lock",
      "npm run typecheck",
    ],
    forbiddenBroadChecks: [
      "npm run check",
      "playwright",
      "cypress",
      "lighthouse",
      "firebase deploy",
    ],
    promoReadinessNotes: [
      "Creator monetization surfaces now guide fans to Wallet first and keep unwrap as the fallback path where relevant.",
      "Expected subscription, request, booking, and chat payment blocks now surface typed user copy instead of generic internal errors.",
      "The low paid-GD reminder cycle remains server-owned and re-arms only after paid refill.",
    ],
    checks,
  };

  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

const report = validate();
const summary = [
  `status=${report.status}`,
  `criticalBlockers=${report.criticalBlockers.length}`,
  `warnings=${report.warnings.length}`,
  `changedFiles=${report.changedFilesSinceLastCreatorMonetizationGatesLock.length}`,
].join(" ");

console.log(summary);
if (report.status === "fail") {
  for (const blocker of report.criticalBlockers) {
    console.log(`blocker: ${blocker}`);
  }
  process.exitCode = 1;
}
