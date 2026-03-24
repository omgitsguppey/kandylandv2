import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN } from "@/lib/server/rate-limit";
import { isAllowedLandingAssetKey } from "@/lib/landing-assets";
import { guardApiRequest } from "@/lib/server/request-guard";

function isImageFormat(mimeType: string) {
    return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType);
}

function extractStorageObjectPath(downloadUrl: string, bucketName: string) {
    try {
        const parsedUrl = new URL(downloadUrl);
        const pathMatch = parsedUrl.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
        if (!pathMatch) {
            return null;
        }

        const [, bucketFromUrl, encodedObjectPath] = pathMatch;
        if (bucketFromUrl !== bucketName) {
            return null;
        }

        return decodeURIComponent(encodedObjectPath);
    } catch {
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "settings/landing/upload",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
        });

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const key = formData.get("key") as string | null;

        if (!file || !key) {
            return NextResponse.json({ error: "Missing required fields (file, key)" }, { status: 400 });
        }
        if (!isAllowedLandingAssetKey(key)) {
            return NextResponse.json({ error: "Invalid landing asset key." }, { status: 400 });
        }

        if (!isImageFormat(file.type)) {
            return NextResponse.json({ error: "Invalid file type. Only images (JPG, PNG, GIF, WebP) are allowed." }, { status: 400 });
        }
        if (!adminDb || !adminStorage) {
            return NextResponse.json({ error: "Database or storage not available" }, { status: 500 });
        }

        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: "File exceeds 10MB limit." }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const timestamp = Date.now();
        const extension = file.type.split('/')[1] || 'jpg';
        const fileName = `landing/assets/${key}_${timestamp}.${extension}`;

        const bucket = adminStorage.bucket();
        const fileRef = bucket.file(fileName);
        const landingSettingsRef = adminDb.collection("settings").doc("landing");
        const landingSettingsDoc = await landingSettingsRef.get();
        const previousUrl = landingSettingsDoc.exists ? landingSettingsDoc.get(key) : null;

        // Firebase Client SDK automatically mints download tokens, but the Admin SDK does not.
        // We must manually generate a token to make the file publicly readable via the standard URL format.
        const downloadToken = crypto.randomUUID();

        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type,
                cacheControl: 'public, max-age=31536000',
                metadata: {
                    firebaseStorageDownloadTokens: downloadToken
                }
            }
        });

        // Use the standard Firebase Storage public URL format with the minted token
        const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media&token=${downloadToken}`;

        try {
            await landingSettingsRef.set({
                [key]: downloadURL
            }, { merge: true });
        } catch (error) {
            await fileRef.delete({ ignoreNotFound: true }).catch((deleteError) => {
                console.error("Failed to clean up newly uploaded landing asset", deleteError);
            });
            throw error;
        }

        const previousObjectPath = typeof previousUrl === "string"
            ? extractStorageObjectPath(previousUrl, bucket.name)
            : null;
        if (previousObjectPath && previousObjectPath !== fileName) {
            await bucket.file(previousObjectPath).delete({ ignoreNotFound: true }).catch((error) => {
                console.error("Failed to remove replaced landing asset", error);
            });
        }

        return NextResponse.json({ success: true, url: downloadURL });
    } catch (error: any) {
        return handleApiError(error, "Settings.Landing.Upload");
    }
}
