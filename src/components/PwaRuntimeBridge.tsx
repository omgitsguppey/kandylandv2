"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { KANDYDROPS_APP_UPDATE_EVENT, registerAppServiceWorker } from "@/lib/firebase-messaging";

export function PwaRuntimeBridge() {
    useEffect(() => {
        void registerAppServiceWorker();
    }, []);

    useEffect(() => {
        const handleUpdateAvailable = () => {
            toast("New version available", {
                description: "Refresh to load the latest KandyDrops build.",
                action: {
                    label: "Refresh",
                    onClick: () => window.location.reload(),
                },
                duration: 12000,
            });
        };

        window.addEventListener(KANDYDROPS_APP_UPDATE_EVENT, handleUpdateAvailable);
        return () => window.removeEventListener(KANDYDROPS_APP_UPDATE_EVENT, handleUpdateAvailable);
    }, []);

    return null;
}
