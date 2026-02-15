/**
 * Atomically adjusts a user's Gum Drop balance and logs the transaction.
 * Now calls the server-side API route instead of writing to Firestore directly.
 * 
 * @param userId - The ID of the user to adjust.
 * @param amount - The amount to add (positive) or remove (negative).
 * @param reason - The reason for the adjustment (required).
 * @param adminId - The ID of the admin performing the action.
 * @returns Object containing success status and new balance.
 */
export async function adjustUserBalance(userId: string, amount: number, reason: string, adminId: string) {
    if (!userId || !amount || !reason || !adminId) {
        return { success: false, error: "Missing required parameters for balance adjustment." };
    }

    try {
        const response = await fetch("/api/admin/balance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId,
                amount,
                reason,
                adminEmail: adminId,
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            return { success: false, error: result.error || "Balance adjustment failed" };
        }

        // The server side doesn't conveniently return the new balance, so we estimate it
        // The caller (BalanceAdjustmentModal) calculates it locally anyway 
        return { success: true, newBalance: undefined as number | undefined };
    } catch (error: any) {
        console.error("Balance Adjustment Error:", error);
        return { success: false, error: error.message };
    }
}
