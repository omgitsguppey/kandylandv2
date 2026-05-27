import { readJson, type ValidationResult } from "./config-hardening-shared";

export type DependencyPolicyRule = {
  id: string;
  status: "classified" | "blocked_by_default" | "separate_window_required";
  rule: string;
  validator: string;
};

export type DependencyToolchainPolicyReport = {
  generatedAtUtc: string;
  policyStatus: "classified" | "config_unknown";
  rules: DependencyPolicyRule[];
  providerSdkPackages: string[];
  frameworkPackages: string[];
  testToolingPackages: string[];
  lockfilePolicy: { status: "intentional_change_required"; files: string[] };
  dependencyPrClassification: "separate_window_required";
  remainingGaps: string[];
};

type PackageJson = { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

export function buildDependencyToolchainPolicyReport(options: { generatedAtUtc?: string } = {}): DependencyToolchainPolicyReport {
  const packageJson = readJson<PackageJson>("package.json", {});
  const packages = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
  const names = Object.keys(packages).sort();
  return {
    generatedAtUtc: options.generatedAtUtc || new Date().toISOString(),
    policyStatus: "classified",
    providerSdkPackages: names.filter((name) => /firebase|paypal|google|posthog|vertex/iu.test(name)),
    frameworkPackages: names.filter((name) => /next|react|typescript|tailwind/iu.test(name)),
    testToolingPackages: names.filter((name) => /vitest|playwright|cypress|storybook|testing-library/iu.test(name)),
    lockfilePolicy: { status: "intentional_change_required", files: ["package-lock.json", "functions/package-lock.json"] },
    dependencyPrClassification: "separate_window_required",
    rules: [
      { id: "broad_dependency_prs_separate_window", status: "separate_window_required", rule: "Broad dependency PRs do not merge during beta exit unless security-required.", validator: "check:dependency-toolchain-policy" },
      { id: "security_advisories_override_deferral", status: "classified", rule: "Security advisories override dependency deferral with explicit owner review.", validator: "check:dependency-toolchain-policy" },
      { id: "provider_sdk_updates_separate_window", status: "separate_window_required", rule: "Provider SDK updates require a separate test window.", validator: "check:dependency-toolchain-policy" },
      { id: "framework_updates_separate_window", status: "separate_window_required", rule: "Framework updates require a separate test window.", validator: "check:dependency-toolchain-policy" },
      { id: "audit_is_advisory", status: "classified", rule: "npm audit output is advisory and classified, not blindly patched.", validator: "check:dependency-toolchain-policy" },
    ],
    remainingGaps: ["No dependency versions changed in this pass."],
  };
}

export function validateDependencyToolchainPolicyReport(report: DependencyToolchainPolicyReport): ValidationResult {
  const failures: string[] = [];
  if (report.policyStatus !== "classified") failures.push("dependency policy not classified");
  if (report.dependencyPrClassification !== "separate_window_required") failures.push("dependency PR classification missing");
  if (!report.rules.some((rule) => rule.id === "provider_sdk_updates_separate_window")) failures.push("provider SDK update policy missing");
  if (report.lockfilePolicy.status !== "intentional_change_required") failures.push("lockfile changed without package reason");
  return { ok: failures.length === 0, failures, warnings: report.remainingGaps };
}
