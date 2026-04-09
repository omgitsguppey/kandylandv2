import { getDropRaw, getDrops, sanitizeDropForClient } from "@/lib/server/drops";
import { ViewerClient } from "./ViewerClient";

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ViewerPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const id = typeof params.id === 'string' ? params.id : undefined;

    const rawDrop = id ? await getDropRaw(id) : null;
    const drop = rawDrop ? sanitizeDropForClient(rawDrop) : null;
    const allDrops = await getDrops();

    return <ViewerClient drop={drop} allDrops={allDrops} />;
}
