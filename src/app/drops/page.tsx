import { getDrops } from "@/lib/server/drops";
import { DropsClient } from "./DropsClient";

export const dynamic = "force-dynamic"; // Ensure fresh data on every request

export default async function DropsPage() {
    const drops = await getDrops();

    return <DropsClient initialDrops={drops} />;
}
