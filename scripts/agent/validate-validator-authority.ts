import { buildValidatorAuthorityAuditReport, validateValidatorAuthorityAuditReport } from "@/lib/release-readiness/validator-authority-auditor";
import { buildValidatorOwnershipMapReport, validateValidatorOwnershipMapReport } from "@/lib/test-hardening/validator-ownership-map";

const authorityAudit = buildValidatorAuthorityAuditReport(process.cwd());
const authorityValidation = validateValidatorAuthorityAuditReport(authorityAudit);
const ownershipMap = buildValidatorOwnershipMapReport();
const ownershipValidation = validateValidatorOwnershipMapReport(ownershipMap);
const failures = [...authorityValidation, ...ownershipValidation.failures];

if (failures.length > 0) {
  console.error("Validator authority validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  [
    "Validator authority validation passed.",
    `canonicalAuditValidators=${authorityAudit.validators.length}`,
    `ownershipValidators=${ownershipMap.validatorsAudited}`,
    "legacyRegistryConsumer=retired",
  ].join(" "),
);
