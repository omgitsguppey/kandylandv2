import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { ROUTE_RUNTIME_HEALTH_TARGETS } from "../src/lib/route-runtime-health";

const root = process.cwd();
const apiRoot = path.join(root, "src", "app", "api");
const encodedProxyRoot = path.join(root, "src", "app", "%5F%5F");
const routeMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] as const;
const allowedUntrackedRoutes = new Set(["health:GET"]);

function walkRouteFiles(directory: string, files: string[] = []) {
  if (!statExists(directory)) {
    return files;
  }

  for (const entry of readdirSync(directory)) {
    const absolutePath = path.join(directory, entry);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      walkRouteFiles(absolutePath, files);
      continue;
    }

    if (entry === "route.ts") {
      files.push(absolutePath);
    }
  }

  return files;
}

function statExists(filePath: string) {
  try {
    statSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function routeNameFromFile(filePath: string) {
  if (filePath.startsWith(apiRoot)) {
    return path.relative(apiRoot, path.dirname(filePath)).split(path.sep).join("/");
  }

  if (filePath.startsWith(encodedProxyRoot)) {
    return `__/${path.relative(encodedProxyRoot, path.dirname(filePath)).split(path.sep).join("/")}`;
  }

  return "";
}

function collectRouteHandlerKeys() {
  const files = [
    ...walkRouteFiles(apiRoot),
    ...walkRouteFiles(encodedProxyRoot),
  ];
  const keys: string[] = [];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const routeName = routeNameFromFile(file);

    for (const method of routeMethods) {
      const exportPattern = new RegExp(`export\\s+(?:async\\s+function|const|let)\\s+${method}\\b`);
      if (exportPattern.test(source)) {
        keys.push(`${routeName}:${method}`);
      }
    }
  }

  return keys;
}

const routeHandlerKeys = collectRouteHandlerKeys();
const trackedRouteHandlerKeys = routeHandlerKeys.filter((key) => !allowedUntrackedRoutes.has(key));
const targetKeys = Object.keys(ROUTE_RUNTIME_HEALTH_TARGETS);
const targetSet = new Set(targetKeys);
const routeHandlerSet = new Set(trackedRouteHandlerKeys);
const routeRuntimeHealthSource = readFileSync(path.join(root, "src", "lib", "route-runtime-health.ts"), "utf8");
const failures: string[] = [];

for (const key of trackedRouteHandlerKeys) {
  if (!targetSet.has(key)) {
    failures.push(`Route handler missing runtime target: ${key}`);
  }
}

for (const key of targetKeys) {
  if (!routeHandlerSet.has(key)) {
    failures.push(`Runtime target has no route handler: ${key}`);
  }

  const title = ROUTE_RUNTIME_HEALTH_TARGETS[key as keyof typeof ROUTE_RUNTIME_HEALTH_TARGETS].title;
  if (/auto-generated/i.test(title) || title.trim().length < 8) {
    failures.push(`Runtime target has a vague debugging title: ${key}`);
  }
}

if (/Auto-generated for/.test(routeRuntimeHealthSource)) {
  failures.push("src/lib/route-runtime-health.ts still contains generated placeholder runtime titles");
}

if (failures.length > 0) {
  console.error("Route runtime parity check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Route runtime parity check passed (${trackedRouteHandlerKeys.length} route handlers, ${targetKeys.length} runtime targets).`);
