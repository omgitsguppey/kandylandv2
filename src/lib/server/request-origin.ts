import "server-only";
import { NextRequest } from "next/server";
import { SITE_ORIGIN } from "@/lib/site-origin";

function getHost(input: string | null): string | null {
    if (!input) {
        return null;
    }

    try {
        return new URL(input).host;
    } catch {
        return null;
    }
}

export function hasTrustedSiteOrigin(request: NextRequest) {
    const expectedHost = getHost(SITE_ORIGIN);
    const originHost = getHost(request.headers.get("origin"));
    const refererHost = getHost(request.headers.get("referer"));

    if (!expectedHost) {
        return false;
    }

    return originHost === expectedHost || refererHost === expectedHost;
}
