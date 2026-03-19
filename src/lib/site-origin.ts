const PRIMARY_SITE_ORIGIN = "https://www.kandydrops.com";
const LEGACY_SITE_ORIGINS = [
    "https://kandydrops--kandydrops-by-ikandy.us-central1.hosted.app",
];

function normalizeOrigin(origin: string) {
    return origin.replace(/\/+$/, "");
}

function tryGetHost(origin: string | undefined) {
    if (!origin) {
        return null;
    }

    try {
        return new URL(origin).host;
    } catch {
        return null;
    }
}

export function resolveSiteOrigin() {
    const configuredOrigin = (
        process.env.NEXT_PUBLIC_SITE_ORIGIN ||
        process.env.SITE_ORIGIN ||
        process.env.NEXT_PUBLIC_APP_URL
    )?.trim();

    return normalizeOrigin(configuredOrigin || PRIMARY_SITE_ORIGIN);
}

export const SITE_ORIGIN = resolveSiteOrigin();

function parseOriginList(value: string | undefined) {
    if (!value) {
        return [];
    }

    return value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
        .map(normalizeOrigin);
}

export function getConfiguredSiteOrigins() {
    const origins = new Set<string>([
        SITE_ORIGIN,
        ...LEGACY_SITE_ORIGINS,
        ...parseOriginList(process.env.NEXT_PUBLIC_SITE_ORIGIN_ALIASES),
        ...parseOriginList(process.env.SITE_ORIGIN_ALIASES),
    ]);

    return Array.from(origins);
}

export function getConfiguredSiteHosts() {
    const hosts = new Set<string>();
    const configuredOrigins = getConfiguredSiteOrigins();

    configuredOrigins.forEach((origin) => {
        const host = tryGetHost(origin);
        if (host) {
            hosts.add(host);
        }
    });

    return Array.from(hosts);
}
