import { getDrops } from "@/lib/server/drops";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const drops = await getDrops();
    return <DashboardClient drops={drops} />;
}
