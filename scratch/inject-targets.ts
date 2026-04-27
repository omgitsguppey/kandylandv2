import { Project, SyntaxKind, ObjectLiteralExpression, PropertyAssignment, Node } from "ts-morph";
import path from "path";

const project = new Project();
project.addSourceFilesAtPaths("src/app/**/route.ts");
project.addSourceFilesAtPaths("src/lib/route-runtime-health.ts");

const healthFile = project.getSourceFileOrThrow("src/lib/route-runtime-health.ts");
const targetsVar = healthFile.getVariableDeclarationOrThrow("ROUTE_RUNTIME_HEALTH_TARGETS");
let initializer = targetsVar.getInitializerOrThrow();

// drill down past `as const` or `satisfies`
while (Node.isAsExpression(initializer) || Node.isSatisfiesExpression(initializer)) {
    initializer = initializer.getExpression();
}

if (!Node.isObjectLiteralExpression(initializer)) {
    throw new Error("Could not find ObjectLiteralExpression");
}

const targetsObj = initializer as ObjectLiteralExpression;

const existingKeys = new Set(
    targetsObj.getProperties()
        .filter(p => p.isKind(SyntaxKind.PropertyAssignment))
        .map(p => (p as PropertyAssignment).getName().replace(/['"]/g, ''))
);

let addedCount = 0;

for (const sourceFile of project.getSourceFiles()) {
  const filePath = sourceFile.getFilePath();
  if (filePath.includes("route-runtime-health.ts")) continue;
  
  const relPath = path.relative(path.join(process.cwd(), "src/app/api"), filePath).replace(/\\/g, '/');
  // e.g. "admin/users/route.ts" -> "admin/users"
  let routeName = relPath.replace(/\/route\.ts$/, '');
  if (routeName === "route.ts") routeName = "root";

  const exportDeclarations = sourceFile.getFunctions().filter(f => f.isExported());
  const methods = exportDeclarations
    .map(f => f.getName())
    .filter(name => ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(name || ""));

  for (const method of methods) {
    const key = `${routeName}:${method}`;
    if (!existingKeys.has(key)) {
        targetsObj.addPropertyAssignment({
            name: `"${key}"`,
            initializer: `{
        routeName: "${routeName}",
        method: "${method}",
        title: "Auto-generated for ${routeName}",
        slowThresholdMs: 1200,
    }`
        });
        existingKeys.add(key);
        addedCount++;
    }
  }
}

if (addedCount > 0) {
    healthFile.saveSync();
    console.log(`Added ${addedCount} new targets to route-runtime-health.ts`);
} else {
    console.log("No new targets to add.");
}
