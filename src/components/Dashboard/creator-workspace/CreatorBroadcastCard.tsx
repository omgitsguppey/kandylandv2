import { Badge } from "@/components/ui/badge";
import { ContentSection } from "@/components/ui/content-layout";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
        <ContentSection
            className="rounded-2xl bg-card p-5 "
            data-creator-broadcast-mobile-priority={broadcastSourceReady ? "ready" : "deferred"}
            data-broadcast-audience="followers"
            data-broadcast-copy-audited="true"
            data-broadcast-capability-source={broadcastCapabilitySource}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary"><Megaphone className="h-4 w-4 text-primary" /> Fans & followers</p>
                    <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">Send a broadcast</h3>
                </div>
                <Badge variant="secondary" className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground">Followers</Badge>
            </div>
            <div className="mt-5">
                {broadcastSourceReady ? (
                    <>
                        <Textarea
                            value={broadcastDraft}
                            onChange={(event) => onDraftChange(event.target.value.slice(0, 280))}
                            rows={2}
                            placeholder="Message your followers..."
                            className="min-h-24 w-full resize-none rounded-2xl bg-secondary px-4 py-3 text-sm text-foreground placeholder-white/30 focus:border-primary/50 focus:outline-none"
                        />
                        <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="text-xs text-muted-foreground">{broadcastDraft.length}/280</span>
                            <Button
                                variant="brand"
                                size="sm"
                                isLoading={busy}
                                disabled={broadcastDraft.trim().length < 4 || isProjectionMode}
                                onClick={onSend}
                                className="min-h-11 rounded-xl px-4 text-sm font-semibold"
                            >
                                <Send className="mr-1 h-4 w-4" /> Send broadcast
                            </Button>
                        </div>
                    </>
                ) : (
                    <Card className="gap-0 py-0 rounded-2xl border border-dashed border-border bg-secondary px-4 py-4 text-sm text-muted-foreground">
                        Broadcasts need setup before an audience message can be sent.
                    </Card>
                )}
            </div>
        </ContentSection>
    );
}
