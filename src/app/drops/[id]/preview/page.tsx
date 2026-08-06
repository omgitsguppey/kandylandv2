import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LockedDropPreviewClient } from "@/components/Drops/LockedDropPreviewClient";
import { adminDb } from "@/lib/server/firebase-admin";
import { getDrop } from "@/lib/server/drops";
import { toLockedDropPreviewSafeDrop, type LockedDropPreviewCreator } from "@/lib/locked-drop-preview-truth";

interface DropPreviewPageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: Pick<DropPreviewPageProps, "params">): Promise<Metadata> {
    const { id } = await params;
    const drop = await getDrop(id);
    if (!drop) {
        return {
            title: "Drop Preview",
        };
    }

    const previewDrop = toLockedDropPreviewSafeDrop(drop);

    return {
        title: `${previewDrop.title} Preview`,
        description: previewDrop.description,
        alternates: {
            canonical: `/drops/${encodeURIComponent(previewDrop.id)}/preview`,
        },
        openGraph: {
            title: `${previewDrop.title} Preview`,
            description: previewDrop.description,
            images: previewDrop.imageUrl ? [{ url: previewDrop.imageUrl, alt: previewDrop.title }] : undefined,
        },
    };
}

export default async function DropPreviewPage({ params, searchParams }: DropPreviewPageProps) {
    const [{ id }, query] = await Promise.all([params, searchParams]);
    const drop = await getDrop(id);
    if (!drop) {
        notFound();
    }

    const sourceComponent = normalizeSourceComponent(query.source_component) ?? normalizeSourceComponent(query.source) ?? "direct_preview_route";
    const creator = await getPreviewCreator(drop.creatorId);

    return (
        <LockedDropPreviewClient
            drop={toLockedDropPreviewSafeDrop(drop)}
            creator={creator}
            sourceComponent={sourceComponent}
        />
    );
}

function normalizeSourceComponent(value: string | string[] | undefined) {
    const rawValue = Array.isArray(value) ? value[0] : value;
    if (!rawValue) return null;

    const normalized = rawValue.trim().replace(/[^a-z0-9_-]+/gi, "_").slice(0, 80);
    return normalized || null;
}

async function getPreviewCreator(creatorId: string | undefined): Promise<LockedDropPreviewCreator | null> {
    if (!creatorId || !adminDb) return null;

    const creatorSnap = await adminDb.collection("users").doc(creatorId).get();
    if (!creatorSnap.exists) return null;

    const data = creatorSnap.data() ?? {};
    return {
        uid: creatorSnap.id,
        displayName: typeof data.displayName === "string" && data.displayName.trim() ? data.displayName.trim() : "Creator",
        username: typeof data.username === "string" ? data.username.trim() : "",
        photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
        isVerified: data.isVerified === true,
    };
}
