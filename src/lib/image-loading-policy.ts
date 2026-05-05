export const IMAGE_LOADING_SURFACES = [
    "home_hero",
    "home_creator_rail",
    "home_drop_ticker",
    "home_active_drops",
    "drops_grid",
    "featured_carousel",
    "drop_preview",
    "creator_profile_header",
    "creator_updates",
    "my_kandydrops_library",
    "dashboard_collection",
    "viewer_content",
] as const;

export type ImageLoadingSurface = (typeof IMAGE_LOADING_SURFACES)[number];
export type ImageLoadingStrategy = "eager" | "lazy";
export type ImageFetchPriority = "high" | "low" | "auto";

type DropGridLayout = "standard" | "wide";

export interface ImageLoadingPolicyOptions {
    mediaIndex?: number;
    isLcpCandidate?: boolean;
    dropGridLayout?: DropGridLayout;
}

export interface ImageLoadingPolicy {
    surface: ImageLoadingSurface;
    loading: ImageLoadingStrategy;
    preload: boolean;
    fetchPriority: ImageFetchPriority;
    sizes: string;
    quality?: number;
    lcpCandidate: boolean;
    sizesPolicy: string;
}

const DROP_GRID_STANDARD_SIZES = "(max-width: 480px) 50vw, (max-width: 768px) 33vw, 240px";
const DROP_GRID_WIDE_SIZES = "(max-width: 480px) 96vw, (max-width: 768px) 66vw, 720px";
const FEATURED_CAROUSEL_SIZES = "(max-width: 768px) 100vw, 720px";
const DROP_PREVIEW_SIZES = "(max-width: 640px) 64vw, 320px";
const VIEWER_CONTENT_SIZES = "100vw";

const BASE_SURFACE_POLICIES: Record<ImageLoadingSurface, Omit<ImageLoadingPolicy, "surface">> = {
    home_hero: {
        loading: "eager",
        preload: true,
        fetchPriority: "high",
        sizes: "100vw",
        quality: 85,
        lcpCandidate: true,
        sizesPolicy: "home-hero-lcp",
    },
    home_creator_rail: {
        loading: "lazy",
        preload: false,
        fetchPriority: "low",
        sizes: "72px",
        quality: 72,
        lcpCandidate: false,
        sizesPolicy: "creator-rail-avatar",
    },
    home_drop_ticker: {
        loading: "lazy",
        preload: false,
        fetchPriority: "low",
        sizes: "180px",
        quality: 72,
        lcpCandidate: false,
        sizesPolicy: "home-drop-ticker-card",
    },
    home_active_drops: {
        loading: "lazy",
        preload: false,
        fetchPriority: "low",
        sizes: "(max-width: 640px) 46vw, (max-width: 1024px) 38vw, 360px",
        quality: 74,
        lcpCandidate: false,
        sizesPolicy: "home-active-drops-carousel",
    },
    drops_grid: {
        loading: "lazy",
        preload: false,
        fetchPriority: "low",
        sizes: DROP_GRID_STANDARD_SIZES,
        quality: 72,
        lcpCandidate: false,
        sizesPolicy: "drops-grid-card",
    },
    featured_carousel: {
        loading: "lazy",
        preload: false,
        fetchPriority: "low",
        sizes: FEATURED_CAROUSEL_SIZES,
        quality: 78,
        lcpCandidate: false,
        sizesPolicy: "featured-carousel-slide",
    },
    drop_preview: {
        loading: "eager",
        preload: true,
        fetchPriority: "high",
        sizes: DROP_PREVIEW_SIZES,
        quality: 82,
        lcpCandidate: true,
        sizesPolicy: "drop-preview-cover-lcp",
    },
    creator_profile_header: {
        loading: "eager",
        preload: false,
        fetchPriority: "auto",
        sizes: "112px",
        quality: 76,
        lcpCandidate: true,
        sizesPolicy: "creator-profile-avatar",
    },
    creator_updates: {
        loading: "lazy",
        preload: false,
        fetchPriority: "low",
        sizes: "(max-width: 768px) 100vw, 640px",
        quality: 72,
        lcpCandidate: false,
        sizesPolicy: "creator-updates-feed",
    },
    my_kandydrops_library: {
        loading: "lazy",
        preload: false,
        fetchPriority: "low",
        sizes: DROP_GRID_STANDARD_SIZES,
        quality: 74,
        lcpCandidate: false,
        sizesPolicy: "my-kandydrops-library-card",
    },
    dashboard_collection: {
        loading: "lazy",
        preload: false,
        fetchPriority: "low",
        sizes: "192px",
        quality: 72,
        lcpCandidate: false,
        sizesPolicy: "dashboard-collection-card",
    },
    viewer_content: {
        loading: "lazy",
        preload: false,
        fetchPriority: "low",
        sizes: VIEWER_CONTENT_SIZES,
        quality: 86,
        lcpCandidate: false,
        sizesPolicy: "viewer-noninitial-media",
    },
};

export function getImageLoadingPolicy(
    surface: ImageLoadingSurface,
    options: ImageLoadingPolicyOptions = {},
): ImageLoadingPolicy {
    const base = BASE_SURFACE_POLICIES[surface];

    if (surface === "drops_grid") {
        return {
            ...base,
            surface,
            sizes: options.dropGridLayout === "wide" ? DROP_GRID_WIDE_SIZES : DROP_GRID_STANDARD_SIZES,
            sizesPolicy: options.dropGridLayout === "wide" ? "drops-grid-wide-card" : base.sizesPolicy,
        };
    }

    if (surface === "featured_carousel") {
        const lcpCandidate = options.mediaIndex === 0 || options.isLcpCandidate === true;
        return {
            ...base,
            surface,
            loading: lcpCandidate ? "eager" : "lazy",
            preload: false,
            fetchPriority: lcpCandidate ? "high" : "low",
            lcpCandidate,
            sizesPolicy: lcpCandidate ? "featured-carousel-first-slide" : base.sizesPolicy,
        };
    }

    if (surface === "drop_preview" && options.isLcpCandidate === false) {
        return {
            ...base,
            surface,
            loading: "eager",
            preload: false,
            fetchPriority: "auto",
            lcpCandidate: false,
            sizesPolicy: "drop-preview-interaction-opened-cover",
        };
    }

    if (surface === "viewer_content") {
        const lcpCandidate = options.mediaIndex === 0 || options.isLcpCandidate === true;
        return {
            ...base,
            surface,
            loading: lcpCandidate ? "eager" : "lazy",
            preload: lcpCandidate,
            fetchPriority: lcpCandidate ? "high" : "low",
            lcpCandidate,
            sizesPolicy: lcpCandidate ? "viewer-first-media-lcp" : base.sizesPolicy,
        };
    }

    return {
        ...base,
        surface,
    };
}

export function getImagePolicyDataAttributes(policy: ImageLoadingPolicy) {
    return {
        "data-image-surface": policy.surface,
        "data-image-loading-policy": policy.loading,
        "data-image-preload-allowed": String(policy.preload),
        "data-image-lcp-candidate": String(policy.lcpCandidate),
        "data-image-sizes-policy": policy.sizesPolicy,
    } as const;
}
