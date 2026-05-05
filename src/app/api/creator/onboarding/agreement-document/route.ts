import { NextRequest, NextResponse } from "next/server";

import {
    CREATOR_AGREEMENT_TEMPLATE_COLLECTION,
    normalizeCreatorAgreementTemplate,
} from "@/lib/creator-agreement-documents";
import { normalizeCreatorOnboardingCanonicalRecord } from "@/lib/creator-onboarding";
import { handleApiError } from "@/lib/server/auth";
import { CREATOR_ONBOARDING_COLLECTION } from "@/lib/server/creator-onboarding";
import { adminDb, adminStorage } from "@/lib/server/firebase-admin";
import { MEDIA_PROXY } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

const CREATOR_AGREEMENT_DOCUMENT_PREFIX = "creator-agreements/";
const CREATOR_AGREEMENT_DOCUMENT_SIGNED_URL_TTL_MS = 5 * 60 * 1000;
const CREATOR_AGREEMENT_DOCUMENT_MEDIA_POLICY = "MEDIA_PROXY";
const CREATOR_AGREEMENT_DOCUMENT_ROUTE_EVIDENCE = {
    creatorAgreementDocumentRoute: true,
    authenticatedOnly: true,
    creatorScoped: true,
    storageEgressGuarded: true,
    mediaProxyGuarded: true,
    mediaProxyPolicy: CREATOR_AGREEMENT_DOCUMENT_MEDIA_POLICY,
    rawStorageUrlExposed: false,
    defaultDocumentResponse: "short_lived_creator_preview",
    maxPreviewTtlSeconds: CREATOR_AGREEMENT_DOCUMENT_SIGNED_URL_TTL_MS / 1000,
} as const;

function jsonError(status: number, error: string) {
    return NextResponse.json({
        ...CREATOR_AGREEMENT_DOCUMENT_ROUTE_EVIDENCE,
        error,
    }, { status });
}

function isSafeCreatorAgreementDocumentPath(storagePath: string) {
    return storagePath.startsWith(CREATOR_AGREEMENT_DOCUMENT_PREFIX)
        && storagePath.length > CREATOR_AGREEMENT_DOCUMENT_PREFIX.length
        && !storagePath.includes("..")
        && !storagePath.endsWith("/");
}

function isSafeCreatorAgreementSignedUrl(value: string) {
    try {
        if (value.trim() !== value) {
            return false;
        }
        const url = new URL(value);
        const host = url.hostname.toLowerCase();
        return url.protocol === "https:"
            && !url.username
            && !url.password
            && (host === "storage.googleapis.com" || host.endsWith(".storage.googleapis.com"))
            && !url.searchParams.has("token");
    } catch {
        return false;
    }
}

async function GET_handler(request: NextRequest) {
    try {
        // google-cost-guard: creator agreement document access is protected by MEDIA_PROXY or equivalent document byte/rate policy.
        // storage-egress-guard: agreement document route does not expose unbounded raw document bytes.
        // safe-url-guard: raw agreement Storage URLs are not exposed by default.
        // creator-document-scope: agreement document access is scoped to the authenticated creator/user.
        const caller = await guardApiRequest(request, {
            routeName: "creator/onboarding/agreement-document",
            rateLimit: MEDIA_PROXY,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });

        if (!caller?.uid) {
            return jsonError(401, "Unauthorized");
        }

        if (!adminDb || !adminStorage) {
            return jsonError(500, "Agreement document storage is unavailable.");
        }

        // cost-bound: single Firestore document read scoped to the authenticated creator/user; not a collection scan.
        const onboardingSnap = await adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(caller.uid).get();
        const canonical = normalizeCreatorOnboardingCanonicalRecord(onboardingSnap.data());
        if (!canonical || canonical.contractDocumentStatus !== "contract_sent") {
            return jsonError(404, "No agreement document has been sent to this account yet.");
        }

        if (!canonical.agreementTemplateId) {
            return jsonError(404, "No uploaded agreement document is available for this agreement.");
        }

        // cost-bound: single Firestore document read scoped to the creator's dispatched agreement template id.
        const templateSnap = await adminDb
            .collection(CREATOR_AGREEMENT_TEMPLATE_COLLECTION)
            .doc(canonical.agreementTemplateId)
            .get();
        const template = normalizeCreatorAgreementTemplate(templateSnap.data());
        const storagePath = template?.pdfStoragePath || template?.fullTextStoragePath;

        if (!template || !storagePath || template.agreementHash !== canonical.agreementHash) {
            return jsonError(404, "No uploaded agreement document is available for this agreement.");
        }
        if (!isSafeCreatorAgreementDocumentPath(storagePath)) {
            return jsonError(400, "Invalid agreement document reference.");
        }

        const [url] = await adminStorage.bucket().file(storagePath).getSignedUrl({
            action: "read",
            expires: Date.now() + CREATOR_AGREEMENT_DOCUMENT_SIGNED_URL_TTL_MS,
        });
        if (!isSafeCreatorAgreementSignedUrl(url)) {
            return jsonError(500, "Agreement document preview is unavailable.");
        }

        return NextResponse.redirect(url);
    } catch (error) {
        return handleApiError(error, "Creator.Onboarding.AgreementDocument.GET");
    }
}

export let GET = withRouteRuntimeHealth("creator/onboarding/agreement-document:GET", GET_handler);
