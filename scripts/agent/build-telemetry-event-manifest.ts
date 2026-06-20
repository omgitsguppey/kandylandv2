import { pathToFileURL } from "node:url";

import { fileExists, nowIso, readText, writeTextFile } from "./shared";

const TELEMETRY_CATALOG_PATH = "src/lib/telemetry-catalog.ts";
const SURFACE_CATALOG_PATH = "src/lib/analytics/telemetry/surface-telemetry-catalog-events.ts";
const OUTPUT_PATH = "shared/runtime/telemetry-event-manifest.ts";
const GENERATED_AT_EXPORT_PATTERN =
  /export const TELEMETRY_EVENT_MANIFEST_GENERATED_AT = "([^"]+)";/u;

type ManifestEvent = {
  eventName: string;
  aliases: string[];
};

function unique(values: string[]) {
  return Array.from(new Set(values)).sort();
}

function extractQuotedStrings(value: string) {
  return Array.from(value.matchAll(/["']([a-z][a-z0-9_:-]+)["']/giu), (match) => match[1]);
}

function extractArrayValues(block: string, property: string) {
  const match = new RegExp(`${property}\\s*:\\s*\\[([\\s\\S]*?)\\]`, "u").exec(block);
  return match ? unique(extractQuotedStrings(match[1])) : [];
}

function extractObjectBlockForEventName(source: string, index: number) {
  const start = source.lastIndexOf("{", index);
  const end = source.indexOf("}", index);
  if (start === -1 || end === -1 || end <= start) {
    return source.slice(index, Math.min(source.length, index + 300));
  }
  return source.slice(start, end + 1);
}

function extractBaseCatalogEvents(source: string) {
  const events = new Map<string, ManifestEvent>();
  const pattern = /eventName:\s*["']([^"']+)["']/gu;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const eventName = match[1];
    const block = extractObjectBlockForEventName(source, match.index);
    events.set(eventName, {
      eventName,
      aliases: extractArrayValues(block, "aliases"),
    });
  }
  return Array.from(events.values());
}

function extractSurfaceCatalogEvents(source: string) {
  const kindsMatch = /SURFACE_TELEMETRY_CATALOG_EVENT_KINDS\s*=\s*\[([\s\S]*?)\]/u.exec(source);
  const kinds = kindsMatch ? extractQuotedStrings(kindsMatch[1]).filter((value) => value.startsWith("surface_")) : [];
  const events = new Map<string, ManifestEvent>();
  const surfacePattern = /\{\s*surfaceId:\s*["']([^"']+)["']([\s\S]*?)aliasesByKind:\s*\{([\s\S]*?)\n\s*\},\n\s*\},/gu;
  let match: RegExpExecArray | null;
  while ((match = surfacePattern.exec(source)) !== null) {
    const surfaceId = match[1];
    const aliasBlock = match[3];
    for (const kind of kinds) {
      const aliasMatch = new RegExp(`${kind}\\s*:\\s*\\[([\\s\\S]*?)\\]`, "u").exec(aliasBlock);
      const eventName = `${surfaceId}_${kind}`;
      events.set(eventName, {
        eventName,
        aliases: aliasMatch ? unique(extractQuotedStrings(aliasMatch[1])) : [],
      });
    }
  }
  return Array.from(events.values());
}

function serializeStringArray(values: string[]) {
  return `[\n${values.map((value) => `  ${JSON.stringify(value)},`).join("\n")}\n] as const`;
}

function serializeAliasEntries(entries: Array<[string, string]>) {
  return `[\n${entries.map(([alias, canonical]) => `  [${JSON.stringify(alias)}, ${JSON.stringify(canonical)}],`).join("\n")}\n] as const`;
}

export function readTelemetryManifestGeneratedAt(source: string) {
  return GENERATED_AT_EXPORT_PATTERN.exec(source)?.[1] ?? null;
}

function replaceTelemetryManifestGeneratedAt(source: string, generatedAtUtc: string) {
  return source.replace(
    GENERATED_AT_EXPORT_PATTERN,
    `export const TELEMETRY_EVENT_MANIFEST_GENERATED_AT = ${JSON.stringify(generatedAtUtc)};`,
  );
}

function normalizeTelemetryManifestForGeneratedAtComparison(source: string) {
  return replaceTelemetryManifestGeneratedAt(source, "__GENERATED_AT__").replace(/\r\n/gu, "\n");
}

export function resolveTelemetryManifestGeneratedAt(input: {
  existingManifestSource?: string | null;
  nextManifestSource: string;
  nextGeneratedAtUtc: string;
}) {
  const existingGeneratedAt = input.existingManifestSource
    ? readTelemetryManifestGeneratedAt(input.existingManifestSource)
    : null;
  if (
    input.existingManifestSource
    && existingGeneratedAt
    && normalizeTelemetryManifestForGeneratedAtComparison(input.existingManifestSource)
      === normalizeTelemetryManifestForGeneratedAtComparison(input.nextManifestSource)
  ) {
    return existingGeneratedAt;
  }

  return input.nextGeneratedAtUtc;
}

export function buildTelemetryEventManifestSource(input?: {
  telemetryCatalogSource?: string;
  surfaceCatalogSource?: string;
  generatedAtUtc?: string;
}) {
  const events = new Map<string, ManifestEvent>();
  for (const event of [
    ...extractBaseCatalogEvents(input?.telemetryCatalogSource ?? readText(TELEMETRY_CATALOG_PATH)),
    ...extractSurfaceCatalogEvents(input?.surfaceCatalogSource ?? readText(SURFACE_CATALOG_PATH)),
  ]) {
    const current = events.get(event.eventName);
    events.set(event.eventName, {
      eventName: event.eventName,
      aliases: unique([...(current?.aliases ?? []), ...event.aliases]),
    });
  }

  const eventNames = Array.from(events.keys()).sort();
  const aliasEntries = Array.from(events.values())
    .flatMap((event) => event.aliases.map((alias) => [alias, event.eventName] as [string, string]))
    .filter(([alias, canonical]) => alias !== canonical)
    .sort(([left], [right]) => left.localeCompare(right));

  return `// Generated by scripts/agent/build-telemetry-event-manifest.ts from src/lib/telemetry-catalog.ts.\n` +
    `// Do not edit by hand. Runtime Functions import this compact manifest to avoid a second telemetry catalog.\n` +
    `export const TELEMETRY_EVENT_MANIFEST_GENERATED_AT = ${JSON.stringify(input?.generatedAtUtc ?? nowIso())};\n` +
    `export const TELEMETRY_EVENT_MANIFEST_SOURCE = ${JSON.stringify(`${TELEMETRY_CATALOG_PATH} + ${SURFACE_CATALOG_PATH}`)};\n\n` +
    `export const TELEMETRY_CANONICAL_EVENT_NAMES = ${serializeStringArray(eventNames)};\n\n` +
    `export const TELEMETRY_EVENT_ALIAS_TO_CANONICAL_ENTRIES = ${serializeAliasEntries(aliasEntries)};\n\n` +
    `export const TELEMETRY_EVENT_ALIAS_TO_CANONICAL = Object.fromEntries(TELEMETRY_EVENT_ALIAS_TO_CANONICAL_ENTRIES) as Record<string, string>;\n\n` +
    `const TELEMETRY_CANONICAL_EVENT_NAME_SET = new Set<string>(TELEMETRY_CANONICAL_EVENT_NAMES);\n\n` +
    `export function resolveTelemetryEventNameForRuntime(eventName: string) {\n` +
    `  const trimmed = eventName.trim();\n` +
    `  if (TELEMETRY_CANONICAL_EVENT_NAME_SET.has(trimmed)) return trimmed;\n` +
    `  return TELEMETRY_EVENT_ALIAS_TO_CANONICAL[trimmed] ?? null;\n` +
    `}\n\n` +
    `export function isSupportedTelemetryEventNameForRuntime(eventName: string) {\n` +
    `  return resolveTelemetryEventNameForRuntime(eventName) !== null;\n` +
    `}\n`;
}

export function main() {
  const nextGeneratedAtUtc = nowIso();
  const nextManifestSource = buildTelemetryEventManifestSource({ generatedAtUtc: nextGeneratedAtUtc });
  const existingManifestSource = fileExists(OUTPUT_PATH) ? readText(OUTPUT_PATH) : null;
  const generatedAtUtc = resolveTelemetryManifestGeneratedAt({
    existingManifestSource,
    nextManifestSource,
    nextGeneratedAtUtc,
  });
  const output = generatedAtUtc === nextGeneratedAtUtc
    ? nextManifestSource
    : replaceTelemetryManifestGeneratedAt(nextManifestSource, generatedAtUtc);
  if (
    existingManifestSource === output
    || (
      existingManifestSource
      && normalizeTelemetryManifestForGeneratedAtComparison(existingManifestSource)
        === normalizeTelemetryManifestForGeneratedAtComparison(output)
    )
  ) {
    console.log(`Telemetry event manifest unchanged at ${OUTPUT_PATH}.`);
    return;
  }
  writeTextFile(OUTPUT_PATH, output);
  console.log(`Telemetry event manifest written to ${OUTPUT_PATH}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
