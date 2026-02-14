import "server-only";
import { adminDb } from "./firebase-admin";
import { Drop } from "@/types/db";

export async function getDrops(): Promise<Drop[]> {
    try {
        if (!adminDb) return [];
        const dropsRef = adminDb.collection("drops");
        const snapshot = await dropsRef.orderBy("createdAt", "desc").get();

        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Ensure dates are serializable if needed, but for now passing raw timestamps is okay 
                // if client component handles them. 
                // Firestore timestamps needs conversion for Client Components.
                createdAt: data.createdAt?.toMillis?.() || data.createdAt,
                validFrom: data.validFrom?.toMillis?.() || data.validFrom,
                validUntil: data.validUntil?.toMillis?.() || data.validUntil,
            } as unknown as Drop;
        });
    } catch (error) {
        console.error("Error fetching drops:", error);
        return [];
    }
}

export const getDropsServer = getDrops; // Alias for backward compatibility if needed

export async function getDrop(id: string): Promise<Drop | null> {
    try {
        if (!adminDb) return null;
        const docRef = adminDb.collection("drops").doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return null;
        }

        const data = docSnap.data()!;
        return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toMillis?.() || data.createdAt,
            validFrom: data.validFrom?.toMillis?.() || data.validFrom,
            validUntil: data.validUntil?.toMillis?.() || data.validUntil,
        } as unknown as Drop;
    } catch (error) {
        console.error("Error fetching drop:", error);
        return null;
    }
}

export const getDropServer = getDrop;
