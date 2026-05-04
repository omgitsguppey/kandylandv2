import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { PublicBetaFinding, PublicBetaScoreReport } from "./core";
import { normalizeScorePath } from "./core";

export type PublicBetaAutofixPlan = {
  findingId: string;
  filePath: string;
  oldText: string;
  newText: string;
  expectedOccurrences: number;
  description: string;
  confidence: number;
};

export type PublicBetaAutofixResult = {
  applied: number;
  skipped: Array<{ findingId: string; reason: string }>;
  plans: PublicBetaAutofixPlan[];
};

const protectedPathPatterns = [
  /^src\/app\/api\/paypal\//u,
  /^src\/app\/api\/drops\/unlock/u,
  /^src\/app\/api\/drops\/content/u,
  /^src\/lib\/server\/paypal/u,
  /^src\/lib\/server\/auth/u,
  /^src\/lib\/gumdrop-ledger\.ts$/u,
  /^src\/lib\/gumdrop-economics\.ts$/u,
  /^src\/lib\/client-session\.ts$/u,
  /^src\/context\/AuthContext\.tsx$/u,
];

const approvedViewportAutofixFiles = new Set([
  "src/components/Chat/ChatRouteShell.tsx",
  "src/components/Chat/ChatExperience.tsx",
  "src/components/CoreLayoutWrapper.tsx",
  "src/components/Drops/LockedDropPreviewView.tsx",
  "src/app/drops/[id]/preview/loading.tsx",
  "src/lib/user-mobile-shell.ts",
]);

function countOccurrences(source: string, needle: string) {
  return source.split(needle).length - 1;
}

function isProtectedPath(filePath: string) {
  const normalized = normalizeScorePath(filePath);
  return protectedPathPatterns.some((pattern) => pattern.test(normalized));
}

export function buildSafeAutofixPlans(report: PublicBetaScoreReport, root = process.cwd()): PublicBetaAutofixPlan[] {
  const plans: PublicBetaAutofixPlan[] = [];

  for (const finding of report.findings) {
    if (!finding.canAutofix || finding.autofixConfidence < 0.95 || isProtectedPath(finding.filePath)) {
      continue;
    }

    const normalizedPath = normalizeScorePath(finding.filePath);
    const source = readFileSync(join(root, normalizedPath), "utf8");

    if (finding.category === "viewport-unit" && approvedViewportAutofixFiles.has(normalizedPath)) {
      const expectedOccurrences = countOccurrences(source, "100vh");
      if (expectedOccurrences > 0) {
        plans.push({
          findingId: finding.id,
          filePath: normalizedPath,
          oldText: "100vh",
          newText: "100dvh",
          expectedOccurrences,
          description: "Replace exact 100vh shell sizing with 100dvh.",
          confidence: finding.autofixConfidence,
        });
      }
    }

    if (finding.category === "chat-bottom-offset" && normalizedPath === "src/lib/user-mobile-shell.ts") {
      const oldText = "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = \"0px\"";
      const expectedOccurrences = countOccurrences(source, oldText);
      if (expectedOccurrences === 1) {
        plans.push({
          findingId: finding.id,
          filePath: normalizedPath,
          oldText,
          newText: "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = CHAT_LIST_CONTROLS_BOTTOM_OFFSET",
          expectedOccurrences,
          description: "Route chat floating controls through the shared bottom-nav offset token.",
          confidence: finding.autofixConfidence,
        });
      }
    }
  }

  return plans;
}

export function assertAutofixGate(finding: PublicBetaFinding, plan: PublicBetaAutofixPlan, source: string) {
  if (!finding.canAutofix) {
    return "Finding is not marked autofixable.";
  }
  if (finding.autofixConfidence < 0.95 || plan.confidence < 0.95) {
    return "Autofix confidence is below 0.95.";
  }
  if (isProtectedPath(plan.filePath)) {
    return "Autofix targets protected payment/auth/content/economy logic.";
  }
  const occurrences = countOccurrences(source, plan.oldText);
  if (occurrences !== plan.expectedOccurrences) {
    return `Expected ${plan.expectedOccurrences} occurrence(s), found ${occurrences}.`;
  }
  if (plan.oldText === plan.newText) {
    return "Autofix old and new text are identical.";
  }
  return null;
}

export function applySafeAutofixPlans(
  report: PublicBetaScoreReport,
  plans: PublicBetaAutofixPlan[],
  root = process.cwd(),
): PublicBetaAutofixResult {
  let applied = 0;
  const skipped: PublicBetaAutofixResult["skipped"] = [];

  for (const plan of plans) {
    const finding = report.findings.find((candidate) => candidate.id === plan.findingId);
    if (!finding) {
      skipped.push({ findingId: plan.findingId, reason: "Finding not found in report." });
      continue;
    }

    const fullPath = join(root, plan.filePath);
    const source = readFileSync(fullPath, "utf8");
    const gateFailure = assertAutofixGate(finding, plan, source);
    if (gateFailure) {
      skipped.push({ findingId: plan.findingId, reason: gateFailure });
      continue;
    }

    writeFileSync(fullPath, source.split(plan.oldText).join(plan.newText));
    applied += 1;
  }

  return { applied, skipped, plans };
}
