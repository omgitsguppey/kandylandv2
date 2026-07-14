import { existsSync } from "node:fs";

import { ROOT, readText, writeJsonFile } from "./shared";

type ScoreCheck = { id: string; pass: boolean; detail: string };
type ScoreReport = {
  generatedAt: string;
  status: "pass" | "warning" | "fail";
  score: number;
  checks: ScoreCheck[];
  criticalBlockers: string[];
  warnings: string[];
  surfacesAffected: string[];
  exactValidatorsToRun: string[];
};

function read(path: string) {
  return existsSync(`${ROOT}/${path}`) ? readText(path) : "";
}

function main() {
  const contract = read("src/lib/user-indexes/user-tracking-index-contract.ts");
  const normalizer = read("src/lib/user-indexes/user-index-normalizer.ts");
  const writer = read("src/lib/server/user-index-writer.ts");
  const reader = read("src/lib/server/user-index-reader.ts");
  const materializer = read("src/lib/server/user-index-materializer.ts");
  const projectionWriter = read("src/lib/server/behavioral-timeline-writer.ts");
  const guestIngest = read("src/app/api/analytics/ingest/route.ts");
  const identifiedIngest = read("src/app/api/analytics/ingest-identified/route.ts");
  const internalRoute = read("src/app/api/internal/analytics/materialize-user-index/route.ts");
  const scheduledConsumer = read("functions/src/user-index-materializer-schedule.ts");
  const materializationRegistry = read("src/lib/analytics/materialization-contract.ts");
  const envExample = read(".env.example");
  const appHosting = read("apphosting.yaml");
  const firestoreIndexes = read("firestore.indexes.json");
  const legacyRegistry = read("src/lib/user-indexes/user-index-legacy-registry.ts");
  const governance = read("src/lib/server/analytics-governance.ts");
  const adminUsersPage = read("src/app/admin/users/page.tsx");
  const adminUserDetailPage = read("src/app/admin/user/[userId]/page.tsx");
  const packageJson = read("package.json");
  const scheduledConsumerDefaultsOff =
    scheduledConsumer.includes("resolveUserIndexMaterializerDispatchMode")
    && scheduledConsumer.includes('normalized === "shadow" || normalized === "active" ? normalized : "off"')
    && scheduledConsumer.includes('if (dispatchMode === "off")');

  const checks: ScoreCheck[] = [
    { id: "contract_exists", pass: contract.includes("type UserTrackingIndex"), detail: "User tracking index contract exists." },
    { id: "guest_contract_exists", pass: contract.includes("type GuestTrackingIndex"), detail: "Guest tracking index contract exists." },
    { id: "identity_lineage_contract_exists", pass: contract.includes("type IdentityLineageIndex"), detail: "Identity lineage index contract exists." },
    { id: "normalizer_exists", pass: normalizer.includes("buildUserTrackingIndex"), detail: "User index normalizer exists." },
    { id: "writer_exists", pass: writer.includes("writeUserTrackingIndex"), detail: "User index writer exists." },
    { id: "reader_exists", pass: reader.includes("readUserTrackingIndex"), detail: "User index reader exists." },
    { id: "materializer_caps", pass: materializer.includes("USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN") && materializer.includes("USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT") && materializer.includes("runtimeCapMs") && materializer.includes("consumeUserIndexMaterializerOutbox"), detail: "Consumer is bounded by the canonical request, fact, and runtime caps." },
    { id: "atomic_projection_owner", pass: projectionWriter.includes("runTransaction") && projectionWriter.includes("buildUserIndexMaterializerRequests") && projectionWriter.includes("coalesceUserIndexMaterializerOutboxRequest"), detail: "Timeline facts and outbox requests share one canonical transaction owner." },
    { id: "guest_ingest_enqueues_projection", pass: guestIngest.includes("writeBehavioralTimelineProjection") && !guestIngest.includes("await materializeUserTrackingIndexes("), detail: "Guest ingest persists the atomic projection without running the materializer in-request." },
    { id: "identified_ingest_enqueues_projection", pass: identifiedIngest.includes("writeBehavioralTimelineProjection") && !identifiedIngest.includes("await materializeUserTrackingIndexes("), detail: "Identified ingest persists the atomic projection without running the materializer in-request." },
    { id: "internal_consumer_route", pass: internalRoute.includes("consumeUserIndexMaterializerOutbox") && internalRoute.includes("CRON_SECRET") && internalRoute.includes("timingSafeEqual") && internalRoute.includes("readBoundedJsonBody"), detail: "The registered internal consumer route is bounded and service-authenticated." },
    { id: "scheduled_consumer_registered", pass: scheduledConsumer.includes("onSchedule") && scheduledConsumer.includes("USER_INDEX_MATERIALIZER_ENDPOINT") && scheduledConsumer.includes("USER_INDEX_MATERIALIZER_ALLOWED_HOSTS") && scheduledConsumer.includes("USER_INDEX_MATERIALIZER_PATH") && scheduledConsumer.includes("maxInstances: 1") && scheduledConsumerDefaultsOff, detail: "The scheduled HTTP consumer is exact-path/host allowlisted, serialized, and off by default." },
    { id: "safe_environment_defaults", pass: /^USER_INDEX_MATERIALIZER_MODE=\s*$/mu.test(envExample) && envExample.includes("USER_INDEX_SOURCE_FINGERPRINT=") && envExample.includes("USER_INDEX_MATERIALIZER_ENDPOINT=") && envExample.includes("USER_INDEX_MATERIALIZER_ALLOWED_HOSTS=") && appHosting.includes("USER_INDEX_MATERIALIZER_MODE") && appHosting.includes('value: "off"'), detail: "Environment examples stay value-free, while App Hosting keeps the materializer off and requires explicit endpoint/host configuration before dispatch." },
    { id: "firestore_query_indexes", pass: firestoreIndexes.includes('"fieldPath": "actorUserId"') && firestoreIndexes.includes('"fieldPath": "anonymousVisitorId"') && firestoreIndexes.includes('"fieldPath": "timestampMs"'), detail: "Bounded subject-window queries have source-owned Firestore index declarations." },
    { id: "materialization_registry_updated", pass: materializationRegistry.includes("user_index_materializer_requests v3 worker") && materializationRegistry.includes("user_tracking_indexes") && materializationRegistry.includes("guest_tracking_indexes"), detail: "The existing materialization registry names the v3 worker and its serving outputs." },
    { id: "ephemeral_retention_metadata", pass: contract.includes("expiresAtMs") && writer.includes("Timestamp.fromMillis") && writer.includes("USER_INDEX_MATERIALIZER_WINDOW_RETENTION_MS"), detail: "Ephemeral requests, shadow publications, and window receipts carry source-owned expiration metadata; deployed TTL enforcement remains external evidence." },
    { id: "governance_collections_updated", pass: governance.includes("user_tracking_indexes") && governance.includes("identity_lineage_indexes") && governance.includes("user_index_materializer_requests") && governance.includes("user_index_materializer_windows"), detail: "Analytics governance contains canonical index and materializer collections." },
    { id: "legacy_paths_blocked", pass: legacyRegistry.includes("status: \"blocked\""), detail: "Legacy tracking registry blocks old paths." },
    { id: "admin_surfaces_source_labels", pass: adminUsersPage.includes("AdminTruthBadge") && adminUserDetailPage.includes("AdminTruthBadge"), detail: "Admin surfaces expose truth/source state." },
    { id: "scripts_wired", pass: packageJson.includes("\"score:user-tracking-indexes\"") && packageJson.includes("\"check:user-tracking-index-cutover\""), detail: "Package scripts wired." },
  ];

  const passCount = checks.filter((check) => check.pass).length;
  const score = Math.round((passCount / checks.length) * 100);
  const criticalBlockers = checks.filter((check) => !check.pass).map((check) => `${check.id}: ${check.detail}`);

  const report: ScoreReport = {
    generatedAt: new Date().toISOString(),
    status: criticalBlockers.length > 0 ? "fail" : score >= 90 ? "pass" : "warning",
    score,
    checks,
    criticalBlockers,
    warnings: [],
    surfacesAffected: [
      "analytics ingest routes",
      "user tracking index materializer",
      "admin/recommendation index read models",
    ],
    exactValidatorsToRun: [
      "npm run score:user-tracking-indexes",
      "npm run check:user-tracking-index-cutover",
      "npm run typecheck",
    ],
  };

  writeJsonFile("agent/state/user-tracking-index-cutover.generated.json", report);
  console.log(`User tracking indexes score: ${report.score}/100 (${report.status})`);
}

main();
