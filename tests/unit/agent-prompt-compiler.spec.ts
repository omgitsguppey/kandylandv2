import { describe, expect, it } from "vitest";

import { buildIssueSpecMarkdown } from "../../scripts/agent/fast-start";

describe("agent prompt compiler", () => {
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
