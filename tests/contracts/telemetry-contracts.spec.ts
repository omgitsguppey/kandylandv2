import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  TELEMETRY_EVENT_ALIAS_MAP,
  TELEMETRY_EVENT_NAMES,
  TELEMETRY_EVENT_OPTIONS,
  TELEMETRY_EVENT_QUERY_NAMES,
  TELEMETRY_MODULE_INDEXES,
  normalizeTelemetryEventName,
} from "@/lib/telemetry-catalog";

describe("telemetry catalog contracts", () => {
  it("keeps canonical event names unique", () => {
    const uniqueNames = new Set(TELEMETRY_EVENT_NAMES);
    expect(uniqueNames.size).toBe(TELEMETRY_EVENT_NAMES.length);
    expect(TELEMETRY_EVENT_OPTIONS.length).toBe(TELEMETRY_EVENT_NAMES.length);
  });

  it("keeps aliases unique and resolvable", () => {
    const aliases = Object.keys(TELEMETRY_EVENT_ALIAS_MAP);
    const uniqueAliases = new Set(aliases);

    expect(uniqueAliases.size).toBe(aliases.length);

    aliases.forEach((alias) => {
      expect(TELEMETRY_EVENT_NAMES).toContain(normalizeTelemetryEventName(alias));
    });
  });

  it("keeps module indexes bound to known telemetry events", () => {
    const knownEvents = new Set(TELEMETRY_EVENT_NAMES);

    TELEMETRY_MODULE_INDEXES.forEach((moduleIndex) => {
      moduleIndex.eventNames.forEach((eventName) => {
        expect(knownEvents.has(eventName), `${moduleIndex.key} -> ${eventName}`).toBe(true);
      });
    });
  });

  it("keeps query names covering every canonical event and alias", () => {
    TELEMETRY_EVENT_NAMES.forEach((eventName) => {
      expect(TELEMETRY_EVENT_QUERY_NAMES).toContain(eventName);
    });

    Object.keys(TELEMETRY_EVENT_ALIAS_MAP).forEach((alias) => {
      expect(TELEMETRY_EVENT_QUERY_NAMES).toContain(alias);
    });
  });
});

describe("analytics consistency contracts", () => {
  it("keeps runtime-critical package versions aligned", () => {
    const rootPackageJson = JSON.parse(
      readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
    };
    const functionsPackageJson = JSON.parse(
      readFileSync(path.resolve(process.cwd(), "functions/package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
    };

    expect(rootPackageJson.dependencies?.["firebase-admin"]).toBe(
      functionsPackageJson.dependencies?.["firebase-admin"],
    );
    expect(rootPackageJson.dependencies?.["@dataconnect/admin-generated"]).toBe(
      functionsPackageJson.dependencies?.["@dataconnect/admin-generated"],
    );
  });

  it("keeps admin analytics telemetry log queries tied to the shared event catalog", () => {
    const adminAnalyticsRouteSource = readFileSync(
      path.resolve(process.cwd(), "src/app/api/admin/analytics/route.ts"),
      "utf8",
    );

    expect(adminAnalyticsRouteSource).toContain("fetchTelemetryLogs(TELEMETRY_EVENT_NAMES, startMs)");
    expect(adminAnalyticsRouteSource).not.toContain("const telemetryEventNames = [");
  });
});
