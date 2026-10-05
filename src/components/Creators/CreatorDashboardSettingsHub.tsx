"use client";

import { CreatorSettingsControls } from "./CreatorSettingsControls";

import { ContentSection } from "@/components/ui/content-layout";
import { Card } from "@/components/ui/card";

import { CreatorSettingsHubFrame } from "./CreatorSettingsHubFrame";
import { CreatorSettingsControlDeck } from "@/components/creative-tim/kandydrops/creator/CreatorSettingsControlDeck";

import { buildBugReportContext, getSafePreviousRoute } from "@/lib/errors/client-error-adapter";

import { cn } from "@/lib/utils";

import { HumanErrorNotice } from "@/components/errors/HumanErrorNotice";

import { CreatorBroadcastManager } from "@/components/Creators/CreatorBroadcastManager";
import { CreatorRequestsManager } from "@/components/Creators/CreatorRequestsManager";
import { CreatorBookingsManager } from "@/components/Creators/CreatorBookingsManager";
import { CreatorFanPassManager } from "@/components/Creators/CreatorFanPassManager";
import { useCreatorDashboardSettings, creatorManagerModuleClassName, creatorSettingsHeaderSkeletonClassName, creatorSettingsCardSkeletonClassName } from "./useCreatorDashboardSettings";

export function CreatorDashboardSettingsHub() {
const { settingsBugReporter, loading, settingsError, settingsSaveError, savingSection, openSection, activeControlDeck, creatorId, creatorName, isCreatorOrProjection, settingsBelongToCurrentSurface, currentSurfaceSettings, statsEvidence, settingsState, creatorSettings, controlPlaneSettings, settingsCompletion, creatorRestrictions, sourceReviewNotice, creatorPricing, subscriptionPriceGd, requestsState, bookingsSourceState, subscriptionsState, requestsEnabled, requestsRestricted, bookingsEnabled, bookingsRestricted, bookingsAvailabilityConfigured, fanPassEnabled, fanPassRestricted, isReadOnlyProjection, handleSettingsErrorPrimaryAction, updateDraftSettings, saveSettingsSection, runwayScopes, activeScope, selectRunwayScope } = useCreatorDashboardSettings();
const activeManager = openSection === "requests" ? (
    <CreatorRequestsManager
      creatorId={creatorId}
      creatorName={creatorName}
      enabled={requestsEnabled}
      restricted={requestsRestricted}
      readOnly={isReadOnlyProjection}
      sourceState={requestsState}
    />
  ) : openSection === "bookings" ? (
    <CreatorBookingsManager
      creatorId={creatorId}
      creatorName={creatorName}
      enabled={bookingsEnabled}
      restricted={bookingsRestricted}
      readOnly={isReadOnlyProjection}
      sourceState={bookingsSourceState}
      availabilityConfigured={bookingsAvailabilityConfigured}
    />
  ) : openSection === "fan_pass" ? (
    <CreatorFanPassManager
      creatorId={creatorId}
      creatorName={creatorName}
      enabled={fanPassEnabled}
      restricted={fanPassRestricted}
      priceGd={subscriptionPriceGd}
      readOnly={isReadOnlyProjection}
      sourceState={subscriptionsState}
    />
  ) : openSection === "broadcasts" ? (
    <CreatorBroadcastManager
      creatorId={creatorId}
      creatorName={creatorName}
      broadcastsEnabled={creatorSettings.broadcastsEnabled === true}
      broadcastsRestricted={creatorRestrictions.broadcastsRestricted === true}
    />
  ) : null;
if (!isCreatorOrProjection) {
    return (
      <ContentSection className={cn("mx-auto max-w-6xl rounded-2xl bg-card p-6 text-foreground ", creatorManagerModuleClassName)} data-mobile-density="compact" data-mobile-sprawl-guard="true">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Creator studio</p>
        <h2 className="mt-2 text-2xl font-semibold">Creator tools are not available on this account.</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Creator settings are only available to creator-role accounts.</p>
      </ContentSection>
    );
  }
if (loading || !settingsBelongToCurrentSurface) {
    return (
      <div
        className="mx-auto w-full max-w-6xl space-y-4 px-3 pb-8 sm:px-4 sm:pb-8"
        data-mobile-density="compact"
        data-mobile-sprawl-guard="true"
        data-mobile-skeleton="creator-settings-route"
      >
        <div className={creatorSettingsHeaderSkeletonClassName} />
        <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className={creatorSettingsCardSkeletonClassName} data-mobile-skeleton={`creator-settings-card-${item}`} />
          ))}
        </div>
      </div>
    );
  }
if (settingsError || !currentSurfaceSettings) {
    return (
      <div
        className="mx-auto w-full max-w-6xl px-3 pb-8 sm:px-4 sm:pb-8"
        data-creator-settings-source-state="unavailable"
        data-mobile-density="compact"
        data-mobile-sprawl-guard="true"
      >
        <Card className={cn(creatorManagerModuleClassName, "rounded-2xl bg-card p-5 ")}>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Creator studio settings</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Manage creator operations</h1>
          {settingsError ? (
            <HumanErrorNotice
              descriptor={settingsError.descriptor}
              compact
              className="mt-3"
              onPrimaryAction={handleSettingsErrorPrimaryAction}
              onSubmitBug={() => settingsBugReporter.submit(settingsError.descriptor, buildBugReportContext({
                descriptor: settingsError.descriptor,
                route: "/api/creator/settings",
                previousRoute: getSafePreviousRoute(),
                extra: {
                  manager: "creator_settings",
                  surface: "creator_dashboard",
                  route: "/api/creator/settings",
                  errorKey: settingsError.descriptor.errorKey,
                },
              }))}
            />
          ) : null}
        </Card>
      </div>
    );
  }
return (
    <CreatorSettingsHubFrame
      className="w-full"
      data-creator-dashboard-density="mobile_compact"
      data-bottom-nav-safe="true"
      data-report-issue-safe-offset="bottom-nav"
      data-mobile-density="compact"
      data-mobile-sprawl-guard="true"
      data-mobile-organization="summary-first"
      data-mobile-drilldown="true"
      data-desktop-flow-collapsed="true"
    >
      <CreatorSettingsControlDeck
          activeScope={activeScope}
          completionLabel={settingsCompletion ? (settingsCompletion.complete ? "Setup complete" : String(settingsCompletion.missingSetupItems.length) + " left") : undefined}
          isReadOnly={isReadOnlyProjection}
          notice={!settingsError && sourceReviewNotice ? (
            <Card
              className="gap-0 py-0 rounded-2xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs leading-5 text-warning sm:text-sm"
              data-creator-settings-source-state={settingsState}
              data-creator-settings-source-review={sourceReviewNotice.tone}
            >
              <p className="font-semibold text-warning">{sourceReviewNotice.title}</p>
              <p className="mt-0.5 text-warning/85">{sourceReviewNotice.body}</p>
              {settingsCompletion?.missingSetupItems?.length ? (
                <p className="mt-1 text-warning/80" data-creator-settings-setup-control-map="true">
                  Setup controls: {settingsCompletion.items.filter((item) => !item.complete).map((item) => item.label).join(", ")}.
                </p>
              ) : null}
            </Card>
          ) : null}
          onSelectScope={selectRunwayScope}
          saveError={openSection ? null : settingsSaveError}
          scopes={runwayScopes}
          sourceFreshness={statsEvidence?.sourceFreshness}
          sourceState={settingsState}
          sourceTruth={statsEvidence?.sourceTruth}
        >
          {openSection ? activeManager : controlPlaneSettings ? (
        <CreatorSettingsControls controlPlaneSettings={controlPlaneSettings} activeControlDeck={activeControlDeck} isReadOnlyProjection={isReadOnlyProjection} creatorPricing={creatorPricing} savingSection={savingSection} updateDraftSettings={updateDraftSettings} saveSettingsSection={saveSettingsSection} />
          ) : null}
        </CreatorSettingsControlDeck>
    </CreatorSettingsHubFrame>
  );
}
