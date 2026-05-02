import type { Metadata } from "next";

import { SITE_ORIGIN } from "@/lib/site-origin";
import { adminDb } from "@/lib/server/firebase-admin";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { isCreatorRole } from "@/lib/creator-experiences";
import { buildCreatorPublicHref } from "@/lib/creator-profile-routing";

import CreatorProfileClient from "./CreatorProfileClient";

export const dynamic = "force-dynamic";

type CreatorMetadataRecord = {
    username: string;
    displayName: string;
    bio?: string;
    photoURL?: string;
};

async function getCreatorMetadataRecord(username: string): Promise<CreatorMetadataRecord | null> {
    if (!adminDb) {
        return null;
    }

    try {
        const snapshot = await adminDb
            .collection("users")
            .where("username", "==", username.toLowerCase())
            .limit(1)
            .get();

        const doc = snapshot.docs[0];
        if (!doc) {
            return null;
        }

        const data = doc.data();
        const status = typeof data.status === "string" ? data.status : "active";
        if (!isCreatorRole(data.role) || status !== "active") {
            return null;
        }

        return {
            username,
            displayName: typeof data.displayName === "string" && data.displayName.trim()
                ? data.displayName.trim()
                : `@${username}`,
            bio: typeof data.bio === "string" ? data.bio.trim() : undefined,
            photoURL: typeof data.photoURL === "string" ? data.photoURL : undefined,
        };
    } catch (error) {
        recordRouteWarning("creator-metadata", "Failed to resolve creator metadata", error);
        return null;
    }
}

export async function generateMetadata(
    { params }: { params: Promise<{ username: string }> },
): Promise<Metadata> {
    const { username } = await params;
    const canonicalPath = buildCreatorPublicHref({ username }) ?? "/creators";
    const creator = await getCreatorMetadataRecord(username);

    if (!creator) {
        return {
            title: "Creator Profile",
            description: "Browse creator profiles and live KandyDrops exclusives.",
            alternates: {
                canonical: canonicalPath,
            },
        };
    }

    const description = creator.bio || `Browse ${creator.displayName}'s latest KandyDrops and creator exclusives.`;
    const image = creator.photoURL;

    return {
        title: creator.displayName,
        description,
        alternates: {
            canonical: canonicalPath,
        },
        openGraph: {
            title: creator.displayName,
            description,
            url: `${SITE_ORIGIN}${canonicalPath}`,
            type: "profile",
            images: image ? [{ url: image, alt: creator.displayName }] : undefined,
        },
        twitter: {
            card: image ? "summary_large_image" : "summary",
            title: creator.displayName,
            description,
            images: image ? [image] : undefined,
        },
    };
}

export default function CreatorProfilePage() {
    return <CreatorProfileClient />;
}
