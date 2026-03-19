import { NextRequest } from "next/server";

import { FIREBASE_PROJECT_ID } from "@/lib/firebase-runtime";

function buildFirebaseHelperUrl(pathSegments: string[], search: string) {
    const projectId = FIREBASE_PROJECT_ID?.trim();
    if (!projectId) {
        return null;
    }

    const normalizedPath = pathSegments.map((segment) => encodeURIComponent(segment)).join("/");
    return `https://${projectId}.firebaseapp.com/__/firebase/${normalizedPath}${search}`;
}

async function proxyFirebaseHelper(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> },
) {
    const { path } = await context.params;
    const targetUrl = buildFirebaseHelperUrl(path, request.nextUrl.search);
    if (!targetUrl) {
        return new Response("Firebase project is not configured", { status: 500 });
    }

    const upstreamResponse = await fetch(targetUrl, {
        method: request.method,
        headers: request.headers,
        redirect: "manual",
    });
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
