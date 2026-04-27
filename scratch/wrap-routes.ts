import { Project, SyntaxKind, FunctionDeclaration } from "ts-morph";
import path from "path";

const project = new Project();
project.addSourceFilesAtPaths("src/app/**/route.ts");

let updatedCount = 0;

for (const sourceFile of project.getSourceFiles()) {
  const filePath = sourceFile.getFilePath();
  console.log("Found file:", filePath);
  if (filePath.includes("route-runtime-health.ts")) continue;
  
  const relPath = path.relative(path.join(process.cwd(), "src/app"), filePath).replace(/\\/g, '/');
  let routeName = relPath.replace(/\/route\.ts$/, '');
  if (routeName === "route.ts") routeName = "root";

  // Find export async function GET(...)
  const functions = sourceFile.getFunctions();
  const handlersToWrap: FunctionDeclaration[] = [];
  
  for (const fn of functions) {
      if (!fn.isExported() || !fn.hasExportKeyword()) continue;
      const name = fn.getName();
      if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(name || "")) {
          // Check if already wrapped or has manual tracking inside
          const hasTracking = fn.getDescendantsOfKind(SyntaxKind.CallExpression)
            .some(callExpr => callExpr.getExpression().getText() === "recordRouteRuntimeSample");
          
          if (!hasTracking) {
              handlersToWrap.push(fn);
          }
      }
  }

  if (handlersToWrap.length > 0) {
      // Import wrapper if not present
      const hasImport = sourceFile.getImportDeclarations()
        .some(i => i.getNamedImports().some(ni => ni.getName() === "withRouteRuntimeHealth"));
      
      if (!hasImport) {
          sourceFile.addImportDeclaration({
              namedImports: ["withRouteRuntimeHealth"],
              moduleSpecifier: "@/lib/server/route-runtime-health"
          });
      }

      for (const fn of handlersToWrap) {
          const method = fn.getName();
          const routeKey = `${routeName}:${method}`;
          
          // Rename function
          fn.toggleModifier("export", false);
          fn.rename(`${method}_handler`);

          // Add variable export
          sourceFile.addVariableStatement({
              isExported: true,
              declarations: [{
                  name: method!,
                  initializer: `withRouteRuntimeHealth("${routeKey}", ${method}_handler)`
              }]
          });
      }

      sourceFile.saveSync();
      updatedCount++;
      console.log(`Wrapped handlers in ${relPath}`);
  }
}

console.log(`Updated ${updatedCount} files.`);
