import { existsSync, readFileSync } from "node:fs";

const EXPECTED_ORIGIN = "https://kandydrops.com";
const EXPECTED_WWW_ALIAS = "https://www.kandydrops.com";
const EXPECTED_HOSTED_ALIAS = "https://kandydrops--kandydrops-by-ikandy.us-central1.hosted.app";
const EXPECTED_FIREBASE_PROJECT_ID = "kandydrops-by-ikandy";
const EXPECTED_FIREBASE_AUTH_DOMAIN = "kandydrops-by-ikandy.firebaseapp.com";
const EXPECTED_GA_PROPERTY_ID = "524442937";
const EXPECTED_GA_MEASUREMENT_ID = "G-V8PWC2L31H";
const EXPECTED_BQ_DATASET = "kandydrops_canonical_analytics";
const EXPECTED_BQ_TABLE = "raw_events";
const REDACTED_BACKEND_VALUE = "<redacted-tracked-snapshot-value>";

const failures: string[] = [];

function readText(path: string) {
  if (!existsSync(path)) {
    failures.push(`Missing required file: ${path}`);
    return "";
  }

  const buffer = readFileSync(path);
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString("utf16le");
  }

  if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    failures.push(`${path} uses unsupported UTF-16BE encoding`);
    return "";
  }

  return buffer.toString("utf8").replace(/^\uFEFF/u, "");
}

function requireContains(path: string, text: string, needle: string, message: string) {
  if (!text.includes(needle)) {
    failures.push(`${path}: ${message}`);
  }
}

function hasYamlEnvValue(text: string, variable: string, expectedValue: string) {
  const lines = text.split(/\r?\n/u);
  const variableLine = lines.findIndex((line) => line.trim() === `- variable: ${variable}`);
  if (variableLine === -1) return false;
  for (let index = variableLine + 1; index < Math.min(lines.length, variableLine + 5); index += 1) {
    const trimmed = lines[index]?.trim() ?? "";
    if (trimmed.startsWith("- variable: ")) return false;
    if (trimmed === `value: ${expectedValue}` || trimmed === `value: "${expectedValue}"`) return true;
  }
  return false;
}

function hasYamlEnvSecret(text: string, variable: string) {
  const lines = text.split(/\r?\n/u);
  const variableLine = lines.findIndex((line) => line.trim() === `- variable: ${variable}`);
  if (variableLine === -1) return false;
  for (let index = variableLine + 1; index < Math.min(lines.length, variableLine + 5); index += 1) {
    const trimmed = lines[index]?.trim() ?? "";
    if (trimmed.startsWith("- variable: ")) return false;
    if (trimmed === `secret: ${variable}`) return true;
  }
  return false;
}

function parseJson(path: string) {
  const text = readText(path);
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    failures.push(`${path}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

const apphosting = readText("apphosting.yaml");
const firebaseJson = readText("firebase.json");
const firebaseRc = readText(".firebaserc");
const siteOrigin = readText("src/lib/site-origin.ts");
const firebaseRuntime = readText("src/lib/firebase-runtime.ts");
const paypalServer = readText("src/lib/server/paypal.ts");
const paypalProvider = readText("src/components/PayPalProvider.tsx");
const firebaseMessaging = readText("src/lib/firebase-messaging.ts");
const serviceWorker = readText("public/firebase-messaging-sw.js");
const functionsPackageJson = parseJson("functions/package.json") as {
  main?: unknown;
  engines?: { node?: unknown };
} | null;
const packageJson = parseJson("package.json") as {
  scripts?: Record<string, string>;
} | null;
const manifest = parseJson("public/manifest.json") as {
  scope?: unknown;
  icons?: Array<{ src?: unknown }>;
} | null;
const backends = parseJson("backends.json") as {
  result?: Array<{ overrideEnv?: Array<{ variable?: string; value?: string; secret?: string }> }>;
} | null;

[
  ["NEXT_PUBLIC_SITE_ORIGIN", EXPECTED_ORIGIN],
  ["SITE_ORIGIN", EXPECTED_ORIGIN],
  ["NEXT_PUBLIC_PAYPAL_ENV", "production"],
  ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", EXPECTED_FIREBASE_AUTH_DOMAIN],
  ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", EXPECTED_FIREBASE_PROJECT_ID],
  ["GA_PROPERTY_ID", EXPECTED_GA_PROPERTY_ID],
  ["GA_MEASUREMENT_ID", EXPECTED_GA_MEASUREMENT_ID],
].forEach(([variable, value]) => {
  if (!hasYamlEnvValue(apphosting, variable, value)) {
    failures.push(`apphosting.yaml: ${variable} must be explicitly set to the production value`);
  }
});

[
  "NEXT_PUBLIC_FIREBASE_VAPID_KEY",
  "NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE",
  "PAYPAL_CLIENT_SECRET_LIVE",
  "GA_API_SECRET",
  "NAVIGATION_COOKIE_SECRET",
].forEach((variable) => {
  if (!hasYamlEnvSecret(apphosting, variable)) {
    failures.push(`apphosting.yaml: ${variable} must be declared in env using secret: ${variable}`);
  }
});

if (/^secrets:\s*$/mu.test(apphosting)) {
  failures.push("apphosting.yaml: top-level secrets block is not allowed for runtime variables; use env secret references");
}

requireContains("apphosting.yaml", apphosting, EXPECTED_WWW_ALIAS, "www origin must remain an alias");
requireContains("apphosting.yaml", apphosting, EXPECTED_HOSTED_ALIAS, "hosted.app backend origin must be documented as an alias");
requireContains("src/lib/site-origin.ts", siteOrigin, `const PRIMARY_SITE_ORIGIN = "${EXPECTED_ORIGIN}"`, "canonical fallback origin must be apex domain");
requireContains("src/lib/site-origin.ts", siteOrigin, EXPECTED_WWW_ALIAS, "www alias must be in configured site origins");
requireContains("src/lib/site-origin.ts", siteOrigin, EXPECTED_HOSTED_ALIAS, "hosted.app alias must be in configured site origins");
requireContains("src/lib/server/paypal.ts", paypalServer, "https://api-m.paypal.com", "server PayPal API must target live PayPal host");
if (paypalServer.includes("api-m.sandbox.paypal.com") || paypalProvider.includes("NEXT_PUBLIC_PAYPAL_CLIENT_ID_SANDBOX")) {
  failures.push("PayPal production code must not default to sandbox credentials or sandbox host");
}

if (!firebaseJson.includes('"source": "."') || !firebaseJson.includes('"frameworksBackend"') || !firebaseJson.includes('"region": "us-central1"')) {
  failures.push("firebase.json: App Hosting source/framework backend region must remain configured");
}

if (!firebaseRc.includes(`"default": "${EXPECTED_FIREBASE_PROJECT_ID}"`)) {
  failures.push(".firebaserc: default Firebase project must match production project");
}

if (functionsPackageJson?.main !== "lib/functions/src/index.js") {
  failures.push("functions/package.json: main must be lib/functions/src/index.js");
}

if (functionsPackageJson?.engines?.node !== "22") {
  failures.push("functions/package.json: engines.node must be 22");
}

[
  "src/app/api/paypal/create/route.ts",
  "src/app/api/paypal/capture/route.ts",
].forEach((path) => {
  if (!existsSync(path)) failures.push(`Missing PayPal route file: ${path}`);
});

if (!readText("docs/agent-truth/environment-deployment-truth.md").includes("PayPal return/cancel/webhook")) {
  failures.push("docs/agent-truth/environment-deployment-truth.md: PayPal return/cancel/webhook position must be documented");
}

requireContains("src/lib/server/analytics.ts", readText("src/lib/server/analytics.ts"), "process.env.GA_MEASUREMENT_ID", "GA Measurement Protocol ID must be read from env");
requireContains("src/lib/server/analytics.ts", readText("src/lib/server/analytics.ts"), "process.env.GA_API_SECRET", "GA API secret must be read from env");
const bigQueryExport = readText("functions/src/analytics-bigquery-export.ts");
requireContains("functions/src/analytics-bigquery-export.ts", bigQueryExport, EXPECTED_BQ_DATASET, "BigQuery dataset default must match doctrine");
requireContains("functions/src/analytics-bigquery-export.ts", bigQueryExport, EXPECTED_BQ_TABLE, "BigQuery raw events table default must match doctrine");

requireContains("src/lib/firebase-runtime.ts", firebaseRuntime, "NEXT_PUBLIC_FIREBASE_VAPID_KEY", "FCM VAPID key must be read from public runtime env");
requireContains("src/lib/firebase-messaging.ts", firebaseMessaging, "vapidKey: FIREBASE_VAPID_KEY", "FCM token registration must pass VAPID key");
requireContains("src/lib/firebase-messaging.ts", firebaseMessaging, 'navigator.serviceWorker.register(getAppServiceWorkerUrl(), { scope: "/" })', "service worker registration must use root scope");
requireContains("public/firebase-messaging-sw.js", serviceWorker, 'const APP_SHELL_CACHE = "kandydrops-app-shell-v3"', "service worker cache version must be explicit");
if (serviceWorker.includes("requestUrl.pathname.startsWith(\"/api/\")") === false) {
  failures.push("public/firebase-messaging-sw.js: service worker must not cache API data routes");
}

if (manifest?.scope !== "/") {
  failures.push("public/manifest.json: scope must be /");
}

const manifestIconSources = (manifest?.icons ?? []).map((icon) => String(icon.src ?? ""));
["/next.svg", "/vercel.svg", "/file.svg", "/window.svg", "/globe.svg"].forEach((obsoleteIcon) => {
  if (manifestIconSources.includes(obsoleteIcon)) {
    failures.push(`public/manifest.json: obsolete icon referenced: ${obsoleteIcon}`);
  }
});
["/icon-192x192.png", "/icon-512x512.png"].forEach((iconPath) => {
  if (!manifestIconSources.includes(iconPath)) failures.push(`public/manifest.json: missing icon ${iconPath}`);
  if (!existsSync(`public${iconPath}`)) failures.push(`Missing manifest icon file: public${iconPath}`);
});

const backendOverrideEnv = backends?.result?.flatMap((entry) => entry.overrideEnv ?? []) ?? [];
backendOverrideEnv.forEach((entry) => {
  if (entry.value && entry.value !== REDACTED_BACKEND_VALUE) {
    failures.push(`backends.json: tracked overrideEnv value for ${entry.variable ?? "unknown"} must be redacted`);
  }
});

const publicSecretPatterns = [
  /PAYPAL_CLIENT_SECRET/u,
  /GA_API_SECRET/u,
  /NAVIGATION_COOKIE_SECRET/u,
  /FIREBASE_PRIVATE_KEY/u,
  /-----BEGIN PRIVATE KEY-----/u,
];
["public/manifest.json", "public/firebase-messaging-sw.js"].forEach((path) => {
  const text = readText(path);
  publicSecretPatterns.forEach((pattern) => {
    if (pattern.test(text)) failures.push(`${path}: public file contains private secret marker ${pattern.source}`);
  });
});

if (!existsSync("agent/state/environment-deployment-truth-audit.generated.json")) {
  failures.push("Missing generated audit report");
}

if (!readText("FULL_SCALE_CODEBASE_AUDIT.md").includes("Environment Deployment Truth Audit")) {
  failures.push("FULL_SCALE_CODEBASE_AUDIT.md must record this audit");
}

if (!readText("REPO_MEMORY_LEDGER.md").includes("Environment and deployment truth is launch-gated")) {
  failures.push("REPO_MEMORY_LEDGER.md must record the environment deployment truth decision");
}

if (packageJson?.scripts?.["check:environment-deployment-truth"] !== "tsx scripts/agent/validate-environment-deployment-truth.ts") {
  failures.push("package.json: missing check:environment-deployment-truth script");
}

if (failures.length > 0) {
  console.error("Environment deployment truth validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Environment deployment truth validation passed.");
