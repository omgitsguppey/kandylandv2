import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFinalCurrentHeadScoreRefreshReport,
  buildFinalOpenPrClosureReport,
  buildFinalOperatorEvidenceNeededReport,
  buildSecurityPrngRedirectClosureReport,
  renderClosureDoc,
} from "../../src/lib/release-readiness/final-beta-exit-closure";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const BUILDERS = {
  "security-prng-redirect-closure": {
    statePath: "agent/state/security-prng-redirect-closure.generated.json",
    docPath: "docs/agent-truth/security-prng-redirect-closure.md",
    title: "Security PRNG Redirect Closure",
    build: () => buildSecurityPrngRedirectClosureReport(ROOT),
  },
  "final-open-pr-closure": {
    statePath: "agent/state/final-open-pr-closure.generated.json",
    docPath: "docs/agent-truth/final-open-pr-closure.md",
    title: "Final Open PR Closure",
    build: () => buildFinalOpenPrClosureReport(ROOT),
  },
  "final-current-head-score-refresh": {
    statePath: "agent/state/final-current-head-score-refresh.generated.json",
    docPath: "docs/agent-truth/final-current-head-score-refresh.md",
    title: "Final Current Head Score Refresh",
    build: () => buildFinalCurrentHeadScoreRefreshReport(ROOT),
  },
  "final-operator-evidence-needed": {
    statePath: "agent/state/final-operator-evidence-needed.generated.json",
    docPath: "docs/agent-truth/final-operator-evidence-needed.md",
    title: "Final Operator Evidence Needed",
    build: () => buildFinalOperatorEvidenceNeededReport(ROOT),
  },
} as const;

export type FinalBetaExitClosureKind = keyof typeof BUILDERS;

export function runFinalBetaExitClosure(kind: FinalBetaExitClosureKind) {
  const config = BUILDERS[kind];
  const report = config.build();

  mkdirSync(join(ROOT, dirname(config.statePath)), { recursive: true });
  mkdirSync(join(ROOT, dirname(config.docPath)), { recursive: true });
  writeFileSync(join(ROOT, config.statePath), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, config.docPath), renderClosureDoc(config.title, report));

  if (report.validationFailures.length > 0) {
    console.error(`${kind} validation failed:`);
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`${kind} passed. currentHead=${report.currentHead}`);
}
