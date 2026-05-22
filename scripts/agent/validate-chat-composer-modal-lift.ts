import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const REPORT_PATH = "agent/state/chat-composer-modal-lift.generated.json";
const DOC_PATH = "docs/agent-truth/chat-composer-modal-lift.md";
const MODAL_COMPONENT = "src/components/Chat/ChatExperience.tsx";

type Status = "pass" | "fail";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function git(args: string[]) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of git([...args]).split(/\r?\n/u)) {
      const file = line.trim().replace(/\\/gu, "/");
      if (file) files.add(file);
    }
  }
  return [...files].sort();
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function status(value: boolean): Status {
  return value ? "pass" : "fail";
}

function modalSection(source: string) {
  const start = source.indexOf("data-chat-new-message-modal=\"true\"");
  const end = source.indexOf("data-chat-modal-list-bottom-padding=\"true\"");
  if (start === -1 || end === -1 || end <= start) return "";
  return source.slice(start, end);
}

function renderDoc(report: {
  generatedAtUtc: string;
  status: Status;
  currentHead: string;
  checks: Record<string, boolean>;
  changedFiles: string[];
  validationFailures: string[];
}) {
  mkdirSync(dirname(DOC_PATH), { recursive: true });
  writeFileSync(DOC_PATH, [
    "# Chat Composer Modal Lift",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Contract",
    "",
    "- The Chat tab New message creator picker remains the existing composer modal in `src/components/Chat/ChatExperience.tsx`.",
    "- The modal is lifted above the mobile bottom navigation with the shared chat bottom-nav/safe-area token.",
    "- The scrollable creator list keeps internal bottom padding so the final row remains visible.",
    "- The panel uses a black frosted glass skin with readable text, subtle border, blur, and shadow.",
    "- Chat routing, message sending, thread APIs, creator follow logic, notification logic, payment runtime, wallet runtime, and GumDrop math are untouched.",
    "",
    "## Checks",
    "",
    ...Object.entries(report.checks).map(([key, passed]) => `- ${passed ? "pass" : "fail"}: ${key}`),
    "",
    "## Changed Files",
    "",
    ...(report.changedFiles.length > 0 ? report.changedFiles.map((file) => `- ${file}`) : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length > 0 ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n"));
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = git(["rev-parse", "HEAD"]) || "unknown";
  const files = changedFiles();
  const source = read(MODAL_COMPONENT);
  const modal = modalSection(source);
  const diff = git(["diff", "-U0", "--", MODAL_COMPONENT]);
  const packageJson = read("package.json");

  const bottomNavTouched = files.some((file) =>
    file === "src/components/Navigation/MobileBottomBar.tsx"
    || file === "src/components/layout/BottomNav.tsx"
    || /(^|\/)BottomNav\.(tsx|ts|jsx|js)$/u.test(file));
  const topNavTouched = files.some((file) =>
    file === "src/components/Navbar.tsx"
    || file === "src/components/layout/TopNav.tsx"
    || /(^|\/)TopNav\.(tsx|ts|jsx|js)$/u.test(file));
  const paymentWalletGumdropTouched = files.some((file) =>
    /paypal|payment|wallet|gumdrop|ledger/iu.test(file)
    && file !== "public/kandydrops-release-notes.json"
    && !file.startsWith("src/lib/release-notes/"));
  const chatLogicFilesTouched = files.some((file) =>
    /^src\/app\/api\/(chat|creator\/messages|messages)\b/u.test(file)
    || /^src\/lib\/chat\b/u.test(file)
    || /^src\/lib\/chat-/u.test(file)
    || /^src\/hooks\/useChat/u.test(file));
  const forbiddenChatLogicDiff = /safeSendChatMessageForViewer|authFetch\(|openThreadComposer\(|followedCreators\s*=|setFollowedCreators|creatorRelationships|notification|sendMessage|handleSend|selectedThreadId|router\.push/iu.test(diff);

  const checks = {
    modalComponentPresent: source.includes("New message") && source.includes("Choose a creator you already follow."),
    modalHasRequiredDataAttrs: [
      'data-chat-new-message-modal="true"',
      'data-chat-modal-above-bottom-nav="true"',
      'data-chat-modal-glass-skin="true"',
      'data-chat-functions-unchanged="true"',
    ].every((needle) => source.includes(needle)),
    modalUsesBottomNavSafeOffset: source.includes("CHAT_NEW_MESSAGE_MODAL_BOTTOM_OFFSET")
      && source.includes("USER_MOBILE_CHAT_BOTTOM_NAV_SAFE_OFFSET")
      && source.includes("paddingBottom: CHAT_NEW_MESSAGE_MODAL_BOTTOM_OFFSET")
      && source.includes('data-new-message-sheet-safe="above-bottom-nav"'),
    modalHasInternalBottomPadding: source.includes("CHAT_NEW_MESSAGE_MODAL_LIST_BOTTOM_PADDING")
      && source.includes('data-chat-modal-list-bottom-padding="true"')
      && source.includes("scrollPaddingBottom: CHAT_NEW_MESSAGE_MODAL_LIST_BOTTOM_PADDING"),
    modalUsesBlackFrostedGlassSkin: modal.includes("bg-black/")
      && modal.includes("backdrop-blur-2xl")
      && modal.includes("border-white/12")
      && modal.includes("shadow-[0_32px_90px_rgba(0,0,0,0.68)]"),
    modalAvoidsLightGrayPanel: !/bg-(?:gray|slate|zinc)-[1-9]/u.test(modal)
      && !/bg-\[#(?:111113|141417|f[0-9a-f]{5}|e[0-9a-f]{5}|d[0-9a-f]{5}|c[0-9a-f]{5})\]/iu.test(modal),
    mobileSafeAreaHandlingExists: source.includes("env(safe-area-inset-bottom)")
      && source.includes("USER_MOBILE_CHAT_BOTTOM_NAV_SAFE_OFFSET"),
    bottomNavUntouched: !bottomNavTouched,
    topNavUntouched: !topNavTouched,
    chatFunctionsUntouched: !chatLogicFilesTouched && !forbiddenChatLogicDiff,
    creatorPickerLogicUntouched: !/openThreadComposer|followedCreators|creatorRelationships|setFollowedCreators/iu.test(diff),
    paymentWalletGumdropUntouched: !paymentWalletGumdropTouched,
    packageScriptPresent: packageJson.includes('"check:chat-composer-modal-lift": "tsx scripts/agent/validate-chat-composer-modal-lift.ts"'),
  };

  const validationFailures = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => `${key} failed.`);

  const report = {
    generatedAtUtc,
    reportKey: "chat-composer-modal-lift",
    currentHead,
    status: status(validationFailures.length === 0),
    modalComponent: MODAL_COMPONENT,
    bottomNavUntouched: checks.bottomNavUntouched,
    topNavUntouched: checks.topNavUntouched,
    chatFunctionsUntouched: checks.chatFunctionsUntouched,
    creatorPickerLogicUntouched: checks.creatorPickerLogicUntouched,
    bottomOffset: "CHAT_NEW_MESSAGE_MODAL_BOTTOM_OFFSET",
    safeAreaPolicy: "shared chat bottom-nav safe offset plus env(safe-area-inset-bottom)",
    glassSkin: "black frosted glass",
    changedFiles: files,
    checks,
    validationFailures,
  };

  writeJson(REPORT_PATH, report);
  renderDoc(report);

  if (validationFailures.length > 0) {
    console.error("Chat composer modal lift validation failed:");
    for (const failure of validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("Chat composer modal lift validation passed.");
}

main();
