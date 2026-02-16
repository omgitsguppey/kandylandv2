import { getDrop } from "@/lib/server/drops";
import { ViewerClient } from "./ViewerClient";

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ViewerPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const id = typeof params.id === 'string' ? params.id : undefined;

    const drop = id ? await getDrop(id) : null;

    return <ViewerClient drop={drop} />;
}
