import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getPublicDiscoveryData } from "@/lib/server/public-discovery-preview";
import { DropsClient } from "./DropsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Discover Live KandyDrops",
    description: "Explore the live KandyDrops collection, meet the creators behind each release, and preview what is available right now.",
    alternates: {
        canonical: "/drops",
    },
};

interface DropsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DropsPage({ searchParams }: DropsPageProps) {
    const params = await searchParams;
    const requestedDropId = normalizeLegacyPreviewDropId(params.drop);
    if (requestedDropId) {
        redirect(`/drops/${encodeURIComponent(requestedDropId)}/preview?source_component=legacy_drop_query`);
    }

    const {
        drops: allDrops,
        creatorProfiles: creatorRailProfiles,
    } = await getPublicDiscoveryData("drops");
    const drops = allDrops.filter((drop) => drop.status === "active");

    return <DropsClient initialDrops={drops} creatorRailProfiles={creatorRailProfiles} />;
}

function normalizeLegacyPreviewDropId(value: string | string[] | undefined) {
    const rawValue = Array.isArray(value) ? value[0] : value;
    if (!rawValue) return null;

    const normalized = rawValue.trim();
    return /^[A-Za-z0-9_-]{1,128}$/u.test(normalized) ? normalized : null;
}
