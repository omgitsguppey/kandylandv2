"use client";

import { recordClientDiagnostic, type ClientDiagnosticChannel } from "@/lib/client-diagnostics";
import { reportClientIssue } from "@/lib/client-error-reporting";

export type UiContinuityModuleState = {
  key: string;
  label: string;
  critical: boolean;
  status: "success" | "error";
  warning: string | null;
  fallbackActive: boolean;
  responseOk: boolean;
};

export type UiContinuityModuleSpec = {
  key: string;
  label: string;
  critical?: boolean;
  fallbackValue?: unknown;
  load: () => Promise<unknown>;
};

export type UiContinuityResult = {
  state: UiContinuityModuleState;
  value: unknown;
};

type JsonErrorBody = {
  error?: string;
  message?: string;
};

function normalizeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return fallback;
}

export async function readUiJson<T>(response: Response, context: { moduleLabel: string; url: string }) {
  const text = await response.text();
  let body: JsonErrorBody | T = {} as JsonErrorBody;

  if (text.trim().length > 0) {
    try {
      body = JSON.parse(text) as JsonErrorBody | T;
    } catch {
      throw new Error(`${context.moduleLabel} returned invalid JSON from ${context.url}`);
    }
  }

  if (!response.ok) {
    const typedBody = body as JsonErrorBody;
    throw new Error(
      typeof typedBody.error === "string" && typedBody.error.trim().length > 0
        ? typedBody.error
        : typeof typedBody.message === "string" && typedBody.message.trim().length > 0
          ? typedBody.message
          : `${context.moduleLabel} request failed (${response.status})`,
    );
  }

  return body as T;
}

export async function loadUiContinuityModules(input: {
  surface: string;
  modules: UiContinuityModuleSpec[];
  diagnosticsChannel?: ClientDiagnosticChannel;
}) {
  const diagnosticsChannel = input.diagnosticsChannel ?? "ui";
  recordClientDiagnostic(diagnosticsChannel, `${input.surface} hydration started`, {
    surface: input.surface,
    modules: input.modules.map((module) => module.key),
  });

  const settled = await Promise.allSettled(
    input.modules.map(async (module) => {
      const value = await module.load();
      return {
        state: {
          key: module.key,
          label: module.label,
          critical: module.critical === true,
          status: "success" as const,
          warning: null,
          fallbackActive: false,
          responseOk: true,
        },
        value,
      } satisfies UiContinuityResult;
    }),
  );

  const results = settled.map((result, index) => {
    const module = input.modules[index];
    if (result.status === "fulfilled") {
      recordClientDiagnostic(diagnosticsChannel, `${input.surface} module hydrated`, {
        surface: input.surface,
        module: module.key,
        critical: module.critical === true,
      });
      return result.value;
    }

    const warning = normalizeErrorMessage(result.reason, `${module.label} failed to load`);
    const fallbackActive = typeof module.fallbackValue !== "undefined";
    reportClientIssue({
      channel: diagnosticsChannel,
      severity: module.critical === true ? "error" : "warn",
      message: `${input.surface} module hydration failed`,
      error: result.reason,
      detail: {
        surface: input.surface,
        module: module.key,
        critical: module.critical === true,
        fallbackActive,
      },
      consoleLabel: `[UIContinuity] ${input.surface}:${module.key}`,
    });

    return {
      state: {
        key: module.key,
        label: module.label,
        critical: module.critical === true,
        status: "error" as const,
        warning,
        fallbackActive,
        responseOk: false,
      },
      value: typeof module.fallbackValue === "undefined" ? null : module.fallbackValue,
    } satisfies UiContinuityResult;
  });

  recordClientDiagnostic(
    diagnosticsChannel,
    `${input.surface} hydration completed`,
    {
      surface: input.surface,
      failedModules: results.filter((result) => result.state.status === "error").map((result) => result.state.key),
    },
    results.some((result) => result.state.status === "error" && result.state.critical) ? "error" : results.some((result) => result.state.status === "error") ? "warn" : "info",
  );

  return results;
}
