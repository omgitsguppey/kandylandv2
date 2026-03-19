import "server-only";
import { NextRequest } from "next/server";
import { getConfiguredSiteHosts } from "@/lib/site-origin";

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
    const requestHost = request.nextUrl.host;
    const originHost = getHost(request.headers.get("origin"));
    const refererHost = getHost(request.headers.get("referer"));
    const trustedHosts = new Set<string>([
        requestHost,
        ...getConfiguredSiteHosts(),
    ]);

    if (trustedHosts.size === 0) {
        return false;
    }

    return Boolean(
        (originHost && trustedHosts.has(originHost))
        || (refererHost && trustedHosts.has(refererHost)),
    );
}
