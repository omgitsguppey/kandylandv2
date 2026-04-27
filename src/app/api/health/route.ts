import "server-only";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";

// Ensure this route is never cached statically so we always get a live health reading.
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // Perform a lightweight check to ensure Firebase Admin is initialized.
        // If firebase-admin.ts failed to initialize due to missing env vars,
        // it would have thrown or adminDb would be undefined.
        if (!adminDb) {
            throw new Error("Firebase Admin Database not initialized");
        }

        // Return a successful health payload
        return NextResponse.json(
            {
                status: "healthy",
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || "unknown",
            },
            { status: 200 }
        );
    } catch (error) {
        // In the event of a failure, leverage the standard handleApiError 
        // to record a diagnostic event so this failure is not silent.
        return handleApiError(error, "deployment-health-check");
    }
}
