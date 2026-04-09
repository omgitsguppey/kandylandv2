import { getDrops } from "@/lib/server/drops";
import { listCreatorDiscoveryProfiles } from "@/lib/server/creator-discovery";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const [drops, creatorRailProfiles] = await Promise.all([
        getDrops(),
        listCreatorDiscoveryProfiles("dashboard"),
    ]);

    return <DashboardClient drops={drops} creatorRailProfiles={creatorRailProfiles} />;
}
