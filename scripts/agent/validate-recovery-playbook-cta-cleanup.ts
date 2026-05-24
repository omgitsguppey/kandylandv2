import {
  buildRecoveryPlaybookCtaCleanupReport,
  validateRecoveryPlaybookCtaCleanupReport,
  writeAndValidateReport,
} from "./business-truth-recovery-shared";

const report = buildRecoveryPlaybookCtaCleanupReport();
const failures = validateRecoveryPlaybookCtaCleanupReport(report);
writeAndValidateReport(
  "agent/state/recovery-playbook-cta-cleanup.generated.json",
  "docs/agent-truth/recovery-playbook-cta-cleanup.md",
  "Recovery Playbook CTA Cleanup",
  report,
  failures,
);
console.log("Recovery playbook CTA cleanup validation passed");
