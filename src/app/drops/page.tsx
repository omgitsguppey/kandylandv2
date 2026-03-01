import { getDrops } from "@/lib/server/drops";
import { DropsClient } from "./DropsClient";

export const dynamic = "force-dynamic";

export default async function DropsPage() {
    const drops = await getDrops();

    return <DropsClient initialDrops={drops} />;
}
