"use client";

import { getClientSessionId, getClientSubjectId } from "@/lib/client-session";

const DIAGNOSTIC_STORAGE_KEY = "kandydrops.clientDiagnostics";
const BREADCRUMB_STORAGE_KEY = "kandydrops.clientBreadcrumbs";
const ERROR_STORAGE_KEY = "kandydrops.clientErrors";
const MAX_DIAGNOSTIC_ENTRIES = 120;
const MAX_BREADCRUMB_ENTRIES = 60;
const MAX_ERROR_ENTRIES = 24;

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
  | "ui"
  | "error"
  | "feedback"
  | "rollout";

export type ClientDiagnosticSeverity = "info" | "warn" | "error";
export type ClientBreadcrumbCategory = "route" | "interaction" | "network" | "error" | "state";

export interface ClientDiagnosticEntry {
  channel: ClientDiagnosticChannel;
  severity: ClientDiagnosticSeverity;
  message: string;
  timestamp: number;
  detail?: string;
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
