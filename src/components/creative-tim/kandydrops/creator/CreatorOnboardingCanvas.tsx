import type { ReactNode } from "react";

type CreatorOnboardingCanvasProps = {
    children: ReactNode;
};

export function CreatorOnboardingCanvas({ children }: CreatorOnboardingCanvasProps) {
    return (
        <main className="relative min-h-screen overflow-hidden bg-[#08050d] px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-24 text-white sm:px-6 sm:pt-28">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_12%_8%,rgba(178,140,255,0.28),transparent_32%),radial-gradient(circle_at_88%_4%,rgba(255,111,207,0.16),transparent_24%),linear-gradient(180deg,rgba(28,13,48,0.5),transparent)]" />
            <div className="relative mx-auto w-full max-w-7xl">{children}</div>
        </main>
    );
}