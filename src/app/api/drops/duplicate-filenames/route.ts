import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";

const duplicateFilenameSchema = z.object({
    fileNames: z.array(z.string().trim().min(1)).min(1),
    excludeDropId: z.string().trim().optional(),
});

function normalizeFileName(value: string) {
    return value.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "drops/duplicate-filenames",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { fileNames, excludeDropId } = duplicateFilenameSchema.parse(await request.json());
        const normalizedTargets = Array.from(new Set(fileNames.map(normalizeFileName)));
        const snapshot = await adminDb.collection("drops").where("creatorId", "==", caller.uid).get();

        const matches = snapshot.docs.flatMap((doc) => {
            if (excludeDropId && doc.id === excludeDropId) {
                return [];
            }

            const data = doc.data() as Record<string, unknown>;
            const coverNames = typeof data.coverFileName === "string" ? [data.coverFileName] : [];
            const contentNames = Array.isArray(data.contentFileNames)
                ? data.contentFileNames.filter((entry): entry is string => typeof entry === "string")
                : [];
            const names = [...coverNames, ...contentNames].map(normalizeFileName);
            const duplicates = names.filter((name) => normalizedTargets.includes(name));
            if (duplicates.length === 0) {
                return [];
            }

            return [{
                dropId: doc.id,
                title: typeof data.title === "string" ? data.title : "Drop",
                creatorId: typeof data.creatorId === "string" ? data.creatorId : null,
                approvalStatus: typeof data.approvalStatus === "string" ? data.approvalStatus : "approved",
                duplicateFileNames: duplicates,
            }];
        });

        return NextResponse.json({
            success: true,
            duplicates: matches,
            hasDuplicates: matches.length > 0,
        });
    } catch (error) {
        return handleApiError(error, "Drops.DuplicateFilenames.POST");
    }
}
