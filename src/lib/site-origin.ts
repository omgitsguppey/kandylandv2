const DEFAULT_SITE_ORIGIN = "https://kandydrops--kandydrops-by-ikandy.us-central1.hosted.app";

function normalizeOrigin(origin: string) {
    return origin.replace(/\/+$/, "");
}

export function resolveSiteOrigin() {
    const configuredOrigin = (
        process.env.NEXT_PUBLIC_SITE_ORIGIN ||
        process.env.SITE_ORIGIN ||
        process.env.NEXT_PUBLIC_APP_URL
    )?.trim();

    return normalizeOrigin(configuredOrigin || DEFAULT_SITE_ORIGIN);
}

export const SITE_ORIGIN = resolveSiteOrigin();
