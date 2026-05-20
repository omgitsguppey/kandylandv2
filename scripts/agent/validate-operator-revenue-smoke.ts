import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type OperatorRevenueSmokeStatus = "operator_confirmed_revenue_smoke";

export type OperatorRevenueSmokeReport = {
  generatedAtUtc: string;
  reportKey: "operator-revenue-smoke";
  currentHead: string;
  summary: {
    revenueSmokeStatus: OperatorRevenueSmokeStatus;
    amountUsdConfirmed: number;
    product: "GumDrops";
    confirmationSource: "operator_confirmed";
    providerArtifactAttached: false;
    formalProviderSmokePassed: false;
    providerSmokeGateStatus: "missing_formal_evidence";
    betaGateImpact: "product_signal_only";
    canStartBetaExitReview: false;
    nextAction: string;
  };
  plainLanguageNote: string;
  evidenceSeparation: {
    acknowledgedAsRealProductSignal: true;
    formalProviderEvidenceRequiredForGate: true;
    providerScreenshotsDemanded: false;
    productionReadsPerformed: false;
    providerCallsPerformed: false;
    runtimePaymentChanged: false;
  };
  integrationTargets: string[];
  nextExactSteps: string[];
};

type BuildOptions = {
  currentHead: string;
  generatedAtUtc: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const reportRelativePath = "agent/state/operator-revenue-smoke.generated.json";
const reportPath = join(repoRoot, reportRelativePath);
const docsRelativePath = "docs/agent-truth/operator-revenue-smoke.md";
const docsPath = join(repoRoot, docsRelativePath);
const plainLanguageNote = "A real $50 GumDrop payment was operator-confirmed. Formal provider evidence is still separate.";

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function readReport() {
  if (!existsSync(reportPath)) return null;
  return JSON.parse(readFileSync(reportPath, "utf8")) as OperatorRevenueSmokeReport;
}

export function buildOperatorRevenueSmokeReport(options: BuildOptions): OperatorRevenueSmokeReport {
  return {
    generatedAtUtc: options.generatedAtUtc,
    reportKey: "operator-revenue-smoke",
    currentHead: options.currentHead,
    summary: {
      revenueSmokeStatus: "operator_confirmed_revenue_smoke",
      amountUsdConfirmed: 50,
      product: "GumDrops",
      confirmationSource: "operator_confirmed",
      providerArtifactAttached: false,
      formalProviderSmokePassed: false,
      providerSmokeGateStatus: "missing_formal_evidence",
      betaGateImpact: "product_signal_only",
      canStartBetaExitReview: false,
      nextAction: "Optional formal provider/app artifact if operator chooses; not required for acknowledging the sale.",
    },
    plainLanguageNote,
    evidenceSeparation: {
      acknowledgedAsRealProductSignal: true,
      formalProviderEvidenceRequiredForGate: true,
      providerScreenshotsDemanded: false,
      productionReadsPerformed: false,
      providerCallsPerformed: false,
      runtimePaymentChanged: false,
    },
    integrationTargets: [
      "agent/state/current-beta-exit-status.generated.json",
      "agent/state/public-beta-score.generated.json",
      "agent/state/beta-evidence-gap-map.generated.json",
      "agent/state/evidence-capture-status.generated.json",
    ],
    nextExactSteps: [
      "Keep revenue smoke classified as operator_confirmed_revenue_smoke.",
      "Keep provider smoke gate classified as missing_formal_evidence until a formal artifact exists.",
      "Do not mark beta exit ready from operator confirmation alone.",
      "If desired later, attach redacted formal provider/app evidence under agent/evidence/provider-smoke/.",
    ],
  };
}

export function validateOperatorRevenueSmokeReport(
  report: OperatorRevenueSmokeReport | null,
  head: string,
) {
  const failures: string[] = [];
  if (!report) return ["operator-revenue-smoke artifact missing"];
  if (report.reportKey !== "operator-revenue-smoke") failures.push("reportKey must be operator-revenue-smoke.");
  if (report.currentHead !== head) failures.push(`operator-revenue-smoke currentHead must match git HEAD (${head}).`);

  const summary = report.summary;
  if (!summary || typeof summary !== "object") {
    failures.push("summary is required.");
    return failures;
  }
  if (summary.revenueSmokeStatus !== "operator_confirmed_revenue_smoke") {
    failures.push("operator-confirmed payment must be classified as operator_confirmed_revenue_smoke.");
  }
  if (summary.amountUsdConfirmed !== 50) failures.push("amountUsdConfirmed must be 50.");
  if (summary.product !== "GumDrops") failures.push("product must be GumDrops.");
  if (summary.confirmationSource !== "operator_confirmed") failures.push("confirmationSource must be operator_confirmed.");
  if (summary.providerArtifactAttached !== false) {
    failures.push("providerArtifactAttached must remain false until a formal artifact exists.");
  }
  if (summary.formalProviderSmokePassed !== false || summary.providerSmokeGateStatus !== "missing_formal_evidence") {
    failures.push("operator-confirmed revenue smoke must not be treated as formal provider proof.");
  }
  if (summary.betaGateImpact !== "product_signal_only") {
    failures.push("operator confirmation must keep betaGateImpact as product_signal_only.");
  }
  if (summary.canStartBetaExitReview !== false) {
    failures.push("operator-confirmed revenue smoke alone must not mark beta exit ready.");
  }
  if (!summary.nextAction.includes("Optional formal provider/app artifact")) {
    failures.push("nextAction must make formal provider/app artifact optional for acknowledgement.");
  }
  if (report.plainLanguageNote !== plainLanguageNote) {
    failures.push("plainLanguageNote must separate real $50 payment confirmation from formal provider evidence.");
  }
  if (!report.evidenceSeparation?.acknowledgedAsRealProductSignal) {
    failures.push("operator payment must be acknowledged as real product signal.");
  }
  if (!report.evidenceSeparation?.formalProviderEvidenceRequiredForGate) {
    failures.push("formal provider evidence must remain required for the provider gate.");
  }
  if (report.evidenceSeparation?.providerScreenshotsDemanded) {
    failures.push("validator must not demand provider screenshots for acknowledging the operator-confirmed sale.");
  }
  if (
    report.evidenceSeparation?.productionReadsPerformed
    || report.evidenceSeparation?.providerCallsPerformed
    || report.evidenceSeparation?.runtimePaymentChanged
  ) {
    failures.push("operator revenue smoke recording must not perform production reads, provider calls, or payment runtime changes.");
  }
  for (const target of [
    "agent/state/current-beta-exit-status.generated.json",
    "agent/state/public-beta-score.generated.json",
    "agent/state/beta-evidence-gap-map.generated.json",
    "agent/state/evidence-capture-status.generated.json",
  ]) {
    if (!report.integrationTargets.includes(target)) {
      failures.push(`integrationTargets must include ${target}.`);
    }
  }
  if ((report.nextExactSteps?.length ?? 0) === 0) failures.push("nextExactSteps must not be empty.");

  return failures;
}

function renderDocs(report: OperatorRevenueSmokeReport) {
  return `# Operator Revenue Smoke

Generated: ${report.generatedAtUtc}

Latest code version: ${report.currentHead}

## Status

- Revenue smoke status: ${report.summary.revenueSmokeStatus}
- Amount confirmed: $${report.summary.amountUsdConfirmed}
- Product: ${report.summary.product}
- Confirmation source: ${report.summary.confirmationSource}
- Provider artifact attached: ${report.summary.providerArtifactAttached}
- Formal provider smoke passed: ${report.summary.formalProviderSmokePassed}
- Provider smoke gate: ${report.summary.providerSmokeGateStatus}
- Beta gate impact: ${report.summary.betaGateImpact}
- Beta exit review can start from this alone: ${report.summary.canStartBetaExitReview}

${report.plainLanguageNote}

This is real product signal and should improve confidence notes. It is not formal provider-attached proof and does not clear the provider smoke gate.

## Next Action

${report.summary.nextAction}

## Next Exact Steps

${report.nextExactSteps.map((step) => `- ${step}`).join("\n")}
`;
}

function main() {
  const report = buildOperatorRevenueSmokeReport({
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
  });
  mkdirSync(dirname(reportPath), { recursive: true });
  mkdirSync(dirname(docsPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(docsPath, renderDocs(report));

  const failures = validateOperatorRevenueSmokeReport(readReport(), currentHead());
  if (failures.length > 0) {
    console.error("Operator revenue smoke validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `Operator revenue smoke passed. status=${report.summary.revenueSmokeStatus} ` +
      `amount=$${report.summary.amountUsdConfirmed} providerGate=${report.summary.providerSmokeGateStatus}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
