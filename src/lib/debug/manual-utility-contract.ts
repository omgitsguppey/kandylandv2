export type ManualUtilityDefinition = {
  id: string;
  label: string;
  kind: "manual_operator_action";
  adminOnly: boolean;
  audited: boolean;
  sourceOfFundsGuard: boolean;
  affectsHealth: boolean;
  affectsScore: boolean;
  copy: string;
  sourceRefs: string[];
};

export function buildManualUtilityRegistry() {
  const utilities: ManualUtilityDefinition[] = [
    {
      id: "admin-balance-adjust-current-admin",
      label: "Add Gum Drops to current admin user",
      kind: "manual_operator_action",
      adminOnly: true,
      audited: true,
      sourceOfFundsGuard: true,
      affectsHealth: false,
      affectsScore: false,
      copy: "Manual operator utility; not live health, not diagnostics, and not a repair proposal.",
      sourceRefs: ["src/app/api/admin/balance/route.ts", "src/lib/server/gumdrop-ledger.ts"],
    },
  ];

  return {
    generatedAtUtc: new Date().toISOString(),
    utilities,
    summary: {
      total: utilities.length,
      healthImpactingUtilities: utilities.filter((utility) => utility.affectsHealth).length,
      scoreImpactingUtilities: utilities.filter((utility) => utility.affectsScore).length,
      auditedUtilities: utilities.filter((utility) => utility.audited).length,
    },
  };
}

export function validateManualUtilitySeparation(registry: ReturnType<typeof buildManualUtilityRegistry>) {
  const failures: string[] = [];
  for (const utility of registry.utilities) {
    if (utility.affectsHealth) failures.push(`${utility.id} must not affect live health.`);
    if (utility.affectsScore) failures.push(`${utility.id} must not affect score.`);
    if (!utility.adminOnly) failures.push(`${utility.id} must remain admin-only.`);
    if (!utility.audited) failures.push(`${utility.id} must keep an audit trail.`);
    if (!utility.sourceOfFundsGuard) failures.push(`${utility.id} must preserve GumDrop source-of-funds guard.`);
    if (!/not live health/i.test(utility.copy)) failures.push(`${utility.id} copy must say not live health.`);
  }
  return failures;
}
