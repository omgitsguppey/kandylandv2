import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type FileFingerprint = {
  filePath: string;
  hash: string;
  size: number;
  missing: boolean;
};

export const DEFAULT_AUDIT_CONFIG_FILES = [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vitest.config.ts",
  "vitest.contracts.config.ts",
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.ts",
  ".eslintrc.json",
  ".eslintrc.js",
  ".eslintrc.cjs",
  "agent/index/surface-map.json",
  "agent/index/dependency-graph.summary.json",
  "agent/index/verification-commands.json",
] as const;

export function normalizeFingerprintPath(filePath: string) {
  return filePath.replace(/\\/gu, "/").replace(/^\.\//u, "").trim();
}

export function sha256Text(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256Json(value: unknown) {
  return sha256Text(JSON.stringify(value));
}

export function fingerprintFile(root: string, filePath: string): FileFingerprint {
  const normalized = normalizeFingerprintPath(filePath);
  const fullPath = join(root, normalized);
  if (!existsSync(fullPath) || !statSync(fullPath).isFile()) {
    return {
      filePath: normalized,
      hash: "missing",
      size: 0,
      missing: true,
    };
  }

  const buffer = readFileSync(fullPath);
  return {
    filePath: normalized,
    hash: createHash("sha256").update(buffer).digest("hex"),
    size: buffer.byteLength,
    missing: false,
  };
}

export function fingerprintFiles(root: string, filePaths: readonly string[]) {
  return uniqueFingerprintPaths(filePaths).map((filePath) => fingerprintFile(root, filePath));
}

export function fingerprintExistingFiles(root: string, filePaths: readonly string[]) {
  return fingerprintFiles(root, filePaths).filter((fingerprint) => !fingerprint.missing);
}

export function uniqueFingerprintPaths(filePaths: readonly string[]) {
  return Array.from(new Set(filePaths.map(normalizeFingerprintPath).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function hashFingerprints(fingerprints: readonly FileFingerprint[]) {
  return sha256Json(
    fingerprints.map((fingerprint) => ({
      filePath: fingerprint.filePath,
      hash: fingerprint.hash,
      size: fingerprint.size,
      missing: fingerprint.missing,
    })),
  );
}
