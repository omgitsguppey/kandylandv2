"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { requestFirebaseNotificationPermission } from "@/lib/firebase-messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase-data";

export function NotificationPromptBanner() {
    const { user, userProfile } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Only show if user is logged in, and we haven't asked yet or they haven't granted it.
        // Wait a few seconds so it's not aggressive on load.
        if (user && userProfile && !isDismissed) {
            if ("Notification" in window && Notification.permission === "default") {
                const timer = setTimeout(() => setIsVisible(true), 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [user, userProfile, isDismissed]);

    const handleEnable = async () => {
        setIsVisible(false);
        const token = await requestFirebaseNotificationPermission();
        if (token && user) {
            // Save token to user profile
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                fcmTokens: arrayUnion(token)
            });
        }
        setIsDismissed(true);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        setIsDismissed(true);
        // Could save dismissal state to local storage if desired
    };

    if (!isVisible) return null;

    return (
        <div className="bg-brand-purple/20 border-b border-brand-purple/30 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-pink/20 rounded-full">
                        <Bell className="w-4 h-4 text-brand-pink" />
                    </div>
                    <p className="text-sm text-brand-purple-light font-medium">
                        Never miss a Kandy Drop! <span className="hidden md:inline text-gray-400">Enable notifications to be alerted when exclusive drops go live.</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleEnable}
                        className="text-xs font-bold text-white bg-brand-pink hover:bg-brand-purple px-4 py-2 rounded-full transition-colors"
                    >
                        Enable
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="p-2 text-gray-400 hover:text-white transition-colors rounded-full"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
