import { Project, SyntaxKind } from "ts-morph";

const project = new Project();
project.addSourceFilesAtPaths("src/app/**/route.ts");

const untracked = [];

for (const sourceFile of project.getSourceFiles()) {
  const hasWrapper = sourceFile.getImportDeclarations()
    .some(i => i.getNamedImports().some(ni => ni.getName() === "withRouteRuntimeHealth"));
  
  const hasManualTracking = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
    .some(callExpr => callExpr.getExpression().getText() === "recordRouteRuntimeSample");

  if (!hasWrapper && !hasManualTracking) {
    untracked.push(sourceFile.getFilePath());
  }
}

console.log(JSON.stringify(untracked, null, 2));
