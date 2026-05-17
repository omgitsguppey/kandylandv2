import { NextResponse } from "next/server";

import type { ErrorSurface, HumanApiErrorPayload, HumanErrorDescriptor } from "./error-language";

type HumanApiErrorPayloadOptions = {
  debugId?: string;
  includeOperatorMessage?: boolean;
  previousSurface?: ErrorSurface;
};

type HumanApiErrorResponseOptions = HumanApiErrorPayloadOptions & {
  status?: number;
  headers?: HeadersInit;
};

export function buildHumanApiErrorPayload(
  descriptor: HumanErrorDescriptor,
  options: HumanApiErrorPayloadOptions = {},
): HumanApiErrorPayload {
  return {
    success: false,
    errorKey: descriptor.errorKey,
    userTitle: descriptor.userTitle,
    userMessage: descriptor.userMessage,
    ...(options.includeOperatorMessage ? { operatorMessage: descriptor.operatorMessage } : {}),
    primaryAction: descriptor.primaryAction,
    ...(descriptor.secondaryAction ? { secondaryAction: descriptor.secondaryAction } : {}),
    bugReportEligible: descriptor.bugReportEligible,
    rewardEligible: descriptor.rewardEligible,
    ...(options.debugId ? { debugId: options.debugId } : {}),
    ...(options.previousSurface ? { previousSurface: options.previousSurface } : {}),
    surface: descriptor.surface,
  };
}

export function buildHumanApiErrorResponse(
  descriptor: HumanErrorDescriptor,
  options: HumanApiErrorResponseOptions = {},
) {
  return NextResponse.json(buildHumanApiErrorPayload(descriptor, options), {
    status: options.status ?? 500,
    headers: options.headers,
  });
}
