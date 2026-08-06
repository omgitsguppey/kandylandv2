import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { resolveDropViewAccess } from "@/lib/drop-view-access";
import { NAV_SESSION_COOKIE, verifyNavigationSessionCookieValue } from "@/lib/navigation-session";
import { getDropRaw, sanitizeDropForClient } from "@/lib/server/drops";
import { ViewerClient } from "./ViewerClient";
import { adminAuth, adminDb } from "@/lib/server/firebase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ViewerPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const id = typeof params.id === 'string' ? params.id : undefined;
    if (!id) {
        notFound();
    }

    const viewerPreviewHref = `/drops/${encodeURIComponent(id)}/preview?source_component=dashboard_viewer_access_denied`;
    const cookieStore = await cookies();
    const navigationSession = await verifyNavigationSessionCookieValue(cookieStore.get(NAV_SESSION_COOKIE)?.value);
    if (!navigationSession || !adminDb || !adminAuth) {
        redirect(viewerPreviewHref);
    }

    const [viewerSnapshot, authUser] = await Promise.all([
        adminDb.collection("users").doc(navigationSession.uid).get(),
        adminAuth.getUser(navigationSession.uid).catch(() => null),
    ]);
    if (!viewerSnapshot.exists || !authUser || authUser.disabled) {
        redirect(viewerPreviewHref);
    }

    const viewerData = viewerSnapshot.data() ?? {};
    if (viewerData.status === "suspended" || viewerData.status === "banned") {
        redirect(viewerPreviewHref);
    }

    const rawDrop = await getDropRaw(id);
    if (!rawDrop) {
        notFound();
    }

    const unlockedContentTimestamps = viewerData.unlockedContentTimestamps;
    const viewerAccess = resolveDropViewAccess({
        drop: rawDrop,
        requestedDropId: id,
        authLoading: false,
        userId: navigationSession.uid,
        userProfile: {
            uid: navigationSession.uid,
            role: viewerData.role === "admin" || viewerData.role === "creator" ? viewerData.role : "user",
            unlockedContent: Array.isArray(viewerData.unlockedContent)
                ? viewerData.unlockedContent.filter((entry): entry is string => typeof entry === "string")
                : [],
            unlockedContentTimestamps: unlockedContentTimestamps
                && typeof unlockedContentTimestamps === "object"
                && !Array.isArray(unlockedContentTimestamps)
                ? Object.fromEntries(
                    Object.entries(unlockedContentTimestamps)
                        .filter(([dropId, timestamp]) => typeof dropId === "string" && Number.isFinite(timestamp))
                        .map(([dropId, timestamp]) => [dropId, Number(timestamp)]),
                )
                : {},
        },
    });
    if (!viewerAccess.allowed) {
        redirect(viewerPreviewHref);
    }

    const drop = sanitizeDropForClient(rawDrop);

    let initialCreatorProfile = null;
    if (drop.creatorId) {
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

    return <ViewerClient drop={drop} requestedDropId={id ?? null} initialCreatorProfile={initialCreatorProfile} />;
}
