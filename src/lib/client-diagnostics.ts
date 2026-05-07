"use client";

import { getClientSessionId, getClientSubjectId } from "@/lib/client-session";
import { analyzeFirestoreClientIssue, buildFirestoreClientIssueDetail } from "@/lib/firestore-client-errors";

const DIAGNOSTIC_STORAGE_KEY = "kandydrops.clientDiagnostics";
const BREADCRUMB_STORAGE_KEY = "kandydrops.clientBreadcrumbs";
const ERROR_STORAGE_KEY = "kandydrops.clientErrors";
const MAX_DIAGNOSTIC_ENTRIES = 120;
const MAX_BREADCRUMB_ENTRIES = 60;
const MAX_ERROR_ENTRIES = 24;
const CLIENT_DIAGNOSTIC_DEDUPE_WINDOW_MS = 60_000;

const BROWSER_SECURITY_BOUNDARY_PATTERNS = [
  /blocked a frame with origin/i,
  /cross-origin frame/i,
  /failed to read a named property/i,
  /permission denied to access property/i,
  /protocols?, domains?, and ports must match/i,
];

const THIRD_PARTY_IFRAME_PATTERNS = [
  /paypal/i,
  /postrobot/i,
  /xcomponent/i,
  /zoid/i,
];

export type ClientDiagnosticChannel =
  | "telemetry"
  | "auth"
  | "firebase"
  | "realtime"
  | "cache"
  | "runtime"
  | "network"
  | "notifications"
  | "payments"
  | "storage"
  | "media_uploads"
  | "ui"
  | "error"
  | "feedback"
  | "rollout"
  | "swr";

export type ClientDiagnosticSeverity = "info" | "warn" | "error";
export type ClientBreadcrumbCategory = "route" | "interaction" | "network" | "error" | "state";

export interface ClientDiagnosticEntry {
  channel: ClientDiagnosticChannel;
  severity: ClientDiagnosticSeverity;
  message: string;
  timestamp: number;
  detail?: string;
}

export interface BrowserSecurityBoundaryClassification {
  errorName: string;
  rawMessage: string;
  humanMessage: string;
  severity: ClientDiagnosticSeverity;
  browserSecurityBlocked: true;
  actionable: boolean;
  nonActionableThirdParty: boolean;
  route: string;
  sourceSurface: "admin" | "user" | "creator" | "unknown";
  browserFrameOwner?: string;
  stackFingerprint: string;
  fingerprint: string;
  detail: Record<string, unknown>;
}

export interface ClientBreadcrumbEntry {
  category: ClientBreadcrumbCategory;
  label: string;
  timestamp: number;
  path?: string;
  detail?: string;
}

export interface ClientErrorEntry {
  message: string;
  timestamp: number;
  stack?: string;
  path?: string;
  componentStack?: string;
}

export interface ClientComponentSnapshot {
  contextId: string;
  componentName: string;
  sourcePath?: string;
  codeSnippet?: string;
  routeHint?: string;
}

export interface ClientDebugSnapshot {
  currentPath: string;
  currentSearch: string;
  viewportWidth: number;
  viewportHeight: number;
  userAgent: string;
  sessionId: string;
  subjectId: string;
  diagnostics: ClientDiagnosticEntry[];
  breadcrumbs: ClientBreadcrumbEntry[];
  recentErrors: ClientErrorEntry[];
  component?: ClientComponentSnapshot;
  rolloutAssignments: Array<{
    id: string;
    variant: string;
    reason: string;
    active: boolean;
  }>;
}

declare global {
  interface Window {
    __KANDYDROPS_DEBUG__?: {
      getDiagnostics: () => ClientDiagnosticEntry[];
      getBreadcrumbs: () => ClientBreadcrumbEntry[];
      getErrors: () => ClientErrorEntry[];
      clearDiagnostics: () => void;
      getSnapshot: (component?: ClientComponentSnapshot, rolloutAssignments?: ClientDebugSnapshot["rolloutAssignments"]) => ClientDebugSnapshot;
    };
  }
}

let diagnosticsBridgeInstalled = false;
const recentDiagnosticFingerprints = new Map<string, number>();

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeStringify(value: unknown) {
  if (typeof value === "string") {
    return value.slice(0, 800);
  }

  try {
    return JSON.stringify(value).slice(0, 800);
  } catch {
    return String(value).slice(0, 800);
  }
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizeClientErrorName(error: unknown) {
  if (error instanceof Error && error.name.trim().length > 0) {
    return error.name.trim();
  }
  return "UnknownError";
}

function normalizeClientErrorMessage(error: unknown, fallback = "Unknown client error") {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim();
  }
  return fallback;
}

function toSourceSurface(route: string): BrowserSecurityBoundaryClassification["sourceSurface"] {
  if (route.startsWith("/admin")) return "admin";
  if (route.startsWith("/creators")) return "creator";
  if (route.startsWith("/")) return "user";
  return "unknown";
}

function inferBrowserFrameOwner(signature: string) {
  if (!signature) {
    return undefined;
  }
  if (THIRD_PARTY_IFRAME_PATTERNS.some((pattern) => pattern.test(signature))) {
    if (/paypal/i.test(signature)) return "paypal";
    if (/postrobot|zoid|xcomponent/i.test(signature)) return "paypal_sdk";
    return "third_party_iframe";
  }
  return undefined;
}

export function shouldRecordClientDiagnosticFingerprint(
  fingerprint: string,
  dedupeWindowMs = CLIENT_DIAGNOSTIC_DEDUPE_WINDOW_MS,
) {
  const now = Date.now();
  for (const [existingFingerprint, timestamp] of recentDiagnosticFingerprints.entries()) {
    if (now - timestamp > dedupeWindowMs) {
      recentDiagnosticFingerprints.delete(existingFingerprint);
    }
  }

  const previous = recentDiagnosticFingerprints.get(fingerprint);
  if (typeof previous === "number" && now - previous < dedupeWindowMs) {
    return false;
  }

  recentDiagnosticFingerprints.set(fingerprint, now);
  return true;
}

export function classifyBrowserSecurityBoundaryError(input: {
  error?: unknown;
  message?: string;
  detail?: Record<string, unknown>;
  route?: string;
}) : BrowserSecurityBoundaryClassification | null {
  const errorName = normalizeClientErrorName(input.error);
  const rawMessage = (
    input.message
    || normalizeClientErrorMessage(input.error, "")
    || (typeof input.detail?.errorMessage === "string" ? input.detail.errorMessage : "")
  ).trim();
  const stack = typeof input.detail?.stack === "string" ? input.detail.stack : "";
  const filename = typeof input.detail?.filename === "string" ? input.detail.filename : "";
  const signature = `${errorName} ${rawMessage} ${stack} ${filename}`.trim();
  const matchedBoundary =
    BROWSER_SECURITY_BOUNDARY_PATTERNS.some((pattern) => pattern.test(signature))
    || ((errorName === "SecurityError" || errorName === "DOMException") && /frame|cross-origin/i.test(signature));

  if (!matchedBoundary) {
    return null;
  }

  const route = input.route
    || (typeof window !== "undefined" ? window.location.pathname : "")
    || "/";
  const browserFrameOwner = inferBrowserFrameOwner(signature);
  const nonActionableThirdParty = Boolean(browserFrameOwner);
  const actionable = !nonActionableThirdParty;
  const flowFailed = input.detail?.flowFailed === true || input.detail?.userFlowFailed === true;
  const stackFingerprint = `stack_${stableHash(stack.slice(0, 600) || rawMessage.toLowerCase())}`;
  const fingerprint = `browser_boundary_${stableHash([
    route,
    rawMessage.toLowerCase(),
    stackFingerprint,
  ].join("|"))}`;
  const humanMessage = nonActionableThirdParty
    ? "Browser blocked cross-origin frame access. This is expected when third-party iframes are protected. App code should not inspect cross-origin frames."
    : "Browser blocked cross-origin frame access. Review app frame logic and avoid reading cross-origin frame internals.";
  const severity: ClientDiagnosticSeverity = flowFailed && actionable ? "error" : "warn";

  return {
    errorName,
    rawMessage,
    humanMessage,
    severity,
    browserSecurityBlocked: true,
    actionable,
    nonActionableThirdParty,
    route,
    sourceSurface: toSourceSurface(route),
    ...(browserFrameOwner ? { browserFrameOwner } : {}),
    stackFingerprint,
    fingerprint,
    detail: {
      ...input.detail,
      errorName,
      errorMessage: rawMessage,
      category: "browser_security_boundary",
      browserSecurityBlocked: true,
      actionable,
      nonActionableThirdParty,
      sourceSurface: toSourceSurface(route),
      route,
      stackFingerprint,
      ...(browserFrameOwner ? { browserFrameOwner } : {}),
    },
  };
}

function readEntries<T>(storageKey: string): T[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries<T>(storageKey: string, entries: T[], maxEntries: number) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(entries.slice(-maxEntries)));
  } catch {
    // Ignore storage failures in restricted contexts.
  }
}

export function readClientDiagnostics() {
  return readEntries<ClientDiagnosticEntry>(DIAGNOSTIC_STORAGE_KEY);
}

export function readClientBreadcrumbs() {
  return readEntries<ClientBreadcrumbEntry>(BREADCRUMB_STORAGE_KEY);
}

export function readClientErrors() {
  return readEntries<ClientErrorEntry>(ERROR_STORAGE_KEY);
}

export function recordClientDiagnostic(
  channel: ClientDiagnosticChannel,
  message: string,
  detail?: unknown,
  severity: ClientDiagnosticSeverity = "info",
) {
  if (typeof window === "undefined") {
    return;
  }

  const nextEntries = [
    ...readClientDiagnostics(),
    {
      channel,
      severity,
      message: message.slice(0, 240),
      timestamp: Date.now(),
      ...(typeof detail === "undefined"
        ? {}
        : {
            detail: safeStringify(detail),
          }),
    },
  ];

  writeEntries(DIAGNOSTIC_STORAGE_KEY, nextEntries, MAX_DIAGNOSTIC_ENTRIES);
}

export function recordClientBreadcrumb(
  category: ClientBreadcrumbCategory,
  label: string,
  detail?: unknown,
) {
  if (typeof window === "undefined") {
    return;
  }

  const nextEntries = [
    ...readClientBreadcrumbs(),
    {
      category,
      label: label.slice(0, 160),
      timestamp: Date.now(),
      path: window.location.pathname,
      ...(typeof detail === "undefined"
        ? {}
        : {
            detail: safeStringify(detail),
          }),
    },
  ];

  writeEntries(BREADCRUMB_STORAGE_KEY, nextEntries, MAX_BREADCRUMB_ENTRIES);
}

export function recordClientError(
  error: unknown,
  context?: {
    componentStack?: string;
    source?: string;
  },
) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedError = error instanceof Error
    ? error
    : new Error(typeof error === "string" ? error : "Unknown client error");

  const nextEntries = [
    ...readClientErrors(),
    {
      message: normalizedError.message.slice(0, 500),
      timestamp: Date.now(),
      stack: normalizedError.stack?.slice(0, 4000),
      path: window.location.pathname,
      componentStack: context?.componentStack?.slice(0, 2000),
    },
  ];

  writeEntries(ERROR_STORAGE_KEY, nextEntries, MAX_ERROR_ENTRIES);
  recordClientDiagnostic("error", normalizedError.message, {
    source: context?.source ?? "client",
    componentStack: context?.componentStack,
  }, "error");
  const firestoreIssue = analyzeFirestoreClientIssue(normalizedError);
  if (firestoreIssue) {
    recordClientDiagnostic(
      "firebase",
      `Firestore client ${firestoreIssue.kind === "internal_assertion" ? "internal assertion" : "error"}`,
      buildFirestoreClientIssueDetail(normalizedError, {
        source: context?.source ?? "client",
        componentStack: context?.componentStack,
      }),
      "error",
    );
  }
  recordClientBreadcrumb("error", normalizedError.message, {
    source: context?.source ?? "client",
  });
}

export function clearClientDiagnostics() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(DIAGNOSTIC_STORAGE_KEY);
  window.localStorage.removeItem(BREADCRUMB_STORAGE_KEY);
  window.localStorage.removeItem(ERROR_STORAGE_KEY);
}

export function getClientDebugSnapshot(
  component?: ClientComponentSnapshot,
  rolloutAssignments: ClientDebugSnapshot["rolloutAssignments"] = [],
) {
  if (typeof window === "undefined") {
    return {
      currentPath: "/",
      currentSearch: "",
      viewportWidth: 0,
      viewportHeight: 0,
      userAgent: "",
      sessionId: "server",
      subjectId: "server",
      diagnostics: [],
      breadcrumbs: [],
      recentErrors: [],
      component,
      rolloutAssignments,
    } satisfies ClientDebugSnapshot;
  }

  let renderer = "unknown";
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
  } catch {
    // WebGL unsupported
  }

  return {
    currentPath: window.location.pathname,
    currentSearch: window.location.search,
    viewportWidth: Math.round(window.innerWidth || 0),
    viewportHeight: Math.round(window.innerHeight || 0),
    userAgent: window.navigator.userAgent.slice(0, 400) + ` (Renderer: ${renderer})`,
    sessionId: getClientSessionId(),
    subjectId: getClientSubjectId(),
    diagnostics: readClientDiagnostics().slice(-24),
    breadcrumbs: readClientBreadcrumbs().slice(-24),
    recentErrors: readClientErrors().slice(-8),
    component,
    rolloutAssignments: rolloutAssignments.slice(0, 12),
  } satisfies ClientDebugSnapshot;
}

function installGlobalErrorListeners() {
  if (typeof window === "undefined") {
    return;
  }

  window.addEventListener("error", (event) => {
    const browserSecurityBoundary = classifyBrowserSecurityBoundaryError({
      error: event.error,
      message: event.message,
      route: window.location.pathname,
      detail: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error instanceof Error ? event.error.stack : undefined,
      },
    });
    if (browserSecurityBoundary) {
      if (!shouldRecordClientDiagnosticFingerprint(browserSecurityBoundary.fingerprint)) {
        return;
      }
      recordClientDiagnostic("ui", browserSecurityBoundary.humanMessage, browserSecurityBoundary.detail, browserSecurityBoundary.severity);
      recordClientBreadcrumb("error", browserSecurityBoundary.humanMessage, {
        category: "browser_security_boundary",
        route: browserSecurityBoundary.route,
        actionable: browserSecurityBoundary.actionable,
      });
      return;
    }

    if (!event.error) {
      recordClientDiagnostic("error", event.message || "Unhandled window error", {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }, "error");
      return;
    }

    recordClientError(event.error, { source: "window.error" });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const browserSecurityBoundary = classifyBrowserSecurityBoundaryError({
      error: event.reason,
      route: window.location.pathname,
      detail: {
        stack: event.reason instanceof Error ? event.reason.stack : undefined,
      },
    });
    if (browserSecurityBoundary) {
      if (!shouldRecordClientDiagnosticFingerprint(browserSecurityBoundary.fingerprint)) {
        return;
      }
      recordClientDiagnostic("ui", browserSecurityBoundary.humanMessage, browserSecurityBoundary.detail, browserSecurityBoundary.severity);
      recordClientBreadcrumb("error", browserSecurityBoundary.humanMessage, {
        category: "browser_security_boundary",
        route: browserSecurityBoundary.route,
        actionable: browserSecurityBoundary.actionable,
      });
      return;
    }

    recordClientError(event.reason, { source: "unhandledrejection" });
  });
}

function extractInteractionLabel(target: HTMLElement) {
  const interactiveTarget = target.closest("button, a, [role='button'], input[type='submit']") as HTMLElement | null;
  if (!interactiveTarget) {
    return null;
  }

  const datasetLabel = interactiveTarget.dataset.breadcrumbLabel
    || interactiveTarget.dataset.onboardingTarget
    || interactiveTarget.getAttribute("aria-label");
  const textLabel = interactiveTarget.textContent?.trim().replace(/\s+/g, " ");
  const href = interactiveTarget instanceof HTMLAnchorElement ? interactiveTarget.href : null;

  return {
    label: (datasetLabel || textLabel || interactiveTarget.tagName.toLowerCase()).slice(0, 120),
    href,
    tag: interactiveTarget.tagName.toLowerCase(),
  };
}

function installInteractionBreadcrumbs() {
  if (typeof window === "undefined") {
    return;
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const interaction = extractInteractionLabel(target);
    if (!interaction) {
      return;
    }

    recordClientBreadcrumb("interaction", interaction.label, {
      href: interaction.href,
      tag: interaction.tag,
    });
  }, { capture: true });
}

export function installClientDiagnosticsBridge() {
  if (typeof window === "undefined" || diagnosticsBridgeInstalled) {
    return;
  }

  diagnosticsBridgeInstalled = true;
  installGlobalErrorListeners();
  installInteractionBreadcrumbs();

  window.__KANDYDROPS_DEBUG__ = {
    getDiagnostics: () => readClientDiagnostics(),
    getBreadcrumbs: () => readClientBreadcrumbs(),
    getErrors: () => readClientErrors(),
    clearDiagnostics: () => clearClientDiagnostics(),
    getSnapshot: (component, rolloutAssignments) => getClientDebugSnapshot(component, rolloutAssignments),
  };
}

export function resetClientDiagnosticsBridgeForTest() {
  diagnosticsBridgeInstalled = false;
  recentDiagnosticFingerprints.clear();
}
