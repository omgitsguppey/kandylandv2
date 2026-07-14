import { describe, expect, it } from "vitest";

import { buildIssueSpecMarkdown } from "../../scripts/agent/fast-start";
import { extractRepoPaths } from "../../scripts/agent/shared";

describe("agent prompt compiler", () => {
  it("extracts paths only from complete inline-code spans", () => {
    const value = [
      "Keep `source_component` and visible economy copy that says Coins,",
      "while recognizing payload builders/local variables and excluding the Lucide `Coins` icon.",
      "Reuse `src/lib/telemetry.ts`.",
    ].join(" ");

    expect(extractRepoPaths(value)).toEqual(["src/lib/telemetry.ts"]);
  });

  it("normalizes, sorts, and deduplicates repository paths", () => {
    const value = [
      "Use ` tests/unit/agent-prompt-compiler.spec.ts ` and `scripts\\agent\\shared.ts`.",
      "Reuse `scripts/agent/shared.ts` and ignore `https://example.com/docs/path`.",
      "Reject `/api/health`, `0/100`, `admin/analytics/refresh`, and `npm run check -- tests/unit/example.spec.ts`.",
      "Keep `/control-tower/00-START-HERE.md` and `src/lib/identity-truth/*`.",
    ].join(" ");

    expect(extractRepoPaths(value)).toEqual([
      "control-tower/00-START-HERE.md",
      "scripts/agent/shared.ts",
      "src/lib/identity-truth/*",
      "tests/unit/agent-prompt-compiler.spec.ts",
    ]);
  });

  it("renders a compact issue-style prompt with safety, context, and verification lanes", () => {
    const markdown = buildIssueSpecMarkdown({
      task: "Normalize payment-adjacent PurchaseModal error copy without touching provider callbacks or wallet math.",
      mode: "ui",
      files: ["src/components/PurchaseModal.tsx"],
      acceptanceCriteria: [
        "Preserve product behavior and source truth.",
        "Reuse canonical helpers before adding a new abstraction.",
      ],
      allowedFiles: ["src/components/PurchaseModal.tsx", "tests/unit/purchase-modal.spec.tsx"],
      forbiddenFiles: ["src/lib/server/paypal.ts", "src/lib/gumdrop-ledger.ts"],
      doctrineContextPack: {
        hot: ["agent/context/optimized-task-context.generated.json"],
        warm: ["docs/doctrine/surfaces/user-ui-doctrine.md"],
        cold: ["docs/agent-truth/current-operator-doctrine.md"],
      },
      canonicalHelpersToReuse: ["src/lib/error-language-contract.ts"],
      likelyDuplicateLogicSearches: [
        'rg -n "paypal|purchase|wallet|gumdrop|unlock|entitlement|sourceOfFunds" src tests scripts/agent',
      ],
      fastCommands: ["npm run typecheck", "npm run check:purchase-telemetry-truth"],
      signoffCommands: ["npm run check:legal-payment-copy"],
      forbiddenSurfaces: ["provider API calls", "payment runtime callbacks"],
      releaseNoteImpact: "review_required",
      rollbackNote: "Rollback by reverting the narrow patch; do not alter balances, provider callbacks, entitlements, or source-of-funds records outside the selected slice.",
    });

    expect(markdown).toContain("## Goal");
    expect(markdown).toContain("## Acceptance Criteria");
    expect(markdown).toContain("## Allowed Files");
    expect(markdown).toContain("## Forbidden Files");
    expect(markdown).toContain("## Doctrine / Context Pack");
    expect(markdown).toContain("## Canonical Helpers To Reuse");
    expect(markdown).toContain("## Likely Duplicate Logic Searches");
    expect(markdown).toContain("## Fast Verification");
    expect(markdown).toContain("## Signoff Verification");
    expect(markdown).toContain("## Release Note Impact");
    expect(markdown).toContain("## Rollback Note");
    expect(markdown).toContain("src/lib/gumdrop-ledger.ts");
    expect(markdown).toContain("provider callbacks");
    expect(markdown).not.toContain(".env.local");
  });
});
