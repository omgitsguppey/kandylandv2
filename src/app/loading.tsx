"use client";

import { motion } from "framer-motion";
import { CandyIcon } from "@/components/ui/Icon";

export default function Loading() {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black">
            <div className="w-10 h-10 rounded-full border-[3px] border-brand-purple/20 border-t-brand-purple animate-spin mb-4" />
            <p className="text-brand-purple/80 text-sm tracking-widest uppercase font-medium mt-2">Please wait</p>
        </div>
    );
}
