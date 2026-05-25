import type { AiRepairContextPacket, AiRepairMode } from "./ai-repair-workbench-contract";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const ID_PATTERN = /\b[a-zA-Z0-9_-]{20,}\b/gu;
const TOKEN_PATTERN = /\b(token|password|secret|authorization|bearer|api[_-]?key)\b\s*[:=]/iu;

const FORBIDDEN_PATTERNS: Array<[string, RegExp]> = [
  ["raw_support_body", /\b(raw support body|support body|ticket body|message body)\b/iu],
  ["raw_chat_message", /\b(raw chat|chat message|private message)\b/iu],
  ["payment_provider_payload", /\b(paypal|stripe|payment provider).{0,40}\b(payload|webhook|raw)\b/iu],
  ["private_creator_content", /\bprivate creator content|locked content|creator private\b/iu],
  ["secret_or_token", TOKEN_PATTERN],
];

function text(value: unknown) {
  return String(value ?? "").trim();
}

export function estimateAiDebugTokens(input: unknown) {
  const normalized = Array.isArray(input)
    ? input.flat(Number.POSITIVE_INFINITY).join("\n").trim()
    : typeof input === "string" ? input.trim() : JSON.stringify(input ?? "");
  if (!normalized) return 0;
  return Math.max(1, Math.ceil(normalized.length / 6));
}

export function redactAiDebugContext(input: { text: string }) {
  const forbiddenPayloadsDetected = FORBIDDEN_PATTERNS
    .filter(([, pattern]) => pattern.test(input.text))
    .map(([name]) => name);
  const redactedText = input.text
    .replace(EMAIL_PATTERN, "[redacted_email]")
    .replace(ID_PATTERN, "[redacted_id]")
    .replace(/(token|password|secret|authorization|bearer|api[_-]?key)\s*[:=]\s*\S+/giu, "$1=[redacted_secret]");

  return {
    redactedText,
    forbiddenPayloadsDetected,
  };
}

function redactList(values: unknown[]) {
  const redacted: string[] = [];
  const forbidden = new Set<string>();
  for (const value of values) {
    const result = redactAiDebugContext({ text: text(value) });
    redacted.push(result.redactedText);
    for (const flag of result.forbiddenPayloadsDetected) forbidden.add(flag);
  }
  return { redacted, forbiddenPayloadsDetected: [...forbidden] };
}

export function buildAiRepairContextPacket(input: {
  workItemId: string;
  boundedEvidence: string[];
  safeSourceSnippets?: string[];
  artifactRefs?: string[];
  validatorRefs?: string[];
  routeRefs?: string[];
  redactedUserFacts?: string[];
  maxInputTokens: number;
  modelRole: AiRepairContextPacket["modelRole"];
  selectedMode?: AiRepairMode;
  missingContextReasons?: string[];
}): AiRepairContextPacket {
  const evidence = redactList(input.boundedEvidence);
  const snippets = redactList(input.safeSourceSnippets ?? []);
  const userFacts = redactList(input.redactedUserFacts ?? []);
  const forbiddenPayloadsDetected = Array.from(new Set([
    ...evidence.forbiddenPayloadsDetected,
    ...snippets.forbiddenPayloadsDetected,
    ...userFacts.forbiddenPayloadsDetected,
  ]));
  const tokenEstimate = estimateAiDebugTokens([
    evidence.redacted,
    snippets.redacted,
    input.artifactRefs ?? [],
    input.validatorRefs ?? [],
    input.routeRefs ?? [],
    userFacts.redacted,
  ]);
  const costDecision = tokenEstimate > input.maxInputTokens ? "blocked_token_budget" : "within_budget";
  const privacyDecision = forbiddenPayloadsDetected.length > 0
    ? "blocked_for_manual_review"
    : [...input.boundedEvidence, ...(input.redactedUserFacts ?? [])].some((value) => EMAIL_PATTERN.test(value) || ID_PATTERN.test(value))
      ? "redacted"
      : "safe";
  const selectedModeAfterSafety: AiRepairMode = privacyDecision === "blocked_for_manual_review" || costDecision === "blocked_token_budget"
    ? "inspect_only"
    : input.selectedMode ?? "inspect_only";

  return {
    packetId: `packet-${input.workItemId}`,
    workItemId: input.workItemId,
    boundedEvidence: evidence.redacted,
    safeSourceSnippets: snippets.redacted,
    artifactRefs: input.artifactRefs ?? [],
    validatorRefs: input.validatorRefs ?? [],
    routeRefs: input.routeRefs ?? [],
    redactedUserFacts: userFacts.redacted,
    forbiddenPayloadsDetected,
    tokenEstimate,
    maxInputTokens: input.maxInputTokens,
    modelRole: input.modelRole,
    privacyDecision,
    costDecision,
    sourceCompletenessScore: input.missingContextReasons?.length ? 55 : 90,
    missingContextReasons: input.missingContextReasons ?? [],
    providerCallRequired: false,
    selectedModeAfterSafety,
  };
}

export function validateAiContextSafety(packet: AiRepairContextPacket) {
  const safe = packet.privacyDecision !== "blocked_for_manual_review"
    && packet.costDecision === "within_budget"
    && packet.forbiddenPayloadsDetected.length === 0;
  return {
    safe,
    reasons: [
      packet.privacyDecision === "blocked_for_manual_review" ? "forbidden_payload_detected" : "",
      packet.costDecision === "blocked_token_budget" ? "token_budget_exceeded" : "",
      ...packet.missingContextReasons,
    ].filter(Boolean),
  };
}
