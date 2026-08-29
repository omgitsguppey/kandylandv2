import "server-only";

import type { CreatorDiscoveryProfile, CreatorDiscoverySurface } from "@/lib/creator-public-pages";
import type { Drop } from "@/types/db";
import { isKandyLocalPublicPreview } from "@/lib/server/local-public-preview";
import {
    PUBLIC_DISCOVERY_PREVIEW_CREATORS,
    PUBLIC_DISCOVERY_PREVIEW_DROPS,
} from "@/lib/server/public-discovery-preview-fixtures";

export type PublicDiscoveryData = {
    drops: Drop[];
    creatorProfiles: CreatorDiscoveryProfile[];
};

export async function getPublicDiscoveryData(
    surface: CreatorDiscoverySurface,
): Promise<PublicDiscoveryData> {
    if (isKandyLocalPublicPreview()) {
        return {
            drops: PUBLIC_DISCOVERY_PREVIEW_DROPS,
            creatorProfiles: PUBLIC_DISCOVERY_PREVIEW_CREATORS,
        };
    }

    const [{ getDrops }, { listCreatorDiscoveryProfiles }] = await Promise.all([
        import("@/lib/server/drops"),
        import("@/lib/server/creator-discovery"),
    ]);
    const [drops, creatorProfiles] = await Promise.all([
        getDrops(),
        listCreatorDiscoveryProfiles(surface),
    ]);

    return { drops, creatorProfiles };
}
