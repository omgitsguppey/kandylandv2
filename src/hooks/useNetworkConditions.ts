"use client";

import { useEffect, useState } from "react";

type EffectiveConnectionType = "slow-2g" | "2g" | "3g" | "4g" | null;

interface NetworkInformationLike {
    addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
    removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
    downlink?: number;
    effectiveType?: string;
    saveData?: boolean;
}

type NetworkConditions = {
    downlinkMbps: number | null;
    effectiveType: EffectiveConnectionType;
    isConstrained: boolean;
    isVerySlow: boolean;
    saveData: boolean;
};

const DEFAULT_NETWORK_CONDITIONS: NetworkConditions = {
    downlinkMbps: null,
    effectiveType: null,
    isConstrained: false,
    isVerySlow: false,
    saveData: false,
};

function readNetworkConditions(): NetworkConditions {
    if (typeof navigator === "undefined") {
        return DEFAULT_NETWORK_CONDITIONS;
    }

    const runtimeNavigator = navigator as Navigator & {
        connection?: NetworkInformationLike;
        mozConnection?: NetworkInformationLike;
        webkitConnection?: NetworkInformationLike;
    };
    const connection =
        runtimeNavigator.connection ??
        runtimeNavigator.mozConnection ??
        runtimeNavigator.webkitConnection;

    if (!connection) {
        return DEFAULT_NETWORK_CONDITIONS;
    }

    const rawEffectiveType = typeof connection.effectiveType === "string"
        ? connection.effectiveType
        : null;
    const effectiveType =
        rawEffectiveType === "slow-2g" ||
        rawEffectiveType === "2g" ||
        rawEffectiveType === "3g" ||
        rawEffectiveType === "4g"
            ? rawEffectiveType
            : null;
    const downlinkMbps = typeof connection.downlink === "number" && Number.isFinite(connection.downlink)
        ? connection.downlink
        : null;
    const saveData = connection.saveData === true;
    const isVerySlow = saveData || effectiveType === "slow-2g" || effectiveType === "2g";
    const isConstrained =
        isVerySlow ||
        effectiveType === "3g" ||
        (downlinkMbps !== null && downlinkMbps > 0 && downlinkMbps < 1.5);

    return {
        downlinkMbps,
        effectiveType,
        isConstrained,
        isVerySlow,
        saveData,
    };
}

export function useNetworkConditions() {
    const [conditions, setConditions] = useState<NetworkConditions>(() => (
        typeof window === "undefined" ? DEFAULT_NETWORK_CONDITIONS : readNetworkConditions()
    ));

    useEffect(() => {
        const runtimeNavigator = navigator as Navigator & {
            connection?: NetworkInformationLike;
            mozConnection?: NetworkInformationLike;
            webkitConnection?: NetworkInformationLike;
        };
        const connection =
            runtimeNavigator.connection ??
            runtimeNavigator.mozConnection ??
            runtimeNavigator.webkitConnection;

        if (!connection?.addEventListener || !connection.removeEventListener) {
            return;
        }

        const handleChange = () => {
            setConditions(readNetworkConditions());
        };

        connection.addEventListener("change", handleChange);
        return () => {
            connection.removeEventListener?.("change", handleChange);
        };
    }, []);

    return conditions;
}
