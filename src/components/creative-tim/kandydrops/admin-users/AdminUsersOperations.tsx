"use client";

import type { ComponentProps, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Clock3,
  DollarSign,
  Edit2,
  Lock,
  ScrollText,
  TrendingUp,
  Users,
} from "lucide-react";

import { AdminReviewBadge } from "@/components/Admin/AdminReviewBadge";
import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
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
      className="relative overflow-hidden border border-fuchsia-200/15 bg-[linear-gradient(120deg,rgba(67,27,103,0.62),rgba(15,8,28,0.94)_54%,rgba(22,10,39,0.88))] px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:px-6"
      data-admin-users-operator-entry="source-aware"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 top-0 h-32 w-32 rounded-full bg-fuchsia-300/15 blur-3xl" />
      <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-100/58">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-violet-100/70">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Admin users work modes">
          {controls}
        </div>
      </div>
      {sourceSignals ? (
        <div className="relative mt-4 border-t border-white/10 pt-3">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-200/48">Source signals</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">{sourceSignals}</div>
        </div>
      ) : null}
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
    <section
      className={[
        "relative isolate overflow-hidden rounded-[2.25rem] border border-fuchsia-200/15 bg-[radial-gradient(circle_at_8%_0%,rgba(178,140,255,0.2),transparent_28%),radial-gradient(circle_at_92%_20%,rgba(255,111,207,0.12),transparent_24%),linear-gradient(145deg,rgba(24,10,42,0.98),rgba(8,5,15,0.99))] p-4 shadow-[0_30px_90px_rgba(4,0,14,0.48)] sm:p-6",
        mode === "dossier"
          ? "[&_.glass-panel]:rounded-none [&_.glass-panel]:border-x-0 [&_.glass-panel]:border-b-0 [&_.glass-panel]:border-t [&_.glass-panel]:border-white/10 [&_.glass-panel]:bg-transparent [&_.glass-panel]:px-0 [&_.glass-panel]:py-6"
          : "",
        className || "",
      ].join(" ")}
      data-admin-users-operations-canvas={mode}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-brand-purple/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-[-3rem] h-60 w-60 rounded-full bg-fuchsia-300/12 blur-3xl" />
      <div className="relative space-y-5">
        <header className="border-b border-white/10 pb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-100/58">{eyebrow}</p>
          <p className="mt-2 text-xl font-black tracking-[-0.035em] text-white sm:text-2xl">{title}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-violet-100/68">{description}</p>
        </header>
        <div className="space-y-5">{children}</div>
      </div>
    </section>
  );
}

type OnboardingBadge = {
  label: string;
  className: string;
};

type DirectoryBehavior = {
  loaded: boolean;
  engagement: string;
  value: string;
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
      className="relative min-h-[8.75rem] overflow-hidden rounded-[1.35rem] border border-fuchsia-200/10 bg-[linear-gradient(145deg,rgba(59,21,84,0.72),rgba(17,8,31,0.92)_58%,rgba(10,6,20,0.96))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_32px_rgba(6,0,16,0.24)]"
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
      <div className="pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-full bg-fuchsia-300/10 blur-2xl" />
      <div className="relative flex min-h-5 items-start justify-between gap-2">
        <p className="min-w-0 text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-100/55">{label}</p>
        <div className="flex shrink-0 items-center gap-1">
          <AdminReviewBadge decision={reviewDecision} className="px-1.5 py-0 text-[8px] tracking-[0.08em]" />
          <AdminTruthBadge
            state={state}
            className="px-1.5 py-0 text-[8px] tracking-[0.08em]"
            pendingInitialLoad={pendingInitialLoad}
            hasUsableValue={hasUsableValue}
          />
        </div>
      </div>
      <p className="relative mt-2 truncate text-2xl font-black leading-none tracking-tight text-white">{primaryValue}</p>
      <div className="relative mt-2 space-y-1">
        <p className="line-clamp-2 text-[11px] leading-4 text-violet-100/76">{secondaryValue || "No additional source explanation supplied."}</p>
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-violet-200/45">
          <span>{sourceDetail}</span>
          <span>{footerReason}</span>
        </div>
      </div>
    </article>
  );
}

function UserAvatar({ user, size }: { user: UserProfile; size: "sm" | "lg" }) {
  const dimensions = size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const imageSize = size === "lg" ? "48px" : "40px";

  return (
    <div className={["relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/35 font-black text-fuchsia-100", dimensions].join(" ")}>
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
    ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
    : value === "creator"
      ? "border-fuchsia-300/20 bg-fuchsia-400/10 text-fuchsia-100"
      : "border-white/10 bg-white/5 text-slate-300";

  return (
    <span className={["inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]", className].join(" ")}>
      {value}
    </span>
  );
}

function DirectoryBehaviorSummary({ record, mode }: { record: AdminUserDirectoryRecord; mode: "table" | "card" }) {
  const { behavior } = record;

  if (!behavior.loaded) return null;

  return (
    <div
      className={mode === "table" ? "space-y-2" : "grid grid-cols-2 gap-2"}
      data-admin-users-loading-lane="behavioralDetail"
      data-user-behavior-rollup-source={behavior.source}
      data-user-behavior-rollup-confidence={behavior.confidence}
    >
      <div className={mode === "table" ? "flex items-center justify-between gap-2" : "col-span-2 flex items-center justify-between gap-2"}>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white">{behavior.engagement} / {behavior.value}</p>
          <p className="mt-1 text-[10px] text-violet-100/45">{behavior.availability} / {behavior.issueCount} issues</p>
        </div>
        <AdminReviewBadge decision={behavior.reviewDecision} className="shrink-0 px-1.5 py-0 text-[8px] tracking-[0.08em]" />
      </div>
      <div className={mode === "table" ? "flex flex-wrap gap-1.5" : "contents"}>
        <span className="rounded-xl border border-white/10 bg-black/25 px-2 py-1 text-[10px] font-semibold text-violet-100/80">Consent: {behavior.consent}</span>
        <span className="rounded-xl border border-white/10 bg-black/25 px-2 py-1 text-[10px] font-semibold text-violet-100/80">{behavior.lowConfidence} low-confidence</span>
      </div>
      {mode === "card" ? (
        <>
          <span className="rounded-xl border border-white/10 bg-black/25 px-2 py-2 text-[10px] text-violet-100/70"><Users className="mr-1 inline h-3 w-3 text-fuchsia-200/70" />{behavior.activityEvents} events</span>
          <span className="rounded-xl border border-white/10 bg-black/25 px-2 py-2 text-[10px] text-violet-100/70"><TrendingUp className="mr-1 inline h-3 w-3 text-fuchsia-200/70" />{behavior.unwraps} unwraps</span>
          <span className="rounded-xl border border-white/10 bg-black/25 px-2 py-2 text-[10px] text-violet-100/70"><Clock3 className="mr-1 inline h-3 w-3 text-fuchsia-200/70" />{behavior.watchTime} watch</span>
          <span className="rounded-xl border border-white/10 bg-black/25 px-2 py-2 text-[10px] text-violet-100/70"><Activity className="mr-1 inline h-3 w-3 text-fuchsia-200/70" />{behavior.engagement}</span>
        </>
      ) : null}
      <details className={mode === "table" ? "rounded-xl border border-white/10 bg-black/25 px-2.5 py-2" : "col-span-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2"}>
        <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.12em] text-violet-100/70">Metric source</summary>
        <div className="mt-2 space-y-1 text-[10px] leading-4 text-violet-100/58">
          <p>Activity: {behavior.activitySource}</p>
          <p>Wallet: {behavior.walletSource}</p>
          <p>Missing: {behavior.missingMetric}</p>
        </div>
      </details>
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
    <section className="border-t border-white/10 pt-6" aria-labelledby="admin-user-directory-heading" data-admin-user-directory-presentation="operations-ledger">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-100/52">Roster operations</p>
          <h2 id="admin-user-directory-heading" className="mt-1 text-lg font-black tracking-tight text-white">User directory records</h2>
          <p className="mt-1 text-xs leading-5 text-violet-100/62">Identity, permissions, wallet, behavior, and protection controls stay attached to each record.</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-fuchsia-200/15 bg-fuchsia-300/10 px-3 py-2 text-xs font-bold text-fuchsia-50">
          <Users className="h-4 w-4 text-fuchsia-200" />
          {loading ? "Refreshing records" : String(records.length) + " shown"}
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1050px] text-left">
          <thead className="bg-black/25">
            <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-[0.15em] text-violet-100/48">
              <th className="px-5 py-3">Identity</th>
              <th className="px-4 py-3">Access</th>
              <th className="px-4 py-3">Wallet</th>
              <th className="px-4 py-3">Observed behavior</th>
              <th className="px-4 py-3">Lifecycle</th>
              <th className="px-4 py-3">Protection</th>
              <th className="px-5 py-3 text-right">Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-14 text-center"><div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-fuchsia-200/20 border-t-fuchsia-200" aria-label="Loading user records" /></td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-violet-100/55">{emptyLabel}</td></tr>
            ) : records.map((record) => {
              const { user, behavior } = record;
              const status = user.status || "active";
              const hasFlags = (user.securityFlags?.ripAttempts ?? 0) > 0;

              return (
                <tr key={user.uid} className="group bg-transparent transition-colors hover:bg-fuchsia-200/[0.035]">
                  <td className="px-5 py-4 align-top">
                    <div className="flex min-w-[12rem] items-start gap-3">
                      <UserAvatar user={user} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-black text-white">{user.username ? "@" + user.username : user.displayName || "No name"}</p>
                          {user.isVerified ? <CheckCircle className="h-3.5 w-3.5 shrink-0 text-fuchsia-200" aria-label="Verified" /> : null}
                          <button type="button" onClick={() => onEditUsername(user)} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl text-violet-100/45 transition-colors hover:bg-white/10 hover:text-white" title="Edit username" aria-label="Edit username"><Edit2 className="h-3.5 w-3.5" /></button>
                        </div>
                        <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.12em] text-violet-100/45">{user.username ? user.displayName : user.uid.slice(0, 8)}</p>
                        <p className="mt-1 max-w-[13rem] truncate text-xs text-violet-100/56">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex max-w-[12rem] flex-wrap gap-1.5">
                      <RoleBadge role={user.role} />
                      <span className={["inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]", getStatusColor(user.status)].join(" ")}>{status}</span>
                      <span className={["inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em]", record.onboarding.className].join(" ")}>{record.onboarding.label}</span>
                      <span className="inline-flex rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-violet-100/70">{record.guestLinkLabel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="min-w-[8rem]">
                      <div className="flex items-center gap-1.5">
                        <p className="font-mono text-sm font-black text-fuchsia-100">{user.gumDropsBalance} GD</p>
                        <button type="button" onClick={() => onEditBalance(user)} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl text-violet-100/45 transition-colors hover:bg-fuchsia-200/10 hover:text-fuchsia-100" title="Edit balance" aria-label="Edit balance"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => onViewHistory(user)} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl text-violet-100/45 transition-colors hover:bg-white/10 hover:text-white" title="View history" aria-label="View history"><ScrollText className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="mt-2 space-y-1 text-[10px] text-violet-100/48"><p>{user.unlockedContent?.length || 0} unlocked</p><p>{user.notificationSettings?.browserPushEnabled ? "Push on" : "Push off"}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    {behavior.loaded ? (
                      <DirectoryBehaviorSummary record={record} mode="table" />
                    ) : (
                      <button type="button" onClick={() => onLoadDetail(user)} className="inline-flex min-h-11 items-center rounded-xl border border-fuchsia-200/15 bg-fuchsia-200/[0.06] px-3 text-xs font-bold text-fuchsia-50 transition-colors hover:bg-fuchsia-200/[0.12] disabled:cursor-not-allowed disabled:opacity-50" data-admin-users-loading-lane="selectedUser" disabled={selectedDetailUserId === user.uid}>{selectedDetailUserId === user.uid ? "Loading detail" : "Load detail"}</button>
                    )}
                  </td>
                  <td className="px-4 py-4 align-top"><div className="min-w-[9rem] space-y-1 text-[10px] text-violet-100/55"><p>{record.joined}</p>{record.lastSeen ? <p>{record.lastSeen}</p> : null}{record.lastPurchase ? <p>{record.lastPurchase}</p> : null}</div></td>
                  <td className="px-4 py-4 align-top">
                    {hasFlags ? (
                      <button type="button" onClick={() => onViewSecurity(user)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-300/20 bg-rose-400/10 px-3 text-xs font-black text-rose-100 transition-colors hover:bg-rose-400/20" title="View security dossier" aria-label="View security dossier"><AlertTriangle className="h-3.5 w-3.5" />{user.securityFlags?.ripAttempts} flags</button>
                    ) : (
                      <span className="inline-flex rounded-xl border border-emerald-300/10 bg-emerald-400/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100/75">Clean</span>
                    )}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex min-w-[13rem] flex-wrap justify-end gap-1.5">
                      {user.role !== "creator" ? <button type="button" onClick={() => onPromoteCreator(user)} className="inline-flex min-h-10 items-center rounded-xl border border-white/10 bg-white/5 px-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-violet-100/75 transition-colors hover:bg-white/10 hover:text-white" title="Promote to creator" aria-label="Promote to creator">Creator</button> : null}
                      <button type="button" onClick={() => onToggleVerification(user)} className={["inline-flex min-h-10 items-center rounded-xl border px-2.5 text-[10px] font-black uppercase tracking-[0.1em] transition-colors", user.isVerified ? "border-fuchsia-200/20 bg-fuchsia-200/[0.1] text-fuchsia-100" : "border-white/10 bg-white/5 text-violet-100/70 hover:text-white"].join(" ")} title={user.isVerified ? "Remove verification badge" : "Add verification badge"} aria-label={user.isVerified ? "Remove verification badge" : "Add verification badge"}>Verify</button>
                      <Link href={"/admin/user/" + user.uid} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-fuchsia-200/20 bg-fuchsia-200/[0.1] px-3 text-[10px] font-black uppercase tracking-[0.1em] text-fuchsia-50 transition-colors hover:bg-fuchsia-200/[0.16]" title="Open user analytics" aria-label="Open user analytics">Detail <ChevronRight className="h-3.5 w-3.5" /></Link>
                      {status === "active" ? (
                        <><button type="button" onClick={() => onSetStatus(user, "suspend")} className="inline-flex min-h-10 items-center rounded-xl border border-white/10 bg-white/5 px-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-violet-100/70 transition-colors hover:bg-white/10 hover:text-white" title="Suspend user" aria-label="Suspend user">Suspend</button><button type="button" onClick={() => onSetStatus(user, "ban")} className="inline-flex min-h-10 items-center rounded-xl border border-rose-300/15 bg-rose-400/[0.06] px-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-rose-100/80 transition-colors hover:bg-rose-400/[0.14]" title="Ban user" aria-label="Ban user">Ban</button></>
                      ) : (
                        <button type="button" onClick={() => onSetStatus(user, "activate")} className="inline-flex min-h-10 items-center rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] px-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100/85 transition-colors hover:bg-emerald-400/[0.14]" title="Reactivate user" aria-label="Reactivate user">Reactivate</button>
                      )}
                      <button type="button" onClick={() => onOpenContent(user)} className="inline-flex min-h-10 items-center rounded-xl border border-white/10 bg-black/20 px-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-violet-100/70 transition-colors hover:bg-white/10 hover:text-white" title="Manage content access" aria-label="Manage content access"><Lock className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 py-4 md:hidden">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-12 text-center"><div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-fuchsia-200/20 border-t-fuchsia-200" aria-label="Loading user records" /></div>
        ) : records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/25 px-4 py-12 text-center text-sm text-violet-100/55">{emptyLabel}</div>
        ) : records.map((record) => {
          const { user, behavior } = record;
          const status = user.status || "active";
          const hasFlags = (user.securityFlags?.ripAttempts ?? 0) > 0;

          return (
            <article key={user.uid} className="relative overflow-hidden rounded-[1.45rem] border border-white/10 bg-[linear-gradient(140deg,rgba(71,28,99,0.42),rgba(12,8,24,0.88))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-fuchsia-300/10 blur-3xl" />
              <div className="relative flex items-start gap-3">
                <UserAvatar user={user} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><div className="flex items-center gap-1.5"><p className="truncate text-base font-black text-white">{user.username ? "@" + user.username : user.displayName || "No name"}</p>{user.isVerified ? <CheckCircle className="h-4 w-4 shrink-0 text-fuchsia-200" aria-label="Verified" /> : null}</div><p className="mt-1 truncate font-mono text-[10px] text-violet-100/50">{user.email}</p></div>
                    <button type="button" onClick={() => onEditUsername(user)} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-violet-100/65" title="Edit username" aria-label="Edit username"><Edit2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5"><RoleBadge role={user.role} /><span className={["inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]", getStatusColor(user.status)].join(" ")}>{status}</span><span className={["inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em]", record.onboarding.className].join(" ")}>{record.onboarding.label}</span></div>
                </div>
              </div>
              <div className="relative mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"><p className="text-[10px] font-black uppercase tracking-[0.13em] text-violet-100/45">Wallet</p><p className="mt-1 font-mono text-sm font-black text-fuchsia-100">{user.gumDropsBalance} GD</p><p className="mt-1 text-[10px] text-violet-100/52">{user.unlockedContent?.length || 0} unlocked</p></div>
                <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"><p className="text-[10px] font-black uppercase tracking-[0.13em] text-violet-100/45">Lifecycle</p><p className="mt-1 text-xs font-bold text-white">{record.joined}</p><p className="mt-1 text-[10px] text-violet-100/52">{record.lastSeen || "No tracked activity"}</p></div>
              </div>
              <div className="relative mt-3 rounded-[1.15rem] border border-white/10 bg-black/25 p-3">
                {behavior.loaded ? <DirectoryBehaviorSummary record={record} mode="card" /> : <button type="button" onClick={() => onLoadDetail(user)} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-fuchsia-200/15 bg-fuchsia-200/[0.06] px-3 text-xs font-bold text-fuchsia-50 disabled:cursor-not-allowed disabled:opacity-50" data-admin-users-loading-lane="selectedUser" disabled={selectedDetailUserId === user.uid}>{selectedDetailUserId === user.uid ? "Loading behavior detail" : "Load behavior detail"}</button>}
              </div>
              {hasFlags ? (
                <button type="button" onClick={() => onViewSecurity(user)} className="relative mt-3 flex min-h-11 w-full items-center justify-between rounded-xl border border-rose-300/20 bg-rose-400/[0.09] px-3 text-left text-sm font-bold text-rose-100"><span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {user.securityFlags?.ripAttempts} security flags</span><span className="text-[10px] font-black uppercase tracking-[0.12em]">Review</span></button>
              ) : <p className="relative mt-3 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/65">Protection status: clean</p>}
              <div className="relative mt-4 grid grid-cols-4 gap-2">
                <button type="button" onClick={() => onEditBalance(user)} className="flex min-h-14 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-[10px] font-black uppercase tracking-[0.08em] text-violet-100/75"><DollarSign className="mb-1 h-4 w-4 text-fuchsia-200" /> Balance</button>
                <button type="button" onClick={() => onOpenContent(user)} className="flex min-h-14 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-[10px] font-black uppercase tracking-[0.08em] text-violet-100/75"><Lock className="mb-1 h-4 w-4 text-fuchsia-200" /> Content</button>
                <button type="button" onClick={() => onViewHistory(user)} className="flex min-h-14 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-[10px] font-black uppercase tracking-[0.08em] text-violet-100/75"><ScrollText className="mb-1 h-4 w-4 text-fuchsia-200" /> History</button>
                <button type="button" onClick={() => onSetStatus(user, "ban")} className="flex min-h-14 flex-col items-center justify-center rounded-xl border border-rose-300/15 bg-rose-400/[0.06] text-[10px] font-black uppercase tracking-[0.08em] text-rose-100/85"><Ban className="mb-1 h-4 w-4" /> Ban</button>
              </div>
              <Link href={"/admin/user/" + user.uid} className="relative mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-fuchsia-200/20 bg-fuchsia-200/[0.12] px-4 text-xs font-black uppercase tracking-[0.11em] text-fuchsia-50">Open detail <ChevronRight className="h-4 w-4" /></Link>
              <div className="relative mt-3 grid grid-cols-[1fr_auto] gap-2">
                <select value={user.role || "user"} onChange={(event) => onChangeRole(user, event.target.value as ManagedRole)} className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-center text-xs font-black uppercase tracking-[0.1em] text-fuchsia-100 outline-none"><option value="user">User role</option><option value="creator">Creator role</option><option value="admin">Admin role</option></select>
                <button type="button" onClick={() => onToggleVerification(user)} className={["min-h-11 rounded-xl border px-3 text-[10px] font-black uppercase tracking-[0.08em]", user.isVerified ? "border-fuchsia-200/20 bg-fuchsia-200/[0.1] text-fuchsia-100" : "border-white/10 bg-white/5 text-violet-100/70"].join(" ")}>{user.isVerified ? "Verified" : "Verify"}</button>
              </div>
              <div className="relative mt-2 grid grid-cols-2 gap-2">
                {status === "active" ? <button type="button" onClick={() => onSetStatus(user, "suspend")} className="min-h-11 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-[10px] font-black uppercase tracking-[0.1em] text-violet-100/75">Suspend</button> : <button type="button" onClick={() => onSetStatus(user, "activate")} className="min-h-11 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] px-3 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100/85">Reactivate</button>}
                {user.role !== "creator" ? <button type="button" onClick={() => onPromoteCreator(user)} className="min-h-11 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-[10px] font-black uppercase tracking-[0.1em] text-violet-100/75">Make creator</button> : <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-black/20 px-3 text-[10px] font-black uppercase tracking-[0.1em] text-violet-100/48">Creator role</span>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function AdminUserDetailMasthead({
  user,
  joinedLabel,
  onBack,
}: {
  user: UserProfile;
  joinedLabel: string;
  onBack: () => void;
}) {
  const status = user.status || "active";

  return (
    <section className="relative overflow-hidden border-b border-white/10 pb-6" data-admin-user-detail-presentation="operations-dossier">
      <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-fuchsia-300/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-violet-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 text-sm font-bold text-violet-100/78 transition-colors hover:bg-white/10 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to roster</button>
          <div className="flex flex-wrap gap-2"><RoleBadge role={user.role} /><span className={["inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]", status === "active" ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" : "border-rose-300/20 bg-rose-400/10 text-rose-100"].join(" ")}>{status}</span></div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.35rem] border border-fuchsia-200/25 bg-black/30 text-2xl font-black text-fuchsia-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              {user.photoURL ? <Image src={user.photoURL} alt={user.displayName || "User"} fill sizes="64px" className="object-cover" /> : (user.displayName?.[0] || user.email?.[0] || "U").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-100/55">Account operator record</p>
              <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-white sm:text-3xl">{user.displayName || user.email || "User"}</h1>
              <p className="mt-2 text-sm font-bold text-fuchsia-100">{user.username ? "@" + user.username : "No public username"}</p>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-violet-100/62"><span className="max-w-full truncate font-mono">{user.email || "No email"}</span><span className="break-all font-mono text-violet-100/45">{user.uid}</span><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-fuchsia-200/75" /> Joined {joinedLabel}</span></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <div className="min-w-40 rounded-full border border-white/10 bg-black/25 px-4 py-2.5"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-100/45">Current balance</p><p className="mt-1 text-lg font-black text-fuchsia-100">{user.gumDropsBalance ?? 0} GD</p></div>
            <div className="min-w-40 rounded-full border border-white/10 bg-black/25 px-4 py-2.5"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-100/45">Unlocked Drops</p><p className="mt-1 text-lg font-black text-white">{user.unlockedContent?.length ?? 0}</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}
