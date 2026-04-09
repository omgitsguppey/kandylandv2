import { getDrops } from "@/lib/server/drops";
import { isDropActiveNow } from "@/lib/drop-status";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const initialActiveDrops = (await getDrops()).filter((drop) => isDropActiveNow(drop));

    return <HomeClient initialActiveDrops={initialActiveDrops} />;
}
