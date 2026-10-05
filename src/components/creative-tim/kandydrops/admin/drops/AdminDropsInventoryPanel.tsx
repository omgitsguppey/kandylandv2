"use client";

import { DataTable } from "@/components/ui/data-table";
import { TableScrollArea } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/content-layout";
import { Button } from "@/components/ui/Button";
import { NativeSelectOption } from "@/components/ui/native-select";
import { NativeSelect } from "@/components/ui/native-select";


import type { ReactNode } from "react";
import { AdminDropCreationWorkstream } from "./AdminDropCreationWorkstream";

import Image from "next/image";
import {
    BellRing,
    Calendar,
    Check,
    ChevronDown,
    ChevronUp,
    Copy,
    Edit,
    Package,
    Repeat,
    Search,
    Trash2,
    X,
    type LucideIcon,
} from "lucide-react";

import { TitleMarquee } from "@/components/ui/TitleMarquee";
import { cn } from "@/lib/utils";
import type { Drop } from "@/types/db";

type FilterOption = {
    value: string;
    label: string;
};

type CreatorDropReviewDecision = "approved" | "rejected" | "needs_changes";

export type AdminDropsInventoryItem = {
    drop: Drop;
    creatorLabel: string;
    creatorSecondary: string | null;
    isQueueManaged: boolean;
    queuePosition: number | null;
    statusLabel: string;
    statusClassName: string;
    schedulePrimaryLabel: string;
    scheduleSecondaryLabel: string | null;
    uploadedLabel: string | null;
};

type AdminDropsInventoryPanelProps = {
    items: AdminDropsInventoryItem[];
    totalDrops: number;
    searchValue: string;
    onSearchChange: (value: string) => void;
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
    statusOptions: FilterOption[];
    creatorFilter: string;
    onCreatorFilterChange: (value: string) => void;
    creatorOptions: FilterOption[];
    sortMode: string;
    onSortModeChange: (value: string) => void;
    sortOptions: FilterOption[];
    selectedDropIds: ReadonlySet<string>;
    selectedCount: number;
    visibleSelectedCount: number;
    onToggleSelection: (dropId: string) => void;
    onToggleAll: () => void;
    onBulkDelete: () => void;
    isFixture: boolean;
    loadError: string | null | undefined;
    dropVisibilityLabel: string;
    pendingCreatorSubmissionCount: number;
    isCreating: boolean;
    onStartCreate: () => void;
    onCloseCreate: () => void;
    creationWorkspace: ReactNode;
    reviewingDropId: string | null;
    expandedDropId: string | null;
    onToggleExpanded: (dropId: string) => void;
    onReviewSubmission: (dropId: string, decision: CreatorDropReviewDecision) => void;
    onToggleQueue: (dropId: string) => void;
    onOpenNotification: (drop: Drop) => void;
    onDuplicate: (dropId: string) => void;
    onEdit: (dropId: string) => void;
    onDelete: (dropId: string) => void;
};

function getDelaySeed(value: string) {
    return Array.from(value).reduce((total, char) => total + char.charCodeAt(0), 0) % 6;
}

function InventorySelect({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
}) {
    return (
        <label className="flex min-w-0 flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
            <NativeSelect
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background/35 px-3 text-sm font-medium text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            >
                {options.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                        {option.label}
                    </NativeSelectOption>
                ))}
            </NativeSelect>
        </label>
    );
}

function InventoryActionButton({
    label,
    icon: Icon,
    onClick,
    disabled = false,
    tone = "neutral",
    active = false,
}: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    disabled?: boolean;
    tone?: "neutral" | "danger" | "success";
    active?: boolean;
}) {
    const toneClassName = tone === "danger"
        ? "text-destructive hover:border-destructive/30 hover:bg-destructive/10"
        : tone === "success"
            ? "text-success hover:border-success/30 hover:bg-success/10"
            : "text-foreground hover:border-border hover:bg-secondary";

    return (
        <Button variant="ghost"
            type="button"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={(event) => {
                event.stopPropagation();
                onClick();
            }}
            className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background/35 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                toneClassName,
                active ? "border-primary/40 bg-primary/15 text-primary shadow-lg shadow-brand-purple/20" : null,
            )}
        >
            <Icon className="h-4 w-4" aria-hidden="true" />
        </Button>
    );
}

function DropActionCluster({
    item,
    isFixture,
    isReviewing,
    onReviewSubmission,
    onToggleQueue,
    onOpenNotification,
    onDuplicate,
    onEdit,
    onDelete,
}: Pick<
    AdminDropsInventoryPanelProps,
    "isFixture" | "onReviewSubmission" | "onToggleQueue" | "onOpenNotification" | "onDuplicate" | "onEdit" | "onDelete"
> & {
    item: AdminDropsInventoryItem;
    isReviewing: boolean;
}) {
    const { drop } = item;

    return (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={drop.title + " actions"}>
            {drop.approvalStatus === "pending_review" ? (
                <>
                    <InventoryActionButton
                        label="Approve creator submission"
                        onClick={() => onReviewSubmission(drop.id, "approved")}
                        icon={Check}
                        tone="success"
                        disabled={isFixture || isReviewing}
                    />
                    <InventoryActionButton
                        label="Reject creator submission"
                        onClick={() => onReviewSubmission(drop.id, "rejected")}
                        icon={X}
                        tone="danger"
                        disabled={isFixture || isReviewing}
                    />
                    <InventoryActionButton
                        label="Request changes"
                        onClick={() => onReviewSubmission(drop.id, "needs_changes")}
                        icon={Edit}
                        disabled={isFixture || isReviewing}
                    />
                </>
            ) : null}
            <InventoryActionButton
                label={item.isQueueManaged ? "Remove from queue" : "Add to queue"}
                onClick={() => onToggleQueue(drop.id)}
                icon={Repeat}
                active={item.isQueueManaged}
                disabled={isFixture}
            />
            <InventoryActionButton
                label="Send drop notification"
                onClick={() => onOpenNotification(drop)}
                icon={BellRing}
                disabled={isFixture}
            />
            <InventoryActionButton
                label="Duplicate drop"
                onClick={() => onDuplicate(drop.id)}
                icon={Copy}
                disabled={isFixture}
            />
            <InventoryActionButton
                label="Edit drop"
                onClick={() => onEdit(drop.id)}
                icon={Edit}
                disabled={isFixture}
            />
            <InventoryActionButton
                label="Delete drop"
                onClick={() => onDelete(drop.id)}
                icon={Trash2}
                tone="danger"
                disabled={isFixture}
            />
        </div>
    );
}

function DropCover({ drop }: { drop: Drop }) {
    return (
        <Surface className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-scrim/20">
            {drop.imageUrl ? (
                <Image src={drop.imageUrl} alt={drop.title} fill sizes="48px" className="object-contain bg-background" />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-foreground">KD</div>
            )}
        </Surface>
    );
}

function EmptyInventory({ totalDrops }: { totalDrops: number }) {
    const hasNoDrops = totalDrops === 0;

    return (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background/20 px-6 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-secondary text-muted-foreground">
                <Package className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-foreground">{hasNoDrops ? "No drops found yet" : "No drops match these filters"}</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {hasNoDrops ? "Create your first drop to populate the manager." : "Try a different search, creator, or status filter."}
            </p>
        </div>
    );
}

export function AdminDropsInventoryPanel({
    items,
    totalDrops,
    searchValue,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    statusOptions,
    creatorFilter,
    onCreatorFilterChange,
    creatorOptions,
    sortMode,
    onSortModeChange,
    sortOptions,
    selectedDropIds,
    selectedCount,
    visibleSelectedCount,
    onToggleSelection,
    onToggleAll,
    onBulkDelete,
    isFixture,
    loadError,
    dropVisibilityLabel,
    pendingCreatorSubmissionCount,
    isCreating,
    onStartCreate,
    onCloseCreate,
    creationWorkspace,
    reviewingDropId,
    expandedDropId,
    onToggleExpanded,
    onReviewSubmission,
    onToggleQueue,
    onOpenNotification,
    onDuplicate,
    onEdit,
    onDelete,
}: AdminDropsInventoryPanelProps) {
    const allVisibleSelected = items.length > 0 && visibleSelectedCount === items.length;

    return (
        <section
            className="mb-4 overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-scrim/30"
            aria-labelledby="admin-drops-inventory-title"
        >
            <header className="border-b border-border bg-card via-transparent to-brand-purple/10 px-4 py-5 sm:px-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Operations inventory</p>
                            {isFixture ? (
                                <span className="rounded-full border border-warning/25 bg-warning/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-warning">
                                    source_missing
                                </span>
                            ) : loadError ? (
                                <span className="rounded-full border border-destructive/25 bg-destructive/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-destructive">
                                    failed
                                </span>
                            ) : null}
                        </div>
                        <h2 id="admin-drops-inventory-title" className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                            Drops control board
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                            Search, review, queue, and manage the existing Drop inventory without changing its source contracts.
                        </p>
                    </div>
                    <dl className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                        <div className="rounded-xl border border-border bg-background/30 px-3 py-2">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visible</dt>
                            <dd className="mt-1 text-sm font-semibold text-foreground">{dropVisibilityLabel}</dd>
                        </div>
                        <div className="rounded-xl border border-border bg-background/30 px-3 py-2">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Review queue</dt>
                            <dd className="mt-1 text-sm font-semibold text-foreground">{pendingCreatorSubmissionCount} pending</dd>
                        </div>
                    </dl>
                </div>
            </header>

            <div className="space-y-4 p-4 sm:p-5">
      <AdminDropCreationWorkstream
        isOpen={isCreating}
        onStart={onStartCreate}
        onClose={onCloseCreate}
      >
        {creationWorkspace}
      </AdminDropCreationWorkstream>
                {isFixture ? (
                    <div
                        className="rounded-2xl border border-warning/20 bg-warning/10 p-4 text-sm text-warning"
                        data-admin-drops-fixture-boundary="true"
                        data-admin-drops-fixture-state="source_missing"
                    >
                        source_missing: drop source is not loaded in this fixture. Protected reads and writes stay blocked until verified admin access provides the source.
                    </div>
                ) : null}

                {loadError ? (
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
                        {loadError}
                    </div>
                ) : null}

                <div className="grid gap-3 rounded-2xl border border-border bg-background/25 p-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.8fr))]">
                    <label className="relative block min-w-0">
                        <span className="sr-only">Search drops</span>
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                            type="text"
                            value={searchValue}
                            onChange={(event) => onSearchChange(event.target.value)}
                            placeholder="Search by title, creator, or ID"
                            className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                        />
                    </label>
                    <InventorySelect label="Status" value={statusFilter} onChange={onStatusFilterChange} options={statusOptions} />
                    <InventorySelect label="Creator" value={creatorFilter} onChange={onCreatorFilterChange} options={creatorOptions} />
                    <InventorySelect label="Order" value={sortMode} onChange={onSortModeChange} options={sortOptions} />
                </div>

                {selectedCount > 0 ? (
                    <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-foreground">
                                {selectedCount} selected{visibleSelectedCount !== selectedCount ? ", " + visibleSelectedCount + " in this view" : ""}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">Bulk delete keeps the existing confirmation and protected write path.</p>
                        </div>
                        <Button variant="ghost"
                            type="button"
                            onClick={onBulkDelete}
                            disabled={isFixture}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Delete selected
                        </Button>
                    </div>
                ) : null}

                {items.length === 0 ? (
                    <EmptyInventory totalDrops={totalDrops} />
                ) : (
                    <>
                        <div className="space-y-3 lg:hidden">
                            {items.map((item) => {
                                const { drop } = item;
                                const isExpanded = expandedDropId === drop.id;
                                const isReviewing = reviewingDropId === drop.id;

                                return (
                                    <article
                                        key={drop.id}
                                        className={cn(
                                            "rounded-2xl border border-border bg-background/25 p-4 shadow-lg shadow-scrim/10",
                                            selectedDropIds.has(drop.id) ? "border-primary/35 bg-primary/10" : null,
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <label className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background/30">
                                                <span className="sr-only">Select {drop.title}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDropIds.has(drop.id)}
                                                    onChange={() => onToggleSelection(drop.id)}
                                                    disabled={isFixture}
                                                    className="h-4 w-4 cursor-pointer rounded border-border bg-background/50 accent-brand-purple disabled:cursor-not-allowed disabled:opacity-40"
                                                />
                                            </label>
                                            <DropCover drop={drop} />
                                            <div className="min-w-0 flex-1">
                                                <TitleMarquee
                                                    title={drop.title}
                                                    delaySeed={getDelaySeed(drop.id)}
                                                    className="text-base font-semibold text-foreground"
                                                />
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <span className={cn("inline-flex rounded-full border px-2 py-1 text-xs font-semibold", item.statusClassName)}>
                                                        {item.statusLabel}
                                                    </span>
                                                    {drop.submittedByCreatorId ? (
                                                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                                                            Creator submission
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-secondary p-3">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Performance</p>
                                                <p className="mt-1 text-sm font-semibold text-foreground">{(drop.totalUnlocks || 0).toLocaleString()} unwraps</p>
                                                <p className="mt-1 text-sm text-muted-foreground">{(drop.totalClicks || 0).toLocaleString()} clicks</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Price</p>
                                                <p className="mt-1 text-sm font-semibold text-primary">{drop.unlockCost} GD</p>
                                                {item.queuePosition !== null ? <p className="mt-1 text-sm text-muted-foreground">Queue #{item.queuePosition + 1}</p> : null}
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-foreground">{item.schedulePrimaryLabel}</p>
                                                {item.scheduleSecondaryLabel ? <p className="mt-1 truncate text-sm text-muted-foreground">{item.scheduleSecondaryLabel}</p> : null}
                                            </div>
                                            <Button variant="ghost"
                                                type="button"
                                                onClick={() => onToggleExpanded(drop.id)}
                                                aria-expanded={isExpanded}
                                                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-background/35 px-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                                            >
                                                {isExpanded ? "Hide" : "Details"}
                                                {isExpanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                                            </Button>
                                        </div>

                                        {isExpanded ? (
                                            <div className="mt-4 space-y-4 border-t border-border pt-4">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Creator</p>
                                                        <p className="mt-1 text-sm font-semibold text-foreground">{item.creatorLabel}</p>
                                                        <p className="mt-1 break-all text-sm text-muted-foreground">{item.creatorSecondary || "No linked creator"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timing</p>
                                                        <div className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
                                                            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                                            <div>
                                                                <p>{item.schedulePrimaryLabel}</p>
                                                                {item.scheduleSecondaryLabel ? <p className="mt-1 text-muted-foreground">{item.scheduleSecondaryLabel}</p> : null}
                                                                {item.uploadedLabel ? <p className="mt-1 text-muted-foreground">Uploaded {item.uploadedLabel}</p> : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="break-all font-mono text-xs text-muted-foreground">{drop.id}</p>
                                                <DropActionCluster
                                                    item={item}
                                                    isFixture={isFixture}
                                                    isReviewing={isReviewing}
                                                    onReviewSubmission={onReviewSubmission}
                                                    onToggleQueue={onToggleQueue}
                                                    onOpenNotification={onOpenNotification}
                                                    onDuplicate={onDuplicate}
                                                    onEdit={onEdit}
                                                    onDelete={onDelete}
                                                />
                                            </div>
                                        ) : null}
                                    </article>
                                );
                            })}
                        </div>

                        <TableScrollArea className="hidden overflow-x-auto rounded-2xl border border-border bg-background/25 lg:block">
                            <DataTable className="w-full min-w-full table-fixed text-left">
                                <caption className="sr-only">Drops inventory with current lifecycle, queue, and review controls.</caption>
                                <thead className="border-b border-border bg-secondary text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th scope="col" className="w-16 px-4 py-4">
                                            <input
                                                type="checkbox"
                                                checked={allVisibleSelected}
                                                onChange={onToggleAll}
                                                disabled={isFixture}
                                                aria-label="Select all visible drops"
                                                className="h-4 w-4 cursor-pointer rounded border-border bg-background/50 accent-brand-purple disabled:cursor-not-allowed disabled:opacity-40"
                                            />
                                        </th>
                                        <th scope="col" className="min-w-64 px-4 py-4">Drop</th>
                                        <th scope="col" className="w-48 px-4 py-4">Schedule</th>
                                        <th scope="col" className="w-40 px-4 py-4">Creator</th>
                                        <th scope="col" className="w-36 px-4 py-4">Performance</th>
                                        <th scope="col" className="w-28 px-4 py-4">Status</th>
                                        <th scope="col" className="w-80 px-4 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {items.map((item) => {
                                        const { drop } = item;
                                        const isReviewing = reviewingDropId === drop.id;

                                        return (
                                            <tr
                                                key={drop.id}
                                                onClick={isFixture ? undefined : () => onToggleSelection(drop.id)}
                                                data-selected={selectedDropIds.has(drop.id) ? "true" : undefined}
                                                className={cn(
                                                    "transition-colors hover:bg-secondary",
                                                    isFixture ? "cursor-default" : "cursor-pointer",
                                                    selectedDropIds.has(drop.id) ? "bg-primary/10" : null,
                                                )}
                                            >
                                                <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedDropIds.has(drop.id)}
                                                        onChange={() => onToggleSelection(drop.id)}
                                                        disabled={isFixture}
                                                        aria-label={"Select " + drop.title}
                                                        className="h-4 w-4 cursor-pointer rounded border-border bg-background/50 accent-brand-purple disabled:cursor-not-allowed disabled:opacity-40"
                                                    />
                                                </td>
                                                <td className="px-4 py-4 align-middle">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <DropCover drop={drop} />
                                                        <div className="min-w-0">
                                                            <TitleMarquee
                                                                title={drop.title}
                                                                delaySeed={getDelaySeed(drop.id)}
                                                                className="text-sm font-semibold text-foreground"
                                                            />
                                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                                <span className="truncate font-mono">{drop.id}</span>
                                                                {drop.submittedByCreatorId ? (
                                                                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 font-semibold uppercase tracking-wide text-primary">
                                                                        Creator submission
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 align-middle">
                                                    <p className="text-sm font-semibold text-foreground">{item.schedulePrimaryLabel}</p>
                                                    {item.scheduleSecondaryLabel ? <p className="mt-1 text-sm text-muted-foreground">{item.scheduleSecondaryLabel}</p> : null}
                                                    {item.queuePosition !== null ? <p className="mt-1 text-sm text-muted-foreground">Queue #{item.queuePosition + 1}</p> : null}
                                                </td>
                                                <td className="px-4 py-4 align-middle">
                                                    <p className="text-sm font-semibold text-foreground">{item.creatorLabel}</p>
                                                    <p className="mt-1 text-sm text-muted-foreground">{item.creatorSecondary || "No linked creator"}</p>
                                                </td>
                                                <td className="px-4 py-4 align-middle">
                                                    <p className="text-sm font-semibold text-foreground">{(drop.totalUnlocks || 0).toLocaleString()} unwraps</p>
                                                    <p className="mt-1 text-sm text-muted-foreground">{(drop.totalClicks || 0).toLocaleString()} clicks | {drop.unlockCost} GD</p>
                                                </td>
                                                <td className="px-4 py-4 align-middle">
                                                    <span className={cn("inline-flex rounded-full border px-2 py-1 text-xs font-semibold", item.statusClassName)}>
                                                        {item.statusLabel}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 align-middle" onClick={(event) => event.stopPropagation()}>
                                                    <div className="flex justify-end">
                                                        <DropActionCluster
                                                            item={item}
                                                            isFixture={isFixture}
                                                            isReviewing={isReviewing}
                                                            onReviewSubmission={onReviewSubmission}
                                                            onToggleQueue={onToggleQueue}
                                                            onOpenNotification={onOpenNotification}
                                                            onDuplicate={onDuplicate}
                                                            onEdit={onEdit}
                                                            onDelete={onDelete}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </DataTable>
                        </TableScrollArea>
                    </>
                )}
            </div>
        </section>
    );
}
