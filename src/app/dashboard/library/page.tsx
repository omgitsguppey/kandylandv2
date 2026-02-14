import { getDropsServer } from "@/lib/server/drops";
import { LibraryClient } from "./LibraryClient";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
    const drops = await getDropsServer(null); // Fetch ALL drops

    return <LibraryClient drops={drops} />;
}
