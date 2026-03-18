import type { Metadata } from "next";

import { getDrops } from "@/lib/server/drops";
import { DropsClient } from "./DropsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Live Drops",
    description: "Browse live KandyDrops, preview what is active right now, and unwrap exclusive digital content before it expires.",
    alternates: {
        canonical: "/drops",
    },
};

export default async function DropsPage() {
    const drops = (await getDrops()).filter((drop) => drop.status === "active");

    return <DropsClient initialDrops={drops} />;
}
