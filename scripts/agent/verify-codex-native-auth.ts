import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  AUTH_READINESS_REPORT_PATH,
  BLOCKED_MUTATION_COMMANDS,
  KANDYDROPS_CLOUD_SQL_INSTANCE,
  KANDYDROPS_PROJECT_ID,
  KANDYDROPS_REGION,
  KANDYDROPS_REPO,
  buildWifBootstrapPlan,
  createAuthSurfaceStatus,
  deriveReadinessSummary,
  type AuthSurfaceStatus,
  type AuthSurfaceStatusCode,
  type CodexAuthReadinessReport,
} from "../../src/lib/config-hardening/devops/auth-surface-contract";
import { ensureDirectory, nowIso, writeJsonFile, type Json } from "./shared";

type CommandResult = {
  command: string;
  ok: boolean;
  status: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  toolMissing: boolean;
};

const root = process.cwd();

function commandLabel(tool: string, args: string[]) {
  return [tool, ...args].join(" ");
}

function runCommand(tool: string, args: string[], timeoutMs = 15000): CommandResult {
  const result = spawnSync(tool, args, {
    cwd: root,
    encoding: "utf8",
    timeout: timeoutMs,
    windowsHide: true,
  });

  const error = result.error as NodeJS.ErrnoException | undefined;
  return {
    command: commandLabel(tool, args),
    ok: result.status === 0 && !error,
    status: result.status,
    stdout: typeof result.stdout === "string" ? result.stdout : "",
    stderr: typeof result.stderr === "string" ? result.stderr : "",
    timedOut: error?.code === "ETIMEDOUT",
    toolMissing: error?.code === "ENOENT",
  };
}

function parseJson<T>(result: CommandResult): T | null {
  if (!result.ok || result.stdout.trim().length === 0) return null;
  try {
    return JSON.parse(result.stdout) as T;
  } catch {
    return null;
  }
}

function toolExists(tool: string) {
  const probe = runCommand(tool, ["--version"], 10000);
  return !probe.toolMissing;
}

function readOptional(repoPath: string) {
  const fullPath = path.join(root, repoPath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function resolveProjectId() {
  for (const key of ["GCP_PROJECT_ID", "GOOGLE_CLOUD_PROJECT", "FIREBASE_PROJECT_ID"]) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  const firebaserc = readOptional(".firebaserc");
  if (firebaserc) {
    try {
      const parsed = JSON.parse(firebaserc) as { projects?: { default?: string } };
      if (parsed.projects?.default) return parsed.projects.default;
    } catch {
      return KANDYDROPS_PROJECT_ID;
    }
  }

  return KANDYDROPS_PROJECT_ID;
}

function configDeclares(key: string) {
  const sources = [".env.example", "apphosting.yaml", "cloudbuild.yaml", "cloudbuild.release-notes.yaml"];
  return sources.some((repoPath) => readOptional(repoPath).includes(key));
}

function envPresent(keys: string[]) {
  return keys.some((key) => Boolean(process.env[key]?.trim()));
}

function summarizeStatusFromFailure(result: CommandResult): AuthSurfaceStatusCode {
  if (result.toolMissing) return "tool_missing";
  const failure = `${result.stderr}\n${result.stdout}`.toLowerCase();
  if (failure.includes("not logged in") || failure.includes("login") || failure.includes("credential")) {
    return "missing_auth";
  }
  if (failure.includes("permission") || failure.includes("denied") || failure.includes("forbidden")) {
    return "insufficient_scope";
  }
  return "unknown";
}

function githubCliSurface(): AuthSurfaceStatus {
  const safeReadCommands = ["gh auth status"];
  if (!toolExists("gh")) {
    return createAuthSurfaceStatus({
      surface: "GitHub CLI",
      tool: "gh",
      status: "tool_missing",
      recommendedNextStep: "Install GitHub CLI and authenticate with repo read access.",
      safeReadCommands,
    });
  }

  const auth = runCommand("gh", ["auth", "status"], 15000);
  const principal = auth.stdout.match(/Logged in to github\.com account ([^\s]+)/)?.[1]
    ?? auth.stderr.match(/Logged in to github\.com account ([^\s]+)/)?.[1];
  return createAuthSurfaceStatus({
    surface: "GitHub CLI",
    tool: "gh",
    authenticated: auth.ok,
    status: auth.ok ? "ok" : summarizeStatusFromFailure(auth),
    principal,
    canRead: auth.ok,
    canWrite: false,
    recommendedNextStep: auth.ok
      ? "GitHub CLI is authenticated for read checks."
      : "Run gh auth login with repo read access, then rerun npm run check:codex-auth.",
    safeReadCommands,
  });
}

function githubRepoSurface(githubCli: AuthSurfaceStatus): AuthSurfaceStatus {
  const safeReadCommands = [
    `gh repo view ${KANDYDROPS_REPO} --json nameWithOwner,viewerPermission`,
    `gh secret list --repo ${KANDYDROPS_REPO}`,
    `gh variable list --repo ${KANDYDROPS_REPO}`,
    `gh workflow list --repo ${KANDYDROPS_REPO}`,
  ];
  if (githubCli.status === "tool_missing" || githubCli.status === "missing_auth") {
    return createAuthSurfaceStatus({
      surface: "GitHub repo permissions",
      tool: "gh",
      status: githubCli.status,
      recommendedNextStep: githubCli.recommendedNextStep,
      safeReadCommands,
    });
  }

  const repoView = runCommand("gh", ["repo", "view", KANDYDROPS_REPO, "--json", "nameWithOwner,viewerPermission"], 15000);
  const repo = parseJson<{ nameWithOwner?: string; viewerPermission?: string }>(repoView);
  const secrets = runCommand("gh", ["secret", "list", "--repo", KANDYDROPS_REPO], 15000);
  const variables = runCommand("gh", ["variable", "list", "--repo", KANDYDROPS_REPO], 15000);
  const workflows = runCommand("gh", ["workflow", "list", "--repo", KANDYDROPS_REPO], 15000);
  const permission = repo?.viewerPermission ?? "";
  const canWrite = ["WRITE", "MAINTAIN", "ADMIN"].includes(permission);
  const canReadMetadata = repoView.ok && workflows.ok;
  const canReadSettingsMetadata = secrets.ok && variables.ok;
  const status: AuthSurfaceStatusCode = canReadMetadata
    ? canReadSettingsMetadata
      ? "ok"
      : "insufficient_scope"
    : summarizeStatusFromFailure(repoView);

  return createAuthSurfaceStatus({
    surface: "GitHub repo permissions",
    tool: "gh",
    authenticated: githubCli.authenticated,
    status,
    principal: githubCli.principal,
    canRead: canReadMetadata,
    canWrite,
    recommendedNextStep: status === "ok"
      ? `Repo metadata is readable with ${permission || "unknown"} permission. Secret values remain unreadable by design.`
      : "Grant repo metadata, workflow, secret-name, and variable-name read access or perform GitHub settings checks manually.",
    safeReadCommands,
    blockedCommands: ["gh secret set", "gh variable set", "gh repo edit", ...BLOCKED_MUTATION_COMMANDS],
  });
}

function gcloudSurface(projectId: string): AuthSurfaceStatus {
  const safeReadCommands = [
    "gcloud auth list --format=json",
    "gcloud config get-value project",
    `gcloud projects describe ${projectId} --format=json`,
    `gcloud services list --enabled --project ${projectId} --format=json`,
  ];
  if (!toolExists("gcloud")) {
    return createAuthSurfaceStatus({
      surface: "Google Cloud CLI",
      tool: "gcloud",
      status: "tool_missing",
      projectId,
      recommendedNextStep: "Install Google Cloud CLI, authenticate read-only access, and set the project to kandydrops-by-ikandy.",
      safeReadCommands,
    });
  }

  const authList = runCommand("gcloud", ["auth", "list", "--filter=status:ACTIVE", "--format=json"], 15000);
  const accounts = parseJson<Array<{ account?: string; status?: string }>>(authList) ?? [];
  const principal = accounts.find((account) => account.status === "ACTIVE")?.account ?? accounts[0]?.account;
  if (!authList.ok || !principal) {
    return createAuthSurfaceStatus({
      surface: "Google Cloud CLI",
      tool: "gcloud",
      status: authList.toolMissing ? "tool_missing" : "missing_auth",
      projectId,
      recommendedNextStep: "Run gcloud auth login and gcloud config set project kandydrops-by-ikandy, then rerun npm run check:codex-auth.",
      safeReadCommands,
    });
  }

  const activeProject = runCommand("gcloud", ["config", "get-value", "project"], 10000).stdout.trim();
  if (activeProject !== projectId) {
    return createAuthSurfaceStatus({
      surface: "Google Cloud CLI",
      tool: "gcloud",
      authenticated: true,
      status: "wrong_project",
      principal,
      projectId: activeProject || null,
      canRead: false,
      recommendedNextStep: `Set the active project to ${projectId} before service-specific cloud checks.`,
      safeReadCommands,
    });
  }

  const describe = runCommand("gcloud", ["projects", "describe", projectId, "--format=json"], 20000);
  const services = describe.ok
    ? runCommand("gcloud", ["services", "list", "--enabled", "--project", projectId, "--format=json"], 30000)
    : describe;
  const status: AuthSurfaceStatusCode = describe.ok && services.ok ? "ok" : summarizeStatusFromFailure(describe.ok ? services : describe);
  return createAuthSurfaceStatus({
    surface: "Google Cloud CLI",
    tool: "gcloud",
    authenticated: true,
    status,
    principal,
    projectId,
    canRead: status === "ok",
    recommendedNextStep: status === "ok"
      ? "gcloud can run read-only project and enabled-service checks."
      : "Grant read-only project/serviceusage access or perform Google Cloud Console checks manually.",
    safeReadCommands,
  });
}

function firebaseSurface(projectId: string): AuthSurfaceStatus {
  const safeReadCommands = [
    "firebase login:list --json",
    "firebase projects:list --json",
    `firebase apps:list --project ${projectId} --json`,
    `firebase apphosting:backends:list --project ${projectId} --json`,
  ];
  if (!toolExists("firebase")) {
    return createAuthSurfaceStatus({
      surface: "Firebase CLI",
      tool: "firebase",
      status: "tool_missing",
      projectId,
      recommendedNextStep: "Install or expose firebase-tools, then authenticate with firebase login.",
      safeReadCommands,
    });
  }

  const login = runCommand("firebase", ["login:list", "--json"], 20000);
  if (!login.ok) {
    return createAuthSurfaceStatus({
      surface: "Firebase CLI",
      tool: "firebase",
      status: summarizeStatusFromFailure(login),
      projectId,
      recommendedNextStep: "Run firebase login and confirm access to kandydrops-by-ikandy.",
      safeReadCommands,
    });
  }

  const projects = runCommand("firebase", ["projects:list", "--json"], 30000);
  const apps = projects.ok ? runCommand("firebase", ["apps:list", "--project", projectId, "--json"], 30000) : projects;
  const status: AuthSurfaceStatusCode = projects.ok && apps.ok ? "ok" : summarizeStatusFromFailure(projects.ok ? apps : projects);
  return createAuthSurfaceStatus({
    surface: "Firebase CLI",
    tool: "firebase",
    authenticated: true,
    status,
    projectId,
    canRead: status === "ok",
    recommendedNextStep: status === "ok"
      ? "Firebase CLI can read project/app metadata."
      : "Grant Firebase project viewer access or perform Firebase Console checks manually.",
    safeReadCommands,
    blockedCommands: ["firebase deploy", "firebase apphosting:backends:delete", ...BLOCKED_MUTATION_COMMANDS],
  });
}

function bqSurface(projectId: string, gcloud: AuthSurfaceStatus): AuthSurfaceStatus {
  const safeReadCommands = [`bq ls --project_id ${projectId} --format=json`];
  if (!toolExists("bq")) {
    return createAuthSurfaceStatus({
      surface: "BigQuery CLI",
      tool: "bq",
      status: "tool_missing",
      projectId,
      recommendedNextStep: "Install the bq CLI component or use Console for BigQuery dataset metadata checks.",
      safeReadCommands,
      blockedCommands: ["bq load", "bq query", "bq rm", ...BLOCKED_MUTATION_COMMANDS],
    });
  }
  if (gcloud.status !== "ok") {
    return createAuthSurfaceStatus({
      surface: "BigQuery CLI",
      tool: "bq",
      status: "manual_required",
      projectId,
      recommendedNextStep: "Fix gcloud authentication/project selection before running bq metadata checks.",
      safeReadCommands,
      blockedCommands: ["bq load", "bq query", "bq rm", ...BLOCKED_MUTATION_COMMANDS],
    });
  }
  const datasets = runCommand("bq", ["ls", "--project_id", projectId, "--format=json"], 30000);
  const status = datasets.ok ? "ok" : summarizeStatusFromFailure(datasets);
  return createAuthSurfaceStatus({
    surface: "BigQuery CLI",
    tool: "bq",
    authenticated: true,
    status,
    projectId,
    canRead: status === "ok",
    recommendedNextStep: status === "ok"
      ? "BigQuery metadata is readable. Do not run query/load jobs without explicit approval."
      : "Grant BigQuery metadata viewer access or perform BigQuery Console checks manually.",
    safeReadCommands,
    blockedCommands: ["bq load", "bq query", "bq rm", ...BLOCKED_MUTATION_COMMANDS],
  });
}

function gcloudReadOnlySurface(input: {
  surface: string;
  projectId: string;
  gcloud: AuthSurfaceStatus;
  safeReadCommands: string[];
  commandGroups: string[][];
  recommendedOk: string;
  recommendedBlocked: string;
}): AuthSurfaceStatus {
  if (input.gcloud.status !== "ok") {
    return createAuthSurfaceStatus({
      surface: input.surface,
      tool: "gcloud",
      status: "manual_required",
      projectId: input.projectId,
      recommendedNextStep: input.recommendedBlocked,
      safeReadCommands: input.safeReadCommands,
    });
  }

  const results = input.commandGroups.map(([tool, ...args]) => runCommand(tool, args, 30000));
  const failed = results.find((result) => !result.ok);
  const status = failed ? summarizeStatusFromFailure(failed) : "ok";
  return createAuthSurfaceStatus({
    surface: input.surface,
    tool: "gcloud",
    authenticated: true,
    status,
    principal: input.gcloud.principal,
    projectId: input.projectId,
    canRead: status === "ok",
    recommendedNextStep: status === "ok" ? input.recommendedOk : input.recommendedBlocked,
    safeReadCommands: input.safeReadCommands,
  });
}

function cloudSurfaces(projectId: string, gcloud: AuthSurfaceStatus) {
  const sql = gcloudReadOnlySurface({
    surface: "Cloud SQL / Data Connect",
    projectId,
    gcloud,
    safeReadCommands: [
      `gcloud sql instances describe ${KANDYDROPS_CLOUD_SQL_INSTANCE} --project ${projectId} --format=json`,
      `gcloud sql operations list --instance ${KANDYDROPS_CLOUD_SQL_INSTANCE} --limit=5 --project ${projectId} --format=json`,
      `gcloud services list --enabled --filter=sqladmin.googleapis.com --project ${projectId} --format=json`,
    ],
    commandGroups: [
      ["gcloud", "sql", "instances", "describe", KANDYDROPS_CLOUD_SQL_INSTANCE, "--project", projectId, "--format=json"],
      ["gcloud", "sql", "operations", "list", "--instance", KANDYDROPS_CLOUD_SQL_INSTANCE, "--limit=5", "--project", projectId, "--format=json"],
      ["gcloud", "services", "list", "--enabled", "--filter=sqladmin.googleapis.com", "--project", projectId, "--format=json"],
    ],
    recommendedOk: "Cloud SQL/Data Connect metadata is readable. Do not stop/delete/patch the instance from Codex.",
    recommendedBlocked: "Use GCP Console or grant Cloud SQL viewer access before auditing Cloud SQL/Data Connect state.",
  });

  const appEngine = gcloudReadOnlySurface({
    surface: "App Engine",
    projectId,
    gcloud,
    safeReadCommands: [
      `gcloud app describe --project ${projectId} --format=json`,
      `gcloud app services list --project ${projectId} --format=json`,
      `gcloud app versions list --project ${projectId} --format=json`,
    ],
    commandGroups: [
      ["gcloud", "app", "describe", "--project", projectId, "--format=json"],
      ["gcloud", "app", "services", "list", "--project", projectId, "--format=json"],
      ["gcloud", "app", "versions", "list", "--project", projectId, "--format=json"],
    ],
    recommendedOk: "App Engine metadata is readable. Deletes/version traffic changes remain blocked.",
    recommendedBlocked: "Use App Engine Console or grant App Engine viewer access before App Engine billing checks.",
  });

  const runCommands = [
    ["gcloud", "run", "services", "list", "--region", KANDYDROPS_REGION, "--project", projectId, "--format=json"],
    ["firebase", "apphosting:backends:list", "--project", projectId, "--json"],
  ];
  const cloudRun = gcloud.status === "ok"
    ? (() => {
      const runList = runCommand("gcloud", ["run", "services", "list", "--region", KANDYDROPS_REGION, "--project", projectId, "--format=json"], 30000);
      const firebaseBackends = toolExists("firebase")
        ? runCommand("firebase", ["apphosting:backends:list", "--project", projectId, "--json"], 30000)
        : null;
      const status: AuthSurfaceStatusCode = runList.ok || firebaseBackends?.ok
        ? "ok"
        : summarizeStatusFromFailure(firebaseBackends ?? runList);
      return createAuthSurfaceStatus({
        surface: "Cloud Run / App Hosting",
        tool: "gcloud/firebase",
        authenticated: true,
        status,
        principal: gcloud.principal,
        projectId,
        canRead: status === "ok",
        recommendedNextStep: status === "ok"
          ? "Cloud Run/App Hosting metadata is readable."
          : "Grant Cloud Run/App Hosting viewer access or perform App Hosting Console checks manually.",
        safeReadCommands: runCommands.map(([tool, ...args]) => commandLabel(tool, args)),
      });
    })()
    : createAuthSurfaceStatus({
      surface: "Cloud Run / App Hosting",
      tool: "gcloud/firebase",
      status: "manual_required",
      projectId,
      recommendedNextStep: "Fix gcloud/Firebase auth before reading App Hosting metadata.",
      safeReadCommands: runCommands.map(([tool, ...args]) => commandLabel(tool, args)),
    });

  const schedulerFunctions = gcloudReadOnlySurface({
    surface: "Cloud Scheduler / Functions",
    projectId,
    gcloud,
    safeReadCommands: [
      `gcloud scheduler jobs list --location ${KANDYDROPS_REGION} --project ${projectId} --format=json`,
      `gcloud functions list --project ${projectId} --format=json`,
    ],
    commandGroups: [
      ["gcloud", "scheduler", "jobs", "list", "--location", KANDYDROPS_REGION, "--project", projectId, "--format=json"],
      ["gcloud", "functions", "list", "--project", projectId, "--format=json"],
    ],
    recommendedOk: "Cloud Scheduler and Functions metadata are readable.",
    recommendedBlocked: "Grant Scheduler/Functions viewer access or inspect those surfaces in Console.",
  });

  const artifactRepoList = gcloud.status === "ok"
    ? runCommand("gcloud", ["artifacts", "repositories", "list", "--project", projectId, "--format=json"], 30000)
    : null;
  const repos = artifactRepoList ? parseJson<Array<{ name?: string; format?: string; location?: string }>>(artifactRepoList) ?? [] : [];
  const dockerRepo = repos.find((repo) => repo.format === "DOCKER" && repo.name);
  const dockerRepoName = dockerRepo?.name?.split("/").pop();
  const dockerLocation = dockerRepo?.location ?? KANDYDROPS_REGION;
  const imageCommand = dockerRepoName
    ? `gcloud artifacts docker images list ${dockerLocation}-docker.pkg.dev/${projectId}/${dockerRepoName} --include-tags --limit=5 --format=json`
    : "gcloud artifacts docker images list LOCATION-docker.pkg.dev/PROJECT_ID/REPO --include-tags --format=json";
  const imageResult = dockerRepoName
    ? runCommand("gcloud", ["artifacts", "docker", "images", "list", `${dockerLocation}-docker.pkg.dev/${projectId}/${dockerRepoName}`, "--include-tags", "--limit=5", "--format=json"], 30000)
    : null;
  const artifactStatus: AuthSurfaceStatusCode = gcloud.status !== "ok"
    ? "manual_required"
    : artifactRepoList?.ok && (!imageResult || imageResult.ok)
      ? "ok"
      : summarizeStatusFromFailure(imageResult ?? artifactRepoList ?? { toolMissing: false, stdout: "", stderr: "", ok: false, status: 1, timedOut: false, command: "" });
  const artifact = createAuthSurfaceStatus({
    surface: "Artifact Registry",
    tool: "gcloud",
    authenticated: gcloud.status === "ok",
    status: artifactStatus,
    principal: gcloud.principal,
    projectId,
    canRead: artifactStatus === "ok",
    recommendedNextStep: artifactStatus === "ok"
      ? "Artifact Registry metadata is readable. Cleanup/delete remains blocked."
      : "Grant Artifact Registry reader access or inspect image retention manually.",
    safeReadCommands: [
      `gcloud artifacts repositories list --project ${projectId} --format=json`,
      imageCommand,
    ],
  });

  return [sql, appEngine, cloudRun, schedulerFunctions, artifact];
}

function envSurface(input: {
  surface: string;
  keys: string[];
  documentedKeys: string[];
  recommendedOk: string;
  recommendedMissing: string;
}) {
  const documented = input.documentedKeys.filter(configDeclares);
  const present = input.keys.filter((key) => Boolean(process.env[key]?.trim()));
  const canRead = documented.length > 0 || present.length > 0;
  return createAuthSurfaceStatus({
    surface: input.surface,
    tool: "env/config",
    authenticated: canRead,
    status: canRead ? "ok" : "manual_required",
    canRead,
    canWrite: false,
    recommendedNextStep: canRead
      ? `${input.recommendedOk} Values were not printed; only key presence/documentation was checked.`
      : input.recommendedMissing,
    safeReadCommands: [`Check documented env keys: ${input.documentedKeys.join(", ")}`],
    blockedCommands: ["Do not call live external APIs without explicit credentials/mode confirmation.", ...BLOCKED_MUTATION_COMMANDS],
  });
}

const projectId = resolveProjectId();
const githubCli = githubCliSurface();
const githubRepo = githubRepoSurface(githubCli);
const gcloud = gcloudSurface(projectId);
const firebase = firebaseSurface(projectId);
const bq = bqSurface(projectId, gcloud);
const cloud = cloudSurfaces(projectId, gcloud);
const paypal = envSurface({
  surface: "PayPal env/config",
  keys: ["NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE", "PAYPAL_CLIENT_ID", "PAYPAL_SECRET", "PAYPAL_CLIENT_SECRET"],
  documentedKeys: ["NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE", "PAYPAL_CLIENT_ID", "PAYPAL_SECRET", "PAYPAL_CLIENT_SECRET"],
  recommendedOk: "PayPal config keys are declared or present.",
  recommendedMissing: "Document or provide PayPal client/secret env names before any PayPal API automation.",
});
const analyticsEnv = envSurface({
  surface: "PostHog / GA env/config",
  keys: ["NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST", "GA_PROPERTY_ID", "NEXT_PUBLIC_GA_MEASUREMENT_ID"],
  documentedKeys: ["NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST", "GA_PROPERTY_ID", "NEXT_PUBLIC_GA_MEASUREMENT_ID"],
  recommendedOk: "PostHog/GA config keys are declared or present.",
  recommendedMissing: "Document or provide PostHog/GA env names before external analytics API automation.",
});

const surfaces = [githubCli, githubRepo, gcloud, firebase, bq, ...cloud, paypal, analyticsEnv];
const summary = deriveReadinessSummary(surfaces);
const safeNextCommands = surfaces
  .flatMap((surface) => surface.safeReadCommands)
  .filter((command, index, commands) => commands.indexOf(command) === index)
  .sort();
const report: CodexAuthReadinessReport = {
  generatedAt: nowIso(),
  projectId,
  overallStatus: summary.overallStatus,
  surfaces,
  canCodexRunCloudReadChecks: summary.canCodexRunCloudReadChecks,
  canCodexSetupWif: summary.canCodexSetupWif,
  manualBootstrapNeeded: summary.manualBootstrapNeeded,
  missingTools: summary.missingTools,
  missingAuth: summary.missingAuth,
  insufficientScopes: summary.insufficientScopes,
  safeNextCommands,
  blockedMutationCommands: [...BLOCKED_MUTATION_COMMANDS],
  recommendedAutomationPlan: buildWifBootstrapPlan(projectId),
};

ensureDirectory(path.dirname(path.join(root, AUTH_READINESS_REPORT_PATH)));
writeJsonFile(AUTH_READINESS_REPORT_PATH, report as unknown as Json);

console.log(`Codex auth readiness written to ${AUTH_READINESS_REPORT_PATH}`);
console.log(`Overall status: ${report.overallStatus}`);
if (report.missingTools.length > 0) console.log(`Missing tools: ${report.missingTools.join(", ")}`);
if (report.missingAuth.length > 0) console.log(`Missing auth: ${report.missingAuth.join(", ")}`);
if (report.insufficientScopes.length > 0) console.log(`Insufficient/wrong project: ${report.insufficientScopes.join(", ")}`);
if (envPresent(["GITHUB_TOKEN", "GOOGLE_APPLICATION_CREDENTIALS"])) {
  console.log("Credential-like environment variables were detected but values were not printed.");
}
