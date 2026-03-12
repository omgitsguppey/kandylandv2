"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface NowContextType {
    now: number;
}

const NowContext = createContext<NowContextType | null>(null);
const INITIAL_NOW = Date.now();

export function NowProvider({ children }: { children: ReactNode }) {
    const [now, setNow] = useState<number>(INITIAL_NOW);

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
        return { now: INITIAL_NOW };
    }
    return context;
};
