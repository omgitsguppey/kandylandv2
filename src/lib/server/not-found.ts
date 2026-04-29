import "server-only";

import { NextResponse } from "next/server";

export const API_NOT_FOUND_ERROR_CODE = "not_found";

export type ApiNotFoundResource =
    | "asset"
    | "booking"
    | "broadcast"
    | "content"
    | "creator"
    | "drop"
    | "file"
    | "generation_job"
    | "message"
    | "notification"
    | "reference"
    | "repair_proposal"
    | "request"
    | "resource"
    | "support_thread"
    | "thread"
    | "user";

export type ApiNotFoundBody = {
    error: string;
    errorCode: string;
    resource: ApiNotFoundResource;
};

export function buildNotFoundBody(resource: ApiNotFoundResource, error: string, errorCode = API_NOT_FOUND_ERROR_CODE): ApiNotFoundBody {
    return {
        error,
        errorCode,
        resource,
    };
}

export function buildNotFoundResponse(resource: ApiNotFoundResource, error: string, errorCode?: string) {
    return NextResponse.json(buildNotFoundBody(resource, error, errorCode), { status: 404 });
}
