import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";

import { findSourceFunction, hasJsxAttribute, someSourceNode, sourceExpressionIs, sourceRenderNodes } from "./validate-behavioral-truth-source";

const REPORT_PATH = "agent/state/chat-composer-modal-lift.generated.json";
const DOC_PATH = "docs/agent-truth/chat-composer-modal-lift.md";
const MODAL_COMPONENT = "src/components/Chat/ChatExperience.tsx";
const PRESENTATION_COMPONENT = "src/components/creative-tim/kandydrops/chat/ChatNewMessageModal.tsx";
const PRESENTATION_MODULE = "@/components/creative-tim/kandydrops/chat/ChatNewMessageModal";
const MOBILE_SHELL_MODULE = "@/lib/user-mobile-shell";
type Status = "pass" | "fail";
type Element = ts.JsxOpeningElement | ts.JsxSelfClosingElement;

function read(path: string) { return readFileSync(path, "utf8"); }
function git(args: string[]) {
  try { return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return ""; }
}
function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const)
    for (const line of git([...args]).split(/\r?\n/u)) { const file = line.trim().replace(/\\/gu, "/"); if (file) files.add(file); }
  return [...files].sort();
}
function ast(file: string, source: string) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (((tree as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics?.length ?? 0) > 0) throw new Error("Invalid source in " + file);
  return tree;
}
function importedName(source: ts.SourceFile, moduleName: string, exportedName: string) {
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== moduleName) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) return bindings.elements.find(element => (element.propertyName?.text ?? element.name.text) === exportedName)?.name.text;
  }
  return undefined;
}
function attribute(element: Element, name: string) {
  const property = element.attributes.properties.find((node): node is ts.JsxAttribute => ts.isJsxAttribute(node) && node.name.getText() === name);
  return property?.initializer && ts.isJsxExpression(property.initializer) ? property.initializer.expression : property?.initializer;
}
function elementIn(nodes: readonly ts.Node[], tag: string | undefined, predicate: (element: Element) => boolean) {
  return Boolean(tag && someSourceNode(nodes, node => (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText() === tag && predicate(node)));
}
function unwrap(expression: ts.Node | undefined): ts.Node | undefined {
  if (expression && (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression) || ts.isTypeAssertionExpression(expression))) return unwrap(expression.expression);
  return expression;
}
function initializer(source: ts.SourceFile, name: string) {
  let found: ts.Expression | undefined;
  someSourceNode(findSourceFunction(source, "ChatExperience")?.body, node => { if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) found = node.initializer; return false; });
  return found;
}
function memoValue(source: ts.SourceFile, reference: ts.Node | undefined) {
  if (!reference || !ts.isIdentifier(reference)) return undefined;
  const call = unwrap(initializer(source, reference.text));
  if (!call || !ts.isCallExpression(call) || !sourceExpressionIs(call.expression, "useMemo")) return undefined;
  const factory = call.arguments[0];
  return factory && ts.isArrowFunction(factory) && !ts.isBlock(factory.body) ? unwrap(factory.body) : undefined;
}
function property(object: ts.Node | undefined, name: string) {
  const value = unwrap(object);
  return value && ts.isObjectLiteralExpression(value) ? value.properties.find((node): node is ts.PropertyAssignment => ts.isPropertyAssignment(node) && node.name.getText() === name)?.initializer : undefined;
}
function isShellConstant(source: ts.SourceFile, expression: ts.Node | undefined, exportedName: string) {
  const imported = importedName(source, MOBILE_SHELL_MODULE, exportedName);
  if (!expression || !ts.isIdentifier(expression) || !imported) return false;
  const declaration = source.statements.flatMap(statement => ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : []).find(node => ts.isIdentifier(node.name) && node.name.text === expression.text);
  return expression.text === imported || sourceExpressionIs(declaration?.initializer, imported);
}
function classText(element: Element) { const value = attribute(element, "className"); return value && ts.isStringLiteral(value) ? value.text : ""; }

function inspect(source: string, presentation: string) {
  const controller = ast(MODAL_COMPONENT, source), component = ast(PRESENTATION_COMPONENT, presentation);
  const controllerNodes = sourceRenderNodes(controller, "ChatExperience"), componentNodes = sourceRenderNodes(component, "ChatNewMessageModal");
  const imported = importedName(controller, PRESENTATION_MODULE, "ChatNewMessageModal");
  let caller: Element | undefined;
  elementIn(controllerNodes, imported, element => { caller = element; return true; });
  const connected = Boolean(caller);
  const sheet = caller ? memoValue(controller, attribute(caller, "sheetStyle")) : undefined;
  const list = caller ? memoValue(controller, attribute(caller, "listStyle")) : undefined;
  const sheetBound = Boolean(sheet && ts.isConditionalExpression(sheet) && sourceExpressionIs(sheet.condition, "isIosPwaChatShell")
    && isShellConstant(controller, property(sheet.whenTrue, "paddingBottom"), "USER_MOBILE_CHAT_NEW_MESSAGE_MODAL_IOS_PWA_BOTTOM_OFFSET")
    && isShellConstant(controller, property(sheet.whenFalse, "paddingBottom"), "USER_MOBILE_CHAT_NEW_MESSAGE_MODAL_BOTTOM_OFFSET")
    && elementIn(componentNodes, "div", element => sourceExpressionIs(attribute(element, "style"), "sheetStyle") && sourceExpressionIs(attribute(element, "ref"), "sheetRef")));
  const listBound = Boolean(isShellConstant(controller, property(list, "paddingBottom"), "USER_MOBILE_CHAT_NEW_MESSAGE_MODAL_LIST_BOTTOM_PADDING")
    && isShellConstant(controller, property(list, "scrollPaddingBottom"), "USER_MOBILE_CHAT_NEW_MESSAGE_MODAL_LIST_BOTTOM_PADDING")
    && elementIn(componentNodes, "div", element => sourceExpressionIs(attribute(element, "style"), "listStyle") && hasJsxAttribute([element], "data-chat-modal-list-bottom-padding", "true")));
  const creatorBound = Boolean(caller && sourceExpressionIs(attribute(caller, "open"), "composePickerOpen")
    && sourceExpressionIs(attribute(caller, "creators"), "followedCreators") && sourceExpressionIs(attribute(caller, "onSelectCreator"), "openThreadComposer")
    && elementIn(componentNodes, "button", element => someSourceNode(attribute(element, "onClick"), node => ts.isCallExpression(node)
      && sourceExpressionIs(node.expression, "onSelectCreator") && node.arguments.length === 1 && sourceExpressionIs(node.arguments[0], "creator.uid")))
    && someSourceNode(componentNodes, node => ts.isCallExpression(node) && sourceExpressionIs(node.expression, "creators.map")));
  const modalBody = findSourceFunction(component, "ChatNewMessageModal")?.body;
  const ownedCall = (pattern: RegExp) => someSourceNode(modalBody, node => ts.isCallExpression(node) && pattern.test(node.expression.getText(component)));
  const ownsThreadSelection = someSourceNode(modalBody, node => ts.isIdentifier(node) && node.text === "selectedThreadId");
  const ownedTag = (pattern: RegExp) => someSourceNode(componentNodes, node => (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && pattern.test(node.tagName.getText(component)));
  const scope = {
    bottomNavUntouched: connected && !ownedTag(/MobileBottomBar|BottomNav/u),
    topNavUntouched: connected && !ownedTag(/Navbar|TopNav/u),
    chatFunctionsUntouched: connected && !ownsThreadSelection && !ownedCall(/safeSendChatMessageForViewer|authFetch|sendMessage|handleSend|router\.push|notification/iu),
    creatorPickerLogicUntouched: connected && creatorBound && !ownedCall(/setFollowedCreators|creatorRelationships/iu),
    paymentWalletGumdropUntouched: connected && !ownedCall(/paypal|payment|wallet|gumdrop|ledger/iu) && !ownedTag(/Paypal|Payment|Wallet|Gumdrop|Ledger/iu),
  };
  const classes: string[] = [];
  someSourceNode(componentNodes, node => { if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) classes.push(classText(node)); return false; });
  const panel = classes.find(value => value.includes("backdrop-blur-2xl") && value.includes("overflow-hidden")) ?? "";
  const readableDarkPanel = /bg-(?:black|slate-9(?:00|50))(?:\/|\s|$)/u.test(panel) || (panel.includes("bg-card") && panel.includes("text-card-foreground"));
  const overlay = classes.find(value => value.includes("fixed") && value.includes("inset-0")) ?? "";
  const labelClass = (text: string) => {
    let value = "";
    elementIn(componentNodes,"p",element => {
      const parent = element.parent;
      if (ts.isJsxElement(parent) && parent.children.some(child => ts.isJsxText(child) && child.text.includes(text))) value = classText(element);
      return false;
    });
    return value;
  };
  const titleClass = labelClass("New message"), subtitleClass = labelClass("Choose a creator you already follow.");
  const semanticPanel = panel.includes("bg-card") && panel.includes("text-card-foreground");
  // These are source-consumed foreground roles, not a computed contrast claim.
  const foregroundBound = semanticPanel
    ? titleClass.includes("text-card-foreground") && subtitleClass.includes("text-muted-foreground")
    : titleClass.includes("text-white") && subtitleClass.includes("text-[#8f9097]");
  return {scope, checks: {
    modalComponentPresent: connected && someSourceNode(componentNodes, node => ts.isJsxText(node) && node.text.includes("New message")) && someSourceNode(componentNodes, node => ts.isJsxText(node) && node.text.includes("Choose a creator you already follow.")),
    modalHasRequiredDataAttrs: connected && ["data-chat-new-message-modal","data-chat-modal-above-bottom-nav","data-chat-modal-glass-skin","data-chat-functions-unchanged"].every(name => hasJsxAttribute(componentNodes,name,"true")),
    modalUsesBottomNavSafeOffset: connected && sheetBound && Boolean(caller && sourceExpressionIs(attribute(caller,"iosPwa"),"isIosPwaChatShell")) && hasJsxAttribute(componentNodes,"data-new-message-sheet-safe","above-bottom-nav"),
    modalHasInternalBottomPadding: connected && listBound,
    modalUsesBlackFrostedGlassSkin: connected && readableDarkPanel && foregroundBound && overlay.includes("bg-black/") && panel.includes("backdrop-blur-2xl") && /\bshadow-/u.test(panel),
    modalAvoidsLightGrayPanel: connected && readableDarkPanel && !/bg-(?:gray|slate|zinc)-[1-8]00(?:\/|\s|$)/u.test(panel),
    ...scope,
  }};
}

export function evaluateChatComposerModalScope(source: string, presentation = read(PRESENTATION_COMPONENT)) { return inspect(source,presentation).scope; }

function writeJson(path: string, value: unknown) { mkdirSync(dirname(path), {recursive:true}); writeFileSync(path, JSON.stringify(value,null,2)+"\n"); }
function main() {
  const generatedAtUtc = new Date().toISOString(), currentHead = git(["rev-parse","HEAD"]) || "unknown", files = changedFiles();
  const source = read(MODAL_COMPONENT), presentation = read(PRESENTATION_COMPONENT), inspection = inspect(source,presentation);
  const checks = {...inspection.checks,
    mobileSafeAreaHandlingExists: read("src/lib/user-mobile-shell.ts").includes("env(safe-area-inset-bottom)"),
    packageScriptPresent: read("package.json").includes('"check:chat-composer-modal-lift": "tsx scripts/agent/validate-chat-composer-modal-lift.ts"'),
  };
  const separateLaneChangedFiles = files.filter(file => /^src\/app\/api\/(chat|creator\/messages|messages)\b/u.test(file) || /^src\/lib\/chat(?:\b|-)/u.test(file) || /^src\/hooks\/useChat/u.test(file) || /Navigation\/MobileBottomBar|Navbar|paypal|payment|wallet|gumdrop|ledger/iu.test(file));
  const validationFailures = Object.entries(checks).filter(([,passed])=>!passed).map(([key])=>key+" failed.");
  const report = {generatedAtUtc,reportKey:"chat-composer-modal-lift",currentHead,status:(validationFailures.length===0?"pass":"fail") as Status,modalComponent:MODAL_COMPONENT,presentationComponent:PRESENTATION_COMPONENT,...inspection.scope,bottomOffset:"CHAT_NEW_MESSAGE_MODAL_BOTTOM_OFFSET",safeAreaPolicy:"Existing shared regular/iOS sheet offsets and internal list padding passed through rendered props",glassSkin:"Existing sourced dark panel, consumed title/subtitle foregrounds and modal backdrop; source checks are not computed contrast proof",changedFiles:files,separateLaneChangedFiles,
    concurrentBottomNavFilesChanged:files.some(file=>file==="src/components/Navigation/MobileBottomBar.tsx" || /(^|\/)BottomNav\.(tsx|ts|jsx|js)$/u.test(file)),
    concurrentTopNavFilesChanged:files.some(file=>file==="src/components/Navbar.tsx" || /(^|\/)TopNav\.(tsx|ts|jsx|js)$/u.test(file)),
    concurrentChatLogicFilesChanged:files.some(file=>/^src\/app\/api\/(chat|creator\/messages|messages)\b/u.test(file) || /^src\/lib\/chat(?:\b|-)/u.test(file) || /^src\/hooks\/useChat/u.test(file)),
    concurrentPaymentWalletGumdropFilesChanged:files.some(file=>/paypal|payment|wallet|gumdrop|ledger/iu.test(file) && file!=="public/kandydrops-release-notes.json" && !file.startsWith("src/lib/release-notes/")),
    checks,validationFailures};
  writeJson(REPORT_PATH,report);
  mkdirSync(dirname(DOC_PATH),{recursive:true});
  writeFileSync(DOC_PATH,["# Chat Composer Modal Lift","",`Generated: ${generatedAtUtc}`,`Status: ${report.status}`,`Current head: ${currentHead}`,"","## Contract","","- ChatExperience remains the state/action owner and renders the existing sourced ChatNewMessageModal.","- Rendered sheet/list props carry the canonical regular/iOS dock-clearance and final-row padding; comments or disconnected marker text do not establish those bindings.","- The current dark readable panel and modal backdrop retain their sourced presentation. Shared theme migration is a separate owner; exact historical decorative color/rim/shadow strings are not required.","- Creator selection delegates the exact creator uid to the existing parent action; the modal owns no navigation shell, Chat/network/financial mutation or creator-follow state.","","## Checks","",...Object.entries(checks).map(([key,passed])=>`- ${passed?"pass":"fail"}: ${key}`),"","## Changed Files","",...(files.length?files.map(file=>"- "+file):["- none"]),"","## Separate-Lane Changed Files","",...(separateLaneChangedFiles.length?separateLaneChangedFiles.map(file=>"- "+file):["- none"]),"","## Validation Failures","",...(validationFailures.length?validationFailures.map(failure=>"- "+failure):["- none"]),""].join("\n"));
  if(validationFailures.length){console.error("Chat composer modal lift validation failed:");for(const failure of validationFailures)console.error("- "+failure);process.exitCode=1;}
  else console.log("Chat composer modal lift validation passed.");
}
const modulePath=fileURLToPath(import.meta.url),entryPath=process.argv[1]?resolve(process.argv[1]):"";
if(process.platform==="win32"?modulePath.toLowerCase()===entryPath.toLowerCase():modulePath===entryPath)main();
