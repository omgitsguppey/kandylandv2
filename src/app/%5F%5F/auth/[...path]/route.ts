import { NextRequest } from "next/server";

import { FIREBASE_PROJECT_ID } from "@/lib/firebase-runtime";

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
        return new Response("Firebase project is not configured", { status: 500 });
    }

    const upstreamResponse = await fetch(targetUrl, {
        method: request.method,
        headers: buildForwardHeaders(request),
        body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
        redirect: "manual",
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("transfer-encoding");

    return new Response(upstreamResponse.body, {
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
