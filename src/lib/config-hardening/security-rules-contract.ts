import { fileExists, readText, type ValidationResult } from "./config-hardening-shared";

export type RulesFileStatus = "present" | "missing_but_not_used" | "missing_and_required" | "config_unknown";

export type SecurityRulesFileEntry = {
  path: string;
  exists: boolean;
  owner: string;
  deployedBy: string;
  protectedResources: string[];
  roleAssumptions: string[];
  localEmulatorTestCoverage: "classified" | "missing" | "config_unknown";
  publicPrivateDataClasses: string[];
  riskyPatterns: string[];
  validator: string;
  status: RulesFileStatus;
};

export type ProtectedDataClassPolicy = {
  dataClass: string;
  owner: string;
  policyStatus: "classified" | "missing_and_required" | "config_unknown";
  evidence: string;
};

export type SecurityRulesInventoryReport = {
  generatedAtUtc: string;
  rulesFiles: SecurityRulesFileEntry[];
  protectedDataClasses: ProtectedDataClassPolicy[];
  riskyPatternCount: number;
  remainingGaps: string[];
};

function rulesEntry(path: string, required: boolean, protectedResources: string[]): SecurityRulesFileEntry {
  const exists = fileExists(path);
  const text = readText(path);
  const riskyPatterns = [
    /allow\s+(read|write):\s*if\s*true/u.test(text) ? "allow_true" : "",
    /allow\s+read,\s*write:\s*if\s*request\.auth\s*!=\s*null/u.test(text) ? "broad_auth_read_write" : "",
  ].filter(Boolean);
  return {
    path,
    exists,
    owner: path.includes("middleware") || path.includes("next.config") ? "web_security" : "firebase_security",
    deployedBy: path === "vercel.json" ? "vercel" : path.includes("next.config") || path.includes("middleware") ? "next_build" : "firebase.json",
    protectedResources,
    roleAssumptions: text.includes("isAdmin") ? ["admin role from users/{uid}.role"] : ["default deny or config-only"],
    localEmulatorTestCoverage: exists ? "classified" : "missing",
    publicPrivateDataClasses: protectedResources,
    riskyPatterns,
    validator: "check:security-rules-inventory",
    status: exists ? "present" : required ? "missing_and_required" : "missing_but_not_used",
  };
}

export function buildSecurityRulesInventoryReport(options: { generatedAtUtc?: string } = {}): SecurityRulesInventoryReport {
  const firestore = readText("firestore.rules");
  const storage = readText("storage.rules");
  const database = readText("database.rules.json");
  const rulesFiles = [
    rulesEntry("firebase.json", true, ["hosting", "firestore", "storage", "database", "functions"]),
    rulesEntry("firestore.rules", true, ["users", "wallet/payment rows", "admin/debug data", "chat", "support", "analytics"]),
    rulesEntry("storage.rules", true, ["private media", "chat attachments", "avatars", "drop assets"]),
    rulesEntry("firestore.indexes.json", true, ["bounded query indexes"]),
    rulesEntry("database.rules.json", true, ["chat presence"]),
    rulesEntry("middleware.ts", true, ["admin route redirects", "legacy/bot probe handling"]),
    rulesEntry("next.config.ts", true, ["security headers", "image host allowlist"]),
    rulesEntry("vercel.json", false, ["vercel deployment config"]),
  ];
  const protectedDataClasses: ProtectedDataClassPolicy[] = [
    { dataClass: "private_media", owner: "storage.rules", policyStatus: storage.includes("match /drops/") && storage.includes("allow get: if false") ? "classified" : "missing_and_required", evidence: "drop assets deny direct client SDK access" },
    { dataClass: "chat_content_attachments", owner: "firestore.rules/storage.rules/database.rules.json", policyStatus: firestore.includes("creator_messages") && storage.includes("creator/messages") && database.includes("chat_presence") ? "classified" : "missing_and_required", evidence: "participant-scoped reads and owner-scoped attachment path" },
    { dataClass: "wallet_payment_provider_data", owner: "firestore.rules", policyStatus: firestore.includes("transactions") && firestore.includes("isAdmin") ? "classified" : "missing_and_required", evidence: "transaction reads self/admin, writes denied" },
    { dataClass: "admin_debug_data", owner: "firestore.rules/middleware.ts", policyStatus: firestore.includes("debug_evidence") && firestore.includes("isAdmin") ? "classified" : "missing_and_required", evidence: "admin-only debug evidence reads" },
    { dataClass: "creator_private_settings", owner: "firestore.rules", policyStatus: firestore.includes("match /{document=**}") ? "classified" : "config_unknown", evidence: "default deny covers unlisted creator settings" },
    { dataClass: "public_creator_drop_metadata", owner: "server readers/API sanitizers", policyStatus: firestore.includes("Drops: public browsing goes through server-side readers") ? "classified" : "config_unknown", evidence: "client Firestore drop reads restricted to admin" },
  ];
  return {
    generatedAtUtc: options.generatedAtUtc || new Date().toISOString(),
    rulesFiles,
    protectedDataClasses,
    riskyPatternCount: rulesFiles.reduce((sum, entry) => sum + entry.riskyPatterns.length, 0),
    remainingGaps: ["Provider deployment state is not proven from source; keep operator evidence separate."],
  };
}

export function validateSecurityRulesInventoryReport(report: SecurityRulesInventoryReport): ValidationResult {
  const failures = [
    ...report.rulesFiles.filter((entry) => entry.status === "config_unknown").map((entry) => `${entry.path} absence unclassified`),
    ...report.protectedDataClasses.filter((entry) => entry.policyStatus !== "classified").map((entry) => `${entry.dataClass} lacks rules/policy owner`),
    ...report.rulesFiles.flatMap((entry) => entry.riskyPatterns.map((pattern) => `${entry.path} risky pattern ${pattern}`)),
  ];
  return { ok: failures.length === 0, failures, warnings: report.remainingGaps };
}
