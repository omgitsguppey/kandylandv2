import { execFileSync } from "node:child_process";

import {
  ROOT,
  nowIso,
  readText,
  writeJsonFile,
  type Json,
} from "./shared";
import {
  deriveGeneratedReportFreshness,
  type GeneratedReportFreshness,
} from "../../src/lib/generated-reports/generated-report-contract";

type SectionResult = {
  name: string;
  status: "pass" | "fail";
  failures: string[];
};

type UserCriticalPathLockReport = {
  reportKey: "user-critical-path-lock";
  generatedAt: string;
  sourceCommit: string;
  freshness: GeneratedReportFreshness;
  status: "pass" | "fail";
  summary: {
    sectionCount: number;
    passedSectionCount: number;
    failedSectionCount: number;
    criticalBlockerCount: number;
    warningCount: number;
    changedFileCount: number;
    requiredTargetedCheckCount: number;
    forbiddenBroadCheckCount: number;
  };
  criticalBlockers: string[];
  warnings: string[];
  changedFilesSinceLastUserCriticalPathLock: string[];
  requiredTargetedChecks: string[];
  forbiddenBroadChecks: string[];
  promoReadinessNotes: string[];
  validationResults: SectionResult[];
};

const REPORT_PATH = "agent/state/user-critical-path-lock.generated.json";
const failures: string[] = [];
const warnings: string[] = [];
const validationResults: SectionResult[] = [];

function gitOutput(args: string[]) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
}

function gitHeadCommit() {
  return gitOutput(["rev-parse", "HEAD"]);
}

function gitChangedFiles() {
  const output = execFileSync("git", ["status", "--porcelain=v1", "-z"], {
    cwd: ROOT,
    encoding: "utf8",
  });

  const entries = output.split("\0").filter(Boolean);
  const paths: string[] = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const status = entry.slice(0, 2);
    const filePath = entry.slice(3).replace(/\\/gu, "/");

    if (status[0] === "R" || status[0] === "C") {
      const renamedPath = entries[index + 1]?.replace(/\\/gu, "/");
      if (renamedPath) {
        paths.push(renamedPath);
      }
      index += 1;
      continue;
    }

    if (filePath.length > 0) {
      paths.push(filePath);
    }
  }

  return paths.sort((left, right) => left.localeCompare(right));
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    failures.push(message);
  }
}

function assertIncludes(source: string, expected: string, label: string) {
  assert(source.includes(expected), `${label} must include "${expected}".`);
}

function assertExcludes(source: string, forbidden: string, label: string) {
  assert(!source.includes(forbidden), `${label} must not include "${forbidden}".`);
}

function runSection(name: string, fn: () => void) {
  const start = failures.length;
  fn();
  validationResults.push({
    name,
    status: failures.length > start ? "fail" : "pass",
    failures: failures.slice(start),
  });
}

function readRequired(relativePath: string) {
  try {
    return readText(relativePath);
  } catch {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
}

const packageJson = readRequired("package.json");
const homePage = readRequired("src/app/page.tsx");
const homeClient = readRequired("src/app/HomeClient.tsx");
const hero = readRequired("src/components/Hero.tsx");
const homeHeroActions = readRequired("src/components/Landing/HomeHeroActions.tsx");
const dashboardPage = readRequired("src/app/dashboard/page.tsx");
const dashboardClient = readRequired("src/app/dashboard/DashboardClient.tsx");
const dailyCheckIn = readRequired("src/components/Dashboard/DailyCheckIn.tsx");
const dropsPage = readRequired("src/app/drops/page.tsx");
const dropsClient = readRequired("src/app/drops/DropsClient.tsx");
const dropCard = readRequired("src/components/DropCard.tsx");
const dropCardCta = readRequired("src/components/DropCardCta.tsx");
const featuredCarousel = readRequired("src/components/FeaturedCarousel.tsx");
const lockedPreviewClient = readRequired("src/components/Drops/LockedDropPreviewClient.tsx");
const lockedPreviewView = readRequired("src/components/Drops/LockedDropPreviewView.tsx");
const purchaseModal = readRequired("src/components/PurchaseModal.tsx");
const viewerPage = readRequired("src/app/dashboard/viewer/page.tsx");
const viewerClient = readRequired("src/app/dashboard/viewer/ViewerClient.tsx");
const viewerHelpers = readRequired("src/app/dashboard/viewer/ViewerHelpers.ts");
const viewerFeedback = readRequired("src/app/dashboard/viewer/hooks/useViewerFeedback.ts");
const chatExperience = readRequired("src/components/Chat/ChatExperience.tsx");
const chatSendFeedback = readRequired("src/lib/chat-send-feedback.ts");
const supportInbox = readRequired("src/components/Support/SupportInbox.tsx");
const problemStateCopy = readRequired("src/lib/problem-state-copy.ts");
const authContext = readRequired("src/context/AuthContext.tsx");

runSection("Guest home CTA leads to signup and dashboard", () => {
  assertIncludes(homePage, "HomeClient", "Home page");
  assertIncludes(homePage, "Hero", "Home page");
  assertIncludes(homeClient, 'const nextPath = "/dashboard";', "Home client");
  assertIncludes(homeClient, "router.replace(nextPath)", "Home client");
  assertIncludes(homeClient, 'Returning you to your dashboard', "Home client");
  assertIncludes(homeHeroActions, 'openAuthModal("signup")', "Home hero actions");
  assertIncludes(homeHeroActions, 'Link href="/dashboard"', "Home hero actions");
  assertIncludes(homeHeroActions, "Unwrap Your KandyDrops", "Home hero actions");
  assertIncludes(homeHeroActions, "See How It Works", "Home hero actions");
  assertIncludes(hero, "HomeHeroActions", "Hero");
  assertIncludes(hero, "Live Now", "Hero");
});

runSection("Logged-in users land on dashboard", () => {
  assertIncludes(dashboardPage, "DashboardClient", "Dashboard page");
  assertIncludes(dashboardClient, "DailyCheckIn", "Dashboard client");
  assertIncludes(dashboardClient, "CollectionList", "Dashboard client");
  assertIncludes(dashboardClient, 'CreatorDiscoveryRail surface="dashboard"', "Dashboard client");
  assertIncludes(dashboardClient, "RecentActivityFeed", "Dashboard client");
});

runSection("Dashboard check-in stays compact and functional", () => {
  assertIncludes(dailyCheckIn, 'variant = "dashboard"', "Daily check-in");
  assertIncludes(dailyCheckIn, 'data-daily-checkin-variant={variant}', "Daily check-in");
  assertIncludes(dailyCheckIn, 'data-onboarding-target="daily-reward"', "Daily check-in");
  assertIncludes(dailyCheckIn, 'data-onboarding-target="daily-reward-claim"', "Daily check-in");
  assertIncludes(dailyCheckIn, "Claimed ${reward} Gum Drops!", "Daily check-in");
  assertIncludes(dailyCheckIn, "Come back tomorrow for", "Daily check-in");
  assertIncludes(dailyCheckIn, "Daily Rewards", "Daily check-in");
  assertIncludes(dailyCheckIn, "Claim", "Daily check-in");
});

runSection("Drops page shows locked, affordable, and refill states", () => {
  assertIncludes(dropsPage, "DropsClient", "Drops page");
  assertIncludes(dropsClient, 'openAuthModal("signup")', "Drops client");
  assertIncludes(dropsClient, "openPurchaseModal()", "Drops client");
  assertIncludes(dropsClient, "KandyDropsAccountOverview", "Drops client");
  assertIncludes(dropCard, "openPurchaseModal(", "Drop card");
  assertIncludes(dropCard, "showUnwrapSuccessToast", "Drop card");
  assertIncludes(dropCard, "router.push(`/dashboard/viewer?id=${drop.id}`)", "Drop card");
  assertIncludes(dropCard, "getUnlockProblemCopy", "Drop card");
  assertIncludes(dropCardCta, "Create account to unwrap", "Drop CTA");
  assertIncludes(dropCardCta, "Refill to unwrap", "Drop CTA");
  assertIncludes(dropCardCta, "Preview cover", "Drop CTA");
  assertIncludes(dropCardCta, "View Content", "Drop CTA");
  assertIncludes(featuredCarousel, "Create account to unwrap", "Featured carousel");
  assertIncludes(featuredCarousel, "Refill to unwrap", "Featured carousel");
  assertIncludes(featuredCarousel, "Preview cover", "Featured carousel");
  assertIncludes(featuredCarousel, "View Content", "Featured carousel");
});

runSection("Preview explains what to do before unlock", () => {
  assertIncludes(lockedPreviewClient, "openPurchaseModal", "Locked preview client");
  assertIncludes(lockedPreviewClient, "router.push(truth.libraryOpenHref)", "Locked preview client");
  assertIncludes(lockedPreviewClient, "applyUnlockedDropPreviewProfilePatch", "Locked preview client");
  assertIncludes(lockedPreviewClient, "getUnlockProblemCopy", "Locked preview client");
  assertIncludes(lockedPreviewView, 'data-safe-preview-fields-only="true"', "Locked preview view");
  assertIncludes(lockedPreviewView, "ReportBugButton", "Locked preview view");
  assertIncludes(lockedPreviewView, "Create account to unwrap", "Locked preview view");
  assertIncludes(lockedPreviewView, "Refill to unwrap", "Locked preview view");
  assertIncludes(lockedPreviewView, "Open in My KandyDrops", "Locked preview view");
  assertIncludes(lockedPreviewView, "Keep Unwrapping", "Locked preview view");
  assertIncludes(lockedPreviewView, "Limited Release", "Locked preview view");
});

runSection("Wallet opens from refill gates and preserves source-aware balances", () => {
  assertIncludes(purchaseModal, 'data-wallet-density="public-beta-compact"', "Purchase modal");
  assertIncludes(purchaseModal, 'data-wallet-balance-chip="split-source"', "Purchase modal");
  assertIncludes(purchaseModal, "resolveWalletBalanceSplit", "Purchase modal");
  assertIncludes(purchaseModal, "formatCompactGd(walletBalanceSplit.freeGd)", "Purchase modal");
  assertIncludes(purchaseModal, "formatCompactGd(walletBalanceSplit.paidGd)", "Purchase modal");
  assertIncludes(purchaseModal, "toast.success(`${result.drops || selectedPackage.drops} Gum Drops added!`)", "Purchase modal");
  assertIncludes(purchaseModal, "router.push(destination)", "Purchase modal");
  assertIncludes(purchaseModal, "dispatchActivitySync()", "Purchase modal");
});

runSection("Unlock creates entitlement and routes to viewer/library", () => {
  assertIncludes(lockedPreviewClient, "entitlementId", "Locked preview client");
  assertIncludes(lockedPreviewClient, 'drop-entitlement:${user.uid}:${drop.id}', "Locked preview client");
  assertIncludes(lockedPreviewClient, "router.push(truth.libraryOpenHref)", "Locked preview client");
  assertIncludes(dropCard, "showUnwrapSuccessToast", "Drop card");
  assertIncludes(dropCard, "router.push(`/dashboard/viewer?id=${drop.id}`)", "Drop card");
  assertIncludes(viewerPage, "ViewerClient", "Viewer page");
  assertIncludes(viewerClient, "/dashboard/library", "Viewer client");
  assertIncludes(viewerClient, "ContentSatisfactionPrompt", "Viewer client");
});

runSection("Viewer opens unlocked content only", () => {
  assertIncludes(viewerClient, "Sign in Required", "Viewer client");
  assertIncludes(viewerClient, "Not Authorized", "Viewer client");
  assertIncludes(viewerClient, "You do not have access to this drop.", "Viewer client");
  assertIncludes(viewerHelpers, "fetchSecureContent", "Viewer helpers");
  assertIncludes(viewerHelpers, 'cache: "no-store"', "Viewer helpers");
  assertIncludes(viewerHelpers, 'throw new Error(typeof result?.error === "string" ? result.error : "Failed to load content securely")', "Viewer helpers");
  assertIncludes(viewerFeedback, "Following creator", "Viewer feedback");
});

runSection("Chat guidance and paid-GD copy are present", () => {
  assertIncludes(chatExperience, "Follow creators to start chatting", "Chat experience");
  assertIncludes(chatExperience, "No followed creators yet", "Chat experience");
  assertIncludes(chatExperience, "Support stays separate", "Chat experience");
  assertIncludes(chatExperience, "Paid GumDrops allow you to send a text, pic, or vid straight to your favorite creator!", "Chat experience");
  assertIncludes(chatExperience, "You need more paid GumDrops before you can send this creator message.", "Chat experience");
  assertIncludes(chatExperience, "buildChatSendErrorMessage", "Chat experience");
  assertIncludes(chatExperience, "buildChatSendWarningMessage", "Chat experience");
  assertIncludes(chatExperience, "Chat threads could not be loaded right now.", "Chat experience");
  assertIncludes(chatExperience, "This chat thread could not be loaded right now.", "Chat experience");
  assertIncludes(chatSendFeedback, "We couldn't send your message. Try again shortly.", "Chat send feedback");
});

runSection("Support and bug-report escape hatches are available", () => {
  assertIncludes(supportInbox, "In-site support inbox", "Support inbox");
  assertIncludes(supportInbox, "New ticket", "Support inbox");
  assertIncludes(supportInbox, "Support tickets could not be loaded right now.", "Support inbox");
  assertIncludes(supportInbox, "This support ticket could not be loaded right now.", "Support inbox");
  assertIncludes(supportInbox, "Support ticket could not be created right now.", "Support inbox");
  assertIncludes(supportInbox, "Support reply could not be sent right now.", "Support inbox");
  assertIncludes(supportInbox, "Ticket status could not be updated right now.", "Support inbox");
  assertIncludes(lockedPreviewView, "ReportBugButton", "Locked preview view");
});

runSection("User-facing errors stay in human copy", () => {
  assertIncludes(problemStateCopy, "Create or open your account before adding GumDrops.", "Problem copy");
  assertIncludes(problemStateCopy, "Your wallet was not changed. Try again or contact support if PayPal charged you.", "Problem copy");
  assertIncludes(problemStateCopy, "Refill your wallet, then unwrap this Drop again.", "Problem copy");
  assertIncludes(problemStateCopy, "Join this Creator's subscription before unwrapping the Drop.", "Problem copy");
  assertIncludes(authContext, "Google sign-in was cancelled before it finished.", "Auth context");
  assertIncludes(authContext, "Your browser blocked the Google sign-in popup. Please allow popups and try again.", "Auth context");
  assertIncludes(authContext, "Sign-in completed, but the app session could not finish loading. Please try again.", "Auth context");
  assertExcludes(chatExperience, 'toast.error(error instanceof Error ? error.message', "Chat experience");
  assertExcludes(supportInbox, "threadListError.message}</div>", "Support inbox");
  assertExcludes(supportInbox, "selectedThreadError.message}</div>", "Support inbox");
});

const generatedAt = nowIso();
const sourceCommit = gitHeadCommit();

function buildReport(changedFilesSinceLastUserCriticalPathLock: string[]): UserCriticalPathLockReport {
  const status = failures.length > 0 ? "fail" : "pass";

  return {
    reportKey: "user-critical-path-lock",
    generatedAt,
    sourceCommit,
    freshness: deriveGeneratedReportFreshness({
      generatedAt,
      nowMs: Date.parse(generatedAt),
    }),
    status,
    summary: {
      sectionCount: validationResults.length,
      passedSectionCount: validationResults.filter((section) => section.status === "pass").length,
      failedSectionCount: validationResults.filter((section) => section.status === "fail").length,
      criticalBlockerCount: failures.length,
      warningCount: warnings.length,
      changedFileCount: changedFilesSinceLastUserCriticalPathLock.length,
      requiredTargetedCheckCount: 3,
      forbiddenBroadCheckCount: 5,
    },
    criticalBlockers: [...failures],
    warnings: [...warnings],
    changedFilesSinceLastUserCriticalPathLock,
    requiredTargetedChecks: [
      "npm run check:user-critical-path-lock",
      "npm run typecheck",
      "npx vitest run tests/unit/chat-send-feedback.spec.ts",
    ],
    forbiddenBroadChecks: [
      "npm run check",
      "playwright",
      "cypress",
      "lighthouse",
      "firebase deploy",
    ],
    promoReadinessNotes:
      status === "pass"
        ? [
            "User-facing Phase 1 is promo-ready when the lock stays green on the current tree.",
            "Any new user-facing copy or journey change should rerun the targeted checks before public promo.",
            "Admin/debug surfaces remain out of scope for this lock.",
          ]
        : [
            "User-facing Phase 1 is not promo-ready until the critical blockers are cleared.",
          ],
    validationResults,
  };
}

const provisionalReport = buildReport([]);
writeJsonFile(REPORT_PATH, provisionalReport as unknown as Json);

const changedFilesSinceLastUserCriticalPathLock = gitChangedFiles();
const report = buildReport(changedFilesSinceLastUserCriticalPathLock);

writeJsonFile(REPORT_PATH, report as unknown as Json);

if (failures.length > 0) {
  console.error("User critical path lock validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("User critical path lock validation passed.");
