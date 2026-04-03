import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

const ROOT = process.cwd();
const INTERNAL_DIRECTORIES = ["src", "functions/src", "scripts", "tests"];
const FILE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

type GraphNode = {
  imports: Set<string>;
  importers: Set<string>;
};

function toRepoPath(absolutePath: string) {
  return path.relative(ROOT, absolutePath).replace(/\\/g, "/");
}

function toAbsoluteRepoPath(repoPath: string) {
  return path.resolve(ROOT, repoPath);
}

function walkFiles(directory: string, results: string[] = []) {
  if (!existsSync(directory)) {
    return results;
  }

  for (const entry of readdirSync(directory)) {
    const absolutePath = path.join(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      walkFiles(absolutePath, results);
      continue;
    }

    if (FILE_EXTENSIONS.includes(path.extname(absolutePath))) {
      results.push(absolutePath);
    }
  }

  return results;
}

function resolveWithCandidates(basePath: string) {
  const candidates = [
    basePath,
    ...FILE_EXTENSIONS.map((extension) => `${basePath}${extension}`),
    ...FILE_EXTENSIONS.map((extension) => path.join(basePath, `index${extension}`)),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function resolveImport(fromFile: string, specifier: string) {
  if (specifier.startsWith("@/")) {
    return resolveWithCandidates(path.join(ROOT, "src", specifier.slice(2)));
  }

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return resolveWithCandidates(path.resolve(path.dirname(fromFile), specifier));
  }

  return null;
}

function collectSpecifiers(sourceFile: ts.SourceFile) {
  const specifiers = new Set<string>();

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
        specifiers.add(moduleSpecifier.text);
      }
    }

    if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length > 0
      && ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.add(node.arguments[0].text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return Array.from(specifiers);
}

function buildGraph(files: string[]) {
  const graph = new Map<string, GraphNode>();

  files.forEach((file) => {
    graph.set(toRepoPath(file), {
      imports: new Set<string>(),
      importers: new Set<string>(),
    });
  });

  files.forEach((file) => {
    const repoFile = toRepoPath(file);
    const sourceFile = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );

    for (const specifier of collectSpecifiers(sourceFile)) {
      const resolved = resolveImport(file, specifier);
      if (!resolved) {
        continue;
      }

      const resolvedRepoFile = toRepoPath(resolved);
      if (!graph.has(resolvedRepoFile)) {
        continue;
      }

      graph.get(repoFile)?.imports.add(resolvedRepoFile);
      graph.get(resolvedRepoFile)?.importers.add(repoFile);
    }
  });

  return graph;
}

function inferSurface(repoPath: string) {
  if (repoPath.startsWith("src/app/api/")) return "route-handler";
  if (repoPath.startsWith("src/app/")) return "route-or-page";
  if (repoPath.startsWith("src/components/")) return "component";
  if (repoPath.startsWith("src/hooks/")) return "hook";
  if (repoPath.startsWith("src/lib/server/")) return "server-helper";
  if (repoPath.startsWith("src/lib/")) return "shared-helper";
  if (repoPath.startsWith("functions/src/")) return "firebase-function";
  if (repoPath.startsWith("scripts/")) return "script";
  if (repoPath.startsWith("tests/")) return "test";
  return "other";
}

function collectSiblingFiles(targetRepoPath: string, files: string[]) {
  const directory = path.posix.dirname(targetRepoPath);
  return files
    .map((file) => toRepoPath(file))
    .filter((file) => file !== targetRepoPath && path.posix.dirname(file) === directory)
    .sort();
}

function collectRelatedTests(targetRepoPath: string, files: string[]) {
  const basename = path.posix.basename(targetRepoPath, path.posix.extname(targetRepoPath));
  const directoryName = path.posix.basename(path.posix.dirname(targetRepoPath));

  return files
    .map((file) => toRepoPath(file))
    .filter((file) => file.startsWith("tests/"))
    .filter((file) => file.includes(basename) || file.includes(directoryName))
    .sort();
}

function collectCanonicalHelpers(targetRepoPath: string) {
  const suggestions = new Set<string>();

  if (/^src\/app\/api\//.test(targetRepoPath)) {
    suggestions.add("src/lib/server/auth.ts");
    suggestions.add("src/lib/server/request-guard.ts");
    suggestions.add("src/lib/server/route-diagnostics.ts");
  }

  if (/^src\/(components|context|hooks)\//.test(targetRepoPath)) {
    suggestions.add("src/lib/client-error-reporting.ts");
  }

  if (/(analytics|telemetry)/.test(targetRepoPath)) {
    suggestions.add("src/lib/telemetry.ts");
    suggestions.add("src/lib/server/analytics.ts");
    suggestions.add("src/lib/server/analytics-governance.ts");
  }

  if (/(paypal|gumdrop|wallet|purchase)/.test(targetRepoPath)) {
    suggestions.add("src/lib/server/paypal.ts");
    suggestions.add("src/lib/gumdrop-economics.ts");
    suggestions.add("src/lib/gumdrop-ledger.ts");
  }

  if (/(creator|onboarding)/.test(targetRepoPath)) {
    suggestions.add("src/lib/creator-application.ts");
    suggestions.add("src/lib/creator-onboarding.ts");
    suggestions.add("src/lib/server/creator-onboarding.ts");
  }

  if (/(drop|queue)/.test(targetRepoPath)) {
    suggestions.add("src/lib/drop-status.ts");
    suggestions.add("src/lib/drop-queue-lifecycle.ts");
    suggestions.add("src/lib/admin-drop-queue.ts");
    suggestions.add("src/lib/admin-drop-lifecycle.ts");
  }

  if (/(storage|cache|persist|session)/.test(targetRepoPath)) {
    suggestions.add("src/hooks/useAuthSWR.ts");
    suggestions.add("src/hooks/useCachedAuthSWR.ts");
    suggestions.add("src/lib/navigation-persistence.ts");
  }

  return Array.from(suggestions).sort();
}

function printSection(title: string, entries: string[]) {
  console.log(`${title}:`);
  if (entries.length === 0) {
    console.log("- None detected");
    return;
  }

  entries.forEach((entry) => console.log(`- ${entry}`));
}

function normalizeInputTarget(input: string) {
  const absolute = path.isAbsolute(input) ? input : toAbsoluteRepoPath(input);
  if (existsSync(absolute) && statSync(absolute).isFile()) {
    return toRepoPath(absolute);
  }

  return input.replace(/\\/g, "/");
}

const files = INTERNAL_DIRECTORIES.flatMap((directory) => walkFiles(path.join(ROOT, directory)));
const graph = buildGraph(files);
const targets = process.argv.slice(2);

if (targets.length === 0) {
  console.error("Usage: tsx scripts/trace-adjacent-surfaces.ts <file> [more-files]");
  process.exit(1);
}

targets.forEach((target, index) => {
  const normalizedTarget = normalizeInputTarget(target);
  const node = graph.get(normalizedTarget);

  if (!node) {
    console.error(`Unknown internal file: ${normalizedTarget}`);
    if (index === targets.length - 1) {
      process.exitCode = 1;
    }
    return;
  }

  console.log("");
  console.log(`Target: ${normalizedTarget}`);
  console.log(`Surface: ${inferSurface(normalizedTarget)}`);
  printSection("Direct imports", Array.from(node.imports).sort());
  printSection("Imported by", Array.from(node.importers).sort());
  printSection("Same-directory siblings", collectSiblingFiles(normalizedTarget, files));
  printSection("Potential related tests", collectRelatedTests(normalizedTarget, files));
  printSection("Canonical helpers to review", collectCanonicalHelpers(normalizedTarget));
});
