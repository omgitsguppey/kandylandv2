import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const ARTIFACT_PATH = "agent/state/bug-report-reward-flow.generated.json";
const DOC_PATH = "docs/agent-truth/bug-report-reward-flow.md";

type Finding = {
  id: string;
  severity: "p0" | "p1" | "p2";
  detail: string;
};

function readSource(path: string) {
  return readFileSync(path, "utf8");
}

function writeJson(path: string, value: unknown) {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

const findings: Finding[] = [];

function requireFile(path: string) {
  if (!existsSync(path)) {
    findings.push({
      id: `missing-${path}`,
      severity: "p0",
      detail: `${path} is missing.`,
    });
    return "";
  }

  return readSource(path);
}

const contractSource = requireFile("src/lib/errors/bug-report-contract.ts");
const routeSource = requireFile("src/app/api/bug-reports/route.ts");
const noticeSource = requireFile("src/components/errors/HumanErrorNotice.tsx");
const routeTestSource = requireFile("tests/unit/bug-reports-route.spec.ts");
const noticeTestSource = requireFile("tests/unit/human-error-notice-bug-report.spec.tsx");
const contractTestSource = requireFile("tests/unit/bug-report-contract.spec.ts");
const submitTestSource = requireFile("tests/unit/submit-bug-report.spec.ts");

if (!/BUG_REPORT_REWARD_GD\s*=\s*10/.test(contractSource)) {
  findings.push({ id: "reward-gd-not-10", severity: "p0", detail: "Bug report reward must be exactly 10 GD." });
}

if (!/BUG_REPORT_DAILY_REWARD_CAP\s*=\s*3/.test(contractSource)) {
  findings.push({ id: "daily-cap-missing", severity: "p0", detail: "Daily bug reward cap must be defined." });
}

if (!/BUG_REPORT_DUPLICATE_WINDOW_MS\s*=\s*6\s*\*\s*60\s*\*\s*60\s*\*\s*1000/.test(contractSource)) {
  findings.push({ id: "duplicate-window-missing", severity: "p0", detail: "Six-hour duplicate reward window must be defined." });
}

if (!routeSource.includes('auth: "user"') || !/if\s*\(\s*!caller\?\.uid\s*\)/.test(routeSource)) {
  findings.push({ id: "unauthenticated-reward-risk", severity: "p0", detail: "Route must require an authenticated user before report/reward handling." });
}

const creditsRewardBalance = /creditSourceAwareGumdrops\([\s\S]*"reward"/.test(routeSource);

if (!creditsRewardBalance) {
  findings.push({ id: "reward-balance-credit-missing", severity: "p0", detail: "Reward path must credit reward balance through source-aware helpers." });
}

if (/gumDropsPurchasedBalance\s*:/.test(routeSource)) {
  findings.push({ id: "purchased-balance-direct-touch", severity: "p0", detail: "Bug reward route must not directly credit purchased balance." });
}

for (const required of ["rewardSource", "sourceTruth", "bugReportId", "rewardCreditGumDrops", "purchasedCreditGumDrops"]) {
  if (!routeSource.includes(required)) {
    findings.push({ id: `missing-transaction-${required}`, severity: "p0", detail: `Reward transaction is missing ${required}.` });
  }
}

for (const blocked of ["token", "secret", "password", "authorization", "cookie", "paypal", "capture", "clientsecret"]) {
  if (!contractSource.toLowerCase().includes(blocked)) {
    findings.push({ id: `sanitizer-missing-${blocked}`, severity: "p0", detail: `Sanitizer must reject ${blocked} context keys.` });
  }
}

if (!/resolveBugReportRedirect/.test(contractSource) || !/startsWith\("\/\/"\)/.test(contractSource)) {
  findings.push({ id: "unsafe-redirect-guard-missing", severity: "p0", detail: "Safe redirect helper must reject external or protocol-relative routes." });
}

if (/purchased GumDrops/i.test(noticeSource)) {
  findings.push({ id: "notice-purchased-copy", severity: "p0", detail: "Bug report notice must not describe rewards as purchased GumDrops." });
}

if (!noticeSource.includes("Send bug + get") || !noticeSource.includes("reward GumDrops added")) {
  findings.push({ id: "notice-bug-reward-copy-missing", severity: "p0", detail: "HumanErrorNotice must show reward-aware Send bug CTA and success copy." });
}

if (!/duplicate/i.test(routeTestSource) || !/daily reward cap/i.test(routeTestSource) || !/gumDropsRewardBalance/i.test(routeTestSource)) {
  findings.push({ id: "route-tests-missing-abuse-guards", severity: "p0", detail: "Route tests must cover duplicate, cap, and reward balance behavior." });
}

if (!/token|secret|password|authorization|cookie|paypal|capture|clientSecret/i.test(contractTestSource)) {
  findings.push({ id: "contract-tests-missing-sanitizer", severity: "p0", detail: "Contract tests must cover sensitive context key stripping." });
}

if (!/Send bug \+ get 10 GD/.test(noticeTestSource) || !/reward GumDrops/i.test(noticeTestSource)) {
  findings.push({ id: "notice-tests-missing-reward-copy", severity: "p0", detail: "Notice tests must cover reward CTA and reward-balance success copy." });
}

if (!/authFetch/.test(submitTestSource)) {
  findings.push({ id: "submit-tests-missing-auth-fetch", severity: "p0", detail: "Submit helper tests must verify authFetch usage." });
}

const report = {
  generatedAtUtc: new Date().toISOString(),
  reportKey: "bug-report-reward-flow",
  currentHead: currentHead(),
  summary: {
    rewardGd: 10,
    dailyRewardCap: 3,
    duplicateWindowMs: 6 * 60 * 60 * 1000,
    routeCreated: existsSync("src/app/api/bug-reports/route.ts"),
    rewardCreditsRewardBalanceOnly: findings.every((finding) => finding.id !== "reward-balance-credit-missing" && finding.id !== "purchased-balance-direct-touch"),
    purchasedBalanceUntouched: !/gumDropsPurchasedBalance\s*:/.test(routeSource),
    safeRedirectEnabled: /resolveBugReportRedirect/.test(contractSource),
    sanitizationEnabled: /SENSITIVE_CONTEXT_KEY_PATTERN/.test(contractSource),
    p0Count: findings.filter((finding) => finding.severity === "p0").length,
    p1Count: findings.filter((finding) => finding.severity === "p1").length,
    p2Count: findings.filter((finding) => finding.severity === "p2").length,
  },
  routeFindings: [
    {
      id: "bug-report-route",
      status: existsSync("src/app/api/bug-reports/route.ts") ? "fixed" : "missing",
      detail: "Authenticated POST route stores sanitized reports and handles reward eligibility.",
    },
  ],
  rewardFindings: [
    {
      id: "reward-balance-only",
      status: creditsRewardBalance ? "fixed" : "missing",
      detail: "Eligible rewards credit 10 reward GumDrops through source-aware balance helpers; purchased balance is not credited.",
    },
    {
      id: "abuse-guards",
      status: contractSource.includes("BUG_REPORT_DAILY_REWARD_CAP") && contractSource.includes("BUG_REPORT_DUPLICATE_WINDOW_MS") ? "fixed" : "missing",
      detail: "Daily cap and duplicate window guard bug-report reward farming.",
    },
  ],
  sanitizerFindings: [
    {
      id: "sensitive-context-strip",
      status: /SENSITIVE_CONTEXT_KEY_PATTERN/.test(contractSource) ? "fixed" : "missing",
      detail: "Bug report context strips token, secret, password, authorization, cookie, PayPal, capture, clientSecret, and stack-like keys.",
    },
  ],
  redirectFindings: [
    {
      id: "safe-internal-redirect",
      status: /resolveBugReportRedirect/.test(contractSource) ? "fixed" : "missing",
      detail: "Redirects prefer safe internal previousRoute, then route, then root.",
    },
  ],
  fixesApplied: [
    "Created one-tap bug report contract, route, client submit helper, and hook.",
    "Updated HumanErrorNotice with async Send bug CTA and reward-aware success state.",
    "Added validator and focused unit coverage for reward balance, duplicate, cap, sanitizer, redirect, and client helper behavior.",
  ],
  nextFixOrder: [
    "Wire translated platform errors on selected user/creator surfaces to useSubmitBugReport.",
    "Expose raw bug report diagnostics only in Debug/admin evidence surfaces.",
    "Add operator review tooling for bug_reports after admin scope is explicitly approved.",
  ],
};

writeJson(ARTIFACT_PATH, report);

const doc = `# Bug Report Reward Flow

Generated: ${report.generatedAtUtc}

Current head: \`${report.currentHead}\`

## Status

Phase 2 creates the one-tap bug report reward contract and route. It does not wire every product surface yet and does not expose raw debug details to normal users.

## Reward Contract

- Eligible translated platform/action bugs can grant ${report.summary.rewardGd} reward GumDrops.
- Bug report rewards credit reward balance only, never purchased balance.
- Auth is required before any reward is considered.
- Duplicate reports for the same user, error, surface, route, and previous route are blocked for ${report.summary.duplicateWindowMs} ms.
- Daily rewards are capped at ${report.summary.dailyRewardCap} per user.

## Route

- Route: \`POST /api/bug-reports\`
- Stores sanitized records in \`bug_reports\`.
- Uses safe internal redirects only.
- Returns human success/failure payloads without raw stack, Firebase, PayPal, Zod, token, or provider details.

## Next Fix Order

${report.nextFixOrder.map((step, index) => `${index + 1}. ${step}`).join("\n")}
`;

writeFileSync(DOC_PATH, doc);

if (findings.length > 0) {
  console.error(JSON.stringify({ ok: false, findings, artifact: ARTIFACT_PATH, doc: DOC_PATH }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, artifact: ARTIFACT_PATH, doc: DOC_PATH, rewardGd: 10 }, null, 2));
}
