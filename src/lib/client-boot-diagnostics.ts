"use client";

import {
  installClientDiagnosticsBridge,
  recordClientBreadcrumb,
  recordClientDiagnostic,
} from "@/lib/client-diagnostics";

let bootDiagnosticsInstalled = false;
let longTaskObserverInstalled = false;
let longTaskCount = 0;

const MAX_LONG_TASK_DIAGNOSTICS = 12;
const LONG_TASK_WARN_THRESHOLD_MS = 180;

function installLifecycleBreadcrumbs() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  window.addEventListener("pageshow", () => {
    recordClientBreadcrumb("state", "page show", {
      persisted: false,
      visibilityState: document.visibilityState,
    });
  });

  window.addEventListener("pagehide", () => {
    recordClientBreadcrumb("state", "page hide", {
      visibilityState: document.visibilityState,
    });
  });

  document.addEventListener("visibilitychange", () => {
    recordClientBreadcrumb("state", `visibility ${document.visibilityState}`, {
      visibilityState: document.visibilityState,
    });
  });
}

function installLongTaskObserver() {
  if (
    longTaskObserverInstalled
    || typeof window === "undefined"
    || typeof PerformanceObserver === "undefined"
  ) {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (longTaskCount >= MAX_LONG_TASK_DIAGNOSTICS) {
          return;
        }

        if (entry.duration < LONG_TASK_WARN_THRESHOLD_MS) {
          return;
        }

        longTaskCount += 1;
        recordClientDiagnostic("runtime", "Main-thread long task observed", {
          durationMs: Math.round(entry.duration),
          entryType: entry.entryType,
          name: entry.name,
          startTimeMs: Math.round(entry.startTime),
        }, "warn");
      });
    });

    observer.observe({ entryTypes: ["longtask"] });
    longTaskObserverInstalled = true;
  } catch (error) {
    recordClientDiagnostic("runtime", "Long-task observer unavailable", {
      message: error instanceof Error ? error.message : String(error),
    }, "warn");
  }
}

export function installEarlyClientBootDiagnostics() {
  if (bootDiagnosticsInstalled || typeof window === "undefined") {
    return;
  }

  bootDiagnosticsInstalled = true;

  try {
    installClientDiagnosticsBridge();
    recordClientDiagnostic("runtime", "Client boot diagnostics ready", {
      source: "instrumentation-client",
    });
    installLifecycleBreadcrumbs();
    installLongTaskObserver();
  } catch (error) {
    recordClientDiagnostic("runtime", "Client boot diagnostics initialization failed", {
      source: "instrumentation-client",
      message: error instanceof Error ? error.message : String(error),
    }, "error");
  }
}

export function recordRouterTransitionBreadcrumb(url: string) {
  if (typeof window === "undefined") {
    return;
  }

  recordClientBreadcrumb("route", url, {
    source: "router_transition_start",
  });
}
