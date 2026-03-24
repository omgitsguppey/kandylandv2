import { NextRequest } from "next/server";

import { FIREBASE_PROJECT_ID } from "@/lib/firebase-runtime";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";

const FIREBASE_AUTH_HELPER_ASSET_VERSION = "20260319c";

function buildFirebaseAuthProxyUrl(pathSegments: string[], search: string) {
    const projectId = FIREBASE_PROJECT_ID?.trim();
    if (!projectId) {
        return null;
    }

    const normalizedPath = pathSegments.map((segment) => encodeURIComponent(segment)).join("/");
    return `https://${projectId}.firebaseapp.com/__/auth/${normalizedPath}${search}`;
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

async function proxyAuthHelper(request: NextRequest, pathSegments: string[]) {
    const targetUrl = buildFirebaseAuthProxyUrl(pathSegments, request.nextUrl.search);
    if (!targetUrl) {
        await recordServerDiagnostic({
            channel: "firebase",
            severity: "error",
            message: "Firebase auth helper proxy missing project configuration",
            detail: {
                route: "/__/auth",
                path: pathSegments.join("/"),
            },
        });
        return new Response("Firebase project is not configured", { status: 500 });
    }

    let upstreamResponse: Response;
    try {
        upstreamResponse = await fetch(targetUrl, {
            method: request.method,
            headers: buildForwardHeaders(request),
            body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
            redirect: "manual",
        });
    } catch (error) {
        await recordServerDiagnostic({
            channel: "firebase",
            severity: "error",
            message: "Firebase auth helper proxy request failed",
            detail: {
                route: "/__/auth",
                path: pathSegments.join("/"),
                error: error instanceof Error ? error.message : String(error),
            },
        });
        return new Response("Firebase auth helper is unavailable", { status: 502 });
    }
    const contentType = upstreamResponse.headers.get("content-type") || "";
    const shouldRewriteHtml = contentType.includes("text/html");
    const responseBody: BodyInit = shouldRewriteHtml
        ? (await upstreamResponse.text())
            .replaceAll('src="experiments.js"', `src="experiments.js?v=${FIREBASE_AUTH_HELPER_ASSET_VERSION}"`)
            .replaceAll('src="handler.js"', `src="handler.js?v=${FIREBASE_AUTH_HELPER_ASSET_VERSION}"`)
        : await upstreamResponse.arrayBuffer();

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
    responseHeaders.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
    responseHeaders.set("pragma", "no-cache");
    responseHeaders.set("expires", "0");

    return new Response(responseBody, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
    });
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> },
) {
    const { path } = await context.params;
    return proxyAuthHelper(request, path);
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> },
) {
    const { path } = await context.params;
    return proxyAuthHelper(request, path);
}

export async function HEAD(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> },
) {
    const { path } = await context.params;
    return proxyAuthHelper(request, path);
}
