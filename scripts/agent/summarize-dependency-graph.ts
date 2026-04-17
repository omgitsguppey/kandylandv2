import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

import { FILE_EXTENSIONS, ROOT, compact, createMetadata, listRepoFiles, readJsonFile, toAbsoluteRepoPath, toRepoPath, walkCodeFiles } from "./shared";
import { buildRepoInventory, fileDepth } from "./classify-repo-files";

type GraphNode = {
  imports: Set<string>;
  importers: Set<string>;
};

type GraphSummary = {
  sourceKind: "dependency_cruiser_json" | "local_import_graph";
  highInboundFiles: Array<{
    path: string;
    inboundCount: number;
    runtimeCritical: boolean;
    likelySharedHelper: boolean;
  }>;
  blastRadiusSurfaces: Array<{
    path: string;
    inboundCount: number;
    reason: string;
  }>;
  highRiskSharedHelpers: Array<{
    path: string;
    inboundCount: number;
    reason: string;
  }>;
  routeHelperAdjacencyHints: Array<{
    route: string;
    helperPaths: string[];
  }>;
  broadChangeDangerMarkers: Array<{
    path: string;
    marker: string;
  }>;
};

function resolveWithCandidates(basePath: string) {
  const candidates = [
    basePath,
    ...FILE_EXTENSIONS.map((extension) => `${basePath}${extension}`),
    ...FILE_EXTENSIONS.map((extension) => path.join(basePath, `index${extension}`)),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveImport(fromFileRepoPath: string, specifier: string) {
  const fromAbsolute = toAbsoluteRepoPath(fromFileRepoPath);

  if (specifier.startsWith("@/")) {
    return resolveWithCandidates(path.join(ROOT, "src", specifier.slice(2)));
  }

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return resolveWithCandidates(path.resolve(path.dirname(fromAbsolute), specifier));
  }

  return null;
}

function collectSpecifiers(repoPath: string) {
  const sourceFile = ts.createSourceFile(
    repoPath,
    readFileSync(toAbsoluteRepoPath(repoPath), "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );

  const specifiers = new Set<string>();

  function visit(node: ts.Node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specifiers.add(node.moduleSpecifier.text);
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

export function buildLocalImportGraph() {
  const files = walkCodeFiles();
  const graph = new Map<string, GraphNode>();

  files.forEach((repoPath) => {
    graph.set(repoPath, {
      imports: new Set<string>(),
      importers: new Set<string>(),
    });
  });

  files.forEach((repoPath) => {
    for (const specifier of collectSpecifiers(repoPath)) {
      const resolved = resolveImport(repoPath, specifier);
      if (!resolved) {
        continue;
      }

      const resolvedRepoPath = toRepoPath(resolved);
      if (!graph.has(resolvedRepoPath)) {
        continue;
      }

      graph.get(repoPath)?.imports.add(resolvedRepoPath);
      graph.get(resolvedRepoPath)?.importers.add(repoPath);
    }
  });

  return graph;
}

function buildGraphFromDependencyCruiser() {
  const outputPath = toAbsoluteRepoPath("output/dependency-graph.json");
  if (!existsSync(outputPath)) {
    return null;
  }

  const payload = readJsonFile<{ modules?: Array<{ source: string; dependencies?: Array<{ resolved?: string }> }> }>("output/dependency-graph.json");
  const graph = new Map<string, GraphNode>();

  for (const repoPath of listRepoFiles()) {
    if (FILE_EXTENSIONS.some((extension) => repoPath.endsWith(extension))) {
      graph.set(repoPath, { imports: new Set<string>(), importers: new Set<string>() });
    }
  }

  for (const moduleEntry of payload.modules ?? []) {
    const sourcePath = moduleEntry.source.replace(/\\/g, "/");
    if (!graph.has(sourcePath)) {
      continue;
    }

    for (const dependency of moduleEntry.dependencies ?? []) {
      const resolvedPath = dependency.resolved?.replace(/\\/g, "/");
      if (!resolvedPath || !graph.has(resolvedPath)) {
        continue;
      }

      graph.get(sourcePath)?.imports.add(resolvedPath);
      graph.get(resolvedPath)?.importers.add(sourcePath);
    }
  }

  return graph;
}

export function summarizeDependencyGraph(): GraphSummary {
  const dependencyCruiserGraph = buildGraphFromDependencyCruiser();
  const graph = dependencyCruiserGraph ?? buildLocalImportGraph();
  const sourceKind = dependencyCruiserGraph ? "dependency_cruiser_json" : "local_import_graph";
  const inventoryByPath = new Map(buildRepoInventory().map((entry) => [entry.path, entry]));

  const inboundEntries = Array.from(graph.entries())
    .map(([repoPath, node]) => ({
      path: repoPath,
      inboundCount: node.importers.size,
      node,
      inventory: inventoryByPath.get(repoPath),
    }))
    .sort((left, right) =>
      right.inboundCount - left.inboundCount
      || fileDepth(left.path) - fileDepth(right.path)
      || left.path.localeCompare(right.path));

  const highInboundFiles = inboundEntries.slice(0, 20).map((entry) => ({
    path: entry.path,
    inboundCount: entry.inboundCount,
    runtimeCritical: entry.inventory?.runtime_critical ?? false,
    likelySharedHelper: entry.inventory?.likely_shared_helper ?? false,
  }));

  const blastRadiusSurfaces = inboundEntries
    .filter((entry) => (entry.inventory?.runtime_critical ?? false) && entry.inboundCount >= 3)
    .slice(0, 12)
    .map((entry) => ({
      path: entry.path,
      inboundCount: entry.inboundCount,
      reason: entry.inventory?.likely_shared_helper
        ? "Runtime-critical shared helper with multiple inbound references."
        : "Runtime-critical surface with wide inbound dependency reach.",
    }));

  const highRiskSharedHelpers = inboundEntries
    .filter((entry) => (entry.inventory?.likely_shared_helper ?? false) && entry.inboundCount >= 4)
    .slice(0, 12)
    .map((entry) => ({
      path: entry.path,
      inboundCount: entry.inboundCount,
      reason: "Shared helper has broad inbound reach and should be treated as a reuse-first surface.",
    }));

  const routeHelperAdjacencyHints = inboundEntries
    .filter((entry) => entry.path.startsWith("src/app/api/"))
    .slice(0, 20)
    .map((entry) => ({
      route: entry.path,
      helperPaths: Array.from(entry.node.imports)
        .filter((importPath) => importPath.startsWith("src/lib/"))
        .sort()
        .slice(0, 8),
    }))
    .filter((entry) => entry.helperPaths.length > 0);

  const broadChangeDangerMarkers = compact([
    ...highRiskSharedHelpers.slice(0, 8).map((entry) => ({
      path: entry.path,
      marker: "high_inbound_shared_helper",
    })),
    ...blastRadiusSurfaces.slice(0, 8).map((entry) => ({
      path: entry.path,
      marker: "runtime_critical_blast_radius",
    })),
    inventoryByPath.has("package.json") ? { path: "package.json", marker: "package_manager_truth_surface" } : null,
    inventoryByPath.has("AGENTS.md") ? { path: "AGENTS.md", marker: "cross_agent_entrypoint" } : null,
  ]);

  return {
    sourceKind,
    highInboundFiles,
    blastRadiusSurfaces,
    highRiskSharedHelpers,
    routeHelperAdjacencyHints,
    broadChangeDangerMarkers,
  };
}

export function buildDependencyGraphSummary() {
  return {
    ...createMetadata([
      "output/dependency-graph.json",
      "scripts/export-dependency-graph.ts",
      "scripts/trace-adjacent-surfaces.ts",
    ]),
    ...summarizeDependencyGraph(),
  };
}
