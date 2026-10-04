import { Megaphone, Send } from "lucide-react";

import { Button } from "@/components/ui/Button";

export function CreatorBroadcastCard({
    broadcastDraft,
    broadcastSourceReady,
    broadcastCapabilitySource,
    busy,
    isProjectionMode,
    onDraftChange,
    onSend,
}: {
    broadcastDraft: string;
    broadcastSourceReady: boolean;
    broadcastCapabilitySource: string;
    busy: boolean;
    isProjectionMode: boolean;
    onDraftChange: (value: string) => void;
    onSend: () => void;
}) {
    return (
        <section
            className="rounded-[1.75rem] border border-white/10 bg-[#120b20]/90 p-5 shadow-[0_18px_44px_rgba(0,0,0,0.24)]"
            data-creator-broadcast-mobile-priority={broadcastSourceReady ? "ready" : "deferred"}
            data-broadcast-audience="followers"
            data-broadcast-copy-audited="true"
            data-broadcast-capability-source={broadcastCapabilitySource}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-200"><Megaphone className="h-4 w-4 text-brand-purple" /> Audience signal</p>
                    <h3 className="mt-1 text-lg font-black tracking-tight text-white">Send a broadcast</h3>
                </div>
                <span className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-zinc-300">Followers</span>
            </div>
            <div className="mt-5">
                {broadcastSourceReady ? (
                    <>
                        <textarea
                            value={broadcastDraft}
                            onChange={(event) => onDraftChange(event.target.value.slice(0, 280))}
                            rows={2}
                            placeholder="Message your followers..."
                            className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-brand-purple/50 focus:outline-none"
                        />
                        <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="text-xs text-zinc-500">{broadcastDraft.length}/280</span>
                            <Button
                                variant="brand"
                                size="sm"
                                isLoading={busy}
                                disabled={broadcastDraft.trim().length < 4 || isProjectionMode}
                                onClick={onSend}
                                className="min-h-11 rounded-xl px-4 text-sm font-bold"
                            >
                                <Send className="mr-1 h-4 w-4" /> Send broadcast
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-4 text-sm text-zinc-300">
                        Broadcasts need setup before an audience message can be sent.
                    </div>
                )}
            </div>
        </section>
    );
}
