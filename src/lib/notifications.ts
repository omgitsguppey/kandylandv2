
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    serverTimestamp,
    updateDoc,
    doc,
    arrayUnion
} from "firebase/firestore";

export interface NotificationPayload {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    target: {
        global: boolean;
        userIds?: string[];
    };
    link?: string;
}

export async function sendNotification(payload: NotificationPayload) {
    try {
        await addDoc(collection(db, "notifications"), {
            ...payload,
            createdAt: serverTimestamp(),
            readBy: []
        });
        return { success: true };
    } catch (error) {
        console.error("Error sending notification:", error);
        return { success: false, error };
    }
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
    try {
        const ref = doc(db, "notifications", notificationId);
        await updateDoc(ref, {
            readBy: arrayUnion(userId)
        });
        return true;
    } catch (error) {
        console.error("Error marking notification as read:", error);
        return false;
    }
}
