"use client";

import { Badge } from "@/components/ui/badge";

import { ContentSection, GroupedRow } from "@/components/ui/content-layout";

import { Button } from "@/components/ui/Button";

import { Loader2, RefreshCw } from "lucide-react";
import { HumanErrorNotice } from "@/components/errors/HumanErrorNotice";

import { buildBugReportContext, getSafePreviousRoute } from "@/lib/errors/client-error-adapter";
import { cn } from "@/lib/utils";
import { type CreatorRequestsManagerProps, useCreatorRequestsManager, statusTone, formatCount } from "./useCreatorRequestsManager";

export function CreatorRequestsManager({
  creatorId,
  creatorName,
  enabled,
  restricted,
  readOnly,
  sourceState,
}: CreatorRequestsManagerProps) {
const { loading, actionError, pendingActionId, bugReporter, canLoadRequests, loadRequests, visibleRequests, pendingRequests, acceptedRequests, unavailableMessage, handleAction } = useCreatorRequestsManager({
  creatorId,
  creatorName,
  enabled,
  restricted,
  readOnly,
  sourceState,
});

return (
    <ContentSection
      id="creator-requests-manager"
      className="overflow-hidden rounded-2xl bg-card p-5  sm:p-6"
      data-testid="creator-requests-manager"
      data-creator-requests-source-state={sourceState}
      data-creator-requests-load-state={canLoadRequests ? "connected" : "configuration_only"}
      data-creator-requests-read-only={readOnly ? "true" : "false"}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Request desk</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Custom work from your audience</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{canLoadRequests ? `${creatorName} has ${formatCount(visibleRequests.length)} loaded.` : unavailableMessage}</p>
        </div>
        <Button variant="ghost"
          type="button"
          onClick={() => void loadRequests()}
          disabled={!canLoadRequests || loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      {readOnly ? (
        <p className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">Read-only projection: request actions are disabled.</p>
      ) : null}
      {actionError ? (
        <HumanErrorNotice
          descriptor={actionError.descriptor}
          compact
          className="mt-3"
          onPrimaryAction={(action) => {
            if (action === "refresh" || action === "retry") {
              void loadRequests();
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

      {!canLoadRequests ? (
        <p className="mt-4 rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">{unavailableMessage}</p>
      ) : loading ? (
        <div className="mt-5 flex min-h-20 items-center gap-3 rounded-2xl bg-secondary px-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          Loading requests
        </div>
      ) : visibleRequests.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-secondary px-4 py-5 text-sm text-muted-foreground">No open requests.</p>
      ) : (
        <div className="mt-5 space-y-3">
          <p className="rounded-xl bg-secondary px-3 py-2 text-sm font-semibold text-muted-foreground">
            {formatCount(pendingRequests.length)} pending. {formatCount(acceptedRequests.length)} accepted.
          </p>
          {visibleRequests.map((request) => {
            const status = request.status || "pending";
            const category = request.categoryLabel || request.categoryId || "Custom request";
            const price = typeof request.priceGd === "number" ? `${request.priceGd.toLocaleString()} GD` : "Price unavailable";
            const actionDisabled = readOnly || Boolean(pendingActionId);
            return (
              <GroupedRow key={request.id} className="rounded-2xl bg-secondary p-4" data-creator-request-status={status}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{category}</h3>
                      <Badge variant="secondary" className={cn("rounded-xl border px-2.5 py-1 text-xs font-semibold", statusTone(status))}>
                        {status}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{request.details || "No request details provided."}</p>
                    <p className="mt-2 inline-flex rounded-xl bg-secondary px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">{price}</p>
                  </div>
                </div>
                {status === "pending" || status === "accepted" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {status === "pending" ? (
                      <>
                        <Button variant="ghost"
                          type="button"
                          disabled={actionDisabled}
                          onClick={() => void handleAction(request, "accept")}
                          className="min-h-11 rounded-xl border border-success/20 bg-success/10 px-4 py-2.5 text-sm font-semibold text-success disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Accept
                        </Button>
                        <Button variant="ghost"
                          type="button"
                          disabled={actionDisabled}
                          onClick={() => void handleAction(request, "decline")}
                          className="min-h-11 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Decline
                        </Button>
                      </>
                    ) : null}
                    {status === "accepted" ? (
                      <Button variant="ghost"
                        type="button"
                        disabled={actionDisabled}
                        onClick={() => void handleAction(request, "fulfill")}
                        className="min-h-11 rounded-xl border border-info/20 bg-info/10 px-4 py-2.5 text-sm font-semibold text-info disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Fulfill
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </GroupedRow>
            );
          })}
        </div>
      )}
    </ContentSection>
  );
}
