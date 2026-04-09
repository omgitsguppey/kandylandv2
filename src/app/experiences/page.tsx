import type { Metadata } from "next";

import { isDropActiveNow } from "@/lib/drop-status";
import { getDrops } from "@/lib/server/drops";
import { listCreatorDiscoveryProfiles } from "@/lib/server/creator-discovery";
import ExperiencesClient from "./ExperiencesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Experiences",
    description: "Check in, complete daily missions, and stay ready for the next live KandyDrops unwrap.",
    alternates: {
        canonical: "/experiences",
    },
};

export default async function ExperiencesPage() {
    const [allDrops, creatorRailProfiles] = await Promise.all([
        getDrops(),
        listCreatorDiscoveryProfiles("experiences"),
    ]);
    const initialActiveDrops = allDrops.filter((drop) => isDropActiveNow(drop));

    return (
        <ExperiencesClient
            initialActiveDrops={initialActiveDrops}
            creatorRailProfiles={creatorRailProfiles}
        />
    );
}
