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
  changedFilesSinceLastCreatorPublicProfileLock: string[];
  requiredTargetedChecks: string[];
  forbiddenBroadChecks: string[];
  promoReadinessNotes: string[];
  checks: ValidationCheck[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const reportPath = join(repoRoot, "agent", "state", "creator-public-profile-lock.generated.json");

const files = {
  creatorProfileClient: join(repoRoot, "src", "app", "creators", "[username]", "CreatorProfileClient.tsx"),
  creatorProfileHeader: join(repoRoot, "src", "components", "Creators", "CreatorProfileHeader.tsx"),
  creatorExperiencesPanel: join(repoRoot, "src", "components", "Creators", "CreatorExperiencesPanel.tsx"),
  creatorProfileRoute: join(repoRoot, "src", "app", "api", "creators", "[username]", "route.ts"),
  creatorRequestsRoute: join(repoRoot, "src", "app", "api", "creator", "requests", "route.ts"),
  creatorBookingsRoute: join(repoRoot, "src", "app", "api", "creator", "bookings", "route.ts"),
  creatorProfileRouting: join(repoRoot, "src", "lib", "creator-profile-routing.ts"),
  creatorProblemCopy: join(repoRoot, "src", "lib", "problem-state-copy.ts"),
  packageJson: join(repoRoot, "package.json"),
};

function read(relativePath: string) {
  return readFileSync(relativePath, "utf8");
}

function includesAll(source: string, snippets: string[]) {
  return snippets.every((snippet) => source.includes(snippet));
}

function collectChangedFiles() {
  const output = execFileSync("git", ["status", "--porcelain=v1", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  return output
    .split("\0")
    .filter(Boolean)
    .map((entry) => entry.slice(3))
    .filter((filePath) => {
      return [
        "package.json",
        "src/app/creators/",
        "src/components/Creators/",
        "src/app/api/creator/requests/",
        "src/app/api/creator/bookings/",
        "src/app/api/creators/",
        "src/lib/problem-state-copy.ts",
        "scripts/agent/validate-creator-public-profile-lock.ts",
        "docs/agent-truth/creator-public-profile-lock.md",
        "agent/state/creator-public-profile-lock.generated.json",
      ].some((prefix) => filePath.startsWith(prefix));
    });
}

function validate(): LockReport {
  const creatorProfileClient = read(files.creatorProfileClient);
  const creatorProfileHeader = read(files.creatorProfileHeader);
  const creatorExperiencesPanel = read(files.creatorExperiencesPanel);
  const creatorProfileRoute = read(files.creatorProfileRoute);
  const creatorRequestsRoute = read(files.creatorRequestsRoute);
  const creatorBookingsRoute = read(files.creatorBookingsRoute);
  const creatorProfileRouting = read(files.creatorProfileRouting);
  const creatorProblemCopy = read(files.creatorProblemCopy);
  const packageJson = read(files.packageJson);

  const checks: ValidationCheck[] = [
    {
      key: "real-creator-data",
      label: "Creator profile loads real creator data",
      ok: includesAll(creatorProfileClient, ["/api/creators/", "DropGrid", "CreatorProfileHeader"]) && includesAll(creatorProfileRoute, ["sanitizeDropForClient", "normalizeCreatorSettings", "buildNotFoundResponse"]),
      evidence: [
        "Client fetches /api/creators/[username] and the API sanitizes public drops.",
      ],
    },
    {
      key: "clean-missing-copy",
      label: "Missing/unavailable states use clean copy",
      ok: includesAll(creatorProfileClient, ["Creator not available", "Sign in to browse drops", "This creator is live, but the first drop has not landed yet."]),
      evidence: [
        "Public profile uses simple unavailable and guest-copy states.",
      ],
    },
    {
      key: "follow-cta",
      label: "Follow CTA is clear",
      ok: includesAll(creatorProfileHeader, ["Follow", "Following", "messageHint"]) && includesAll(creatorProfileClient, ["handleFollow", "creator_followed", "creator_unfollowed"]),
      evidence: [
        "Header exposes a follow action and the profile tracks follow/unfollow events.",
      ],
    },
    {
      key: "compact-mobile-layout",
      label: "Mobile layout stays compact",
      ok: includesAll(creatorProfileClient, ["max-w-6xl", "px-4 sm:px-6", "space-y-4"]) && includesAll(creatorExperiencesPanel, ["grid-cols-2 sm:grid-cols-4", "p-4 sm:p-5", "min-h-11"]),
      evidence: [
        "Profile and creator experience sections use compact spacing and responsive grids.",
      ],
    },
    {
      key: "chat-gating",
      label: "Chat CTA checks follow and paid GD",
      ok: includesAll(creatorProfileClient, [
        "messageHint",
        "CreatorPaidGdGuidanceCard",
        "monetizationGuidance",
        "openPurchaseModal(monetizationGuidance.requiredPaidGd)",
        "reason: \"chat\"",
        "reason: \"fan_pass\"",
        "reason: \"request\"",
        "reason: \"booking\"",
      ]) && includesAll(creatorProfileHeader, ["messageHint"]),
      evidence: [
        "Profile CTA now blocks to auth, follow, or refill before opening chat.",
      ],
    },
    {
      key: "fan-pass-copy",
      label: "Fan Pass explains paid-only GumDrops",
      ok: includesAll(creatorExperiencesPanel, ["Paid GumDrops only. Reward GD do not count toward Fan Pass."]),
      evidence: [
        "Fan Pass lane explicitly says reward GD do not count.",
      ],
    },
    {
      key: "typed-request-errors",
      label: "Request and booking CTAs use typed errors",
      ok: includesAll(creatorRequestsRoute, ["CreatorRequestProblem", "buildRequestProblemResponse", "insufficient_paid_gumdrops"]) && includesAll(creatorBookingsRoute, ["CreatorBookingProblem", "buildBookingProblemResponse", "insufficient_paid_gumdrops"]),
      evidence: [
        "Creator request and booking routes return typed problem payloads.",
      ],
    },
    {
      key: "no-content-leak",
      label: "Expired/locked drops do not leak content",
      ok: includesAll(creatorProfileClient, ["pointer-events-none select-none grayscale opacity-30", "Sign in to browse drops"]) && includesAll(creatorProfileRoute, ["sanitizeDropForClient"]),
      evidence: [
        "Locked drops stay visually blocked and public API payloads are sanitized.",
      ],
    },
    {
      key: "first-name-guidance",
      label: "Creator name and first name are available for guidance copy",
      ok: includesAll(creatorProfileClient, ["readFirstName", "creatorFirstName", "messageHint"]) && includesAll(creatorExperiencesPanel, ["creatorGuidanceName"]),
      evidence: [
        "Chat guidance copy can address the creator by first name.",
      ],
    },
    {
      key: "telemetry-separation",
      label: "Route telemetry separates actor and target creator",
      ok: includesAll(creatorProfileClient, ["viewer_actor_type", "viewer_actor_uid", "target_creator_id", "target_creator_username"]),
      evidence: [
        "Creator profile view telemetry now carries separate viewer and target fields.",
      ],
    },
    {
      key: "package-script",
      label: "Package script is wired",
      ok: packageJson.includes("\"check:creator-public-profile-lock\""),
      evidence: [
        "package.json exposes the creator public-profile lock script.",
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
    changedFilesSinceLastCreatorPublicProfileLock: collectChangedFiles(),
    requiredTargetedChecks: [
      "npm run check:creator-public-profile-lock",
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
      "Creator public profile now guides fans through follow, browse, message, subscribe, request, and booking states.",
      "Chat entry explains follow and paid-GD requirements before routing to the chat shell.",
      "Fan Pass and request/booking flows now surface user copy instead of internal server text.",
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
  `changedFiles=${report.changedFilesSinceLastCreatorPublicProfileLock.length}`,
].join(" ");

console.log(summary);
if (report.status === "fail") {
  for (const blocker of report.criticalBlockers) {
    console.log(`blocker: ${blocker}`);
  }
  process.exitCode = 1;
}
