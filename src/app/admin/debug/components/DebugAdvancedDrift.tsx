"use client";

import { Pill, Section, ScrollWrap } from "./DebugPrimitives";

/* ─── Props ─── */
export interface DebugAdvancedDriftProps {
    data: any;
}

/* ─── Helpers (local) ─── */
function compactNumber(value?: number) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

/* ─── Component ─── */
export function DebugAdvancedDrift({ data }: DebugAdvancedDriftProps) {
    return (
        <>
            {/* ── Task parity and Gum Drop guardrails ── */}
            <Section
                title="Task parity and Gum Drop guardrails"
                subtitle="Task assignment issues, reward parity, and creator-spend guardrails in one view."
                defaultOpen={false}
                summary={<><Pill label="Affected users" value={data?.stats?.usersWithTaskIssues ?? 0} tone={data?.stats?.usersWithTaskIssues ? "warn" : "good"} /><Pill label="Reward delta 7d" value={data?.stats?.rewardEventDeltaLast7d ?? 0} tone={(data?.stats?.rewardEventDeltaLast7d ?? 0) === 0 ? "good" : "warn"} /><Pill label="Creator spend violations" value={data?.stats?.creatorSpendViolationsLast7d ?? 0} tone={(data?.stats?.creatorSpendViolationsLast7d ?? 0) === 0 ? "good" : "warn"} />{(data?.stats?.taskEventsSamplePartial ?? 0) > 0 || (data?.stats?.taskReceiptsSamplePartial ?? 0) > 0 ? <Pill label="Sample" value="partial" tone="warn" /> : null}</>}
            >
                {(data?.stats?.taskEventsSamplePartial ?? 0) > 0 || (data?.stats?.taskReceiptsSamplePartial ?? 0) > 0 ? (
                    <div className="mb-4 rounded-[1rem] border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                        The 7-day task parity audit hit its bounded sample window.
                        Event sample {data?.taskAuditSample?.taskEventsSampleCount ?? 0}/{data?.taskAuditSample?.taskEventsSampleLimit ?? 0},
                        receipt sample {data?.taskAuditSample?.receiptsSampleCount ?? 0}/{data?.taskAuditSample?.receiptsSampleLimit ?? 0}.
                        Treat mismatches here as partial until the deeper audit lane is run.
                    </div>
                ) : null}
                <div className="mb-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex flex-wrap gap-2">
                            <Pill label="Reward version" value={data?.taskRewardConfig?.rewardVersion ?? "--"} />
                            <Pill label="Multiplier" value={`${data?.taskRewardConfig?.multiplierPercent ?? 0}%`} />
                            <Pill label="Built-in avg" value={data?.taskRewardConfig?.builtInAverageReward ?? 0} />
                            <Pill label="Legacy custom" value={data?.taskRewardConfig?.legacyRewardVersionCount ?? 0} tone={(data?.taskRewardConfig?.legacyRewardVersionCount ?? 0) === 0 ? "good" : "warn"} />
                        </div>
                        <p className="mt-3 text-xs leading-6 text-gray-400">
                            Reward settings are normalized under one active version so built-ins, legacy custom tasks, receipts, and admin task tools stay aligned after economy tuning.
                        </p>
                    </div>
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex flex-wrap gap-2">
                            <Pill label="Tracked creator spends" value={data?.creatorSpendParity?.trackedTransactions ?? 0} />
                            <Pill label="Purchased spent" value={data?.creatorSpendParity?.totalPurchasedSpent ?? 0} />
                            <Pill label="Reward spent" value={data?.creatorSpendParity?.totalRewardSpent ?? 0} tone={(data?.creatorSpendParity?.totalRewardSpent ?? 0) === 0 ? "good" : "warn"} />
                            <Pill label="Amount mismatches" value={data?.creatorSpendParity?.amountMismatchCount ?? 0} tone={(data?.creatorSpendParity?.amountMismatchCount ?? 0) === 0 ? "good" : "warn"} />
                        </div>
                        <p className="mt-3 text-xs leading-6 text-gray-400">
                            Creator chat, subscriptions, requests, and bookings are expected to consume purchased Gum Drops only. Reward-spend or amount mismatch remains a parity warning.
                        </p>
                    </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-1">
                    <ScrollWrap>
                        <div className="divide-y divide-white/10">
                            {(data?.assignmentIssues || []).length ? (data?.assignmentIssues || []).map((issue: any) => (
                                <div key={issue.uid} className="space-y-2 px-4 py-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-white">{issue.username}</p>
                                            <p className="text-xs text-gray-400">{issue.uid}</p>
                                        </div>
                                        <Pill label="Issues" value={issue.issueCount} tone="warn" />
                                    </div>
                                    <div className="flex flex-wrap gap-2">{(issue.taskIds || []).map((taskId: string) => <Pill key={taskId} label="Task" value={taskId} />)}</div>
                                    <div className="space-y-1 text-sm text-amber-100">{(issue.issues || []).map((entry: string) => <div key={entry}>- {entry}</div>)}</div>
                                </div>
                            )) : <div className="px-4 py-4 text-sm text-emerald-100">No assignment integrity issues were detected in the sampled users.</div>}
                        </div>
                    </ScrollWrap>
                    <ScrollWrap>
                        <div className="divide-y divide-white/10">
                            {(data?.taskParity || []).map((entry: any) => (
                                <div key={entry.taskId} className="space-y-2 px-4 py-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-white">{entry.title}</p>
                                            <p className="text-xs text-gray-400">{entry.taskId}</p>
                                        </div>
                                        <Pill label="Completed" value={entry.completedCount} />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Pill label="Rewarded" value={entry.rewardedCount} tone={entry.completedCount !== entry.rewardedCount ? "warn" : "good"} />
                                        <Pill label="Receipts" value={entry.receiptCount} />
                                        <Pill label="Reward total" value={entry.rewardTotal} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollWrap>
                </div>
                {(data?.creatorSpendParity?.byType || []).length ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {(data?.creatorSpendParity?.byType || []).map((entry: any) => (
                            <div key={entry.type} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-white">{entry.label}</p>
                                        <p className="text-xs text-gray-400">{entry.type}</p>
                                    </div>
                                    <Pill label="Count" value={entry.count} />
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Pill label="Purchased" value={entry.purchasedSpent} />
                                    <Pill label="Reward" value={entry.rewardSpent} tone={entry.rewardSpent ? "warn" : "good"} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </Section>

            {/* ── Runtime task sample and custom-task drift ── */}
            <Section
                title="Runtime task sample and custom-task drift"
                subtitle="Sampled runtime state from assignments, task events, receipts, reward claims, and rollups."
                defaultOpen={false}
                summary={<><Pill label="Sampled users" value={data?.runtimeTaskAudit?.summary?.sampledUsers ?? 0} /><Pill label="Assignments" value={data?.stats?.runtimeAssignedTasks ?? 0} /><Pill label="Custom assigned" value={data?.stats?.runtimeCustomAssignments ?? 0} tone={(data?.stats?.runtimeCustomAssignments ?? 0) > 0 ? "good" : "warn"} /><Pill label="Cooldown drift" value={data?.stats?.runtimeCooldownConflictUsers ?? 0} tone={(data?.stats?.runtimeCooldownConflictUsers ?? 0) === 0 ? "good" : "warn"} /><Pill label="Unsupported runtime" value={data?.stats?.runtimeUnsupportedTaskRecords ?? 0} tone={(data?.stats?.runtimeUnsupportedTaskRecords ?? 0) === 0 ? "good" : "warn"} />{(data?.stats?.taskEventsSamplePartial ?? 0) > 0 || (data?.stats?.taskReceiptsSamplePartial ?? 0) > 0 ? <Pill label="Sample" value="partial" tone="warn" /> : null}</>}
            >
                {(data?.stats?.taskEventsSamplePartial ?? 0) > 0 || (data?.stats?.taskReceiptsSamplePartial ?? 0) > 0 ? (
                    <div className="mb-4 rounded-[1rem] border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                        Runtime task drift is derived from a bounded 7-day sample, not a full-history sweep.
                        Increase the audit depth before treating every warning as global truth.
                    </div>
                ) : null}
                <div className="grid gap-4 lg:grid-cols-1">
                    <ScrollWrap>
                        <div className="divide-y divide-white/10">
                            {(data?.runtimeTaskAudit?.distribution || []).slice(0, 24).map((entry: any) => (
                                <div key={entry.taskId} className="space-y-2 px-4 py-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-white">{entry.title}</p>
                                            <p className="text-xs text-gray-400">{entry.taskId} | {entry.eventLabel}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Origin" value={entry.definitionOrigin} tone={entry.definitionOrigin === "custom" ? "warn" : "good"} />
                                            <Pill label="Assigned users" value={entry.assignedUsers} />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Pill label="Mode" value={entry.actionMode === "runtime" ? "runtime" : "route"} />
                                        <Pill label="Scope" value={entry.scope} />
                                        <Pill label="Claimed" value={entry.claimedAssignments} />
                                        <Pill label="Completed" value={entry.recentCompletedCount} />
                                        <Pill label="Rewards" value={entry.recentRewardClaimCount} tone={entry.recentCompletedCount !== entry.recentRewardClaimCount ? "warn" : "good"} />
                                        <Pill label="Cooldown" value={`${entry.cooldownDays}d`} />
                                        {entry.active === false ? <Pill label="Status" value="inactive" tone="warn" /> : null}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {entry.usersWithRefreshIssues ? <Pill label="Refresh issues" value={entry.usersWithRefreshIssues} tone="warn" /> : null}
                                        {entry.cooldownConflictUsers ? <Pill label="Cooldown drift" value={entry.cooldownConflictUsers} tone="warn" /> : null}
                                        {entry.recentReceiptCount ? <Pill label="Receipts" value={entry.recentReceiptCount} /> : null}
                                        {entry.rollupCompletedCount ? <Pill label="Rollup completed" value={entry.rollupCompletedCount} /> : null}
                                        {entry.eventStatTotalCount ? <Pill label="Event stats" value={compactNumber(entry.eventStatTotalCount)} /> : null}
                                    </div>
                                    {entry.driftReasons?.length ? (
                                        <div className="space-y-1 text-sm text-amber-100">
                                            {entry.driftReasons.map((reason: string) => (
                                                <div key={reason}>- {reason.replaceAll("_", " ")}</div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs leading-6 text-gray-400">
                                            {entry.actionLabel} {"->"} {entry.destinationHref}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollWrap>
                    <div className="space-y-4">
                        <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                            <div className="flex flex-wrap gap-2">
                                <Pill label="Custom defs" value={data?.taskRewardConfig?.customTaskCount ?? 0} />
                                <Pill label="Custom with assignments" value={data?.runtimeTaskAudit?.summary?.customDefinitionsWithAssignments ?? 0} />
                                <Pill label="Custom drift" value={data?.stats?.runtimeCustomTaskDrift ?? 0} tone={(data?.stats?.runtimeCustomTaskDrift ?? 0) === 0 ? "good" : "warn"} />
                                <Pill label="No runtime signal" value={data?.runtimeTaskAudit?.summary?.customDefinitionsWithoutRuntimeSignals ?? 0} />
                            </div>
                            <p className="mt-3 text-xs leading-6 text-gray-400">
                                Custom and admin-authored tasks stay on the same runtime truth model as built-ins. This panel surfaces assignments, drift, reward visibility, cooldown pressure, and definitions that still exist only on paper.
                            </p>
                        </div>
                        <ScrollWrap>
                            <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                {(data?.runtimeTaskAudit?.customDistribution || []).length ? (data?.runtimeTaskAudit?.customDistribution || []).map((entry: any) => (
                                    <div key={entry.taskId} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.title}</p>
                                                <p className="text-xs text-gray-400">{entry.taskId}</p>
                                            </div>
                                            <Pill label="Assigned" value={entry.assignedUsers} tone={entry.assignedUsers > 0 ? "good" : "warn"} />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Scope" value={entry.scope} />
                                            <Pill label="Tracking" value={entry.trackingSource} tone={entry.trackingSource === "unsupported" ? "bad" : "good"} />
                                            {entry.targetUserId ? <Pill label="Target user" value={entry.targetUserId} /> : null}
                                            {entry.oneTime ? <Pill label="Mode" value="one-time" /> : null}
                                        </div>
                                    </div>
                                )) : <div className="px-4 py-4 text-sm text-emerald-100">No custom task definitions are present in the sampled runtime data.</div>}
                            </div>
                        </ScrollWrap>
                    </div>
                </div>
            </Section>
        </>
    );
}
