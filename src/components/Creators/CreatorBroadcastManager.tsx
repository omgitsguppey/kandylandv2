"use client";

import { Badge } from "@/components/ui/badge";

import { ContentSection, GroupedRow } from "@/components/ui/content-layout";
import { Card } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/Button";

import { ChevronDown, ChevronUp, Loader2, Megaphone, RefreshCw, Send } from "lucide-react";
import { HumanErrorNotice } from "@/components/errors/HumanErrorNotice";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";

import { buildBugReportContext, getSafePreviousRoute } from "@/lib/errors/client-error-adapter";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { useCreatorBroadcastManager, formatDateTime, getStatusTone, statusLabel } from "./useCreatorBroadcastManager";

export function CreatorBroadcastManager({
  creatorId,
  creatorName,
  broadcastsEnabled = true,
  broadcastsRestricted = false,
}: {
  creatorId: string;
  creatorName: string;
  broadcastsEnabled?: boolean;
  broadcastsRestricted?: boolean;
}) {
const { broadcasts, loading, expandedId, setExpandedId, title, setTitle, message, setMessage, sending, error, actionError, bugReporter, readOnly, actorRole, canReadBroadcasts, canSendBroadcast, blockedTruthState, loadBroadcasts, handleSend } = useCreatorBroadcastManager({
  creatorId,
  creatorName,
  broadcastsEnabled,
  broadcastsRestricted,
});

return (
    <ContentSection className="overflow-hidden rounded-2xl bg-card p-5  sm:p-6">
      <PageViewEvent
        eventName="creator_broadcast_manager_viewed"
        eventParams={{
          actor_role: actorRole,
          creator_id: creatorId,
          target_creator_id: creatorId,
          section: "broadcasts",
          source_component: "CreatorBroadcastManager",
          truth_state: readOnly ? "blocked" : canReadBroadcasts ? "live" : blockedTruthState,
        }}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Audience signal</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Send a clear update to your fans</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Review what {creatorName} sent, see delivery status, and send a new update.</p>
        </div>
        <Button variant="ghost"
          type="button"
          onClick={() => void loadBroadcasts()}
          disabled={!canReadBroadcasts || loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 text-xs font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <ContentSection className="mt-5 rounded-2xl bg-secondary p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-base font-semibold text-foreground">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Megaphone className="h-5 w-5" /></span>
            Create broadcast
          </div>
          <Badge variant="secondary" className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground" data-broadcast-audience="followers">Audience: Followers</Badge>
        </div>
        <div className="mt-5 space-y-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value.slice(0, 80))}
            placeholder="Optional title"
            className="min-h-11 w-full rounded-2xl bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
            maxLength={80}
            disabled={!canSendBroadcast}
          />
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, 280))}
            placeholder="Message your followers"
            rows={3}
            className="min-h-28 w-full resize-none rounded-2xl bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
            maxLength={280}
            disabled={!canSendBroadcast}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{message.length}/280</p>
            <Button variant="ghost"
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !canSendBroadcast || message.trim().length < 4}
              aria-busy={sending}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" />}
              Create broadcast
            </Button>
          </div>
          {readOnly ? <p className="text-xs text-muted-foreground">Read-only projection. Broadcast creation is disabled.</p> : null}
          {!readOnly && !canReadBroadcasts ? <p className="text-xs text-muted-foreground">Broadcasts are unavailable for this creator.</p> : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          {actionError ? (
            <HumanErrorNotice
              descriptor={actionError.descriptor}
              compact
              className="mt-2"
              onPrimaryAction={(action) => {
                if (action === "refresh" || action === "retry") {
                  void loadBroadcasts();
                }
              }}
              onSubmitBug={() => bugReporter.submit(actionError.descriptor, buildBugReportContext({
                descriptor: actionError.descriptor,
                route: actionError.route,
                previousRoute: getSafePreviousRoute(),
                extra: actionError.context,
              }))}
            />
          ) : null}
        </div>
      </ContentSection>

      <div className="mt-5 space-y-3">
        {loading ? (
          <Card className="gap-0 py-0 rounded-2xl  bg-secondary p-4 text-sm text-muted-foreground">Loading broadcasts...</Card>
        ) : broadcasts.length === 0 ? (
          <Card className="gap-0 py-0 rounded-2xl border border-dashed border-border bg-secondary p-5">
            <p className="text-sm font-semibold text-foreground">No broadcasts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Broadcasts you send from here will show up in newest-first order.</p>
          </Card>
        ) : broadcasts.map((broadcast) => {
          const status = (broadcast.status || "sent").toString();
          const expanded = expandedId === broadcast.id;
          return (
            <GroupedRow key={broadcast.id} className="rounded-2xl bg-secondary p-4 sm:p-5">
              <Button variant="ghost"
                type="button"
                aria-expanded={expanded}
                onClick={() => {
                  setExpandedId(expanded ? null : broadcast.id);
                  trackEvent("creator_broadcast_detail_viewed", {
                    actor_role: actorRole,
                    creator_id: creatorId,
                    target_creator_id: creatorId,
                    section: "broadcasts",
                    broadcast_id: broadcast.id,
                    source_component: "CreatorBroadcastManager",
                    truth_state: status,
                  });
                }}
                className="flex min-h-11 w-full items-start justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{broadcast.title?.trim() || "Creator update"}</p>
                    <Badge variant="secondary" className={cn("rounded-xl border px-2.5 py-1 text-xs font-semibold", getStatusTone(status))}>
                      {statusLabel(status)}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{broadcast.message || "Not tracked yet"}</p>
                  <p className="mt-2 text-xs font-semibold text-primary">View details</p>
                </div>
                {expanded
                  ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
              </Button>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <Card className="gap-0 py-0 rounded-xl  bg-secondary px-3 py-2">Created {formatDateTime(broadcast.createdAtMs)}</Card>
                <Card className="gap-0 py-0 rounded-xl  bg-secondary px-3 py-2">Sent {formatDateTime(broadcast.sentAtMs)}</Card>
                <Card className="gap-0 py-0 rounded-xl  bg-secondary px-3 py-2">Audience {broadcast.audienceNotificationCount ?? broadcast.audienceFanCount ?? "Not tracked yet"}</Card>
              </div>
              {expanded ? (
                <Card className="gap-0 py-0 mt-4 space-y-3 rounded-2xl  bg-secondary p-4 text-sm text-muted-foreground">
                  <p>{broadcast.message || "Not tracked yet"}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <Card className="gap-0 py-0 rounded-xl  bg-secondary px-3 py-2">Delivered {broadcast.deliveryCount ?? "Not tracked yet"}</Card>
                    <Card className="gap-0 py-0 rounded-xl  bg-secondary px-3 py-2">Opened {broadcast.openCount ?? "Not tracked yet"}</Card>
                  </div>
                  {broadcast.failureReason ? <p className="text-xs text-destructive">Failure: {broadcast.failureReason}</p> : null}
                </Card>
              ) : null}
            </GroupedRow>
          );
        })}
      </div>
    </ContentSection>
  );
}
