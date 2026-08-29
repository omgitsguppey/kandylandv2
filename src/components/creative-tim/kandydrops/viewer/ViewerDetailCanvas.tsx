import type { ReactNode } from "react";

type ViewerDetailCanvasProps = {
    children: ReactNode;
    actions: ReactNode;
};

export function ViewerDetailCanvas({ children, actions }: ViewerDetailCanvasProps) {
    return (
        <section
            aria-label="KandyDrop details"
            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(192,38,211,0.18),transparent_32%),linear-gradient(145deg,rgba(30,5,57,0.96),rgba(8,8,23,0.96))] text-white shadow-2xl shadow-black/20"
        >
            <div className="px-5 py-6 sm:px-7 sm:py-7">
                {children}
                <div
                    aria-label="Viewer actions"
                    className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5"
                >
                    {actions}
                </div>
            </div>
        </section>
    );
}
