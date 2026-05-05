import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { AuditRuntimeLedgerEntry } from "./audit-runtime-contract";
import {
  DEFAULT_AUDIT_CONFIG_FILES,
  fingerprintExistingFiles,
  hashFingerprints,
  sha256Json,
  uniqueFingerprintPaths,
  type FileFingerprint,
} from "./file-fingerprint";

export const AUDIT_CACHE_VERSION = "audit-cache-v1";
export const AUDIT_CACHE_INDEX_PATH = "agent/cache/audit-cache-index.json";
export const AUDIT_CACHE_DOC_PATH = "docs/agent-truth/audit-cache.md";
export const DEFAULT_AUDIT_CACHE_ACCURACY_THRESHOLD = 0.8;
export const FALSE_POSITIVE_RATE_REVIEW_THRESHOLD = 0.2;
export const AUDIT_CACHE_VOLATILE_OUTPUT_FILES = new Set([
  "agent/cache/audit-cache-index.json",
  "agent/state/audit-runtime-ledger.jsonl",
  "agent/state/audit-runtime-summary.generated.json",
]);

export type AuditCacheResultStatus = "pass" | "warning" | "fail";

export type AuditCacheRecord = {
  cacheKey: string;
  auditName: string;
  auditVersion: string;
  createdAt: number;
  durationMs: number;
  resultStatus: AuditCacheResultStatus;
  findingsHash: string;
  relevantFiles: string[];
  validatorFiles: string[];
  commandsAvoided: string[];
  accuracyScoreAtCreation: number;
  relevantFileHash: string;
  validatorFileHash: string;
  configFileHash: string;
  packageScriptHash: string;
  maxAgeMs: number;
  hitCount: number;
  lastUsedAt?: number;
};

export type AuditCacheIndex = {
  version: string;
  generatedAt: number;
  records: Record<string, AuditCacheRecord>;
};

export type AuditCacheKeyInput = {
  auditName: string;
  auditVersion?: string;
  relevantFiles: string[];
  validatorFiles: string[];
  relevantPackageJsonScripts: Record<string, string>;
  configFiles?: string[];
  root: string;
};

export type AuditCacheMetadata = {
  cacheKey: string;
  auditName: string;
  auditVersion: string;
  relevantFiles: string[];
  validatorFiles: string[];
  configFiles: string[];
  relevantPackageJsonScripts: Record<string, string>;
  relevantFileFingerprints: FileFingerprint[];
  validatorFileFingerprints: FileFingerprint[];
  configFileFingerprints: FileFingerprint[];
  relevantFileHash: string;
  validatorFileHash: string;
  configFileHash: string;
  packageScriptHash: string;
  maxAgeMs: number;
};

export type AuditCacheAccuracyStats = {
  accuracyScore: number;
  falsePositiveRate: number;
  confirmedFindings: number;
  falsePositiveFindings: number;
};

export type AuditCacheEvaluation = {
  valid: boolean;
  cacheHit: boolean;
  reason: string;
  record?: AuditCacheRecord;
  metadata: AuditCacheMetadata;
};

export function readAuditCacheIndex(root: string): AuditCacheIndex {
  const cachePath = join(root, AUDIT_CACHE_INDEX_PATH);
  if (!existsSync(cachePath)) {
    return emptyAuditCacheIndex();
  }

  try {
    const parsed = JSON.parse(readFileSync(cachePath, "utf8")) as AuditCacheIndex;
    if (!parsed || typeof parsed !== "object" || !parsed.records) {
      return emptyAuditCacheIndex();
    }
    return {
      version: parsed.version || AUDIT_CACHE_VERSION,
      generatedAt: Number.isFinite(parsed.generatedAt) ? parsed.generatedAt : Date.now(),
      records: parsed.records,
    };
  } catch {
    return emptyAuditCacheIndex();
  }
}

export function writeAuditCacheIndex(root: string, index: AuditCacheIndex) {
  const cachePath = join(root, AUDIT_CACHE_INDEX_PATH);
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, `${JSON.stringify({ ...index, generatedAt: Date.now() }, null, 2)}\n`);
}

export function emptyAuditCacheIndex(): AuditCacheIndex {
  return {
    version: AUDIT_CACHE_VERSION,
    generatedAt: 0,
    records: {},
  };
}

export function buildAuditCacheMetadata(input: AuditCacheKeyInput): AuditCacheMetadata {
  const auditVersion = input.auditVersion ?? AUDIT_CACHE_VERSION;
  const relevantFiles = filterAuditCacheInputFiles(input.relevantFiles);
  const validatorFiles = uniqueFingerprintPaths(input.validatorFiles);
  const configFiles = uniqueFingerprintPaths(input.configFiles ?? DEFAULT_AUDIT_CONFIG_FILES);
  const relevantFileFingerprints = fingerprintExistingFiles(input.root, relevantFiles);
  const validatorFileFingerprints = fingerprintExistingFiles(input.root, validatorFiles);
  const configFileFingerprints = fingerprintExistingFiles(input.root, configFiles);
  const relevantFileHash = hashFingerprints(relevantFileFingerprints);
  const validatorFileHash = hashFingerprints(validatorFileFingerprints);
  const configFileHash = hashFingerprints(configFileFingerprints);
  const packageScriptHash = sha256Json(input.relevantPackageJsonScripts);
  const maxAgeMs = getAuditCacheMaxAgeMs(input.auditName, relevantFiles);
  const cacheKey = sha256Json({
    auditName: input.auditName,
    auditVersion,
    sortedRelevantFilePaths: relevantFiles,
    contentHashes: relevantFileHash,
    relevantPackageJsonScripts: input.relevantPackageJsonScripts,
    validatorFileHash,
    configFileHashes: configFileHash,
  });

  return {
    cacheKey,
    auditName: input.auditName,
    auditVersion,
    relevantFiles,
    validatorFiles,
    configFiles,
    relevantPackageJsonScripts: input.relevantPackageJsonScripts,
    relevantFileFingerprints,
    validatorFileFingerprints,
    configFileFingerprints,
    relevantFileHash,
    validatorFileHash,
    configFileHash,
    packageScriptHash,
    maxAgeMs,
  };
}

export function filterAuditCacheInputFiles(filePaths: readonly string[]) {
  return uniqueFingerprintPaths(filePaths).filter((filePath) => !AUDIT_CACHE_VOLATILE_OUTPUT_FILES.has(filePath));
}

export function evaluateAuditCache(input: {
  index: AuditCacheIndex;
  metadata: AuditCacheMetadata;
  now?: number;
  accuracyStats: AuditCacheAccuracyStats;
  accuracyThreshold?: number;
}): AuditCacheEvaluation {
  const now = input.now ?? Date.now();
  const threshold = input.accuracyThreshold ?? DEFAULT_AUDIT_CACHE_ACCURACY_THRESHOLD;
  const record = input.index.records[input.metadata.cacheKey];

  if (!record) {
    return { valid: false, cacheHit: false, reason: "cache miss: relevant fingerprints changed or no record exists", metadata: input.metadata };
  }
  if (record.relevantFileHash !== input.metadata.relevantFileHash) {
    return { valid: false, cacheHit: false, reason: "cache stale: relevant file hash changed", record, metadata: input.metadata };
  }
  if (record.validatorFileHash !== input.metadata.validatorFileHash) {
    return { valid: false, cacheHit: false, reason: "cache stale: validator hash changed", record, metadata: input.metadata };
  }
  if (record.configFileHash !== input.metadata.configFileHash) {
    return { valid: false, cacheHit: false, reason: "cache stale: config hash changed", record, metadata: input.metadata };
  }
  if (record.packageScriptHash !== input.metadata.packageScriptHash) {
    return { valid: false, cacheHit: false, reason: "cache stale: package script changed", record, metadata: input.metadata };
  }
  if (now - record.createdAt > input.metadata.maxAgeMs) {
    return { valid: false, cacheHit: false, reason: "cache stale: maxAge exceeded", record, metadata: input.metadata };
  }
  if (record.auditVersion !== input.metadata.auditVersion) {
    return { valid: false, cacheHit: false, reason: "cache stale: audit version changed", record, metadata: input.metadata };
  }
  if (record.accuracyScoreAtCreation < threshold || input.accuracyStats.accuracyScore < threshold) {
    return { valid: false, cacheHit: false, reason: "cache blocked: last known accuracy below threshold", record, metadata: input.metadata };
  }
  if (input.accuracyStats.falsePositiveRate > FALSE_POSITIVE_RATE_REVIEW_THRESHOLD) {
    return { valid: false, cacheHit: false, reason: "cache blocked: previous false positive rate requires audit review", record, metadata: input.metadata };
  }

  return { valid: true, cacheHit: true, reason: "cache hit: deterministic audit inputs unchanged", record, metadata: input.metadata };
}

export function upsertAuditCacheRecord(input: {
  root: string;
  index: AuditCacheIndex;
  metadata: AuditCacheMetadata;
  durationMs: number;
  resultStatus: AuditCacheResultStatus;
  findingsHash: string;
  command: string;
  accuracyScoreAtCreation: number;
  now?: number;
  write?: boolean;
}) {
  const now = input.now ?? Date.now();
  input.index.records[input.metadata.cacheKey] = {
    cacheKey: input.metadata.cacheKey,
    auditName: input.metadata.auditName,
    auditVersion: input.metadata.auditVersion,
    createdAt: now,
    durationMs: input.durationMs,
    resultStatus: input.resultStatus,
    findingsHash: input.findingsHash,
    relevantFiles: input.metadata.relevantFiles,
    validatorFiles: input.metadata.validatorFiles,
    commandsAvoided: [],
    accuracyScoreAtCreation: input.accuracyScoreAtCreation,
    relevantFileHash: input.metadata.relevantFileHash,
    validatorFileHash: input.metadata.validatorFileHash,
    configFileHash: input.metadata.configFileHash,
    packageScriptHash: input.metadata.packageScriptHash,
    maxAgeMs: input.metadata.maxAgeMs,
    hitCount: 0,
  };
  if (input.write !== false) {
    writeAuditCacheIndex(input.root, input.index);
  }
}

export function markAuditCacheHit(input: { root: string; index: AuditCacheIndex; cacheKey: string; command: string; now?: number; write?: boolean }) {
  const record = input.index.records[input.cacheKey];
  if (!record) return;
  record.commandsAvoided = Array.from(new Set([...record.commandsAvoided, input.command])).sort();
  record.hitCount += 1;
  record.lastUsedAt = input.now ?? Date.now();
  if (input.write !== false) {
    writeAuditCacheIndex(input.root, input.index);
  }
}

export function getAuditCacheMaxAgeMs(auditName: string, relevantFiles: readonly string[]) {
  const joined = `${auditName} ${relevantFiles.join(" ")}`.toLowerCase();
  const docsOnly = relevantFiles.length > 0 && relevantFiles.every((filePath) => {
    const normalized = filePath.toLowerCase();
    return normalized.startsWith("docs/") || normalized.includes("doctrine") || normalized.includes("agent-truth");
  });
  if (docsOnly) {
    return 72 * 60 * 60 * 1000;
  }
  if (joined.includes("audit-runtime") || joined.includes("audit-cache") || joined.includes("audit-runtime-summary")) {
    return 60 * 60 * 1000;
  }
  if (/payment|paypal|purchase|auth|security|unlock|rules|gumdrop|wallet/u.test(joined)) {
    return 6 * 60 * 60 * 1000;
  }
  if (joined.includes("generated") || joined.includes("agent/state/")) {
    return 24 * 60 * 60 * 1000;
  }
  if (joined.includes("src/components/") || joined.includes(".tsx") || joined.includes("device-ui")) {
    return 24 * 60 * 60 * 1000;
  }
  if (joined.includes("docs/") || joined.includes("doctrine") || joined.includes("agent-truth")) {
    return 72 * 60 * 60 * 1000;
  }
  return 24 * 60 * 60 * 1000;
}

export function resultStatusFromExit(exitCode: number, findingsCount: number): AuditCacheResultStatus {
  if (exitCode !== 0) return "fail";
  return findingsCount > 0 ? "warning" : "pass";
}

export function exitCodeFromCachedStatus(status: AuditCacheResultStatus) {
  return status === "fail" ? 1 : 0;
}

export function findingsHashForAudit(input: {
  auditName: string;
  resultStatus: AuditCacheResultStatus;
  findingsCount: number;
  criticalCount: number;
  majorCount: number;
}) {
  return sha256Json(input);
}

export function accuracyStatsForAudit(entries: readonly AuditRuntimeLedgerEntry[], auditName: string): AuditCacheAccuracyStats {
  const matching = entries.filter((entry) => entry.auditName === auditName);
  const confirmedFindings = matching
    .filter((entry) => entry.accuracyStatus === "confirmed")
    .reduce((total, entry) => total + Math.max(0, entry.findingsCount), 0);
  const falsePositiveFindings = matching
    .filter((entry) => entry.accuracyStatus === "false_positive")
    .reduce((total, entry) => total + Math.max(0, entry.findingsCount), 0);
  const denominator = confirmedFindings + falsePositiveFindings;
  return {
    accuracyScore: denominator > 0 ? confirmedFindings / denominator : 1,
    falsePositiveRate: denominator > 0 ? falsePositiveFindings / denominator : 0,
    confirmedFindings,
    falsePositiveFindings,
  };
}

export function summarizeAuditCacheIndex(index: AuditCacheIndex) {
  const records = Object.values(index.records);
  return {
    records: records.length,
    commandsAvoided: records.reduce((total, record) => total + record.commandsAvoided.length, 0),
    cacheHits: records.reduce((total, record) => total + record.hitCount, 0),
    newestRecordAt: records.reduce((latest, record) => Math.max(latest, record.createdAt), 0),
  };
}
