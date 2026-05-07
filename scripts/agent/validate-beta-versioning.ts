import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CURRENT_BETA_RELEASE_COUNTER,
  CURRENT_BETA_RELEASE_VERSION,
} from "../../src/lib/release-notes/release-version-contract";
import {
  formatBetaOdometerVersion,
  getNextBetaOdometerVersion,
  migrateLegacyVersionToBetaCounter,
  parseBetaOdometerVersion,
} from "../../src/lib/release-notes/beta-odometer-version";

const root = process.cwd();
const failures: string[] = [];

function expectEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    failures.push(`${label} expected ${String(expected)} but received ${String(actual)}.`);
  }
}

function expect(condition: boolean, message: string) {
  if (!condition) {
    failures.push(message);
  }
}

const publicJson = JSON.parse(
  readFileSync(join(root, "public/kandydrops-release-notes.json"), "utf8"),
) as {
  currentVersion: string;
  betaReleaseCounter: number;
};

const fallbackSource = readFileSync(join(root, "src/lib/release-notes/public-release-notes.ts"), "utf8");
const drawer = readFileSync(join(root, "src/components/ReleaseNotes/BetaReleaseNotesDrawer.tsx"), "utf8");
const hook = readFileSync(join(root, "src/hooks/usePublicReleaseNotes.ts"), "utf8");

expectEqual(formatBetaOdometerVersion(0), "1.0.0", "counter 0");
expectEqual(formatBetaOdometerVersion(1), "1.0.1", "counter 1");
expectEqual(formatBetaOdometerVersion(99), "1.0.99", "counter 99");
expectEqual(formatBetaOdometerVersion(100), "1.1.0", "counter 100");
expectEqual(formatBetaOdometerVersion(199), "1.1.99", "counter 199");
expectEqual(formatBetaOdometerVersion(200), "1.2.0", "counter 200");
expectEqual(formatBetaOdometerVersion(201), "1.2.1", "counter 201");
expectEqual(formatBetaOdometerVersion(9999), "1.99.99", "counter 9999");
expectEqual(formatBetaOdometerVersion(10000), "1.99.99.1", "counter 10000");
expectEqual(formatBetaOdometerVersion(19998), "1.99.99.9999", "counter 19998");
expectEqual(formatBetaOdometerVersion(19999), "1.99.99.1a", "counter 19999");

expectEqual(parseBetaOdometerVersion("1.2.1")?.counter, 201, "parse 1.2.1");
expectEqual(parseBetaOdometerVersion("1.99.99.1a")?.counter, 19999, "parse overflow");
expectEqual(migrateLegacyVersionToBetaCounter("1.113.4"), 201, "legacy migration");
expectEqual(getNextBetaOdometerVersion(201), "1.2.2", "first accepted release after migration baseline");

expectEqual(formatBetaOdometerVersion(CURRENT_BETA_RELEASE_COUNTER), CURRENT_BETA_RELEASE_VERSION, "canonical current version");
expectEqual(publicJson.betaReleaseCounter, CURRENT_BETA_RELEASE_COUNTER, "public JSON counter");
expectEqual(publicJson.currentVersion, CURRENT_BETA_RELEASE_VERSION, "public JSON current version");
expect(
  (parseBetaOdometerVersion(CURRENT_BETA_RELEASE_VERSION)?.counter ?? -1) >= (migrateLegacyVersionToBetaCounter("1.113.4") ?? 201),
  "Canonical current version must be 1.2.1 or newer after legacy migration.",
);
expect(
  (parseBetaOdometerVersion(publicJson.currentVersion)?.counter ?? -1) >= (migrateLegacyVersionToBetaCounter("1.113.4") ?? 201),
  "Public JSON current version must be 1.2.1 or newer after legacy migration.",
);

if (!fallbackSource.includes(`"currentVersion": "${CURRENT_BETA_RELEASE_VERSION}"`)) {
  failures.push(`Bundled fallback must carry currentVersion ${CURRENT_BETA_RELEASE_VERSION}.`);
}
if (fallbackSource.includes("\"currentVersion\": \"1.113.4\"")) {
  failures.push("Bundled fallback must not keep legacy currentVersion 1.113.4.");
}
if (!drawer.includes("Current version: v{releaseNotes.currentVersion}")) {
  failures.push("Beta modal must continue to display the current release-notes version.");
}
if (!hook.includes("kandydrops-release-notes.json?v=")) {
  failures.push("Release notes hook must continue requesting the public changelog with the current app version.");
}

if (failures.length > 0) {
  console.error("Beta odometer versioning validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Beta odometer versioning validation passed.");
