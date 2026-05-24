import { getDropRaw } from "@/lib/server/drops";
import { buildViewerDropEntitlementPayload } from "@/lib/server/viewer-drop-entitlement";
import { ViewerClient } from "./ViewerClient";
import { adminDb } from "@/lib/server/firebase-admin";

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ViewerPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const id = typeof params.id === 'string' ? params.id : undefined;

    const rawDrop = id ? await getDropRaw(id) : null;
    const { drop } = buildViewerDropEntitlementPayload(rawDrop);

    let initialCreatorProfile = null;
    if (drop?.creatorId && adminDb) {
        const userDoc = await adminDb.collection("users").doc(drop.creatorId).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            initialCreatorProfile = {
                uid: userDoc.id,
                displayName: data?.displayName || "Creator",
                username: data?.username || "",
                photoURL: data?.photoURL || null,
                isVerified: data?.isVerified === true,
            };
        }
    }

    return <ViewerClient drop={drop} initialCreatorProfile={initialCreatorProfile} />;
}
