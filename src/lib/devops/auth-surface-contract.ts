export type AuthSurfaceStatusCode =
  | "ok"
  | "missing_auth"
  | "tool_missing"
  | "wrong_project"
  | "insufficient_scope"
  | "manual_required"
  | "unknown";

export type AuthSurfaceId =
  | "github_cli"
  | "github_repo_permissions"
  | "gcloud_cli"
  | "firebase_cli"
  | "bigquery_cli"
  | "cloud_sql_data_connect"
  | "app_engine"
  | "cloud_run_app_hosting"
  | "cloud_scheduler_functions"
  | "artifact_registry"
  | "paypal_env"
  | "posthog_ga_env";

export type AuthSurfaceStatus = {
  surface: string;
  tool: string;
  authenticated: boolean;
  status: AuthSurfaceStatusCode;
  principal?: string;
  projectId?: string;
  canRead: boolean;
  canWrite: boolean;
  canMutateProduction: boolean;
  recommendedNextStep: string;
  safeReadCommands: string[];
  blockedCommands: string[];
};

export type CodexAuthReadinessReport = {
  generatedAt: string;
  projectId: string | null;
  overallStatus:
    | "cloud_read_ready"
    | "repo_only_ready"
    | "manual_bootstrap_required"
    | "partial"
    | "unknown";
  surfaces: AuthSurfaceStatus[];
  canCodexRunCloudReadChecks: boolean;
  canCodexSetupWif: boolean;
  manualBootstrapNeeded: boolean;
  missingTools: string[];
  missingAuth: string[];
  insufficientScopes: string[];
  safeNextCommands: string[];
  blockedMutationCommands: string[];
  recommendedAutomationPlan: string[];
};

export const AUTH_READINESS_REPORT_PATH = "agent/state/codex-auth-readiness.generated.json";
export const KANDYDROPS_REPO = "omgitsguppey/kandylandv2";
export const KANDYDROPS_PROJECT_ID = "kandydrops-by-ikandy";
export const KANDYDROPS_REGION = "us-central1";
export const KANDYDROPS_CLOUD_SQL_INSTANCE = "kandydrops-db";

export const REQUIRED_AUTH_SURFACES: Array<{ id: AuthSurfaceId; label: string; tool: string }> = [
  { id: "github_cli", label: "GitHub CLI", tool: "gh" },
  { id: "github_repo_permissions", label: "GitHub repo permissions", tool: "gh" },
  { id: "gcloud_cli", label: "Google Cloud CLI", tool: "gcloud" },
  { id: "firebase_cli", label: "Firebase CLI", tool: "firebase" },
  { id: "bigquery_cli", label: "BigQuery CLI", tool: "bq" },
  { id: "cloud_sql_data_connect", label: "Cloud SQL / Data Connect", tool: "gcloud" },
  { id: "app_engine", label: "App Engine", tool: "gcloud" },
  { id: "cloud_run_app_hosting", label: "Cloud Run / App Hosting", tool: "gcloud/firebase" },
  { id: "cloud_scheduler_functions", label: "Cloud Scheduler / Functions", tool: "gcloud" },
  { id: "artifact_registry", label: "Artifact Registry", tool: "gcloud" },
  { id: "paypal_env", label: "PayPal env/config", tool: "env" },
  { id: "posthog_ga_env", label: "PostHog / GA env/config", tool: "env" },
];

export const BLOCKED_MUTATION_COMMANDS = [
  "firebase deploy",
  "firebase apphosting:backends:delete",
  "gcloud run services update",
  "gcloud run services delete",
  "gcloud functions deploy",
  "gcloud functions delete",
  "gcloud sql instances delete",
  "gcloud sql instances patch",
  "gcloud sql instances restart",
  "gcloud sql instances stop",
  "gcloud app services delete",
  "gcloud app versions delete",
  "gcloud scheduler jobs delete",
  "gcloud scheduler jobs update",
  "gcloud artifacts repositories delete",
  "bq load",
  "bq query",
  "bq rm",
  "gh secret set",
  "gh variable set",
] as const;

export function createAuthSurfaceStatus(input: {
  surface: string;
  tool: string;
  authenticated?: boolean;
  status?: AuthSurfaceStatusCode;
  principal?: string;
  projectId?: string | null;
  canRead?: boolean;
  canWrite?: boolean;
  canMutateProduction?: boolean;
  recommendedNextStep: string;
  safeReadCommands?: string[];
  blockedCommands?: string[];
}): AuthSurfaceStatus {
  return {
    surface: input.surface,
    tool: input.tool,
    authenticated: input.authenticated ?? false,
    status: input.status ?? "unknown",
    principal: input.principal,
    projectId: input.projectId ?? undefined,
    canRead: input.canRead ?? false,
    canWrite: input.canWrite ?? false,
    canMutateProduction: input.canMutateProduction ?? false,
    recommendedNextStep: input.recommendedNextStep,
    safeReadCommands: input.safeReadCommands ?? [],
    blockedCommands: input.blockedCommands ?? [...BLOCKED_MUTATION_COMMANDS],
  };
}

export function deriveReadinessSummary(surfaces: AuthSurfaceStatus[]) {
  const missingTools = surfaces
    .filter((surface) => surface.status === "tool_missing")
    .map((surface) => surface.surface);
  const missingAuth = surfaces
    .filter((surface) => surface.status === "missing_auth")
    .map((surface) => surface.surface);
  const insufficientScopes = surfaces
    .filter((surface) => surface.status === "insufficient_scope" || surface.status === "wrong_project")
    .map((surface) => surface.surface);
  const cloudSurfaces = surfaces.filter((surface) =>
    [
      "Google Cloud CLI",
      "Cloud SQL / Data Connect",
      "App Engine",
      "Cloud Run / App Hosting",
      "Cloud Scheduler / Functions",
      "Artifact Registry",
      "BigQuery CLI",
    ].includes(surface.surface),
  );
  const canCodexRunCloudReadChecks = cloudSurfaces.length > 0 && cloudSurfaces.every((surface) => surface.canRead);
  const repoSurface = surfaces.find((surface) => surface.surface === "GitHub repo permissions");
  const gcloudSurface = surfaces.find((surface) => surface.surface === "Google Cloud CLI");
  const canCodexSetupWif = Boolean(repoSurface?.canWrite && gcloudSurface?.canRead && gcloudSurface.status === "ok");
  const manualBootstrapNeeded = missingTools.length > 0 || missingAuth.length > 0 || insufficientScopes.length > 0 || !canCodexSetupWif;

  let overallStatus: CodexAuthReadinessReport["overallStatus"] = "unknown";
  if (canCodexRunCloudReadChecks) {
    overallStatus = "cloud_read_ready";
  } else if (repoSurface?.canRead) {
    overallStatus = "repo_only_ready";
  } else if (manualBootstrapNeeded) {
    overallStatus = "manual_bootstrap_required";
  } else if (surfaces.some((surface) => surface.canRead)) {
    overallStatus = "partial";
  }

  return {
    missingTools,
    missingAuth,
    insufficientScopes,
    canCodexRunCloudReadChecks,
    canCodexSetupWif,
    manualBootstrapNeeded,
    overallStatus,
  };
}

export function buildWifBootstrapPlan(projectId = KANDYDROPS_PROJECT_ID) {
  return [
    "Workload Identity Federation bootstrap is preferred over service account JSON keys for repeatable cloud read checks.",
    `PROJECT_ID="${projectId}"`,
    'POOL_ID="kandydrops-github-readonly"',
    'PROVIDER_ID="github-oidc"',
    'SERVICE_ACCOUNT_ID="kandydrops-cloud-readiness"',
    'PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")"',
    'gcloud iam service-accounts create "$SERVICE_ACCOUNT_ID" --project "$PROJECT_ID" --display-name "KandyDrops GitHub read-only cloud readiness"',
    'gcloud iam workload-identity-pools create "$POOL_ID" --project "$PROJECT_ID" --location "global" --display-name "KandyDrops GitHub Readiness"',
    'gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" --project "$PROJECT_ID" --location "global" --workload-identity-pool "$POOL_ID" --issuer-uri "https://token.actions.githubusercontent.com" --attribute-mapping "google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.ref=assertion.ref" --attribute-condition "assertion.repository==\'omgitsguppey/kandylandv2\'"',
    'gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT_ID@$PROJECT_ID.iam.gserviceaccount.com" --project "$PROJECT_ID" --role "roles/iam.workloadIdentityUser" --member "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/attribute.repository/omgitsguppey/kandylandv2"',
    'for ROLE in roles/viewer roles/serviceusage.serviceUsageViewer roles/cloudsql.viewer roles/run.viewer roles/cloudfunctions.viewer roles/cloudscheduler.viewer roles/appengine.appViewer roles/bigquery.metadataViewer roles/artifactregistry.reader; do gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$SERVICE_ACCOUNT_ID@$PROJECT_ID.iam.gserviceaccount.com" --role "$ROLE"; done',
    'gh variable set GCP_PROJECT_ID --repo omgitsguppey/kandylandv2 --body "$PROJECT_ID"',
    'gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo omgitsguppey/kandylandv2 --body "projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"',
    'gh variable set GCP_SERVICE_ACCOUNT --repo omgitsguppey/kandylandv2 --body "$SERVICE_ACCOUNT_ID@$PROJECT_ID.iam.gserviceaccount.com"',
  ];
}
