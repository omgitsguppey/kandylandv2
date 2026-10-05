"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { ToggleControl, NumberControl } from "@/components/ui/form-controls";
import { ContentSection } from "@/components/ui/content-layout";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreatorSettingsControlPlane } from "@/lib/creator-settings/creator-settings-contract";
import { creatorManagerModuleClassName, type useCreatorDashboardSettings } from "./useCreatorDashboardSettings";

type SettingsState = ReturnType<typeof useCreatorDashboardSettings>;
type Props = Pick<SettingsState, "activeControlDeck" | "isReadOnlyProjection" | "creatorPricing" | "savingSection" | "updateDraftSettings" | "saveSettingsSection"> & { controlPlaneSettings: NonNullable<SettingsState["controlPlaneSettings"]> };

export function CreatorSettingsControls({ controlPlaneSettings, activeControlDeck, isReadOnlyProjection, creatorPricing, savingSection, updateDraftSettings, saveSettingsSection }: Props) {
    return (
<ContentSection
          className={cn(creatorManagerModuleClassName, "space-y-3")}
          data-creator-settings-control-plane="true"
          data-creator-settings-user-facing-safe="true"
          data-mobile-density="compact"
          data-mobile-sprawl-guard="true"
        >
          <div className="space-y-4" data-mobile-organization="single_scope" data-mobile-drilldown="true">
            {activeControlDeck === "profile_basics" ? (
              <div className="min-w-0" data-creator-settings-section="profile-basics">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">Profile basics</h3>
                <span className="rounded-xl bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">Profile</span>
              </div>
              <label className="mt-3 grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Display name
                <Input
                  value={controlPlaneSettings.profileDisplayName}
                  disabled={isReadOnlyProjection}
                  onChange={(event) => updateDraftSettings("profileDisplayName", event.target.value)}
                  className="min-h-11 rounded-2xl bg-secondary px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none focus:border-primary/50 disabled:opacity-60"
                />
              </label>
              <label className="mt-2 grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Bio
                <Textarea
                  value={controlPlaneSettings.bio}
                  disabled={isReadOnlyProjection}
                  onChange={(event) => updateDraftSettings("bio", event.target.value)}
                  rows={3}
                  className="min-h-20 resize-y rounded-2xl bg-secondary px-3 py-2 text-sm font-medium normal-case tracking-normal text-foreground outline-none focus:border-primary/50 disabled:opacity-60"
                />
              </label>
              <Button variant="ghost" type="button" disabled={isReadOnlyProjection || savingSection !== null} aria-busy={savingSection === "profile_basics"} onClick={() => saveSettingsSection("profile_basics")} className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground   disabled:opacity-60">
                {savingSection === "profile_basics" ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving...</> : "Save profile"}
              </Button>
              </div>
            ) : null}

            {activeControlDeck === "fan_pass" ? (
              <div className="min-w-0" data-creator-settings-section="fan-pass">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">Fan Pass</h3>
                <span className="rounded-xl bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground" data-creator-price-source={creatorPricing.fanPass.source}>Paid GD - {creatorPricing.fanPass.source === "creator_settings" ? "Custom" : "Default"}</span>
              </div>
              <div className="mt-3 space-y-2">
                <ToggleControl label="Enable Fan Pass" checked={controlPlaneSettings.fanPassEnabled} disabled={isReadOnlyProjection} onChange={(value) => updateDraftSettings("fanPassEnabled", value)} />
                <NumberControl label="Fan Pass price GD" value={controlPlaneSettings.fanPassPriceGd} min={500} disabled={isReadOnlyProjection} onChange={(value) => updateDraftSettings("fanPassPriceGd", value)} />
                <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Welcome text
                  <Input
                    value={controlPlaneSettings.fanPassWelcomeText}
                    disabled={isReadOnlyProjection}
                    onChange={(event) => updateDraftSettings("fanPassWelcomeText", event.target.value)}
                    className="min-h-11 rounded-2xl bg-secondary px-3 py-2 text-sm font-medium normal-case tracking-normal text-foreground outline-none focus:border-primary/50 disabled:opacity-60"
                  />
                </label>
              </div>
              <Button variant="ghost" type="button" disabled={isReadOnlyProjection || savingSection !== null} aria-busy={savingSection === "fan_pass"} onClick={() => saveSettingsSection("fan_pass")} className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground   disabled:opacity-60">
                {savingSection === "fan_pass" ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving...</> : "Save Fan Pass"}
              </Button>
              </div>
            ) : null}

            {activeControlDeck === "gumdrop_experiences" ? (
              <div className="min-w-0" data-creator-settings-section="gumdrop-experiences">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">GumDrop experiences</h3>
                <span className="rounded-xl bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground" data-creator-price-source={creatorPricing.selectedRequest?.source ?? creatorPricing.booking?.source ?? "unavailable"}>Requests + calls</span>
              </div>
              <div className="mt-3 grid gap-2">
                <ToggleControl label="Enable requests" checked={controlPlaneSettings.creatorRequestsEnabled} disabled={isReadOnlyProjection} onChange={(value) => updateDraftSettings("creatorRequestsEnabled", value)} />
                <NumberControl label="Request base price GD" value={controlPlaneSettings.requestBasePriceGd} min={0} disabled={isReadOnlyProjection} onChange={(value) => updateDraftSettings("requestBasePriceGd", value)} />
                <ToggleControl label="Enable live time" checked={controlPlaneSettings.callsEnabled} disabled={isReadOnlyProjection} onChange={(value) => updateDraftSettings("callsEnabled", value)} />
                <NumberControl label="Call price per minute GD" value={controlPlaneSettings.callPriceGd} min={500} disabled={isReadOnlyProjection} onChange={(value) => updateDraftSettings("callPriceGd", value)} />
              </div>
              <Button variant="ghost" type="button" disabled={isReadOnlyProjection || savingSection !== null} aria-busy={savingSection === "gumdrop_experiences"} onClick={() => saveSettingsSection("gumdrop_experiences")} className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground   disabled:opacity-60">
                {savingSection === "gumdrop_experiences" ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving...</> : "Save experiences"}
              </Button>
              </div>
            ) : null}

            {activeControlDeck === "broadcasts" ? (
              <div className="min-w-0" data-creator-settings-section="broadcasts">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">Broadcasts</h3>
                <span className="rounded-xl bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">Audience</span>
              </div>
              <div className="mt-3 space-y-2">
                <ToggleControl label="Enable broadcasts" checked={controlPlaneSettings.broadcastsEnabled} disabled={isReadOnlyProjection} onChange={(value) => updateDraftSettings("broadcastsEnabled", value)} />
                <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Default audience
                  <NativeSelect
                    value={controlPlaneSettings.broadcastDefaultAudience}
                    disabled={isReadOnlyProjection}
                    onChange={(event) => updateDraftSettings("broadcastDefaultAudience", event.target.value as CreatorSettingsControlPlane["broadcastDefaultAudience"])}
                    className="min-h-11 rounded-2xl bg-secondary px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none focus:border-primary/50 disabled:opacity-60"
                  >
                    <option value="followers">Followers</option>
                    <option value="fan_pass_subscribers">Fan Pass subscribers</option>
                    <option value="followers_and_subscribers">Followers and subscribers</option>
                  </NativeSelect>
                </label>
              </div>
              <Button variant="ghost" type="button" disabled={isReadOnlyProjection || savingSection !== null} aria-busy={savingSection === "broadcasts"} onClick={() => saveSettingsSection("broadcasts")} className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground   disabled:opacity-60">
                {savingSection === "broadcasts" ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving...</> : "Save broadcasts"}
              </Button>
              </div>
            ) : null}

            {activeControlDeck === "timeline" ? (
              <div className="min-w-0" data-creator-settings-section="timeline">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">Timeline</h3>
                <span className="rounded-xl bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">Approved only</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <ToggleControl label="Show profile timeline" checked={controlPlaneSettings.profileTimelineEnabled} disabled={isReadOnlyProjection} onChange={(value) => updateDraftSettings("profileTimelineEnabled", value)} />
                <ToggleControl label="Show approved drops" checked={controlPlaneSettings.showApprovedDropsOnTimeline} disabled={isReadOnlyProjection} onChange={(value) => updateDraftSettings("showApprovedDropsOnTimeline", value)} />
                <ToggleControl label="Show broadcasts" checked={controlPlaneSettings.showBroadcastsOnTimeline} disabled={isReadOnlyProjection} onChange={(value) => updateDraftSettings("showBroadcastsOnTimeline", value)} />
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Drop approval, public discovery, and rotation stay admin-only.</p>
              <Button variant="ghost" type="button" disabled={isReadOnlyProjection || savingSection !== null} aria-busy={savingSection === "timeline"} onClick={() => saveSettingsSection("timeline")} className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground   disabled:opacity-60">
                {savingSection === "timeline" ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving...</> : "Save timeline"}
              </Button>
              </div>
            ) : null}
          </div>
        </ContentSection>
    );
}
