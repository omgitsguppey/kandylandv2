import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import {
  TELEMETRY_EVENT_NAME_SET,
  TELEMETRY_EVENT_OPTIONS,
  normalizeTelemetryEventName,
} from "../src/lib/telemetry-catalog";

const ROOT = path.resolve(process.cwd(), "src");
const FILE_EXTENSIONS = new Set([".ts", ".tsx"]);

interface MatchRecord {
  file: string;
  line: number;
  eventName: string;
  matcher: string;
}

function walkFiles(directory: string, results: string[] = []) {
  for (const entry of readdirSync(directory)) {
    const absolutePath = path.join(directory, entry);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      walkFiles(absolutePath, results);
      continue;
    }

    if (FILE_EXTENSIONS.has(path.extname(absolutePath))) {
      results.push(absolutePath);
    }
  }

  return results;
}

function collectMatches(filePath: string) {
  const content = readFileSync(filePath, "utf8");
  const matchers = [
    { label: "trackEvent", pattern: /trackEvent\(\s*["'`]([^"'`]+)["'`]/g },
    { label: "trackServerEvent", pattern: /trackServerEvent\(\s*["'`]([^"'`]+)["'`]/g },
    { label: "sendGAEvent", pattern: /sendGAEvent\(\s*["'`]event["'`]\s*,\s*["'`]([^"'`]+)["'`]/g },
    { label: "window.gtag", pattern: /gtag\(\s*["'`]event["'`]\s*,\s*["'`]([^"'`]+)["'`]/g },
  ];

  const matches: MatchRecord[] = [];

  for (const matcher of matchers) {
    for (const match of content.matchAll(matcher.pattern)) {
      const index = match.index ?? 0;
      const line = content.slice(0, index).split(/\r?\n/u).length;
      matches.push({
        file: filePath,
        line,
        eventName: match[1],
        matcher: matcher.label,
      });
    }
  }

  return matches;
}

const files = walkFiles(ROOT);
const matches = files.flatMap((filePath) => collectMatches(filePath));
const emittedEventNames = new Set<string>();
const unknownMatches: MatchRecord[] = [];

matches.forEach((match) => {
  const normalizedName = normalizeTelemetryEventName(match.eventName);
  emittedEventNames.add(normalizedName);

  if (!TELEMETRY_EVENT_NAME_SET.has(normalizedName)) {
    unknownMatches.push(match);
  }
});

if (unknownMatches.length > 0) {
  console.error("Telemetry audit failed. Unknown event emitters found:");
  unknownMatches.forEach((match) => {
    console.error(`- ${path.relative(process.cwd(), match.file)}:${match.line} -> ${match.matcher}("${match.eventName}")`);
  });
  process.exit(1);
}

const catalogedButUnemitted = TELEMETRY_EVENT_OPTIONS
  .map((event) => event.eventName)
  .filter((eventName) => !emittedEventNames.has(eventName));

console.log(`Telemetry audit passed. ${matches.length} literal emitters checked across ${files.length} files.`);
console.log(`Cataloged events with no literal emitters: ${catalogedButUnemitted.length}`);
if (catalogedButUnemitted.length > 0) {
  console.log(catalogedButUnemitted.join(", "));
}
