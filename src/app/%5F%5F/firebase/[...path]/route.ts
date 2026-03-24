import { NextRequest } from "next/server";

import { FIREBASE_PROJECT_ID } from "@/lib/firebase-runtime";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";

function buildFirebaseHelperUrl(pathSegments: string[], search: string) {
    const projectId = FIREBASE_PROJECT_ID?.trim();
    if (!projectId) {
        return null;
    }

    const normalizedPath = pathSegments.map((segment) => encodeURIComponent(segment)).join("/");
    return `https://${projectId}.firebaseapp.com/__/firebase/${normalizedPath}${search}`;
}

function buildForwardHeaders(request: NextRequest) {
    const headers = new Headers(request.headers);

    headers.delete("host");
    headers.delete("content-length");
    headers.delete("x-forwarded-host");
    headers.delete("x-forwarded-proto");
    headers.delete("x-forwarded-port");

    return headers;
}

async function proxyFirebaseHelper(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> },
) {
    const { path } = await context.params;
    const targetUrl = buildFirebaseHelperUrl(path, request.nextUrl.search);
    if (!targetUrl) {
        await recordServerDiagnostic({
            channel: "firebase",
            severity: "error",
            message: "Firebase helper proxy missing project configuration",
            detail: {
                route: "/__/firebase",
                path: path.join("/"),
            },
        });
        return new Response("Firebase project is not configured", { status: 500 });
    }

    let upstreamResponse: Response;
    try {
        upstreamResponse = await fetch(targetUrl, {
            method: request.method,
            headers: buildForwardHeaders(request),
            redirect: "manual",
        });
    } catch (error) {
        await recordServerDiagnostic({
            channel: "firebase",
            severity: "error",
            message: "Firebase helper proxy request failed",
            detail: {
                route: "/__/firebase",
                path: path.join("/"),
                error: error instanceof Error ? error.message : String(error),
            },
        });
        return new Response("Firebase helper is unavailable", { status: 502 });
    }
    const upstreamBody = await upstreamResponse.arrayBuffer();

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
    responseHeaders.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
    responseHeaders.set("pragma", "no-cache");
    responseHeaders.set("expires", "0");

    return new Response(upstreamBody, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
    });
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> },
) {
    return proxyFirebaseHelper(request, context);
}

export async function HEAD(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> },
) {
    return proxyFirebaseHelper(request, context);
}
