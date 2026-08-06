import { Megaphone, Send } from "lucide-react";

import { Badge } from "@/components/creative-tim/ui/badge";
import { Card } from "@/components/creative-tim/ui/card";
import { Separator } from "@/components/creative-tim/ui/separator";
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
        <Card
            className="rounded-2xl border-white/10 bg-black/40 !gap-0 !p-0 sm:rounded-3xl"
            data-creator-broadcast-mobile-priority={broadcastSourceReady ? "ready" : "deferred"}
            data-broadcast-audience="followers"
            data-broadcast-copy-audited="true"
            data-broadcast-capability-source={broadcastCapabilitySource}
        >
            <div className="p-3 sm:p-4">
                <h3 className="flex items-center gap-2 text-xs font-bold text-white sm:text-sm">
                    <Megaphone className="h-3.5 w-3.5 text-brand-purple sm:h-4 sm:w-4" />
                    Quick Broadcast
                </h3>
                <Separator className="my-2 bg-white/10 sm:my-3" />
                {broadcastSourceReady ? (
                    <>
                        <Badge className="mb-2 rounded-full border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-300 hover:bg-white/5">
                            Audience: Followers
                        </Badge>
                        <textarea
                            value={broadcastDraft}
                            onChange={(event) => onDraftChange(event.target.value.slice(0, 280))}
                            rows={2}
                            placeholder="Message your followers..."
                            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-purple/50 focus:outline-none"
                        />
                        <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">{broadcastDraft.length}/280</span>
                            <Button
                                variant="brand"
                                size="sm"
                                isLoading={busy}
                                disabled={broadcastDraft.trim().length < 4 || isProjectionMode}
                                onClick={onSend}
                                className="h-8 rounded-full px-4 text-xs font-bold"
                            >
                                <Send className="mr-1 h-3 w-3" /> Send
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300">
                        Broadcasts need setup.
                    </div>
                )}
            </div>
        </Card>
    );
}