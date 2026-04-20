type MadgeResult = {
  circular(): string[][];
  warnings(): unknown;
  obj(): Record<string, unknown>;
};

const madge = require("madge") as (
  input: string,
  config: {
    fileExtensions: string[];
    tsConfig: string;
    excludeRegExp?: string[];
  },
) => Promise<MadgeResult>;

type TargetName = "app" | "functions";

interface CycleTargetConfig {
  label: string;
  input: string;
  tsConfig: string;
  extensions: string[];
  excludeRegExp?: string[];
  allowedSkipped?: string[];
}

const TARGETS: Record<TargetName, CycleTargetConfig> = {
  app: {
    label: "app",
    input: "src",
    tsConfig: "tsconfig.json",
    extensions: ["ts", "tsx"],
    excludeRegExp: [
      "globals\\.css$",
      "dataconnect-generated",
      "dataconnect-admin-generated",
      "^tailwindcss$",
      "^react-loading-skeleton/dist/skeleton\\.css$",
      "^@tanstack-query-firebase/react/data-connect$",
      "^@tanstack/react-query$",
    ],
    allowedSkipped: [
      "tailwindcss",
      "react-loading-skeleton/dist/skeleton.css",
      "@tanstack-query-firebase/react/data-connect",
      "@tanstack/react-query",
      "storybook/test",
    ],
  },
  functions: {
    label: "functions",
    input: "functions/src",
    tsConfig: "functions/tsconfig.json",
    extensions: ["ts"],
    allowedSkipped: [
      "firebase-functions/v2/firestore",
      "firebase-functions",
      "firebase-functions/v2/scheduler",
      "firebase-functions/v2",
    ],
  },
};

function normalizeSkippedWarnings(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const skipped = (value as { skipped?: unknown }).skipped;
  if (!Array.isArray(skipped)) {
    return [];
  }

  return skipped.filter((entry): entry is string => typeof entry === "string");
}

async function main() {
  const rawTarget = process.argv[2];

  if (rawTarget !== "app" && rawTarget !== "functions") {
    throw new Error('Usage: tsx scripts/check-cycles.ts <app|functions>');
  }

  const config = TARGETS[rawTarget as TargetName];
  const result = await madge(config.input, {
    fileExtensions: config.extensions,
    tsConfig: config.tsConfig,
    excludeRegExp: config.excludeRegExp,
  });

  const circular = result.circular();
  const skipped = normalizeSkippedWarnings(result.warnings());
  const unexpectedSkipped = skipped.filter(
    (entry) => !(config.allowedSkipped ?? []).includes(entry),
  );

  console.log(`Cycle audit target: ${config.label}`);
  console.log(`Files processed: ${Object.keys(result.obj()).length}`);

  if (unexpectedSkipped.length > 0) {
    console.error("Unexpected skipped imports detected:");
    unexpectedSkipped.forEach((entry) => console.error(`- ${entry}`));
    process.exit(1);
  }

  if (circular.length > 0) {
    console.error("Circular dependencies detected:");
    circular.forEach((cycle: string[]) => console.error(`- ${cycle.join(" -> ")}`));
    process.exit(1);
  }

  console.log("No circular dependencies found.");

  if (skipped.length > 0) {
    console.log(`Ignored known non-runtime imports: ${skipped.length}`);
  }
}

void main();
