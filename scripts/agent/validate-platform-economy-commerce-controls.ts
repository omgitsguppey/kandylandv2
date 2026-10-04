import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import * as ts from "typescript";
import { findSourceFunction, hasJsxAttribute, readSourceAst, someSourceNode, sourceExpressionIs, sourceRenderNodes } from "./validate-behavioral-truth-source";

// Reuse the existing source AST owner. Only a connected render is a commerce control.
function importedName(source: ts.SourceFile, callerPath: string, ownerPath: string, exportedName: string) {
    for (const statement of source.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)
            || statement.importClause?.isTypeOnly) continue;
        const specifier = statement.moduleSpecifier.text;
        const resolved = specifier.startsWith("@/") ? "src/" + specifier.slice(2)
            : specifier.startsWith(".") ? posix.normalize(posix.join(posix.dirname(callerPath), specifier)) : "";
        if (resolved.replace(/\.tsx?$/, "") !== ownerPath.replace(/\.tsx?$/, "")) continue;
        const bindings = statement.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
            const binding = bindings.elements.find(element => !element.isTypeOnly
                && (element.propertyName?.text ?? element.name.text) === exportedName);
            if (binding) return binding.name.text;
        }
    }
}

function connectedRender(callerPath: string, callerFunction: string, ownerPath: string, exportedName: string, rootDirectory: string) {
    const caller = readSourceAst(callerPath, rootDirectory);
    const localName = importedName(caller, callerPath, ownerPath, exportedName);
    const callers: Array<ts.JsxOpeningElement | ts.JsxSelfClosingElement> = [];
    someSourceNode(sourceRenderNodes(caller, callerFunction), node => {
        if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
            && ts.isIdentifier(node.tagName) && node.tagName.text === localName) callers.push(node);
        return false;
    });
    const source = readSourceAst(ownerPath, rootDirectory);
    return { caller, source, callers, rendered: callers.length ? sourceRenderNodes(source, exportedName) : [] };
}

function inspectRenderedEconomy(rootDirectory: string, failures: string[]) {
    const requireTruth = (condition: unknown, message: string) => { if (!condition) failures.push(message); };
    const pagePath = "src/app/admin/economy/page.tsx";
    const consolePath = "src/app/admin/economy/components/PlatformEconomyConsole.tsx";
    const canvasPath = "src/components/creative-tim/kandydrops/admin-economy/KandyTreasuryOperationsCanvas.tsx";
    const stripPath = "src/app/admin/economy/components/PlatformEconomyStrip.tsx";
    const consoleOwner = connectedRender(pagePath, "default", consolePath, "PlatformEconomyConsole", rootDirectory);
    const canvas = connectedRender(consolePath, "PlatformEconomyConsole", canvasPath, "KandyTreasuryOperationsCanvas", rootDirectory);
    const strip = connectedRender(canvasPath, "KandyTreasuryOperationsCanvas", stripPath, "PlatformEconomyStrip", rootDirectory);
    requireTruth(consoleOwner.callers.length > 0, "Economy page must render its imported canonical Console.");
    requireTruth(canvas.callers.length > 0, "Economy Console must render its imported canonical Canvas.");
    for (const [attribute, expression] of [
        ["state", "state"], ["warningSummary", "warningSummary"],
        ["isLocalAdminUiTestSession", "isLocalAdminUiTestSession"], ["treasurySourceState", "treasurySourceState"],
    ]) requireTruth(canvas.callers.length > 0 && canvas.callers.every(caller => hasJsxAttribute([caller], attribute, expression)),
        "Economy Canvas must receive canonical " + attribute + ".");
    const consoleFunction = findSourceFunction(consoleOwner.source, "PlatformEconomyConsole");
    const warningCollector = importedName(consoleOwner.source, consolePath, "src/app/admin/economy/components/types.ts", "collectEconomyWarnings");
    requireTruth(Boolean(warningCollector) && someSourceNode(consoleFunction?.body, node => ts.isVariableDeclaration(node)
        && ts.isIdentifier(node.name) && node.name.text === "warningSummary"
        && someSourceNode(node.initializer, child => ts.isCallExpression(child) && ts.isIdentifier(child.expression)
            && child.expression.text === warningCollector && sourceExpressionIs(child.arguments[0], "state"))),
        "Economy warning summary must derive from the canonical current dashboard state.");

    const sliceRenderer = findSourceFunction(canvas.source, "renderSliceState");
    for (const key of ["treasury", "packages", "promos", "offers", "redemptions", "drift"]) {
        const direct = someSourceNode(canvas.rendered, node => ts.isCallExpression(node)
            && ts.isIdentifier(node.expression) && node.expression.text === "renderSliceState"
            && Boolean(node.arguments[0]) && ts.isObjectLiteralExpression(node.arguments[0])
            && node.arguments[0].properties.some(property => ts.isPropertyAssignment(property)
                && property.name.getText() === "slice" && sourceExpressionIs(property.initializer, "state." + key)));
        const composed = someSourceNode(canvas.rendered, node => {
            if (!(ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) || !ts.isIdentifier(node.tagName)
                || !hasJsxAttribute([node], "id", key) || !hasJsxAttribute([node], "slice", "state." + key)) return false;
            return someSourceNode(sourceRenderNodes(canvas.source, node.tagName.text), child => ts.isCallExpression(child)
                && ts.isIdentifier(child.expression) && child.expression.text === "renderSliceState"
                && Boolean(child.arguments[0]) && ts.isObjectLiteralExpression(child.arguments[0])
                && child.arguments[0].properties.some(property => ts.isShorthandPropertyAssignment(property)
                    && property.name.text === "slice" || ts.isPropertyAssignment(property) && property.name.getText() === "slice"
                    && sourceExpressionIs(property.initializer, "slice")));
        });
        requireTruth(direct || composed, "Economy Canvas must render canonical " + key + " slice state.");
    }
    for (const condition of ["slice.error", "slice.loading && slice.data == null", "slice.data == null", "Array.isArray(slice.data) && slice.data.length === 0"]) {
        requireTruth(someSourceNode(sliceRenderer?.body, node => ts.isIfStatement(node) && sourceExpressionIs(node.expression, condition)),
            "Economy slice rendering must retain source boundary: " + condition + ".");
    }
    requireTruth(someSourceNode(sliceRenderer?.body, node => ts.isReturnStatement(node)
        && sourceExpressionIs(node.expression, "children(slice.data)")), "Economy slice records must render from admitted slice data.");

    requireTruth(strip.callers.length > 0, "Economy Canvas must render its imported canonical Strip.");
    for (const [attribute, expression] of [["treasury", "state.treasury.data"], ["warningSummary", "warningSummary"], ["sourceState", "treasurySourceState"]]) {
        requireTruth(strip.callers.length > 0 && strip.callers.every(caller => hasJsxAttribute([caller], attribute, expression)),
            "Economy Strip must receive canonical " + attribute + ".");
    }
    requireTruth(hasJsxAttribute(strip.rendered, "data-admin-economy-strip-source-state", "sourceState"),
        "Economy Strip must expose its supplied source state.");
    const stripFunction = findSourceFunction(strip.source, "PlatformEconomyStrip");
    requireTruth(someSourceNode(stripFunction?.body, node => ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
        && node.name.text === "hidesValues" && sourceExpressionIs(node.initializer,
            'sourceState === "source_missing" || sourceState === "collecting" || sourceState === "failed"')),
        "Economy Strip must retain unavailable source masking.");
    requireTruth(someSourceNode(strip.rendered, node => ts.isConditionalExpression(node)
        && sourceExpressionIs(node.condition, "hidesValues") && sourceExpressionIs(node.whenTrue, '"--"')
        && someSourceNode(node.whenFalse, child => ts.isCallExpression(child) && ts.isIdentifier(child.expression) && child.expression.text === "formatGd")),
        "Economy Strip must render unavailable balances as unknown, not zero.");
    requireTruth(someSourceNode(strip.rendered, node => ts.isConditionalExpression(node)
        && sourceExpressionIs(node.condition, "warningSummary.count === null") && sourceExpressionIs(node.whenTrue, '"--"')
        && someSourceNode(node.whenFalse, child => sourceExpressionIs(child, 'warningSummary.sourceState === "verified"'))
        && someSourceNode(node.whenFalse, child => sourceExpressionIs(child, "warningSummary.count.toLocaleString()"))),
        "Economy Strip must render canonical warning availability and partial lower bounds.");
    const warningRail = findSourceFunction(canvas.source, "SourceTruthRail");
    const railCallers: Array<ts.JsxOpeningElement | ts.JsxSelfClosingElement> = [];
    someSourceNode(canvas.rendered, node => {
        if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName)
            && node.tagName.text === "SourceTruthRail") railCallers.push(node);
        return false;
    });
    requireTruth(railCallers.length > 0 && railCallers.every(caller => hasJsxAttribute([caller], "warningSummary", "warningSummary")
        && hasJsxAttribute([caller], "treasurySourceState", "treasurySourceState")),
        "Economy warning inventory must render canonical warning and Treasury source projections.");
    requireTruth(someSourceNode(warningRail?.body, node => ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
        && node.name.text === "complete" && sourceExpressionIs(node.initializer, '!isLocalAdminUiTestSession && sourceState === "verified"')),
        "Economy warning inventory must not promote an incomplete source to verified zero.");
}

export function inspectPlatformEconomyCommerceControls(rootDirectory = process.cwd()) {
    const failures: string[] = [];
    function readRequired(relativePath: string) {
        const fullPath = join(rootDirectory, relativePath);
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
    
    const packageJson = JSON.parse(readRequired("package.json")) as { scripts?: Record<string, string> };
    const contract = readRequired("src/lib/platform-economy.ts");
    const helper = readRequired("src/lib/server/platform-economy.ts");
    const mutations = readRequired("src/lib/server/platform-economy-mutations.ts");
    const packagesRoute = readRequired("src/app/api/admin/economy/packages/route.ts");
    const promosRoute = readRequired("src/app/api/admin/economy/promos/route.ts");
    const offersRoute = readRequired("src/app/api/admin/economy/offers/route.ts");
    const redemptionsRoute = readRequired("src/app/api/admin/economy/redemptions/route.ts");
    const driftRoute = readRequired("src/app/api/admin/economy/drift/route.ts");
    const paypalCapture = readRequired("src/app/api/paypal/capture/route.ts");
    const doctrineDoc = readRequired("docs/doctrine/surfaces/admin-platform-economy-doctrine.md");
    const controlsDoc = readRequired("docs/agent-truth/platform-economy-commerce-controls.md");
    const sourceDoc = readRequired("docs/agent-truth/gumdrop-source-of-funds-truth.md");
    
    if (packageJson.scripts?.["check:platform-economy-commerce-controls"] !== "tsx scripts/agent/validate-platform-economy-commerce-controls.ts") {
        failures.push("package.json must expose check:platform-economy-commerce-controls.");
    }
    
    inspectRenderedEconomy(rootDirectory, failures);
    
    for (const expected of [
        "PLATFORM_ECONOMY_BASE_USD_PER_100_GD = 1",
        "PLATFORM_ECONOMY_WARNING_FLOOR_USD_PER_100_GD = 0.5",
        "computeEffectiveUsdPer100Gd",
        "buildPackageWarnings",
        "buildPromoWarnings",
        "normalizePromoCode",
        "classifyPromoBonusSource",
    ]) {
        requireIncludes(contract, expected, "Platform Economy contract");
    }
    
    for (const expected of [
        "readPlatformEconomyPackages",
        "readPlatformEconomyPromos",
        "readPlatformEconomyOffers",
        "readPlatformEconomyRedemptions",
        "buildPlatformEconomyDriftReport",
        "expired_promo_active",
        "wallet_balance_source_mismatch",
    ]) {
        requireIncludes(helper, expected, "Platform Economy server helper");
    }
    
    for (const expected of [
        "savePlatformEconomyPackage",
        "savePlatformEconomyPromo",
        "savePlatformEconomyOffer",
        "below_floor_override_reason_required",
        "normalizePromoCode",
    ]) {
        requireIncludes(mutations, expected, "Platform Economy mutations");
    }
    
    requireIncludes(contract, "promo_redemption_limit_missing", "Platform Economy contract");
    
    for (const [source, label] of [
        [packagesRoute, "Packages route"],
        [promosRoute, "Promos route"],
        [offersRoute, "Offers route"],
    ] as const) {
        requireIncludes(source, "guardApiRequest", label);
        requireIncludes(source, "auth: \"admin\"", label);
        requireIncludes(source, "requireTrustedOrigin: true", label);
        requireIncludes(source, "PATCH_handler", label);
        requireIncludes(source, "POST_handler", label);
    }
    
    for (const [source, label] of [
        [redemptionsRoute, "Redemptions route"],
        [driftRoute, "Drift route"],
    ] as const) {
        requireIncludes(source, "guardApiRequest", label);
        requireIncludes(source, "auth: \"admin\"", label);
    }
    
    for (const expected of [
        "packageId",
        "promoId",
        "offerId",
        "priceUsdBeforeDiscount",
        "priceUsdPaid",
        "sourceOfFundsBreakdown",
        "idempotencyKey",
        "orderId",
    ]) {
        requireIncludes(paypalCapture, expected, "PayPal capture ledger metadata");
    }
    
    for (const expected of [
        "Platform Economy cannot drift",
        "Base rate anchor: `$1 = 100 GD`",
        "Paid package bonus GumDrops remain paid-source bonus",
    ]) {
        requireIncludes(`${doctrineDoc}\n${controlsDoc}\n${sourceDoc}`, expected, "Commerce control doctrine bundle");
    }
    
    
    return { failures };
}

function main() {
    let failures: string[];
    try { failures = inspectPlatformEconomyCommerceControls().failures; }
    catch (error) { failures = [error instanceof Error ? error.message : String(error)]; }
    if (failures.length > 0) {
        console.error("Platform economy commerce controls validation failed:");
        failures.forEach(failure => console.error("- " + failure));
        process.exitCode = 1;
        return;
    }
    console.log("Platform economy commerce controls validation passed.");
}
if (require.main === module) main();
