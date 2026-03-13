"use client";

import { Candy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

interface ShowUnwrapSuccessToastParams {
    dropTitle: string;
    onTaste: () => void;
}

export function showUnwrapSuccessToast({ dropTitle, onTaste }: ShowUnwrapSuccessToastParams) {
    return toast.custom((toastId) => (
        <div className="pointer-events-auto w-[min(30rem,calc(100vw-2rem))] overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#09090f]/95 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand-purple/20 bg-brand-purple/12 text-brand-purple">
                    <Candy className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-purple">Freshly Unwrapped</p>
                    <h3 className="mt-1 text-base font-bold leading-tight text-white">
                        You&apos;ve Unwrapped: {dropTitle}!
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-gray-300">
                        Get a taste now or unwrap more flavors!
                    </p>
                </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                    type="button"
                    variant="brand"
                    className="h-11 flex-1 rounded-2xl"
                    onClick={() => {
                        toast.dismiss(toastId);
                        onTaste();
                    }}
                >
                    Taste Your Kandy
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1 rounded-2xl border-white/15 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => {
                        toast.dismiss(toastId);
                    }}
                >
                    Unwrap More Drops
                </Button>
            </div>
        </div>
    ), {
        duration: 9000,
    });
}
