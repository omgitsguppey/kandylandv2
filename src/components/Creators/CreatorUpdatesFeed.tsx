"use client";

type CreatorUpdatesFeedProps = {
    broadcasts: Array<Record<string, unknown>>;
};

export function CreatorUpdatesFeed({ broadcasts }: CreatorUpdatesFeedProps) {
    if (broadcasts.length === 0) {
        return null;
    }

    return (
        <section
            className="space-y-3"
            data-creator-profile-timeline-preview="broadcasts"
            data-mobile-timeline-preview="compact"
        >
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">Updates</h2>
            <div className="space-y-2">
                {broadcasts.map((broadcast) => {
                    const broadcastBody = typeof broadcast.body === "string"
                        ? broadcast.body
                        : typeof broadcast.message === "string"
                            ? broadcast.message
                            : "";

                    return (
                        <article
                            key={String(broadcast.id)}
                            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                        >
                            <p className="text-sm font-semibold text-white">
                                {typeof broadcast.title === "string" && broadcast.title.trim().length > 0 ? broadcast.title : "Creator update"}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-gray-400">{broadcastBody}</p>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
