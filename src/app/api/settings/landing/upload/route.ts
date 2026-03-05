import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/server/firebase-admin";
import { verifyAdmin, handleApiError } from "@/lib/server/auth";

function isImageFormat(mimeType: string) {
    return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType);
}

export async function POST(request: NextRequest) {
    try {
        await verifyAdmin(request);

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const key = formData.get("key") as string | null;

        if (!file || !key) {
            return NextResponse.json({ error: "Missing required fields (file, key)" }, { status: 400 });
        }

        if (!isImageFormat(file.type)) {
            return NextResponse.json({ error: "Invalid file type. Only images (JPG, PNG, GIF, WebP) are allowed." }, { status: 400 });
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

        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type,
                cacheControl: 'public, max-age=31536000'
            }
        });

        // Use the standard Firebase Storage public URL format
        const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

        // Update settings in Firestore
        const landingSettingsRef = adminDb.collection("settings").doc("landing");
        await landingSettingsRef.set({
            [key]: downloadURL
        }, { merge: true });

        return NextResponse.json({ success: true, url: downloadURL });
    } catch (error: any) {
        return handleApiError(error, "Settings.Landing.Upload");
    }
}
