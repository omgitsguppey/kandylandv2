import { ShieldCheck, Sparkles, Users } from "lucide-react";

const APPLICATION_STEPS = [
    {
        title: "Shape your creator identity",
        description: "Tell the review team who you create as, where you show up, and what your audience can expect.",
        icon: Sparkles,
    },
    {
        title: "Keep one clear application",
        description: "Your creator profile, review status, legal steps, and verification stay connected in one place.",
        icon: Users,
    },
    {
        title: "Open your creator tools",
        description: "Once approved, your dashboard becomes the workspace for drops, audience tools, and experiences.",
        icon: ShieldCheck,
    },
] as const;

export function CreatorApplicationMilestonePath() {
    return (
        <section
            aria-labelledby="creator-application-path"
            className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#120a20]/75 shadow-[0_22px_68px_rgba(0,0,0,0.3)] backdrop-blur-xl"
        >
            <div className="border-b border-white/10 px-6 py-5 sm:px-9 sm:py-6">
                <h2 id="creator-application-path" className="text-xs font-bold uppercase tracking-widest text-purple-200">
                    The path in front of you
                </h2>
            </div>

            <ol className="px-6 sm:px-9">
                {APPLICATION_STEPS.map((step, index) => {
                    const Icon = step.icon;

                    return (
                        <li
                            key={step.title}
                            className="flex gap-4 border-b border-white/10 py-5 last:border-b-0 sm:gap-5 sm:py-6"
                        >
                            <span
                                aria-hidden="true"
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/10 text-sm font-black text-brand-purple"
                            >
                                0{index + 1}
                            </span>
                            <div className="min-w-0 pt-0.5">
                                <div className="flex items-center gap-2">
                                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-pink" />
                                    <p className="text-sm font-bold text-white">{step.title}</p>
                                </div>
                                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-400">{step.description}</p>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
