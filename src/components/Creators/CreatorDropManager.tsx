"use client";

import { Badge } from "@/components/ui/badge";

import { ContentFrame, ContentSection, GroupedRow, SectionHeader, GroupedList } from "@/components/ui/content-layout";

import { Button } from "@/components/ui/Button";

import { Package, Plus, RefreshCw } from "lucide-react";

import { CreateDropModal } from "@/components/Admin/CreateDropModal";
import { MarqueeText } from "@/components/ui/MarqueeText";

import { resolveCreatorDropMetrics } from "@/lib/drops/drop-metrics-resolver";
import { resolveDropStatus } from "@/lib/drops/drop-status-resolver";

import { useCreatorDropManager, REVIEW_TABS, REVIEW_STATUS_LABELS, creatorManagerModuleClassName, creatorDropListSkeletonClassName, CREATOR_DROP_MANAGER_PANEL_CLASS_NAME, classifyDrop, statusToneClassName, renderMetric } from "./useCreatorDropManager";

export function CreatorDropManager() {
const { user, activeTab, setActiveTab, isModalOpen, setIsModalOpen, loadDrops, tabCounts, visibleDrops, showDropListSkeleton, openSubmitForm } = useCreatorDropManager();

return (
        <main
            className="min-h-[calc(100dvh-var(--root-shell-top-spacing,5rem))] bg-background text-foreground"
            data-creator-drop-manager="true"
            data-drop-manager-surface="creator_submission"
            data-admin-approval-required="true"
            data-bottom-nav-safe="true"
            data-mobile-primary-action="submit_drop"
            data-mobile-density="compact"
            data-mobile-sprawl-guard="true"
            data-mobile-organization="summary-first"
            data-mobile-drilldown="true"
            data-desktop-flow-collapsed="true"
        >
            <ContentFrame className="space-y-8">
                <SectionHeader level={1} title="Drop management" description="Create, submit, and track the exact review and visibility state of every drop." accessory={
                    <div className="flex gap-2">
                        <Button variant="ghost"
                            type="button"
                            onClick={() => void loadDrops()}
                            className="inline-flex min-h-11 w-11 items-center justify-center rounded-xl bg-secondary text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                            aria-label="Refresh creator drops"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="brand"
                            type="button"
                            onClick={openSubmitForm}
                        >
                            <Plus className="h-4 w-4" />
                            Submit drop
                        </Button>
                    </div>
                } />

                <ContentSection className={`${CREATOR_DROP_MANAGER_PANEL_CLASS_NAME} p-3 sm:p-4`} aria-label="Creator drop status filters" data-creator-drop-status-filter="all" data-mobile-density="compact" data-mobile-sprawl-guard="true" data-mobile-drilldown="true" data-desktop-flow-collapsed="true">
                    <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Drop pipeline</p><p className="mt-1 text-sm font-semibold text-foreground">{tabCounts.all} total drops</p></div><Badge variant="secondary" className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground">{visibleDrops[0] ? REVIEW_STATUS_LABELS[classifyDrop(visibleDrops[0])] : "No matching drops"}</Badge></div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {REVIEW_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <Button variant="ghost"
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                data-creator-drop-status-filter={tab.id}
                                className={`flex min-h-11 items-center justify-between gap-2 rounded-2xl border px-3 py-3 text-left transition-colors ${active ? "border-primary/60 bg-primary/20  " : "border-border bg-secondary hover:bg-secondary"}`}
                            >
                                <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-muted-foreground">
                                    <Icon className="h-4 w-4 shrink-0" />
                                    {tab.label}
                                </span>
                                <span className="text-sm font-semibold text-foreground">{tabCounts[tab.id]}</span>
                            </Button>
                        );
                    })}
                    </div>
                </ContentSection>

                <ContentSection className={`${creatorManagerModuleClassName} ${CREATOR_DROP_MANAGER_PANEL_CLASS_NAME} p-4 sm:p-5`} data-creator-drop-list-density="compact_rows" data-mobile-density="compact" data-mobile-sprawl-guard="true">
                    {showDropListSkeleton ? (
                        <div className="grid gap-2" data-mobile-skeleton="creator-drop-list" data-mobile-density="compact" data-mobile-sprawl-guard="true" aria-label="Loading creator drops">
                            {[0, 1, 2].map((item) => (
                                <div key={item} className={creatorDropListSkeletonClassName} />
                            ))}
                        </div>
                    ) : visibleDrops.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center" data-empty-state-density="compact">
                            <Package className="h-7 w-7 text-primary" />
                            <div>
                                <p className="text-base font-semibold text-foreground">No drops submitted yet</p>
                                <p className="mt-1 text-sm text-muted-foreground">Create your first drop for review.</p>
                            </div>
                            <Button variant="ghost"
                                type="button"
                                onClick={openSubmitForm}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                            >
                                <Plus className="h-4 w-4" />
                                Submit drop
                            </Button>
                        </div>
                    ) : (
                        <GroupedList>
                            {visibleDrops.map((drop) => {
                                const status = drop.statusResolution ?? resolveDropStatus(drop);
                                const metrics = drop.metrics ?? resolveCreatorDropMetrics(drop).serialized;
                                return (
                                    <GroupedRow
                                        key={drop.id}
                                        className="gap-3"
                                        data-creator-drop-card-status={status.creatorStatusKey}
                                        data-creator-drop-metrics-source={metrics.source}
                                        data-creator-drop-expired={String(status.isExpired)}
                                        data-creator-drop-mobile-density="compact"
                                    >
                                        {drop.imageUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={drop.imageUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                                        ) : (
                                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                                                <Package className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex min-w-0 items-start justify-between gap-2">
                                                <MarqueeText
                                                    as="h2"
                                                    title={drop.title}
                                                    className="text-sm font-semibold text-foreground"
                                                    ariaLabel={drop.title}
                                                />
                                                <Badge variant="secondary" className={`shrink-0 rounded-xl border px-2.5 py-1.5 text-xs font-semibold ${statusToneClassName(status.statusTone)}`}>
                                                    {status.creatorStatusLabel}
                                                </Badge>
                                            </div>
                                            <p className="mt-1 truncate text-xs leading-5 text-muted-foreground">{drop.description || "No description provided."}</p>
                                            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
                                                <span>{status.isAdminCreated ? "Added by admin" : status.isCreatorSubmitted ? "Submitted" : REVIEW_STATUS_LABELS[classifyDrop(drop)]}</span>
                                                <span aria-hidden="true">|</span>
                                                <span>{status.publicVisibilityLabel}</span>
                                                <span aria-hidden="true">|</span>
                                                <span>{typeof drop.unlockCost === "number" ? `${drop.unlockCost} GumDrops` : "Cost unset"}</span>
                                            </div>
                                            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                                <span className="rounded-xl bg-secondary px-2.5 py-1.5">Views {renderMetric(metrics.views)}</span>
                                                <span className="rounded-xl bg-secondary px-2.5 py-1.5">Clicks {renderMetric(metrics.clicks)}</span>
                                                <span className="rounded-xl bg-secondary px-2.5 py-1.5">Unwraps {renderMetric(metrics.unwraps)}</span>
                                            </div>
                                        </div>
                                    </GroupedRow>
                                );
                            })}
                        </GroupedList>
                    )}
                </ContentSection>
            </ContentFrame>

            <CreateDropModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    setIsModalOpen(false);
                    void loadDrops();
                }}
                mode="creator"
                creatorIdOverride={user?.uid || null}
            />
        </main>
    );
}
