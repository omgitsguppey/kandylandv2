"use client";

import { getClientDisplayMode } from "@/lib/browser-utils";
import type {
    LockedDropPreviewCreator,
    LockedDropPreviewSafeDrop,
    LockedDropPreviewTruth,
} from "@/lib/locked-drop-preview-truth";

export function buildPreviewTelemetryPayload(input: {
    drop: LockedDropPreviewSafeDrop;
    creator: LockedDropPreviewCreator | null;
    truth: LockedDropPreviewTruth;
    sourceComponent: string;
    userId: string | null;
    authState: "guest" | "authenticated";
}) {
    return {
        drop_id: input.drop.id,
        drop_category: input.drop.type ?? "content",
        creator_id: input.drop.creatorId ?? input.creator?.uid ?? "",
        creator_username: input.creator?.username ?? "",
        unlock_cost: input.drop.unlockCost,
        current_balance: input.truth.balanceGd,
        shortfall_gd: input.truth.shortfallGd,
        urgency_tier: input.truth.urgencyTier,
        social_proof_type: input.truth.socialProofType,
        social_proof_count: input.truth.socialProofCount,
        source_component: input.sourceComponent,
        route: `/drops/${input.drop.id}/preview`,
        display_mode: getClientDisplayMode(),
        auth_state: input.authState,
        user_id: input.userId ?? "",
        safe_preview_fields_only: input.truth.safePreviewFieldsOnly,
        is_guest: input.truth.isGuest,
        is_owner_or_creator: input.truth.isOwnerOrCreator,
        has_enough_gumdrops: input.truth.hasEnoughGumDrops,
        has_unlocked_drop: input.truth.hasUnlockedDrop,
        should_blur_cover: input.truth.shouldBlurCover,
        cta_state: input.truth.ctaState,
        cover_treatment: input.truth.coverTreatment,
        creator_preview_eligible: input.truth.creatorCoverPreviewEligible,
        can_preview_cover_as_creator: input.truth.canPreviewCoverAsCreator,
        is_creator_preview: input.truth.isCreatorPreview,
        reason_codes: input.truth.reasonCodes.join("|"),
    };
}
