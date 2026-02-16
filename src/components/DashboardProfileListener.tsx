"use client";

import { useAuthIdentity, useUserProfile } from "@/context/AuthContext";
import { db } from "@/lib/firebase-data";
import { UserProfile } from "@/types/db";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect } from "react";

export function DashboardProfileListener() {
    const { user } = useAuthIdentity();
    const { setUserProfile } = useUserProfile();

    useEffect(() => {
        if (!user) return;

        console.log("Starting Dashboard Realtime Profile Listener");
        const unsubscribe = onSnapshot(doc(db, "users", user.uid), (doc) => {
            if (doc.exists()) {
                setUserProfile(doc.data() as UserProfile);
            }
        });

        return () => {
            console.log("Stopping Dashboard Realtime Profile Listener");
            unsubscribe();
        };
    }, [user, setUserProfile]);

    return null; // Logic only component
}
