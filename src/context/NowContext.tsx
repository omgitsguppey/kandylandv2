"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface NowContextType {
    now: number;
}

const NowContext = createContext<NowContextType | null>(null);

export function NowProvider({ children }: { children: ReactNode }) {
    const [now, setNow] = useState<number>(Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <NowContext.Provider value={{ now }}>
            {children}
        </NowContext.Provider>
    );
}

export const useNow = () => {
    const context = useContext(NowContext);
    if (!context) {
        // Fallback for components used outside provider (though shouldn't happen)
        return { now: Date.now() };
    }
    return context;
};
