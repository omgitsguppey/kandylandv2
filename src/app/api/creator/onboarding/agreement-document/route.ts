import { NextRequest, NextResponse } from "next/server";

import {
    CREATOR_AGREEMENT_TEMPLATE_COLLECTION,
    normalizeCreatorAgreementTemplate,
} from "@/lib/creator-agreement-documents";
import { normalizeCreatorOnboardingCanonicalRecord } from "@/lib/creator-onboarding";
import { handleApiError } from "@/lib/server/auth";
import { CREATOR_ONBOARDING_COLLECTION } from "@/lib/server/creator-onboarding";
import { adminDb, adminStorage } from "@/lib/server/firebase-admin";
import { STRICT } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

function jsonError(status: number, error: string) {
    return NextResponse.json({ error }, { status });
}

async function GET_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/onboarding/agreement-document",
            rateLimit: STRICT,
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

        const onboardingSnap = await adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(caller.uid).get();
        const canonical = normalizeCreatorOnboardingCanonicalRecord(onboardingSnap.data());
        if (!canonical || canonical.contractDocumentStatus !== "contract_sent") {
            return jsonError(404, "No agreement document has been sent to this account yet.");
        }

        if (!canonical.agreementTemplateId) {
            return jsonError(404, "No uploaded agreement document is available for this agreement.");
        }

        const templateSnap = await adminDb
            .collection(CREATOR_AGREEMENT_TEMPLATE_COLLECTION)
            .doc(canonical.agreementTemplateId)
            .get();
        const template = normalizeCreatorAgreementTemplate(templateSnap.data());
        const storagePath = template?.pdfStoragePath || template?.fullTextStoragePath;

        if (!template || !storagePath || template.agreementHash !== canonical.agreementHash) {
            return jsonError(404, "No uploaded agreement document is available for this agreement.");
        }

        const [url] = await adminStorage.bucket().file(storagePath).getSignedUrl({
            action: "read",
            expires: Date.now() + 5 * 60 * 1000,
        });

        return NextResponse.redirect(url);
    } catch (error) {
        return handleApiError(error, "Creator.Onboarding.AgreementDocument.GET");
    }
}

export let GET = withRouteRuntimeHealth("creator/onboarding/agreement-document:GET", GET_handler);
