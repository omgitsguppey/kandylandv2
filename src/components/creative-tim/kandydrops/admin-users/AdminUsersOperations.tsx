"use client";

import { DisclosureSummary } from "@/components/ui/disclosure";
import { Disclosure } from "@/components/ui/disclosure";


import type { ComponentProps, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  DollarSign,
  Edit2,
  Lock,
  ScrollText,
} from "lucide-react";

import { AdminReviewBadge } from "@/components/Admin/AdminReviewBadge";
import { AdminMetricCard } from "@/components/Admin/AdminMetricCard";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import { Badge } from "@/components/ui/badge";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/Button";
import { ADMIN_NO_SOURCE_LABEL } from "@/lib/admin-truth-state";
import type { AdminReviewBadgeDecision } from "@/lib/behavioral/review-badge-rules";
import type { UserProfile } from "@/types/db";

type AdminTruthBadgeState = ComponentProps<typeof AdminTruthBadge>["state"];
type ManagedRole = "user" | "creator" | "admin";

type AdminUsersOperatorEntryBandProps = {
  controls: ReactNode;
  eyebrow: string;
  sourceSignals?: ReactNode;
  subtitle: string;
  title: string;
};

export function AdminUsersOperatorEntryBand({
  controls,
  eyebrow,
  sourceSignals,
  subtitle,
  title,
}: AdminUsersOperatorEntryBandProps) {
  return (
    <section
      className="min-w-0"
      data-admin-users-operator-entry="source-aware"
    >
      <AdminPageHeader compact eyebrow={eyebrow} title={title} subtitle={subtitle}
        actions={<div className="flex flex-wrap gap-2" role="group" aria-label="Admin users work modes">{controls}</div>}
        topSlot={sourceSignals ? <div className="flex flex-wrap gap-2" aria-label="Source signals">{sourceSignals}</div> : undefined}
      />
    </section>
  );
}
type AdminUsersOperationsProps = {
  children: ReactNode;
  className?: string;
  description: string;
  eyebrow: string;
  mode: "directory" | "dossier";
  title: string;
};

export function AdminUsersOperations({
  children,
  className,
  description,
  eyebrow,
  mode,
  title,
}: AdminUsersOperationsProps) {
  return (
    <Card
      className={className}
      data-admin-users-operations-canvas={mode}
    >
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
        <CardTitle><h2 className="text-xl font-semibold">{title}</h2></CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4">{children}</CardContent>
    </Card>
  );
}

type OnboardingBadge = {
  label: string;
  className: string;
};

type DirectoryBehavior = {
  loaded: boolean;
  engagement: string;
  engagementReason: string;
  value: string;
  valueReason: string;
  mathMode: string;
  mathVerdict: string;
  availability: string;
  issueCount: number;
  consent: string;
  lowConfidence: number;
  activitySource: string;
  walletSource: string;
  missingMetric: string;
  activityEvents: string;
  unwraps: string;
  watchTime: string;
  source: string;
  confidence: string;
  reviewDecision: AdminReviewBadgeDecision | null;
};

export type AdminUserDirectoryRecord = {
  user: UserProfile;
  joined: string;
  lastSeen?: string;
  lastPurchase?: string;
  onboarding: OnboardingBadge;
  guestLinkLabel: string;
  behavior: DirectoryBehavior;
};

type AdminUserMetricCardProps = {
  id: string;
  label: string;
  primaryValue: string;
  secondaryValue?: string;
  title: string;
  state: AdminTruthBadgeState;
  pendingInitialLoad: boolean;
  hasUsableValue: boolean;
  reviewDecision: AdminReviewBadgeDecision | null;
  source: string;
  freshness: string;
  scope: string;
  reason: string;
  generatedAtUtc: string;
  sourceDetail: string;
  footerReason: string;
};

export function AdminUserMetricCard({
  id,
  label,
  primaryValue,
  secondaryValue,
  title,
  state,
  pendingInitialLoad,
  hasUsableValue,
  reviewDecision,
  source,
  freshness,
  scope,
  reason,
  generatedAtUtc,
  sourceDetail,
  footerReason,
}: AdminUserMetricCardProps) {
  return (
    <article
      className="min-w-0"
      title={title}
      data-admin-metric-state={state}
      data-admin-metric-source={source}
      data-admin-metric-freshness={freshness}
      data-admin-users-metric-state={state}
      data-admin-users-metric-source={source}
      data-admin-review-reason={reviewDecision?.reasonCode ?? "none"}
      data-admin-users-kpi-id={id}
      data-admin-users-kpi-source-truth={source}
      data-admin-users-kpi-freshness={freshness}
      data-admin-users-kpi-scope={scope}
      data-admin-users-kpi-reason={reason}
      data-admin-users-kpi-generated-at-utc={generatedAtUtc}
    >
      <AdminMetricCard
        label={label}
        value={primaryValue}
        truthState={state}
        pendingInitialLoad={pendingInitialLoad}
        hasUsableValue={hasUsableValue}
        auxiliaryBadges={<AdminReviewBadge decision={reviewDecision} />}
        meta={
          <div className="min-w-0 space-y-2">
            <p className="break-words leading-relaxed">{secondaryValue || "No additional source explanation supplied."}</p>
            <div className="flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="min-w-0 break-words">{sourceDetail}</span>
              <span className="min-w-0 break-words">{footerReason}</span>
            </div>
          </div>
        }
      />
    </article>
  );
}

function UserAvatar({ user, size }: { user: UserProfile; size: "sm" | "lg" }) {
  const dimensions = size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const imageSize = size === "lg" ? "48px" : "40px";

  return (
    <div className={["relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background/35 font-semibold text-primary", dimensions].join(" ")}>
      {user.photoURL ? (
        <Image src={user.photoURL} alt={user.displayName || "User"} fill sizes={imageSize} className="object-cover" />
      ) : (
        (user.displayName?.[0] || user.email?.[0] || "?").toUpperCase()
      )}
    </div>
  );
}

function RoleBadge({ role }: { role?: UserProfile["role"] }) {
  const value = role || "user";
  const className = value === "admin"
    ? "border-destructive/20 bg-destructive/10 text-destructive"
    : value === "creator"
      ? "border-primary/20 bg-primary/10 text-primary"
      : "border-border bg-secondary text-muted-foreground";

  return (
    <span className={["inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide", className].join(" ")}>
      {value}
    </span>
  );
}

function DirectoryBehaviorSummary({ record }: { record: AdminUserDirectoryRecord }) {
  const { behavior } = record;

  if (!behavior.loaded) return null;

  return (
    <div
      className="min-w-0 space-y-3"
      data-admin-users-loading-lane="behavioralDetail"
      data-user-behavior-rollup-source={behavior.source}
      data-user-behavior-rollup-confidence={behavior.confidence}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 break-words text-base font-semibold">{behavior.engagement} / {behavior.value}</p>
        <div className="flex min-w-0 max-w-full flex-wrap gap-1 *:min-w-0 *:max-w-full *:whitespace-normal *:break-words">
          <AdminReviewBadge decision={behavior.reviewDecision} className="text-xs tracking-normal" />
        </div>
      </div>
      <div className="space-y-2 break-words text-sm leading-relaxed text-muted-foreground">
        <p>Engagement: {behavior.engagementReason}</p>
        <p>Value: {behavior.valueReason}</p>
      </div>
      <p className="break-words text-sm text-muted-foreground">{behavior.availability} / {behavior.issueCount} issues</p>
      <p className="break-words text-sm text-muted-foreground">Source: {behavior.source} / {behavior.confidence}</p>
      <p className="break-words text-sm text-muted-foreground">Consent: {behavior.consent} / {behavior.lowConfidence} low-confidence</p>
      <Disclosure className="min-w-0 border-t border-border pt-2">
        <DisclosureSummary className="min-h-11 cursor-pointer content-center break-words text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Metric source</DisclosureSummary>
        <div className="mt-3 space-y-3 break-words text-sm leading-relaxed text-muted-foreground">
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3">
            <div><dt>Recorded events</dt><dd className="text-foreground">{behavior.activityEvents}</dd></div>
            <div><dt>Unwraps</dt><dd className="text-foreground">{behavior.unwraps}</dd></div>
            <div><dt>Watch time</dt><dd className="text-foreground">{behavior.watchTime}</dd></div>
          </dl>
          <p>Activity: {behavior.activitySource}</p>
          <p>Wallet: {behavior.walletSource}</p>
          <p>Missing: {behavior.missingMetric}</p>
          <p data-user-behavior-math-mode={behavior.mathMode}>Math: {behavior.mathMode} / {behavior.mathVerdict}</p>
        </div>
      </Disclosure>
    </div>
  );
}

type AdminUserDirectoryProps = {
  records: AdminUserDirectoryRecord[];
  loading: boolean;
  searchQuery: string;
  selectedDetailUserId: string | null;
  getStatusColor: (status?: string) => string;
  onEditUsername: (user: UserProfile) => void;
  onEditBalance: (user: UserProfile) => void;
  onViewHistory: (user: UserProfile) => void;
  onLoadDetail: (user: UserProfile) => void;
  onOpenContent: (user: UserProfile) => void;
  onViewSecurity: (user: UserProfile) => void;
  onPromoteCreator: (user: UserProfile) => void;
  onChangeRole: (user: UserProfile, role: ManagedRole) => void;
  onToggleVerification: (user: UserProfile) => void;
  onSetStatus: (user: UserProfile, status: "suspend" | "ban" | "activate") => void;
};

export function AdminUserDirectory({
  records,
  loading,
  searchQuery,
  selectedDetailUserId,
  getStatusColor,
  onEditUsername,
  onEditBalance,
  onViewHistory,
  onLoadDetail,
  onOpenContent,
  onViewSecurity,
  onPromoteCreator,
  onChangeRole,
  onToggleVerification,
  onSetStatus,
}: AdminUserDirectoryProps) {
  const emptyLabel = searchQuery.trim() ? "No users match \"" + searchQuery.trim() + "\"." : "No users found.";

  return (
    <section className="min-w-0 border-t border-border pt-6" aria-labelledby="admin-user-directory-heading" data-admin-user-directory-presentation="operations-ledger">
      <div className="flex flex-wrap items-baseline justify-between gap-3 pb-4">
        <h2 id="admin-user-directory-heading" className="text-lg font-semibold">User directory records</h2>
        <p className="text-sm text-muted-foreground" role="status">{loading ? "Refreshing records" : String(records.length) + " shown"}</p>
      </div>
      {loading ? (
        <div className="py-12" role="status" aria-label="Loading user records"><p className="text-sm text-muted-foreground">Loading user records</p></div>
      ) : records.length === 0 ? (
        <p className="py-12 text-sm text-muted-foreground" role="status">{emptyLabel}</p>
      ) : (
        <ul className="min-w-0 divide-y divide-border" role="list">
          {records.map((record) => {
            const { user, behavior } = record;
            const status = user.status || "active";
            const hasFlags = (user.securityFlags?.ripAttempts ?? 0) > 0;

            return (
              <li key={user.uid} className="min-w-0 py-6">
                <article className="min-w-0 space-y-5" aria-labelledby={"directory-user-" + user.uid}>
                  <div className="flex min-w-0 flex-wrap items-start gap-3">
                    <UserAvatar user={user} size="lg" />
                    <div className="min-w-0 flex-1 basis-48 space-y-1">
                      <h3 id={"directory-user-" + user.uid} className="break-words text-base font-semibold">{user.displayName || (user.username ? "@" + user.username : "No name")}</h3>
                      {user.username ? <p className="break-words text-sm text-muted-foreground">{"@" + user.username}</p> : null}
                      <p className="break-all text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Link href={"/admin/user/" + user.uid} className={buttonVariants({ variant: "outline", size: "sm", className: "max-w-full gap-2 whitespace-normal" })} title="Open user analytics" aria-label="Open user analytics">Open detail <ChevronRight className="size-4 shrink-0" aria-hidden="true" /></Link>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 break-words text-sm">
                    <span className="text-muted-foreground">{user.role || "user"} role</span>
                    <Badge variant="secondary" className={["min-w-0 max-w-full whitespace-normal break-words text-sm", getStatusColor(user.status)].join(" ")}>{status}</Badge>
                    {user.isVerified ? <span className="inline-flex min-w-0 items-center gap-1"><CheckCircle className="size-4 shrink-0 text-primary" aria-hidden="true" />Verified</span> : null}
                    <span className="text-muted-foreground">{record.onboarding.label}</span>
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-x-6 gap-y-2 break-words text-sm text-muted-foreground">
                    <p>GumDrops: <span className="font-semibold text-foreground">{user.gumDropsBalance} GD</span></p>
                    <p>Joined: {record.joined}</p>
                  </div>
                  {hasFlags ? (
                    <Button variant="danger" size="sm" type="button" onClick={() => onViewSecurity(user)} className="max-w-full gap-2 whitespace-normal" title="View security dossier" aria-label="View security dossier"><AlertTriangle className="size-4 shrink-0" aria-hidden="true" />{user.securityFlags?.ripAttempts} security flags · Review</Button>
                  ) : <p className="break-words text-sm text-muted-foreground">No security flags recorded</p>}
                  {behavior.loaded ? <DirectoryBehaviorSummary record={record} /> : (
                    <Button variant="outline" size="sm" type="button" onClick={() => onLoadDetail(user)} className="max-w-full whitespace-normal" data-admin-users-loading-lane="selectedUser" disabled={selectedDetailUserId === user.uid}>{selectedDetailUserId === user.uid ? "Loading detail" : "Load detail"}</Button>
                  )}
                  <Disclosure className="min-w-0 border-t border-border pt-2">
                    <DisclosureSummary className="min-h-11 cursor-pointer content-center break-words text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Account details and actions</DisclosureSummary>
                    <div className="mt-4 min-w-0 space-y-5">
                      <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-4 break-words text-sm">
                        <div><dt className="text-muted-foreground">User ID</dt><dd className="break-all font-mono">{user.uid}</dd></div>
                        <div><dt className="text-muted-foreground">Guest link</dt><dd>{record.guestLinkLabel}</dd></div>
                        <div><dt className="text-muted-foreground">Unlocked Drops</dt><dd>{user.unlockedContent?.length || 0}</dd></div>
                        <div><dt className="text-muted-foreground">Browser notifications</dt><dd>{user.notificationSettings?.browserPushEnabled ? "Push on" : "Push off"}</dd></div>
                        <div><dt className="text-muted-foreground">Last activity</dt><dd>{record.lastSeen || "No tracked activity"}</dd></div>
                        {record.lastPurchase ? <div><dt className="text-muted-foreground">Last purchase</dt><dd>{record.lastPurchase}</dd></div> : null}
                      </dl>
                      <div className="flex min-w-0 flex-wrap gap-2" role="group" aria-label="Account management">
                        <Button variant="ghost" size="sm" type="button" onClick={() => onEditUsername(user)} className="max-w-full gap-2 whitespace-normal"><Edit2 className="size-4 shrink-0" aria-hidden="true" />Edit username</Button>
                        <Button variant="ghost" size="sm" type="button" onClick={() => onEditBalance(user)} className="max-w-full gap-2 whitespace-normal"><DollarSign className="size-4 shrink-0" aria-hidden="true" />Edit balance</Button>
                        <Button variant="ghost" size="sm" type="button" onClick={() => onViewHistory(user)} className="max-w-full gap-2 whitespace-normal"><ScrollText className="size-4 shrink-0" aria-hidden="true" />View history</Button>
                        <Button variant="ghost" size="sm" type="button" onClick={() => onOpenContent(user)} className="max-w-full gap-2 whitespace-normal"><Lock className="size-4 shrink-0" aria-hidden="true" />Manage content access</Button>
                      </div>
                      <div className="min-w-0 space-y-3 border-t border-border pt-4">
                        <label className="grid min-w-0 gap-2 text-sm font-medium" htmlFor={"directory-role-" + user.uid}>Account role
                          <NativeSelect id={"directory-role-" + user.uid} value={user.role || "user"} onChange={(event) => onChangeRole(user, event.target.value as ManagedRole)} className="h-auto min-h-11 py-2">
                            <NativeSelectOption value="user">User role</NativeSelectOption>
                            <NativeSelectOption value="creator">Creator role</NativeSelectOption>
                            <NativeSelectOption value="admin">Admin role</NativeSelectOption>
                          </NativeSelect>
                        </label>
                        <div className="flex min-w-0 flex-wrap gap-2" role="group" aria-label="Access management">
                          {user.role !== "creator" ? <Button variant="ghost" size="sm" type="button" onClick={() => onPromoteCreator(user)} className="max-w-full whitespace-normal" title="Promote to creator" aria-label="Promote to creator">Make creator</Button> : null}
                          <Button variant="ghost" size="sm" type="button" onClick={() => onToggleVerification(user)} className="max-w-full whitespace-normal" title={user.isVerified ? "Remove verification badge" : "Add verification badge"} aria-label={user.isVerified ? "Remove verification badge" : "Add verification badge"}>{user.isVerified ? "Remove verification" : "Verify"}</Button>
                          {status === "active" ? <Button variant="ghost" size="sm" type="button" onClick={() => onSetStatus(user, "suspend")} className="max-w-full whitespace-normal">Suspend</Button> : <Button variant="ghost" size="sm" type="button" onClick={() => onSetStatus(user, "activate")} className="max-w-full whitespace-normal">Reactivate</Button>}
                          {status === "active" ? <Button variant="danger" size="sm" type="button" onClick={() => onSetStatus(user, "ban")} className="max-w-full gap-2 whitespace-normal"><Ban className="size-4 shrink-0" aria-hidden="true" />Ban</Button> : null}
                        </div>
                      </div>
                    </div>
                  </Disclosure>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function AdminUserDetailMasthead({
  user,
  joinedLabel,
  onBack,
  sourceAvailable = true,
}: {
  user: UserProfile;
  joinedLabel: string;
  onBack: () => void;
  sourceAvailable?: boolean;
}) {
  const status = user.status || "active";
  const balanceLabel = sourceAvailable && typeof user.gumDropsBalance === "number" && Number.isFinite(user.gumDropsBalance)
    ? `${user.gumDropsBalance} GD` : ADMIN_NO_SOURCE_LABEL;
  const unlockLabel = sourceAvailable && Array.isArray(user.unlockedContent) ? user.unlockedContent.length : ADMIN_NO_SOURCE_LABEL;

  return (
    <section className="min-w-0" data-admin-user-detail-presentation="operations-dossier">
      <AdminPageHeader
        compact
        eyebrow="Account operator record"
        title={user.displayName || user.email || "User"}
        subtitle={user.username ? "@" + user.username : "No public username"}
        actions={<><Button type="button" variant="outline" onClick={onBack}><ArrowLeft className="mr-2 size-4" aria-hidden="true" />Back to roster</Button><RoleBadge role={user.role} /><span className="text-sm">{status}</span></>}
        topSlot={
          <div className="space-y-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-lg font-semibold">
                {user.photoURL ? <Image src={user.photoURL} alt={user.displayName || "User"} fill sizes="48px" className="object-cover" /> : (user.displayName?.[0] || user.email?.[0] || "U").toUpperCase()}
              </div>
              <div className="min-w-0 space-y-1 break-words text-sm text-muted-foreground">
                <p>{user.email || "No email"}</p>
                <p className="break-all font-mono text-xs">{user.uid}</p>
                <p className="flex items-center gap-1"><CalendarDays className="size-4 shrink-0" aria-hidden="true" />Joined {joinedLabel}</p>
              </div>
            </div>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-4">
              <div><dt className="text-sm text-muted-foreground">Current balance</dt><dd className="mt-1 text-lg font-semibold">{balanceLabel}</dd></div>
              <div><dt className="text-sm text-muted-foreground">Unlocked Drops</dt><dd className="mt-1 text-lg font-semibold">{unlockLabel}</dd></div>
            </dl>
          </div>
        }
      />
    </section>
  );
}
