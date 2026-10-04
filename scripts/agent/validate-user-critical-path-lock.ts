import { execFileSync } from "node:child_process";
import * as ts from "typescript";

import {
  findSourceFunction,
  hasJsxAttribute,
  hasRenderedExpression,
  readSourceAst,
  someSourceNode,
  sourceExpressionIs,
  sourceRenderNodes,
} from "./validate-behavioral-truth-source";

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
} from "../../src/lib/agent-governance/generated-reports/generated-report-contract";

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
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: source inspection could not establish the contract: ${(error as Error).message}`);
  }
  validationResults.push({
    name,
    status: failures.length > start ? "fail" : "pass",
    failures: failures.slice(start),
  });
}

function importName(source: ts.SourceFile, moduleName: string, exportName: string) {
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)
      || statement.moduleSpecifier.text !== moduleName || statement.importClause?.isTypeOnly) continue;
    if (exportName === "default") return statement.importClause?.name?.text;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      return bindings.elements.find(element => !element.isTypeOnly
        && (element.propertyName?.text ?? element.name.text) === exportName)?.name.text;
    }
  }
}

type Element = ts.JsxOpeningElement | ts.JsxSelfClosingElement;
function renderedElement(nodes: readonly ts.Node[], tag: string | undefined, predicate: (element: Element) => boolean = () => true) {
  return Boolean(tag && someSourceNode(nodes, node => (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
    && ts.isIdentifier(node.tagName) && node.tagName.text === tag && predicate(node)));
}

function attributeExpression(element: Element, name: string) {
  const attribute = element.attributes.properties.find((property): property is ts.JsxAttribute =>
    ts.isJsxAttribute(property) && property.name.getText() === name);
  return attribute?.initializer && (ts.isJsxExpression(attribute.initializer)
    ? attribute.initializer.expression : attribute.initializer);
}

function attributeIs(element: Element, name: string, value: string) {
  const expression = attributeExpression(element, name);
  return Boolean(expression && (ts.isStringLiteral(expression) ? expression.text === value : sourceExpressionIs(expression, value)));
}

function calls(nodes: readonly ts.Node[] | ts.Node | undefined, name: string | undefined, args: readonly string[] = []) {
  return Boolean(name && someSourceNode(nodes, node => ts.isCallExpression(node)
    && (ts.isIdentifier(node.expression) ? node.expression.text === name : sourceExpressionIs(node.expression, name))
    && node.arguments.length === args.length && args.every((argument, index) => sourceExpressionIs(node.arguments[index], argument))));
}

function readableAttribute(element: Element, name: string) {
  const value = attributeExpression(element, name);
  return Boolean(value && ts.isStringLiteral(value) && value.text.trim().length > 4);
}

function renderedOwner(entry: ts.SourceFile, nodes: readonly ts.Node[], moduleName: string, exportName: string, ownerPath: string) {
  return renderedElement(nodes, importName(entry, moduleName, exportName))
    ? sourceRenderNodes(readSourceAst(ownerPath, ROOT), exportName) : [];
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
  const page = readSourceAst("src/app/page.tsx", ROOT);
  const pageNodes = sourceRenderNodes(page);
  const experience = readSourceAst("src/components/Landing/PublicHomeExperience.tsx", ROOT);
  const experienceNodes = renderedOwner(page, pageNodes, "@/components/Landing/PublicHomeExperience", "PublicHomeExperience", "src/components/Landing/PublicHomeExperience.tsx");
  const actions = readSourceAst("src/components/Landing/PublicHomeActions.tsx", ROOT);
  const actionNodes = renderedOwner(experience, experienceNodes, "./PublicHomeActions", "PublicHomeActions", "src/components/Landing/PublicHomeActions.tsx");
  const uiActions = importName(actions, "@/context/UIContext", "useUIActions");
  let signupAction: string | undefined;
  someSourceNode(findSourceFunction(actions, "PublicHomeActions")?.body, node => {
    if (!ts.isVariableDeclaration(node) || !ts.isObjectBindingPattern(node.name) || !calls(node.initializer, uiActions)) return false;
    const action = node.name.elements.find(element => (element.propertyName?.getText() ?? element.name.getText()) === "openAuthModal");
    if (action && ts.isIdentifier(action.name)) signupAction = action.name.text;
    return false;
  });
  assert(renderedElement(pageNodes, importName(page, "./HomeClient", "default")), "Home must render its authenticated redirect owner.");
  assert(actionNodes.length > 0, "Home must render the canonical public account actions through its experience body.");
  assert(renderedElement(actionNodes, importName(actions, "@/components/ui/Button", "Button"), element =>
    calls(attributeExpression(element, "onClick"), signupAction, ['"signup"'])), "Home signup must be bound to the rendered primary action from its canonical UIActions hook.");
  assert(renderedElement(actionNodes, importName(actions, "next/link", "default"), element =>
    attributeIs(element, "href", "/dashboard")), "Home signed-in account action must link to Dashboard.");
  const client = readSourceAst("src/app/HomeClient.tsx", ROOT);
  const preferredPath = importName(client, "@/lib/creator-application", "getPreferredAuthenticatedPathForProfile");
  const redirect = findSourceFunction(client, "default");
  assert(someSourceNode(redirect?.body, node => {
    if (!ts.isIfStatement(node) || !sourceExpressionIs(node.expression, "!loading && user && userProfile && !isAdmin")) return false;
    let pathName: string | undefined;
    someSourceNode(node.thenStatement, child => {
      if (ts.isVariableDeclaration(child) && ts.isIdentifier(child.name) && child.initializer
        && calls(child.initializer, preferredPath, ["userProfile", "user.uid"])) pathName = child.name.text;
      return false;
    });
    return Boolean(pathName && calls(node.thenStatement, "router.replace", [pathName]));
  }), "Home redirect must use the canonical profile- and UID-bound preferred path after account readiness, retaining Admin browsing.");
  assertIncludes(homeClient, 'Returning you to your dashboard', "Home client");
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
  assertIncludes(dailyCheckIn, "Claimed ${reward} Reward GD!", "Daily check-in");
  assertIncludes(dailyCheckIn, "Come back after reset for", "Daily check-in");
  const dailyNodes = sourceRenderNodes(readSourceAst("src/components/Dashboard/DailyCheckIn.tsx", ROOT), "DailyCheckIn");
  assert(someSourceNode(dailyNodes, node => ts.isJsxText(node) && node.text.includes("Reward GD")), "Daily check-in must visibly identify Reward GD in its current body.");
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
  const modal = readSourceAst("src/components/PurchaseModal.tsx", ROOT);
  const modalNodes = sourceRenderNodes(modal, "PurchaseModal");
  const frameNodes = renderedOwner(modal, modalNodes, "@/components/creative-tim/kandydrops/wallet/KandyWalletModalFrame", "KandyWalletModalFrame", "src/components/creative-tim/kandydrops/wallet/KandyWalletModalFrame.tsx");
  assert(hasJsxAttribute(frameNodes, "data-wallet-density", "public-beta-compact")
    && hasJsxAttribute(frameNodes, "data-wallet-balance-chip", "split-source"), "Wallet must render its canonical compact split-source frame.");
  const balanceReader = importName(modal, "@/lib/gumdrop-formatting", "resolveWalletBalanceSplit");
  const formatter = importName(modal, "@/lib/gumdrop-formatting", "formatCompactGd");
  let splitName: string | undefined;
  someSourceNode(findSourceFunction(modal, "PurchaseModal")?.body, node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer
      && calls(node.initializer, balanceReader, ["userProfile"])) splitName = node.name.text;
    return false;
  });
  const headerName = importName(modal, "@/components/creative-tim/kandydrops/wallet/KandyWalletPackagePicker", "KandyWalletHeader");
  const headerNodes = renderedOwner(modal, modalNodes, "@/components/creative-tim/kandydrops/wallet/KandyWalletPackagePicker", "KandyWalletHeader", "src/components/creative-tim/kandydrops/wallet/KandyWalletPackagePicker.tsx");
  assert(Boolean(splitName && formatter && renderedElement(modalNodes, headerName, element =>
    calls(attributeExpression(element, "rewardBalanceLabel"), formatter, [splitName + ".freeGd"])
    && calls(attributeExpression(element, "paidBalanceLabel"), formatter, [splitName + ".paidGd"]))
    && hasRenderedExpression(headerNodes, "rewardBalanceLabel") && hasRenderedExpression(headerNodes, "paidBalanceLabel")),
    "Wallet must display separate formatted reward and paid balances from the canonical profile balance reader.");
  assertIncludes(purchaseModal, "toast.success(`${result.drops || selectedPackage.drops} Gum Drops added!`)", "Purchase modal");
  assertIncludes(purchaseModal, "router.push(destination)", "Purchase modal");
  assertIncludes(purchaseModal, "dispatchActivitySync()", "Purchase modal");
});

runSection("Unlock creates entitlement and routes to viewer/library", () => {
  const preview = readSourceAst("src/components/Drops/LockedDropPreviewClient.tsx", ROOT);
  const previewNodes = sourceRenderNodes(preview, "LockedDropPreviewClient");
  const handler = findSourceFunction(preview, "handleCtaClick");
  const decoder = importName(preview, "@/lib/ui-continuity", "readUiJson");
  assert(renderedElement(previewNodes, importName(preview, "@/components/Drops/LockedDropPreviewView", "LockedDropPreviewView"), element =>
    attributeIs(element, "onCtaClick", "handleCtaClick")), "Preview unwrap must remain bound to its canonical action handler.");
  let resultName: string | undefined;
  someSourceNode(handler?.body, node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer
      && ts.isAwaitExpression(node.initializer) && ts.isCallExpression(node.initializer.expression)) {
      const call = node.initializer.expression;
      if (ts.isIdentifier(call.expression) && call.expression.text === decoder
        && sourceExpressionIs(call.arguments[0], "response") && call.arguments[1]
        && someSourceNode(call.arguments[1], property => ts.isPropertyAssignment(property)
          && property.name.getText() === "requireSuccess" && property.initializer.kind === ts.SyntaxKind.TrueKeyword)) resultName = node.name.text;
    }
    return false;
  });
  const identifiers = new Map<string, string>();
  someSourceNode(handler?.body, node => {
    if (!resultName || !ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) return false;
    for (const field of ["transactionId", "entitlementId"]) {
      if (sourceExpressionIs(node.initializer, `typeof ${resultName}.${field} === "string" ? ${resultName}.${field}.trim() : null`)) identifiers.set(field, node.name.text);
    }
    return false;
  });
  assert(Boolean(resultName && identifiers.size === 2 && someSourceNode(handler?.body, node => ts.isCallExpression(node)
    && ts.isIdentifier(node.expression) && node.expression.text === "setUnlockState" && someSourceNode(node.arguments, child =>
      ts.isObjectLiteralExpression(child) && ["transactionId", "entitlementId"].every(field => child.properties.some(property =>
        ts.isShorthandPropertyAssignment(property) ? property.name.text === identifiers.get(field)
          : ts.isPropertyAssignment(property) && property.name.getText() === field && sourceExpressionIs(property.initializer, identifiers.get(field)!)))))),
    "Preview confirmed entitlement and transaction IDs must come from its strict successful server response, never a client reconstruction.");
  assertIncludes(lockedPreviewClient, "router.push(truth.libraryOpenHref)", "Locked preview client");
  assertIncludes(dropCard, "showUnwrapSuccessToast", "Drop card");
  assertIncludes(dropCard, "router.push(`/dashboard/viewer?id=${drop.id}`)", "Drop card");
  assertIncludes(viewerPage, "ViewerClient", "Viewer page");
  assertIncludes(viewerClient, "/dashboard/library", "Viewer client");
  assertIncludes(viewerClient, "ContentSatisfactionPrompt", "Viewer client");
});

runSection("Viewer opens unlocked content only", () => {
  const viewer = readSourceAst("src/app/dashboard/viewer/ViewerClient.tsx", ROOT);
  const viewerNodes = sourceRenderNodes(viewer, "ViewerClient");
  const owner = findSourceFunction(viewer, "ViewerClient");
  const accessName = importName(viewer, "@/lib/drop-view-access", "resolveDropViewAccess");
  assert(Boolean(accessName && someSourceNode(owner?.body, node => ts.isVariableDeclaration(node)
    && ts.isIdentifier(node.name) && node.name.text === "accessState" && someSourceNode(node.initializer, child => ts.isCallExpression(child)
      && ts.isIdentifier(child.expression) && child.expression.text === accessName))
    && someSourceNode(owner?.body, node => ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
      && node.name.text === "isAuthorized" && sourceExpressionIs(node.initializer, "accessState.allowed"))),
    "Viewer authorization must remain derived from canonical Drop access truth.");
  const stateName = importName(viewer, "@/components/creative-tim/kandydrops/viewer/ViewerAccessState", "ViewerAccessState");
  const frameName = importName(viewer, "./components/ViewerFrame", "ViewerFrame");
  let frameStart = Number.POSITIVE_INFINITY;
  renderedElement(viewerNodes, frameName, element => { frameStart = Math.min(frameStart, element.pos); return true; });
  const statements: readonly ts.Statement[] = owner?.body && ts.isBlock(owner.body) ? owner.body.statements : [];
  for (const condition of ['accessState.status === "denied_not_logged_in"', 'accessState.status === "denied_drop_missing" || !drop', 'accessState.status === "error" || contentError', "!isAuthorized"]) {
    const branch = statements.find((statement): statement is ts.IfStatement => ts.isIfStatement(statement) && sourceExpressionIs(statement.expression, condition));
    const branchNodes = branch ? viewerNodes.filter(node => node.pos >= branch.thenStatement.pos && node.end <= branch.thenStatement.end) : [];
    assert(Boolean(branch && branch.end < frameStart && renderedElement(branchNodes, stateName, element =>
      readableAttribute(element, "title") && readableAttribute(element, "message"))), `Viewer must return a human recovery state before content for ${condition}.`);
  }
  assert(Number.isFinite(frameStart), "Viewer must keep its authorized content frame.");
  assertIncludes(viewerHelpers, "fetchSecureContent", "Viewer helpers");
  assertIncludes(viewerHelpers, 'cache: "no-store"', "Viewer helpers");
  assertIncludes(viewerHelpers, 'throw new Error(typeof result?.error === "string" ? result.error : "Failed to load content securely")', "Viewer helpers");
  assertIncludes(viewerFeedback, "Following creator", "Viewer feedback");
});

runSection("Chat guidance and paid-GD copy are present", () => {
  const chat = readSourceAst("src/components/Chat/ChatExperience.tsx", ROOT);
  const chatNodes = sourceRenderNodes(chat, "ChatExperience");
  const pickerName = importName(chat, "@/components/creative-tim/kandydrops/chat/ChatNewMessageModal", "ChatNewMessageModal");
  const pickerNodes = renderedOwner(chat, chatNodes, "@/components/creative-tim/kandydrops/chat/ChatNewMessageModal", "ChatNewMessageModal", "src/components/creative-tim/kandydrops/chat/ChatNewMessageModal.tsx");
  assert(renderedElement(chatNodes, pickerName, element => attributeIs(element, "creators", "followedCreators")
    && attributeIs(element, "onSelectCreator", "openThreadComposer") && attributeIs(element, "open", "composePickerOpen")),
    "Chat picker must be rendered with followed creators and the canonical compose action.");
  const picker = readSourceAst("src/components/creative-tim/kandydrops/chat/ChatNewMessageModal.tsx", ROOT);
  assert(renderedElement(pickerNodes, importName(picker, "next/link", "default"), element => attributeIs(element, "href", "/experiences"))
    && someSourceNode(pickerNodes, node => ts.isJsxText(node) && node.text.includes("No followed creators yet")),
    "Chat empty picker must expose human follow guidance and Creator discovery.");
  assert(renderedElement(chatNodes, importName(chat, "next/link", "default"), element => attributeIs(element, "href", "/experiences")
    && calls(attributeExpression(element, "onClick"), "handleNoFollowCreatorsCtaClick", ['"find_creators"'])),
    "Chat empty inbox must bind Creator discovery to its current follow guidance action.");
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
  const inbox = readSourceAst("src/components/Support/SupportInbox.tsx", ROOT);
  const inboxNodes = sourceRenderNodes(inbox, "SupportInbox");
  const conversationName = importName(inbox, "@/components/creative-tim/kandydrops/support/KandySupportConversation", "KandySupportConversation");
  const conversationNodes = renderedOwner(inbox, inboxNodes, "@/components/creative-tim/kandydrops/support/KandySupportConversation", "KandySupportConversation", "src/components/creative-tim/kandydrops/support/KandySupportConversation.tsx");
  assert(renderedElement(inboxNodes, conversationName, element => attributeIs(element, "composerOpen", "composerOpen")
    && attributeIs(element, "onComposerOpenChange", "setComposerOpen")
    && calls(attributeExpression(element, "onCreateThread"), "handleCreateThread")),
    "Support inbox must render its actual composer state and create handler.");
  assert(renderedElement(conversationNodes, "button", element => calls(attributeExpression(element, "onClick"), "onComposerOpenChange", ["!composerOpen"]))
    && renderedElement(conversationNodes, "form", element => calls(attributeExpression(element, "onSubmit"), "onCreateThread"))
    && renderedElement(conversationNodes, "button", element => attributeIs(element, "type", "submit")
      && attributeIs(element, "disabled", "submitting || createDisabled")), "Support must expose a connected new-request form and guarded submit control.");
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
            "This lock establishes current source integration only; it does not establish provider, payment, runtime, device or public-promo readiness.",
            "Any changed journey dependency requires the affected targeted checks before its source result can be reused.",
            "Admin/debug surfaces remain out of scope for this lock.",
          ]
        : [
            "Current user-journey source integration remains incomplete until these blockers are cleared; broader acceptance remains separately required.",
          ],
    validationResults,
  };
}

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
