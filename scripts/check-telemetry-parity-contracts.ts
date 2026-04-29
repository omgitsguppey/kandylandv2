import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import {
  ADMIN_TELEMETRY_LOG_EVENT_NAMES,
  TELEMETRY_EVENT_NAME_SET,
  TELEMETRY_EVENT_OPTIONS,
  TELEMETRY_MODULE_INDEXES,
} from "../src/lib/telemetry-catalog";
import { getLegacyPagePathForEvent } from "../src/lib/analytics-semantics";

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, "src");
const TSX_EXTENSIONS = new Set([".tsx"]);

function walkFiles(directory: string, results: string[] = []) {
  for (const entry of readdirSync(directory)) {
    const absolutePath = path.join(directory, entry);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      walkFiles(absolutePath, results);
      continue;
    }

    if (TSX_EXTENSIONS.has(path.extname(absolutePath))) {
      results.push(absolutePath);
    }
  }

  return results;
}

function read(relativePath: string) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function collectPageViewEvents() {
  const pageViewEvents = new Set<string>();
  const pattern = /<PageViewEvent\b[^>]*\beventName=["']([^"']+)["']/g;

  for (const filePath of walkFiles(SRC_ROOT)) {
    const source = readFileSync(filePath, "utf8");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source))) {
      pageViewEvents.add(match[1]);
    }
  }

  return Array.from(pageViewEvents).sort();
}

const failures: string[] = [];
let checks = 0;

const eventNames = TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName);
const duplicateEventNames = eventNames.filter((eventName, index) => eventNames.indexOf(eventName) !== index);
checks += eventNames.length;
if (duplicateEventNames.length > 0) {
  failures.push(`Duplicate telemetry catalog events: ${Array.from(new Set(duplicateEventNames)).join(", ")}`);
}

for (const moduleIndex of TELEMETRY_MODULE_INDEXES) {
  for (const eventName of moduleIndex.eventNames) {
    checks += 1;
    if (!TELEMETRY_EVENT_NAME_SET.has(eventName)) {
      failures.push(`Module index ${moduleIndex.key} references uncataloged event ${eventName}`);
    }
  }
}

for (const eventName of ADMIN_TELEMETRY_LOG_EVENT_NAMES) {
  checks += 1;
  if (!TELEMETRY_EVENT_NAME_SET.has(eventName)) {
    failures.push(`Admin telemetry log references uncataloged event ${eventName}`);
  }
}

const appSemanticSource = read("src/lib/analytics-semantics.ts");
const serverSemanticSource = read("src/lib/server/analytics-semantics.ts");
const functionsSemanticSource = read("functions/src/analytics-semantics.ts");

for (const eventName of collectPageViewEvents()) {
  checks += 5;
  if (!TELEMETRY_EVENT_NAME_SET.has(eventName)) {
    failures.push(`PageViewEvent emits uncataloged event ${eventName}`);
  }

  if (!getLegacyPagePathForEvent(eventName)) {
    failures.push(`App semantic legacy page mapping missing for ${eventName}`);
  }

  if (!appSemanticSource.includes(`${eventName}:`)) {
    failures.push(`App semantic source does not explicitly map ${eventName}`);
  }

  if (!serverSemanticSource.includes(`case "${eventName}"`)) {
    failures.push(`Server semantic rollup switch does not count ${eventName}`);
  }

  if (!functionsSemanticSource.includes(`${eventName}:`) || !functionsSemanticSource.includes(`case "${eventName}"`)) {
    failures.push(`Functions semantic rollup does not map and count ${eventName}`);
  }
}

if (failures.length > 0) {
  console.error("Telemetry parity contract failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Telemetry parity contract passed (${checks} checks).`);
