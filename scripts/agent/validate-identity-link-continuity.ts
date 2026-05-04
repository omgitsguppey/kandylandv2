import { getPackageScripts, readText } from "./shared";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const scripts = getPackageScripts("package.json");
  assert(scripts["check:identity-link-continuity"], "package.json is missing check:identity-link-continuity");

  const authContext = readText("src/context/AuthContext.tsx");
  const clientSession = readText("src/lib/client-session.ts");
  const telemetry = readText("src/lib/telemetry.ts");
  const contract = readText("src/lib/analytics/analytics-event-contract.ts");
  const ingest = readText("src/app/api/analytics/ingest-identified/route.ts");
  const authModal = readText("src/components/Auth/AuthModal.tsx");

  assert(authContext.includes('emitIdentityLinkContinuity(currentUser.uid, "session_restore")'), "session restore does not emit identity_linked from AuthContext.");
  assert(authContext.includes('emitIdentityLinkContinuity(auth.currentUser.uid, "login")') || authContext.includes('emitIdentityLinkContinuity(credential.user.uid, "login")'), "login continuity is missing in AuthContext.");
  assert(authContext.includes('emitIdentityLinkContinuity(credential.user.uid, "signup")'), "signup continuity is missing in AuthContext.");

  assert(clientSession.includes("buildClientIdentityLinkRecord"), "client-session is missing identity-link record construction.");
  assert(clientSession.includes("anonymousVisitorId"), "identity-link record is missing anonymous visitor continuity.");
  assert(clientSession.includes("sessionId"), "identity-link record is missing session continuity.");
  assert(clientSession.includes("linkedAt"), "identity-link record is missing linkedAt.");

  assert(telemetry.includes('prepareAnalyticsEvent("identity_linked"'), "telemetry.ts does not enqueue identity_linked.");
  assert(telemetry.includes('privacy_exclusion_reason: allowIdentifiedAnalytics ? "" : "privacy_limited"'), "identity link telemetry does not preserve privacy-limited exclusion.");

  assert(contract.includes('IDENTITY_LINKED_EVENT_NAME = "identity_linked"'), "analytics contract is missing identity_linked.");
  assert(ingest.includes('canonicalEventName === "identity_linked"') && ingest.includes('sourceTruth: canonicalEventName === "identity_linked"'), "identified ingest does not preserve canonical identity-link source truth.");
  assert(ingest.includes('metricExclusionReason') && ingest.includes('metricEligible'), "identified ingest does not persist metric eligibility for identity links.");

  assert(!authModal.includes("trackIdentityLinked("), "AuthModal should not emit identity_linked directly; continuity must stay in AuthContext.");

  console.log("Identity-link continuity validated.");
}

main();
