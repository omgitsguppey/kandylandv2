import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function walkFiles(directory: string, matcher: (filePath: string) => boolean): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(absolutePath, matcher));
    } else if (matcher(absolutePath)) {
      files.push(absolutePath);
    }
  }
  return files;
}

const requiredContains: Array<{ file: string; values: string[]; label: string }> = [
  {
    file: "src/app/creators/[username]/CreatorProfileClient.tsx",
    label: "creator missing state uses shared NotFoundSurface",
    values: ["NotFoundSurface", "Creator not available"],
  },
  {
    file: "src/lib/server/not-found.ts",
    label: "API 404 helper returns canonical error shape",
    values: ["buildNotFoundResponse", "errorCode", "resource", "{ status: 404 }"],
  },
  {
    file: "src/lib/server/auth.ts",
    label: "AuthError 404s flow through canonical API 404 helper",
    values: ["buildNotFoundResponse", "error.status === 404", "resource?: ApiNotFoundResource"],
  },
  {
    file: "src/app/api/chat/threads/[threadId]/route.ts",
    label: "chat thread 404 preserves domain code through canonical helper",
    values: ["buildNotFoundResponse(\"thread\"", "\"thread_not_found\""],
  },
  {
    file: "src/app/api/notifications/route.ts",
    label: "notification 404 uses canonical helper",
    values: ["buildNotFoundResponse(\"notification\""],
  },
  {
    file: "src/app/api/creators/[username]/route.ts",
    label: "creator profile API 404 uses canonical helper",
    values: ["buildNotFoundResponse(\"creator\"", "Creator profile view count update failed"],
  },
];

function isCanonicalGlobalNotFound(source: string): boolean {
  return source.includes("return <NotFoundSurface />") || [
    "<KandyNotFoundStateSurface",
    "eyebrow={NOT_FOUND_COPY.eyebrow}",
    "title={NOT_FOUND_COPY.title}",
    "detail={NOT_FOUND_COPY.detail}",
    "returnHref={NOT_FOUND_RETURN_HREF}",
  ].every((value) => source.includes(value));
}

function isStatus404(options: ts.Expression | undefined): boolean {
  return Boolean(options && ts.isObjectLiteralExpression(options) && options.properties.some((property) =>
    ts.isPropertyAssignment(property)
    && property.name.getText().replace(/["']/g, "") === "status"
    && ts.isNumericLiteral(property.initializer)
    && property.initializer.text === "404"));
}

function isCanonicalNotFoundBody(body: ts.Expression | undefined): boolean {
  if (!body) return false;
  if (ts.isCallExpression(body) && body.expression.getText() === "buildNotFoundBody") return true;
  return ts.isObjectLiteralExpression(body) && body.properties.some((property) =>
    ts.isSpreadAssignment(property)
    && ts.isCallExpression(property.expression)
    && property.expression.expression.getText() === "buildNotFoundBody");
}

export function findNonCanonical404Lines(source: string): number[] {
  const sourceFile = ts.createSourceFile("route.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const lines: number[] = [];
  const visit = (node: ts.Node) => {
    const responseNode = ts.isCallExpression(node) || ts.isNewExpression(node) ? node : null;
    const isJsonResponse = responseNode && ts.isCallExpression(responseNode)
      && ["NextResponse.json", "Response.json"].includes(responseNode.expression.getText(sourceFile));
    const isResponseConstructor = responseNode && ts.isNewExpression(responseNode)
      && ["Response", "NextResponse"].includes(responseNode.expression.getText(sourceFile));
    if ((isJsonResponse || isResponseConstructor)
      && isStatus404(responseNode?.arguments?.[1])
      && !isCanonicalNotFoundBody(responseNode?.arguments?.[0])) {
      lines.push(sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return lines;
}

export function runValidation() {
  const failures: string[] = [];
  const globalNotFound = readRepoFile("src/app/not-found.tsx");
  if (!isCanonicalGlobalNotFound(globalNotFound)) {
    failures.push("global 404 must render the shared not-found surface or pass shared copy and return link to the branded surface");
  }

  for (const contract of requiredContains) {
    const source = readRepoFile(contract.file);
    for (const value of contract.values) {
      if (!source.includes(value)) {
        failures.push(`${contract.label}: missing ${value} in ${contract.file}`);
      }
    }
  }

const bannedUiCopy = [
  { file: "src/app/not-found.tsx", pattern: /Looks like|Page Not Found|does not exist|Oops/i },
  { file: "src/app/error.tsx", pattern: /Something went wrong|Unknown Error|Oops/i },
  { file: "src/app/admin/error.tsx", pattern: /Something went wrong|Unknown Application Error|Oops/i },
  { file: "src/components/ErrorBoundary.tsx", pattern: /Something went wrong|Oops/i },
  { file: "src/components/Admin/CreateDropModal.tsx", pattern: /Drop not found!/ },
];

  for (const check of bannedUiCopy) {
    const source = readRepoFile(check.file);
    if (check.pattern.test(source)) {
      failures.push(`banned 404/error copy remains in ${check.file}: ${check.pattern}`);
    }
  }

  const apiRouteFiles = walkFiles(path.join(root, "src", "app", "api"), (filePath) => path.basename(filePath) === "route.ts");
  for (const apiRouteFile of apiRouteFiles) {
    const source = fs.readFileSync(apiRouteFile, "utf8");
    for (const line of findNonCanonical404Lines(source)) {
      failures.push(`API 404 response lacks buildNotFoundBody in ${path.relative(root, apiRouteFile)}:${line}`);
    }
  }

  if (failures.length > 0) {
    console.error("Not-found contract check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Not-found contract check passed (${requiredContains.length + bannedUiCopy.length + apiRouteFiles.length + 1} checks).`);
}

if (require.main === module) runValidation();
