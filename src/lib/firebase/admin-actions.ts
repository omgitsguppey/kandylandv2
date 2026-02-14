import { db } from "@/lib/firebase";
import { doc, runTransaction, serverTimestamp, collection } from "firebase/firestore";

/**
 * Atomically adjusts a user's Gum Drop balance and logs the transaction.
 * 
 * @param userId - The ID of the user to adjust.
 * @param amount - The amount to add (positive) or remove (negative).
 * @param reason - The reason for the adjustment (required).
 * @param adminId - The ID of the admin performing the action.
 * @returns Object containing success status and new balance.
 */
export async function adjustUserBalance(userId: string, amount: number, reason: string, adminId: string) {
    if (!userId || !amount || !reason || !adminId) {
        throw new Error("Missing required parameters for balance adjustment.");
    }

    try {
        const result = await runTransaction(db, async (transaction) => {
            const userRef = doc(db, "users", userId);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists()) {
                throw new Error("User does not exist!");
            }

            const currentBalance = userDoc.data().gumDropsBalance || 0;
            const newBalance = currentBalance + amount;

            if (newBalance < 0) {
                throw new Error(`Insufficient funds. Cannot deduct ${Math.abs(amount)} from ${currentBalance}.`);
            }

            // 1. Update User Balance
            transaction.update(userRef, {
                gumDropsBalance: newBalance
            });

            // 2. Create Ledger Entry
            const transactionRef = doc(collection(db, "transactions"));
            transaction.set(transactionRef, {
                userId,
                amount,
                type: 'admin_adjustment',
                description: reason,
                adminId,
                timestamp: serverTimestamp(),
                balanceAfter: newBalance
            });

            return newBalance;
        });

        return { success: true, newBalance: result };
    } catch (error: any) {
        console.error("Balance Adjustment Error:", error);
        return { success: false, error: error.message };
    }
}
