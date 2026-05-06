import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type PackageManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  overrides?: Record<string, unknown>;
};

type Lockfile = {
  packages?: Record<string, { version?: string }>;
};

const root = process.cwd();
const failures: string[] = [];
const warnings: string[] = [];

function fail(message: string) {
  failures.push(message);
}

function warn(message: string) {
  warnings.push(message);
}

function readJson<T>(relativePath: string, fallback: T): T {
  const fullPath = path.join(root, relativePath);
  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${relativePath}`);
    return fallback;
  }

  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as T;
  } catch (error) {
    fail(`Unable to parse ${relativePath}: ${(error as Error).message}`);
    return fallback;
  }
}

function verifyDirectDependencies(scope: string, pkg: PackageManifest, lockfile: Lockfile) {
  for (const [name] of Object.entries(pkg.dependencies ?? {})) {
    const version = lockfile.packages?.[`node_modules/${name}`]?.version;
    if (!version) {
      warn(`${scope} runtime dependency ${name} is declared but not lockfile-verified.`);
    }
  }

  for (const [name] of Object.entries(pkg.devDependencies ?? {})) {
    const version = lockfile.packages?.[`node_modules/${name}`]?.version;
    if (!version) {
      warn(`${scope} dev dependency ${name} is declared but not lockfile-verified.`);
    }
  }

  for (const [name] of Object.entries(pkg.optionalDependencies ?? {})) {
    const version = lockfile.packages?.[`node_modules/${name}`]?.version;
    if (!version) {
      warn(`${scope} optional dependency ${name} is declared but not lockfile-verified.`);
    }
  }
}

function main() {
  const rootPkg = readJson<PackageManifest>("package.json", {});
  const rootLock = readJson<Lockfile>("package-lock.json", {});
  const functionsPkg = readJson<PackageManifest>("functions/package.json", {});
  const functionsLock = readJson<Lockfile>("functions/package-lock.json", {});

  verifyDirectDependencies("root", rootPkg, rootLock);
  verifyDirectDependencies("functions", functionsPkg, functionsLock);

  if ((rootPkg.dependencies ?? {})["@google-cloud/storage"]) {
    fail("@google-cloud/storage must not be treated as not-direct when it is a direct root dependency.");
  }
  if ((rootPkg.dependencies ?? {})["@google-cloud/pubsub"]) {
    fail("@google-cloud/pubsub must not be treated as not-direct when it is a direct root dependency.");
  }
  if ((functionsPkg.dependencies ?? {})["@google-cloud/storage"]) {
    fail("@google-cloud/storage must not be treated as not-direct when it is a direct functions dependency.");
  }
  if ((functionsPkg.dependencies ?? {})["@google-cloud/pubsub"]) {
    fail("@google-cloud/pubsub must not be treated as not-direct when it is a direct functions dependency.");
  }

  const rootRuntimeCount = Object.keys(rootPkg.dependencies ?? {}).length;
  const rootDevCount = Object.keys(rootPkg.devDependencies ?? {}).length;
  const functionsRuntimeCount = Object.keys(functionsPkg.dependencies ?? {}).length;
  const functionsDevCount = Object.keys(functionsPkg.devDependencies ?? {}).length;

  console.log(`root runtime dependencies: ${rootRuntimeCount}`);
  console.log(`root dev dependencies: ${rootDevCount}`);
  console.log(`functions runtime dependencies: ${functionsRuntimeCount}`);
  console.log(`functions dev dependencies: ${functionsDevCount}`);
  console.log(`root overrides: ${Object.keys(rootPkg.overrides ?? {}).length}`);
  console.log(`functions overrides: ${Object.keys(functionsPkg.overrides ?? {}).length}`);
  if (warnings.length > 0) {
    console.log("lockfile verification warnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (failures.length > 0) {
    console.error("Dependency truth validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Dependency truth validation passed.");
}

main();
