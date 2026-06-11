import { discoverRepoFiles, readRepoToolchainState } from "./agent/shared";

type InventoryEntry = {
  label: string;
  count: number;
};

function isRootFile(file: string) {
  return !file.includes("/");
}

function isRootMarkdownDoc(file: string) {
  return isRootFile(file) && file.endsWith(".md");
}

function isRootLockfile(file: string) {
  return isRootFile(file) && (file === "package-lock.json" || file === "pnpm-lock.yaml");
}

function isRootConfigOrRuntimeFile(file: string) {
  return isRootFile(file) && !isRootMarkdownDoc(file) && !isRootLockfile(file);
}

function readTrackedFiles() {
  return discoverRepoFiles().files;
}

function countByPrefix(files: string[], prefix: string) {
  return files.filter((file) => file.startsWith(prefix)).length;
}

function buildInventory(files: string[]): InventoryEntry[] {
  return [
    { label: "Total tracked files", count: files.length },
    { label: "Root files", count: files.filter((file) => isRootFile(file)).length },
    { label: "Root markdown/docs", count: files.filter((file) => isRootMarkdownDoc(file)).length },
    { label: "Root lockfiles", count: files.filter((file) => isRootLockfile(file)).length },
    { label: "Root config/runtime/tooling files", count: files.filter((file) => isRootConfigOrRuntimeFile(file)).length },
    { label: "src", count: countByPrefix(files, "src/") },
    { label: "src/app", count: countByPrefix(files, "src/app/") },
    { label: "src/components", count: countByPrefix(files, "src/components/") },
    { label: "src/context", count: countByPrefix(files, "src/context/") },
    { label: "src/hooks", count: countByPrefix(files, "src/hooks/") },
    { label: "src/lib", count: countByPrefix(files, "src/lib/") },
    { label: "src/lib/server", count: countByPrefix(files, "src/lib/server/") },
    { label: "src/types", count: countByPrefix(files, "src/types/") },
    { label: "functions", count: countByPrefix(files, "functions/") },
    { label: "functions/src", count: countByPrefix(files, "functions/src/") },
    { label: "scripts", count: countByPrefix(files, "scripts/") },
    { label: "tests", count: countByPrefix(files, "tests/") },
    { label: "public", count: countByPrefix(files, "public/") },
    { label: "dataconnect", count: countByPrefix(files, "dataconnect/") },
    { label: "src/dataconnect-generated", count: countByPrefix(files, "src/dataconnect-generated/") },
    { label: "src/dataconnect-admin-generated", count: countByPrefix(files, "src/dataconnect-admin-generated/") },
    { label: "functions/src/dataconnect-admin-generated", count: countByPrefix(files, "functions/src/dataconnect-admin-generated/") },
  ];
}

function printInventory(entries: InventoryEntry[]) {
  const toolchain = readRepoToolchainState();
  console.log("Repository inventory");
  console.log(`- Git status: ${toolchain.gitStatus}`);
  console.log(`- Source file discovery: ${toolchain.sourceFileDiscovery}`);
  console.log(`- Current head source: ${toolchain.currentHeadSource}`);
  console.log(`- Tooling degraded: ${toolchain.toolingDegraded ? "yes" : "no"}`);
  if (toolchain.degradationReason) {
    console.log(`- Degradation reason: ${toolchain.degradationReason}`);
  }
  entries.forEach((entry) => {
    console.log(`- ${entry.label}: ${entry.count}`);
  });
}

function printJson(entries: InventoryEntry[]) {
  console.log(JSON.stringify({
    toolchain: readRepoToolchainState(),
    entries,
  }, null, 2));
}

const files = readTrackedFiles();
const inventory = buildInventory(files);

if (process.argv.includes("--json")) {
  printJson(inventory);
} else {
  printInventory(inventory);
}
