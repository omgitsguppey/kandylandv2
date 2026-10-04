import * as ts from "typescript";
import {
    findSourceFunction,
    getReturnedLiteralRecord,
    hasJsxAttribute,
    literalRecordProperty,
    readRenderedOwner,
    readSourceAst,
    someSourceNode,
    sourceExpressionIs,
    sourceRenderNodes,
} from "./validate-behavioral-truth-source";

// This existing stats reader owns the connected KPI presentation inspection.
// The behavior reader consumes it; comments and unused components are not controls.
export function inspectAdminUsersStatsTruth(rootDirectory = process.cwd()) {
    const failures: string[] = [];
    const requireTruth = (condition: unknown, message: string) => { if (!condition) failures.push(message); };
    const pagePath = "src/app/admin/users/page.tsx";
    const cardPath = "src/components/creative-tim/kandydrops/admin-users/AdminUsersOperations.tsx";
    const routePath = "src/app/api/admin/users/route.ts";
    const page = readSourceAst(pagePath, rootDirectory);
    const route = readSourceAst(routePath, rootDirectory);
    const card = readSourceAst(cardPath, rootDirectory);
    const renderedPage = sourceRenderNodes(page);
    const renderedCard = readRenderedOwner(pagePath, cardPath, "AdminUserMetricCard", rootDirectory);

    let localCardName: string | undefined;
    for (const declaration of page.statements) {
        if (!ts.isImportDeclaration(declaration) || !ts.isStringLiteral(declaration.moduleSpecifier)
            || declaration.moduleSpecifier.text !== "@/components/creative-tim/kandydrops/admin-users/AdminUsersOperations") continue;
        const bindings = declaration.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) localCardName = bindings.elements.find(element =>
            (element.propertyName?.text ?? element.name.text) === "AdminUserMetricCard")?.name.text;
    }

    const ribbons: ts.JsxElement[] = [];
    someSourceNode(renderedPage, node => {
        if (!ts.isJsxElement(node) || !hasJsxAttribute([node.openingElement], "data-admin-users-stats-layout", "evidence-ribbon")) return false;
        ribbons.push(node);
        return true;
    });
    const ribbon = ribbons[0];
    requireTruth(ribbon, "User Management stats must render the current evidence-ribbon layout.");
    const ribbonClass = ribbon?.openingElement.attributes.properties.find((attribute): attribute is ts.JsxAttribute =>
        ts.isJsxAttribute(attribute) && attribute.name.getText() === "className");
    const classes = ribbonClass?.initializer && ts.isStringLiteral(ribbonClass.initializer)
        ? new Set(ribbonClass.initializer.text.split(/\s+/)) : new Set<string>();
    requireTruth(classes.has("flex") && (classes.has("overflow-x-auto") || classes.has("overflow-x-scroll")),
        "User Management evidence ribbon must retain its bounded horizontal overflow owner.");

    const summaryMaps: ts.CallExpression[] = [];
    someSourceNode(ribbon?.children, node => {
        if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression) || node.expression.name.text !== "map"
            || !sourceExpressionIs(node.expression.expression, "(summary?.kpiCards ?? [])")) return false;
        summaryMaps.push(node);
        return true;
    });
    const summaryMap = summaryMaps[0];
    requireTruth(summaryMap, "User Management must render its ribbon from canonical summary.kpiCards.");
    const callback = summaryMap?.arguments[0];
    const mapParameter = callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) && callback.parameters[0]
        && ts.isIdentifier(callback.parameters[0].name) ? callback.parameters[0].name.text : undefined;
    const mappedCallers: Array<{ renderer: ts.FunctionLikeDeclaration; caller: ts.JsxOpeningElement | ts.JsxSelfClosingElement }> = [];
    if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) && mapParameter && localCardName) {
        someSourceNode(callback.body, node => {
            if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || !sourceExpressionIs(node.arguments[0], mapParameter)) return false;
            const candidate = findSourceFunction(page, node.expression.text);
            if (!candidate) return false;
            const cardCallers: Array<ts.JsxOpeningElement | ts.JsxSelfClosingElement> = [];
            const connected = someSourceNode(sourceRenderNodes(page, node.expression.text), child => {
                if (!(ts.isJsxOpeningElement(child) || ts.isJsxSelfClosingElement(child)) || !ts.isIdentifier(child.tagName)
                    || child.tagName.text !== localCardName) return false;
                cardCallers.push(child);
                return true;
            });
            if (connected) mappedCallers.push({ renderer: candidate, caller: cardCallers[0]! });
            return connected;
        });
    }
    const renderer = mappedCallers[0]?.renderer;
    const caller = mappedCallers[0]?.caller;
    requireTruth(caller && renderedCard.length > 0, "Canonical KPI map must call the imported, rendered AdminUserMetricCard.");
    const cardParameter = renderer?.parameters[0] && ts.isIdentifier(renderer.parameters[0].name) ? renderer.parameters[0].name.text : undefined;
    const props: Array<[string, string]> = [
        ["id", "id"], ["label", "label"], ["source", "sourceLabel"],
        ["freshness", "freshnessState"], ["scope", "scope"], ["reason", 'reasonCode ?? "none"'], ["generatedAtUtc", "generatedAtUtc"],
    ];
    for (const [prop, source] of props) {
        const expected = cardParameter && (source.startsWith("sourceLabel")
            ? cardParameter + ".sourceLabel ?? " + cardParameter + ".sourceTruth" : cardParameter + "." + source);
        requireTruth(caller && expected && hasJsxAttribute([caller], prop, expected),
            "AdminUserMetricCard " + prop + " must forward canonical KPI truth.");
    }
    let stateExpression: ts.Expression | undefined;
    const stateProp = caller?.attributes.properties.find((attribute): attribute is ts.JsxAttribute =>
        ts.isJsxAttribute(attribute) && attribute.name.getText() === "state");
    if (stateProp?.initializer && ts.isJsxExpression(stateProp.initializer)) stateExpression = stateProp.initializer.expression;
    const stateVariable = stateExpression && ts.isIdentifier(stateExpression) ? stateExpression.text : undefined;
    const hasStateBinding = cardParameter && stateVariable && someSourceNode(renderer?.body, node =>
        ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === stateVariable
        && sourceExpressionIs(node.initializer, "getKpiCardTruthState(" + cardParameter + ")"));
    requireTruth(hasStateBinding, "AdminUserMetricCard state must use the canonical KPI freshness mapper.");

    const propsParameter = findSourceFunction(card, "AdminUserMetricCard")?.parameters[0]?.name;
    const propNames = new Map<string, string>();
    if (propsParameter && ts.isObjectBindingPattern(propsParameter)) {
        for (const binding of propsParameter.elements) if (ts.isIdentifier(binding.name)) {
            propNames.set(binding.propertyName?.getText() ?? binding.name.text, binding.name.text);
        }
    }
    const articles: ts.JsxOpeningElement[] = [];
    someSourceNode(renderedCard, node => {
        if (!ts.isJsxOpeningElement(node) || !ts.isIdentifier(node.tagName) || node.tagName.text !== "article") return false;
        articles.push(node);
        return true;
    });
    const article = articles[0];
    const attributes: Array<[string, string]> = [
        ["data-admin-users-metric-state", "state"], ["data-admin-users-metric-source", "source"],
        ["data-admin-users-kpi-id", "id"], ["data-admin-users-kpi-source-truth", "source"],
        ["data-admin-users-kpi-freshness", "freshness"], ["data-admin-users-kpi-scope", "scope"],
        ["data-admin-users-kpi-reason", "reason"], ["data-admin-users-kpi-generated-at-utc", "generatedAtUtc"],
    ];
    for (const [attribute, prop] of attributes) {
        const localProp = propNames.get(prop);
        requireTruth(article && localProp && hasJsxAttribute([article], attribute, localProp),
            "Rendered AdminUserMetricCard must expose prop-backed " + attribute + ".");
    }
    const requiredIds = ["total_users", "returned_7d", "unwraps", "watch_time", "revenue", "paying_users", "verified", "push_enabled", "onboarded"];
    const staleTitles = ["User base", "7 day returners", "Tracked unwraps", "Watch time", "Monetization", "Profit / bonus", "Delivered / bonus", "Effective rate"];
    for (const id of requiredIds) {
        const record = getReturnedLiteralRecord(route, "buildAdminUsersKpiCards", "id", id);
        const label = literalRecordProperty(record, "label");
        requireTruth(record && label?.trim(), "Canonical User Management KPI builder must return " + id + " with a display label.");
        requireTruth(!label || !staleTitles.includes(label), "Old sprawled metric title still appears in canonical User Management stats: " + label + ".");
    }
    requireTruth(someSourceNode(findSourceFunction(route, "buildSummaryFromMetricsSnapshot")?.body, node =>
        ts.isReturnStatement(node) && Boolean(node.expression) && ts.isObjectLiteralExpression(node.expression!)
        && node.expression!.properties.some(property => ts.isPropertyAssignment(property) && property.name.getText() === "kpiCards"
            && sourceExpressionIs(property.initializer, "buildAdminUsersKpiCards({ summary: summaryBase })"))),
    "Bounded summary projection must return canonical KPI cards from the existing builder.");
    return { failures };
}

function main() {
    const { failures } = inspectAdminUsersStatsTruth();
    if (failures.length > 0) {
        console.error("Admin users stats grid validation failed:");
        for (const failure of failures) console.error("- " + failure);
        process.exit(1);
    }
    console.log("Admin users stats grid validation passed.");
}

if (require.main === module) main();
