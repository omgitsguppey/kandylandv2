import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const srcRoot = resolve(process.cwd(), "src");
const rulesPath = resolve(process.cwd(), "firestore.rules");

const SERVER_ONLY_SEGMENTS = [
  "/app/api/",
  "/lib/server/",
];

const KNOWN_COLLECTION_TOKENS: Record<string, string> = {
  ADMIN_AI_DEBUG_SERVER_DIAGNOSTICS_COLLECTION: "server_diagnostics",
  ADMIN_AI_DEBUG_ROUTE_RUNTIME_HEALTH_COLLECTION: "route_runtime_health",
  RUNTIME_WARNING_COLLECTION: "runtime_warning_records",
  QUEUE_JOB_HEARTBEAT_COLLECTION: "queue_job_heartbeats",
  ROUTE_RUNTIME_HEALTH_COLLECTION: "route_runtime_health",
  "ORCHESTRATION_COLLECTIONS.repairProposals": "orchestration_repair_proposals",
};

const rulesSource = readFileSync(rulesPath, "utf8");

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if ([".ts", ".tsx"].includes(extname(entry))) {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizePath(filePath: string) {
  return `/${relative(process.cwd(), filePath).replace(/\\/g, "/")}`;
}

function isServerOnlyPath(filePath: string) {
  const normalized = normalizePath(filePath);
  return SERVER_ONLY_SEGMENTS.some((segment) => normalized.includes(segment));
}

function addCollection(
  collections: Map<string, Set<string>>,
  collectionName: string,
  filePath: string,
) {
  if (!collectionName || collectionName.includes("$(") || collectionName.includes("{")) {
    return;
  }

  const existing = collections.get(collectionName) ?? new Set<string>();
  existing.add(relative(process.cwd(), filePath).replace(/\\/g, "/"));
  collections.set(collectionName, existing);
}

function extractClientFirestoreCollections() {
  const collections = new Map<string, Set<string>>();

  for (const filePath of walk(srcRoot)) {
    if (isServerOnlyPath(filePath)) {
      continue;
    }

    const source = readFileSync(filePath, "utf8");
    if (!source.includes("firebase/firestore") && !source.includes("collection(db") && !source.includes("doc(db")) {
      continue;
    }

    for (const match of source.matchAll(/(?:collection|doc)\(db,\s*([`'"])([^`'"]+)\1/g)) {
      addCollection(collections, match[2], filePath);
    }

    for (const match of source.matchAll(/collection\(db,\s*([A-Z0-9_]+|ORCHESTRATION_COLLECTIONS\.[A-Za-z0-9_]+)\)/g)) {
      const collectionName = KNOWN_COLLECTION_TOKENS[match[1]];
      if (collectionName) {
        addCollection(collections, collectionName, filePath);
      }
    }

    for (const match of source.matchAll(/doc\(collection\(db,\s*([A-Z0-9_]+|ORCHESTRATION_COLLECTIONS\.[A-Za-z0-9_]+)\)/g)) {
      const collectionName = KNOWN_COLLECTION_TOKENS[match[1]];
      if (collectionName) {
        addCollection(collections, collectionName, filePath);
      }
    }
  }

  return collections;
}

function hasReadOnlyRule(collectionName: string) {
  const escapedCollectionName = collectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matchPattern = new RegExp(
    `match\\s+/${escapedCollectionName}/\\{[^}]+\\}\\s*\\{[\\s\\S]*?allow\\s+read:\\s+if\\s+[\\s\\S]*?;[\\s\\S]*?allow\\s+write:\\s+if\\s+false;[\\s\\S]*?\\}`,
    "m",
  );
  return matchPattern.test(rulesSource);
}

const collections = extractClientFirestoreCollections();
const missing = Array.from(collections.entries())
  .filter(([collectionName]) => !hasReadOnlyRule(collectionName))
  .sort(([left], [right]) => left.localeCompare(right));

if (missing.length > 0) {
  console.error(
    [
      "Client Firestore connectivity check failed.",
      "These client-side Firestore collections do not have explicit read-only rules:",
      ...missing.flatMap(([collectionName, files]) => [
        `- ${collectionName}`,
        ...Array.from(files).sort().map((file) => `  - ${file}`),
      ]),
    ].join("\n"),
  );
  process.exit(1);
}

console.log(
  `Client Firestore connectivity check passed (${collections.size} client collection contracts).`,
);
