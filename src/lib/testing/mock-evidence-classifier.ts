export const MOCK_EVIDENCE_CLASSES = [
  "source_only",
  "runtime_like",
  "provider_like",
  "admin_like",
  "operator_like",
  "fixture_only",
  "unsafe_unknown",
] as const;

export type MockEvidenceClass = (typeof MOCK_EVIDENCE_CLASSES)[number];

export type MockEvidenceClassification = {
  evidenceClass: MockEvidenceClass;
  canClearSourceGate: boolean;
  canClearRuntimeGate: boolean;
  canClearProviderGate: boolean;
  canClearAdminTruthGate: boolean;
  canClaimActualProviderProof: boolean;
  canBeProducedByCodex: boolean;
  proofBoundary: string;
};

const CLASSIFICATIONS: Record<MockEvidenceClass, MockEvidenceClassification> = {
  source_only: {
    evidenceClass: "source_only",
    canClearSourceGate: true,
    canClearRuntimeGate: false,
    canClearProviderGate: false,
    canClearAdminTruthGate: false,
    canClaimActualProviderProof: false,
    canBeProducedByCodex: true,
    proofBoundary: "Source-only evidence can validate contracts but cannot prove deployed runtime, provider, or production admin truth.",
  },
  runtime_like: {
    evidenceClass: "runtime_like",
    canClearSourceGate: true,
    canClearRuntimeGate: false,
    canClearProviderGate: false,
    canClearAdminTruthGate: false,
    canClaimActualProviderProof: false,
    canBeProducedByCodex: true,
    proofBoundary: "Runtime-like mocks simulate route behavior locally and cannot claim deployed runtime proof.",
  },
  provider_like: {
    evidenceClass: "provider_like",
    canClearSourceGate: true,
    canClearRuntimeGate: false,
    canClearProviderGate: false,
    canClearAdminTruthGate: false,
    canClaimActualProviderProof: false,
    canBeProducedByCodex: true,
    proofBoundary: "Provider-like mocks simulate provider payloads but never prove an actual provider response.",
  },
  admin_like: {
    evidenceClass: "admin_like",
    canClearSourceGate: true,
    canClearRuntimeGate: false,
    canClearProviderGate: false,
    canClearAdminTruthGate: false,
    canClaimActualProviderProof: false,
    canBeProducedByCodex: true,
    proofBoundary: "Admin-like mocks can validate redaction and shape, not production admin truth.",
  },
  operator_like: {
    evidenceClass: "operator_like",
    canClearSourceGate: false,
    canClearRuntimeGate: false,
    canClearProviderGate: false,
    canClearAdminTruthGate: false,
    canClaimActualProviderProof: false,
    canBeProducedByCodex: false,
    proofBoundary: "Operator evidence must come from a human/operator process and cannot be produced by Codex.",
  },
  fixture_only: {
    evidenceClass: "fixture_only",
    canClearSourceGate: false,
    canClearRuntimeGate: false,
    canClearProviderGate: false,
    canClearAdminTruthGate: false,
    canClaimActualProviderProof: false,
    canBeProducedByCodex: true,
    proofBoundary: "Fixture-only data is for deterministic unit tests and cannot clear release gates.",
  },
  unsafe_unknown: {
    evidenceClass: "unsafe_unknown",
    canClearSourceGate: false,
    canClearRuntimeGate: false,
    canClearProviderGate: false,
    canClearAdminTruthGate: false,
    canClaimActualProviderProof: false,
    canBeProducedByCodex: false,
    proofBoundary: "Unknown mock evidence is blocked until classified.",
  },
};

export function classifyMockEvidence(evidenceClass: MockEvidenceClass | string): MockEvidenceClassification {
  return CLASSIFICATIONS[(MOCK_EVIDENCE_CLASSES as readonly string[]).includes(evidenceClass) ? evidenceClass as MockEvidenceClass : "unsafe_unknown"];
}

export function validateMockEvidenceClassification(classification: MockEvidenceClassification) {
  const failures: string[] = [];
  if (classification.evidenceClass === "source_only" && (classification.canClearRuntimeGate || classification.canClearProviderGate || classification.canClearAdminTruthGate)) {
    failures.push("source_only mock clears runtime/provider/admin gate.");
  }
  if (classification.evidenceClass === "provider_like" && classification.canClaimActualProviderProof) {
    failures.push("provider_like mock claims actual provider proof.");
  }
  if (classification.evidenceClass === "operator_like" && classification.canBeProducedByCodex) {
    failures.push("operator_like evidence is marked producible by Codex.");
  }
  if (classification.evidenceClass === "unsafe_unknown") failures.push("mock evidence class is unsafe_unknown.");
  return failures;
}
