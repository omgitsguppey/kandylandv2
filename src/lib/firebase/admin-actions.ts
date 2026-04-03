/**
 * Atomically adjusts a user's Gum Drop balance and logs the transaction.
 * Now calls the server-side API route with authentication.
 * 
 * @param userId - The ID of the user to adjust.
 * @param amount - The amount to add (positive) or remove (negative).
 * @param reason - The reason for the adjustment (required).
 * @returns Object containing success status and new balance.
 */
"use client";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";

export async function adjustUserBalance(userId: string, amount: number, reason: string) {
    if (!userId || !amount || !reason) {
        return { success: false, error: "Missing required parameters for balance adjustment." };
    }

    try {
        const response = await authFetch("/api/admin/balance", {
            method: "POST",
            body: JSON.stringify({
                userId,
                amount,
                reason,
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            return { success: false, error: result.error || "Balance adjustment failed" };
        }

        return {
            success: true,
            newBalance: typeof result.balanceAfter === "number" ? result.balanceAfter : undefined,
        };
    } catch (error: any) {
        reportClientIssue({
            channel: "ui",
            message: "Admin balance adjustment failed",
            error,
            detail: {
                context: "Balance Adjustment Error",
                userId,
                amount,
            },
            consoleLabel: "[Admin Balance] adjustment failed",
        });
        return { success: false, error: error.message };
    }
}
