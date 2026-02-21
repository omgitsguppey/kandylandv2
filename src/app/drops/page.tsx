import { getDrops } from "@/lib/server/drops";
import { DropsClient } from "./DropsClient";

export const revalidate = 60; // Revalidate every 60 seconds (ISR)

export default async function DropsPage() {
    const drops = await getDrops();

    return <DropsClient initialDrops={drops} />;
}
