"use client";

import { useEffect } from "react";

import { registerAppServiceWorker } from "@/lib/firebase-messaging";

export function PwaRuntimeBridge() {
    useEffect(() => {
        void registerAppServiceWorker();
    }, []);

    return null;
}
