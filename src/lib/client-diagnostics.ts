"use client";

const DIAGNOSTIC_STORAGE_KEY = "kandydrops.clientDiagnostics";
const MAX_DIAGNOSTIC_ENTRIES = 80;

export type ClientDiagnosticChannel =
  | "telemetry"
  | "firebase"
  | "realtime"
  | "cache"
  | "runtime";

export interface ClientDiagnosticEntry {
  channel: ClientDiagnosticChannel;
  message: string;
  timestamp: number;
  detail?: string;
}

declare global {
  interface Window {
    __KANDYDROPS_DEBUG__?: {
      getDiagnostics: () => ClientDiagnosticEntry[];
      clearDiagnostics: () => void;
    };
  }
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readDiagnosticEntries() {
  if (!canUseStorage()) {
    return [] as ClientDiagnosticEntry[];
  }

  try {
    const raw = window.localStorage.getItem(DIAGNOSTIC_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as ClientDiagnosticEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDiagnosticEntries(entries: ClientDiagnosticEntry[]) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(DIAGNOSTIC_STORAGE_KEY, JSON.stringify(entries.slice(-MAX_DIAGNOSTIC_ENTRIES)));
  } catch {
    // Ignore storage failures in restricted browsing contexts.
  }
}

export function recordClientDiagnostic(
  channel: ClientDiagnosticChannel,
  message: string,
  detail?: unknown,
) {
  if (typeof window === "undefined") {
    return;
  }

  const nextEntries = [
    ...readDiagnosticEntries(),
    {
      channel,
      message,
      timestamp: Date.now(),
      ...(typeof detail === "undefined"
        ? {}
        : {
            detail: typeof detail === "string" ? detail : JSON.stringify(detail),
          }),
    },
  ];

  writeDiagnosticEntries(nextEntries);
}

export function clearClientDiagnostics() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(DIAGNOSTIC_STORAGE_KEY);
}

export function installClientDiagnosticsBridge() {
  if (typeof window === "undefined") {
    return;
  }

  window.__KANDYDROPS_DEBUG__ = {
    getDiagnostics: () => readDiagnosticEntries(),
    clearDiagnostics: () => clearClientDiagnostics(),
  };
}
