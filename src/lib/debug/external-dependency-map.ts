import type {
  ConfigPresenceStatus,
  ExternalRuntimeVerificationStatus,
  ExternalServiceDependency,
} from "@/lib/debug/dependency-inventory-contract";

type ExternalDefinition = {
  serviceName: string;
  packageDependency: string | null;
  envKeysRequired: string[];
  envKeysOptional?: string[];
  owner: string;
  scoreImpact: number;
  nextAction: string;
};

const EXTERNAL_DEPENDENCY_DEFINITIONS: ExternalDefinition[] = [
  { serviceName: "Firebase Auth", packageDependency: "firebase", envKeysRequired: ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_PROJECT_ID"], owner: "auth/firebase", scoreImpact: 2, nextAction: "Keep Firebase public config declared; runtime auth verification remains separate." },
  { serviceName: "Firestore", packageDependency: "firebase", envKeysRequired: ["NEXT_PUBLIC_FIREBASE_PROJECT_ID"], envKeysOptional: ["FIREBASE_PROJECT_ID"], owner: "server truth/firebase", scoreImpact: 2, nextAction: "Use runtime diagnostics for Firestore connectivity; package presence is inventory only." },
  { serviceName: "Firebase Admin SDK", packageDependency: "firebase-admin", envKeysRequired: ["FIREBASE_PROJECT_ID"], envKeysOptional: ["FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", "GOOGLE_APPLICATION_CREDENTIALS"], owner: "server truth/firebase-admin", scoreImpact: 2, nextAction: "Keep admin credentials secret and classify runtime separately." },
  { serviceName: "Firebase Storage", packageDependency: "firebase", envKeysRequired: ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"], envKeysOptional: ["FIREBASE_STORAGE_BUCKET"], owner: "media/storage", scoreImpact: 2, nextAction: "Keep storage config separate from entitlement and egress runtime checks." },
  { serviceName: "Firebase Functions", packageDependency: "firebase-functions", envKeysRequired: ["FIREBASE_PROJECT_ID"], owner: "functions", scoreImpact: 1, nextAction: "Functions package declares runtime; deployed functions health requires separate evidence." },
  { serviceName: "Firebase Hosting/App Hosting", packageDependency: "firebase-tools", envKeysRequired: ["NEXT_PUBLIC_APP_URL"], envKeysOptional: ["NEXT_PUBLIC_SITE_URL"], owner: "app hosting", scoreImpact: 1, nextAction: "Hosting config exists in firebase.json; deployment status remains external evidence." },
  { serviceName: "Firebase Realtime Database", packageDependency: "firebase", envKeysRequired: ["FIREBASE_DATABASE_URL"], owner: "firebase database", scoreImpact: 1, nextAction: "Database rules/config are inventoried; runtime use must be proven separately." },
  { serviceName: "FCM/push/VAPID", packageDependency: "firebase", envKeysRequired: ["NEXT_PUBLIC_FIREBASE_VAPID_KEY"], envKeysOptional: ["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"], owner: "notifications/push", scoreImpact: 2, nextAction: "Push config missing is actionable only for push surfaces; do not infer notification delivery health." },
  { serviceName: "Google Analytics Data API", packageDependency: "@google-analytics/data", envKeysRequired: ["GA_PROPERTY_ID"], envKeysOptional: ["GOOGLE_ANALYTICS_DATA_API_CLIENT_EMAIL", "GOOGLE_ANALYTICS_DATA_API_PRIVATE_KEY"], owner: "analytics/external evidence", scoreImpact: 1, nextAction: "GA Data API stays explicit refresh evidence and must not run in validators." },
  { serviceName: "GA4 / Measurement ID", packageDependency: null, envKeysRequired: ["NEXT_PUBLIC_GA_MEASUREMENT_ID"], envKeysOptional: ["GA_MEASUREMENT_ID"], owner: "analytics/client evidence", scoreImpact: 1, nextAction: "GA4 config is external evidence only and does not replace first-party telemetry." },
  { serviceName: "BigQuery", packageDependency: "@google-cloud/bigquery", envKeysRequired: ["BIGQUERY_DATASET"], envKeysOptional: ["BIGQUERY_LOCATION", "BQ_ANALYTICS_DATASET_ID"], owner: "analytics/warehouse", scoreImpact: 1, nextAction: "BigQuery export is evidence/export only and requires bounded jobs." },
  { serviceName: "Cloud SQL/Data Connect", packageDependency: null, envKeysRequired: ["DATACONNECT_SERVICE_ID", "DATACONNECT_DATABASE", "DATACONNECT_LOCATION"], envKeysOptional: ["CLOUD_SQL_INSTANCE"], owner: "agent context mirror", scoreImpact: 1, nextAction: "Data Connect remains an agent/retrieval mirror unless explicitly promoted." },
  { serviceName: "Cloud Run/App Hosting", packageDependency: null, envKeysRequired: ["GOOGLE_CLOUD_PROJECT"], envKeysOptional: ["NEXT_PUBLIC_APP_URL"], owner: "cloud hosting", scoreImpact: 1, nextAction: "Cloud hosting runtime is external infrastructure evidence, not package health." },
  { serviceName: "Vertex AI/Gemini", packageDependency: "@google-cloud/vertexai", envKeysRequired: ["VERTEX_AI_LOCATION"], envKeysOptional: ["ADMIN_AI_ENABLED", "ADMIN_AI_MODEL_ALIAS", "ADMIN_AI_DAILY_BUDGET_USD"], owner: "admin ai", scoreImpact: 2, nextAction: "AI provider calls must remain budgeted and disabled in validators." },
  { serviceName: "PayPal", packageDependency: "@paypal/react-paypal-js", envKeysRequired: ["NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE", "PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"], envKeysOptional: ["PAYPAL_WEBHOOK_ID", "PAYPAL_ENV"], owner: "payments/wallet", scoreImpact: 3, nextAction: "PayPal config presence does not prove payment runtime; payment runtime is protected." },
  { serviceName: "PostHog", packageDependency: "posthog-js", envKeysRequired: ["NEXT_PUBLIC_POSTHOG_KEY"], envKeysOptional: ["NEXT_PUBLIC_POSTHOG_HOST", "NEXT_PUBLIC_ENABLE_POSTHOG"], owner: "analytics/vendor", scoreImpact: 1, nextAction: "PostHog remains consent/config gated and external evidence only." },
  { serviceName: "Service Worker/PWA", packageDependency: null, envKeysRequired: [], envKeysOptional: ["NEXT_PUBLIC_APP_URL"], owner: "pwa", scoreImpact: 1, nextAction: "PWA/service worker source checks are separate from package inventory." },
  { serviceName: "Scheduler/Cron", packageDependency: null, envKeysRequired: [], envKeysOptional: ["CRON_SECRET", "TASK_MATERIALIZER_ENDPOINT", "TASK_MATERIALIZER_TOKEN"], owner: "scheduler/queue", scoreImpact: 1, nextAction: "Scheduler runtime requires heartbeat/dispatch evidence, not package presence." },
  { serviceName: "External email/SMS", packageDependency: null, envKeysRequired: [], envKeysOptional: ["RESEND_API_KEY", "SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"], owner: "support/notifications future", scoreImpact: 0, nextAction: "No active email/SMS provider is required unless a future provider is explicitly enabled." },
];

function declaredEnvKeys(envExampleText: string) {
  const keys = new Set<string>();
  for (const match of envExampleText.matchAll(/^([A-Z0-9_]+)=/gmu)) {
    keys.add(match[1]);
  }
  return keys;
}

function configStatus(required: string[], optional: string[], declared: Set<string>): ConfigPresenceStatus {
  if (required.length === 0) return optional.some((key) => declared.has(key)) ? "declared" : "not_required";
  const requiredCount = required.filter((key) => declared.has(key)).length;
  if (requiredCount === required.length) return "declared";
  if (requiredCount > 0 || optional.some((key) => declared.has(key))) return "partially_declared";
  return "not_declared";
}

export function buildExternalDependencyMap(input: {
  envExampleText?: string;
  packageNames?: string[];
  runtimeVerificationStatus?: ExternalRuntimeVerificationStatus;
}) {
  const declared = declaredEnvKeys(input.envExampleText || "");
  const packageNames = new Set(input.packageNames || []);
  const runtimeVerificationStatus = input.runtimeVerificationStatus || "not_verified_here";
  const services: ExternalServiceDependency[] = EXTERNAL_DEPENDENCY_DEFINITIONS.map((definition) => ({
    serviceName: definition.serviceName,
    packageDependency: definition.packageDependency,
    envKeysRequired: definition.envKeysRequired,
    envKeysOptional: definition.envKeysOptional || [],
    configPresenceStatus: configStatus(definition.envKeysRequired, definition.envKeysOptional || [], declared),
    runtimeVerificationStatus,
    runtimeEvidenceSource: "inventory_only_no_provider_call",
    owner: definition.owner,
    scoreImpact: definition.packageDependency && !packageNames.has(definition.packageDependency) ? definition.scoreImpact : 0,
    nextAction: definition.nextAction,
  }));

  return {
    services,
    providerCallsRun: false,
    envValuesExposed: false,
  };
}

export const EXTERNAL_SERVICE_NAMES = EXTERNAL_DEPENDENCY_DEFINITIONS.map((definition) => definition.serviceName);
