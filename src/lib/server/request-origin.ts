import "server-only";
import { NextRequest } from "next/server";
import { getConfiguredSiteHosts, getConfiguredSiteOrigins } from "@/lib/site-origin";

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

function getOrigin(input: string | null): string | null {
    if (!input) {
        return null;
    }

    try {
        return new URL(input).origin;
    } catch {
        return null;
    }
}

export function hasTrustedSiteOrigin(request: NextRequest) {
    const requestOrigin = request.nextUrl.origin;
    const requestHost = request.nextUrl.host;
    const requestProtocol = request.nextUrl.protocol;
    const originOrigin = getOrigin(request.headers.get("origin"));
    const refererOrigin = getOrigin(request.headers.get("referer"));
    const originHost = getHost(request.headers.get("origin"));
    const refererHost = getHost(request.headers.get("referer"));
    const trustedOrigins = new Set<string>([
        requestOrigin,
        ...getConfiguredSiteOrigins().filter((origin) => {
            try {
                return new URL(origin).protocol === requestProtocol;
            } catch {
                return false;
            }
        }),
    ]);
    const trustedHosts = new Set<string>([
        requestHost,
        ...getConfiguredSiteHosts(),
    ]);

    if (trustedOrigins.size === 0 && trustedHosts.size === 0) {
        return false;
    }

    return Boolean(
        (originOrigin && trustedOrigins.has(originOrigin))
        || (refererOrigin && trustedOrigins.has(refererOrigin))
        || (!originOrigin && originHost && trustedHosts.has(originHost))
        || (!refererOrigin && refererHost && trustedHosts.has(refererHost)),
    );
}
