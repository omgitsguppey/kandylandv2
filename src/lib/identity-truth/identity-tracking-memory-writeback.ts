export const IDENTITY_TRACKING_MEMORY_LINES = [
  "When individual user analytics are wrong, inspect the full identity chain: guest id creation, session id, event envelope actor, auth state, identity link, signed-in user id, linked person id, person metric hydration, journey attribution, debug lane, and panel display. Do not fix only global metrics.",
  "Global metrics proving activity does not prove user-level metrics. Every event must declare whether it counts globally, for guest, for signed-in user, for linked person, for creator role, or not at all.",
  "Guest-to-user handoff must preserve journey continuity without double-counting. Linked guest and signed-in events representing the same action should count once globally and once for the linked person.",
  "Missing individual user data is not zero. Show collecting, source_missing, bridge_missing, materializer_missing, or permission_blocked unless a bounded source window proves zero.",
  "Identity/session 4xx errors are not generic failures. Expired session, missing guest id, stale user id, role drift, identity link conflict, and malformed handoff payload must be classified, non-retryable where appropriate, and debug-visible.",
] as const;

export function validateIdentityTrackingMemoryWriteback(input: string = IDENTITY_TRACKING_MEMORY_LINES.join("\n")) {
  const failures: string[] = [];
  const required = [
    "Global metrics proving activity does not prove user-level metrics",
    "Guest-to-user handoff must preserve journey continuity",
    "Missing individual user data is not zero",
    "Identity/session 4xx errors are not generic failures",
    "creator role",
  ];
  for (const phrase of required) {
    if (!input.includes(phrase)) failures.push(`memory missing: ${phrase}`);
  }
  return failures;
}
