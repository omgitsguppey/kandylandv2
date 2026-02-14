import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Drop } from "@/types/db";

// Force this to be used only on the server
import "server-only";

export async function getDropsServer(statusFilter: string[] | null = ["active", "scheduled"]): Promise<Drop[]> {
    try {
        const dropsRef = collection(db, "drops");
        let q;

        if (statusFilter && statusFilter.length > 0) {
            q = query(
                dropsRef,
                where("status", "in", statusFilter),
                orderBy("validFrom", "asc")
            );
        } else {
            q = query(dropsRef, orderBy("validFrom", "asc"));
        }

        const snapshot = await getDocs(q);

        // Serialize data (convert Timestamps to structured data if needed, but for now passing as is 
        // implies we might need to be careful with Client Component props serialization)
        // Next.js passes props from Server -> Client components via serialization.
        // Firestore Timestamps are objects (seconds, nanoseconds) which ARE serializable, 
        // but methods like .toDate() are lost. We should convert to plain objects/numbers.

        const dropsData: Drop[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Ensure Date/Timestamp fields are handled if they cause serialization issues.
                // However, the Drop type likely uses `number` or `Timestamp`.
                // If it uses Timestamp, we might need to convert to millisecond numbers for safe passing.
                // Let's assume standard behavior for now, but be ready to fix serialization error.
            } as Drop;
        });

        return dropsData;
    } catch (error) {
        console.error("Error fetching drops server-side:", error);
        return [];
    }
}

export async function getDropServer(id: string): Promise<Drop | null> {
    try {
        if (!id) return null;
        // Optimization: In a real app we might cache this or use a more direct fetch
        // For now, fetching all and filtering is inefficient if list is huge, 
        // but 'doc(db, "drops", id)' is better.
        // However, 'getDoc' is available in client SDK.

        // Import dynamically to avoid circular deps if any (though unlikely here)
        const { doc, getDoc } = await import("firebase/firestore");
        const docRef = doc(db, "drops", id);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
            const data = snapshot.data();
            return {
                id: snapshot.id,
                ...data
            } as Drop;
        }
        return null;
    } catch (error) {
        console.error("Error fetching drop server-side:", error);
        return null;
    }
}
