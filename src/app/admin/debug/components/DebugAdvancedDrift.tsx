"use client";

import { Pill, Section, ScrollWrap } from "./DebugPrimitives";

export interface DebugAdvancedDriftProps {
    data: any;
}

function compactNumber(value?: number) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function toneForGuardrailState(state?: string) {
    if (state === "error") return "bad" as const;
    if (state === "review") return "warn" as const;
    if (state === "live") return "good" as const;
    return "neutral" as const;
}

function shortUid(value?: string) {
    if (!value) return "unknown";
    if (value.length <= 12) return value;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function DebugAdvancedDrift({ data }: DebugAdvancedDriftProps) {
    const guardrails = data?.taskGumdropGuardrails;
    const affectedUsers = data?.assignmentIssues || [];
    const taskReceiptParity = guardrails?.taskReceiptParity || data?.taskParity || [];
    const creatorSpendRows = data?.creatorSpendParity?.byType || [];

    return (
        <>
            <Section
                title="Task parity and Gum Drop guardrails"
                subtitle="Task assignment issues, reward parity, creator-spend guardrails, and receipt explanations in one view."
                defaultOpen={false}
                summary={
                    <>
                        <Pill
                            label="Assignment issues"
                            value={guardrails?.affectedUsersCount ?? data?.stats?.usersWithTaskIssues ?? 0}
                            tone={(guardrails?.affectedUsersCount ?? data?.stats?.usersWithTaskIssues ?? 0) > 0 ? "warn" : "good"}
                            truthState="live"
                            badgeLabel="LOADED"
                        />
                        <Pill
                            label="Reward delta 7d"
                            value={guardrails?.rewardDelta7d ?? data?.stats?.rewardEventDeltaLast7d ?? 0}
                            tone={(guardrails?.rewardDelta7d ?? data?.stats?.rewardEventDeltaLast7d ?? 0) === 0 ? "good" : "warn"}
                            truthState="live"
                            badgeLabel="LOADED"
                        />
                        <Pill
                            label="Creator spend violations"
                            value={guardrails?.creatorSpendViolations ?? data?.stats?.creatorSpendViolationsLast7d ?? 0}
                            tone={(guardrails?.creatorSpendViolations ?? data?.stats?.creatorSpendViolationsLast7d ?? 0) === 0 ? "good" : "warn"}
                            truthState="live"
                            badgeLabel="LOADED"
                        />
                        <Pill
                            label="Receipt parity"
                            value={`${guardrails?.receiptParity?.okCount ?? 0} ok / ${(guardrails?.receiptParity?.reviewCount ?? 0) + (guardrails?.receiptParity?.errorCount ?? 0)} review`}
                            tone={toneForGuardrailState(guardrails?.receiptParity?.state)}
                            truthState="live"
                            badgeLabel="LOADED"
                        />
                        {(data?.stats?.taskEventsSamplePartial ?? 0) > 0 || (data?.stats?.taskReceiptsSamplePartial ?? 0) > 0 ? (
                            <Pill label="Sample" value="partial" tone="warn" truthState="degraded" badgeLabel="PARTIAL" />
                        ) : null}
                    </>
                }
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
                    <div
                        className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4"
                        data-task-guardrail-reward-version={guardrails?.rewardSettings?.version ?? data?.taskRewardConfig?.rewardVersion ?? 0}
                        data-task-guardrail-multiplier={guardrails?.rewardSettings?.multiplierPct ?? data?.taskRewardConfig?.multiplierPercent ?? 0}
                        data-task-guardrail-built-in-avg={guardrails?.rewardSettings?.builtInAverageRewardGd ?? data?.taskRewardConfig?.builtInAverageReward ?? 0}
                    >
                        <div className="flex flex-wrap gap-2">
                            <Pill
                                label="Reward version"
                                value={guardrails?.rewardSettings?.version ?? data?.taskRewardConfig?.rewardVersion ?? "--"}
                                tone={toneForGuardrailState(guardrails?.rewardSettings?.state)}
                                truthState="live"
                                badgeLabel="LOADED"
                            />
                            <Pill
                                label="Multiplier"
                                value={`${guardrails?.rewardSettings?.multiplierPct ?? data?.taskRewardConfig?.multiplierPercent ?? 0}%`}
                                tone="neutral"
                                truthState="live"
                                badgeLabel="LOADED"
                            />
                            <Pill
                                label="Built-in avg"
                                value={`${guardrails?.rewardSettings?.builtInAverageRewardGd ?? data?.taskRewardConfig?.builtInAverageReward ?? 0} GD`}
                                tone="neutral"
                                truthState="live"
                                badgeLabel="LOADED"
                            />
                            <Pill
                                label="Legacy custom"
                                value={guardrails?.rewardSettings?.legacyCustomCount ?? data?.taskRewardConfig?.legacyRewardVersionCount ?? 0}
                                tone={(guardrails?.rewardSettings?.legacyCustomCount ?? data?.taskRewardConfig?.legacyRewardVersionCount ?? 0) === 0 ? "good" : "warn"}
                                truthState="live"
                                badgeLabel="LOADED"
                            />
                        </div>
                        <p className="mt-3 text-xs leading-6 text-gray-400">
                            Reward settings are loaded config and inventory values. They only move to review when the catalog or versioning falls out of sync.
                        </p>
                    </div>

                    <div
                        className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4"
                        data-task-guardrail-creator-spend-state={guardrails?.creatorSpend?.state ?? "live"}
                    >
                        <div className="flex flex-wrap gap-2">
                            <Pill
                                label="Tracked creator spends"
                                value={guardrails?.creatorSpend?.trackedSpendCount ?? data?.creatorSpendParity?.trackedTransactions ?? 0}
                                tone="neutral"
                                truthState="live"
                                badgeLabel="LOADED"
                            />
                            <Pill
                                label="Purchased spent"
                                value={guardrails?.creatorSpend?.purchasedSpendCount ?? data?.creatorSpendParity?.totalPurchasedSpent ?? 0}
                                tone="neutral"
                                truthState="live"
                                badgeLabel="LOADED"
                            />
                            <Pill
                                label="Reward spent"
                                value={guardrails?.creatorSpend?.rewardSpendCount ?? data?.creatorSpendParity?.totalRewardSpent ?? 0}
                                tone={(guardrails?.creatorSpend?.rewardSpendCount ?? data?.creatorSpendParity?.totalRewardSpent ?? 0) === 0 ? "good" : "warn"}
                                truthState="live"
                                badgeLabel="LOADED"
                            />
                            <Pill
                                label="Amount mismatches"
                                value={guardrails?.creatorSpend?.amountMismatchCount ?? data?.creatorSpendParity?.amountMismatchCount ?? 0}
                                tone={(guardrails?.creatorSpend?.amountMismatchCount ?? data?.creatorSpendParity?.amountMismatchCount ?? 0) === 0 ? "good" : "warn"}
                                truthState="live"
                                badgeLabel="LOADED"
                            />
                        </div>
                        <p className="mt-3 text-xs leading-6 text-gray-400">
                            {guardrails?.creatorSpend?.explanation || "Creator chat, subscriptions, requests, and bookings are expected to consume purchased Gum Drops only."}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-1">
                    <ScrollWrap>
                        <div className="divide-y divide-white/10">
                            {affectedUsers.length ? affectedUsers.map((issue: any) => (
                                <div key={issue.uid} className="space-y-2 px-4 py-3" data-task-affected-user-count={guardrails?.affectedUsersCount ?? affectedUsers.length}>
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-white">{issue.username}</p>
                                            <p className="text-xs text-gray-400">{shortUid(issue.uid)} | {issue.attribution?.issueType || "assignment_missing"}</p>
                                        </div>
                                        <Pill label="Issues" value={issue.issueCount} tone="warn" truthState="degraded" badgeLabel="REVIEW" />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Pill label="Expected source" value={issue.attribution?.expectedSource || "task_catalog"} tone="neutral" truthState="live" badgeLabel="INFO" />
                                        <Pill label="Found source" value={issue.attribution?.foundSource || "none"} tone="neutral" truthState="live" badgeLabel="INFO" />
                                        <Pill label="Freshness" value={issue.attribution?.sourceFreshness || "unknown"} tone={issue.attribution?.sourceFreshness === "stale" ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(issue.taskIds || []).map((taskId: string) => (
                                            <Pill key={taskId} label="Task" value={taskId} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                        ))}
                                    </div>
                                    <div className="space-y-1 text-sm text-amber-100">
                                        {(issue.issues || []).map((entry: string) => <div key={entry}>- {entry}</div>)}
                                    </div>
                                    <p className="text-xs text-gray-400">{issue.attribution?.recommendedAction || "Rebuild task assignment for this user after validating the current daily task window."}</p>
                                </div>
                            )) : (
                                <div className="px-4 py-4 text-sm text-emerald-100">No assignment integrity issues were detected in the sampled users.</div>
                            )}
                        </div>
                    </ScrollWrap>

                    <ScrollWrap>
                        <div className="divide-y divide-white/10">
                            {taskReceiptParity.map((entry: any) => (
                                <div
                                    key={entry.taskId}
                                    className="space-y-2 px-4 py-3"
                                    data-task-receipt-policy={entry.expectedReceiptPolicy || "unknown"}
                                    data-task-receipt-parity-state={entry.receiptParityState || "review"}
                                    data-task-paid-reward-total={entry.paidRewardTotalGd ?? entry.rewardTotal ?? 0}
                                    data-task-potential-reward-total={entry.potentialRewardTotalGd ?? 0}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-white">{entry.taskTitle || entry.title}</p>
                                            <p className="text-xs text-gray-400">{entry.taskId}</p>
                                        </div>
                                        <Pill
                                            label="Receipt parity"
                                            value={entry.receiptParityState || "review"}
                                            tone={toneForGuardrailState(entry.receiptParityState)}
                                            truthState="live"
                                            badgeLabel={entry.receiptParityState === "error" ? "ERROR" : entry.receiptParityState === "review" ? "REVIEW" : "LIVE"}
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Pill label="Completed" value={entry.completedCount} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Rewarded" value={entry.rewardedCount} tone={entry.completedCount !== entry.rewardedCount ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                        <Pill
                                            label="Task reward receipts"
                                            value={entry.taskRewardReceiptCount ?? entry.receiptCount ?? 0}
                                            tone={(entry.rewardedCount ?? 0) > 0 && (entry.taskRewardReceiptCount ?? entry.receiptCount ?? 0) === 0 && entry.expectedReceiptPolicy !== "not_required" ? "bad" : "neutral"}
                                            truthState="live"
                                            badgeLabel="LOADED"
                                        />
                                        {typeof entry.purchaseReceiptCount === "number" ? (
                                            <Pill label="Purchase receipts" value={entry.purchaseReceiptCount} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                        ) : null}
                                        {typeof entry.relatedActionReceiptCount === "number" ? (
                                            <Pill
                                                label={entry.relatedActionReceiptLabel || "Related action receipts"}
                                                value={entry.relatedActionReceiptCount}
                                                tone="neutral"
                                                truthState="live"
                                                badgeLabel="LOADED"
                                            />
                                        ) : null}
                                        <Pill label="Paid rewards" value={`${entry.paidRewardTotalGd ?? entry.rewardTotal ?? 0} GD`} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Potential assigned rewards" value={`${entry.potentialRewardTotalGd ?? 0} GD`} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Receipt policy" value={entry.expectedReceiptPolicy || "unknown"} tone="neutral" truthState="live" badgeLabel="INFO" />
                                    </div>
                                    <p className="text-xs leading-6 text-gray-400">{entry.explanation || "Task receipt parity explanation unavailable."}</p>
                                </div>
                            ))}
                        </div>
                    </ScrollWrap>
                </div>

                {creatorSpendRows.length ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {creatorSpendRows.map((entry: any) => (
                            <div key={entry.type} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-white">{entry.label}</p>
                                        <p className="text-xs text-gray-400">{entry.type}</p>
                                    </div>
                                    <Pill label="Count" value={entry.count} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Pill label="Purchased" value={entry.purchasedSpent} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                    <Pill label="Reward" value={entry.rewardSpent} tone={entry.rewardSpent ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                </div>
                                <p className="mt-3 text-xs leading-6 text-gray-400">
                                    {entry.count} creator {entry.label.toLowerCase()} spend(s) used purchased GD; {entry.rewardSpent} used reward GD.
                                </p>
                            </div>
                        ))}
                    </div>
                ) : null}
            </Section>

            <Section
                title="Runtime task sample and custom-task drift"
                subtitle="Sampled runtime state from assignments, task events, receipts, reward claims, and rollups."
                defaultOpen={false}
                summary={
                    <>
                        <Pill label="Sampled users" value={data?.runtimeTaskAudit?.summary?.sampledUsers ?? 0} truthState="live" badgeLabel="LOADED" />
                        <Pill label="Assignments" value={data?.stats?.runtimeAssignedTasks ?? 0} truthState="live" badgeLabel="LOADED" />
                        <Pill label="Custom assigned" value={data?.stats?.runtimeCustomAssignments ?? 0} tone={(data?.stats?.runtimeCustomAssignments ?? 0) > 0 ? "good" : "warn"} truthState="live" badgeLabel="LOADED" />
                        <Pill label="Cooldown drift" value={data?.stats?.runtimeCooldownConflictUsers ?? 0} tone={(data?.stats?.runtimeCooldownConflictUsers ?? 0) === 0 ? "good" : "warn"} truthState="live" badgeLabel="LOADED" />
                        <Pill label="Unsupported runtime" value={data?.stats?.runtimeUnsupportedTaskRecords ?? 0} tone={(data?.stats?.runtimeUnsupportedTaskRecords ?? 0) === 0 ? "good" : "warn"} truthState="live" badgeLabel="LOADED" />
                        {(data?.stats?.taskEventsSamplePartial ?? 0) > 0 || (data?.stats?.taskReceiptsSamplePartial ?? 0) > 0 ? <Pill label="Sample" value="partial" tone="warn" truthState="degraded" badgeLabel="PARTIAL" /> : null}
                    </>
                }
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
                                            <Pill label="Origin" value={entry.definitionOrigin} tone={entry.definitionOrigin === "custom" ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Assigned users" value={entry.assignedUsers} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Pill label="Mode" value={entry.actionMode === "runtime" ? "runtime" : "route"} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Scope" value={entry.scope} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Claimed" value={entry.claimedAssignments} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Completed" value={entry.recentCompletedCount} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Rewards" value={entry.recentRewardClaimCount} tone={entry.recentCompletedCount !== entry.recentRewardClaimCount ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Cooldown" value={`${entry.cooldownDays}d`} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                        {entry.active === false ? <Pill label="Status" value="inactive" tone="warn" truthState="degraded" badgeLabel="REVIEW" /> : null}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {entry.usersWithRefreshIssues ? <Pill label="Refresh issues" value={entry.usersWithRefreshIssues} tone="warn" truthState="degraded" badgeLabel="REVIEW" /> : null}
                                        {entry.cooldownConflictUsers ? <Pill label="Cooldown drift" value={entry.cooldownConflictUsers} tone="warn" truthState="degraded" badgeLabel="REVIEW" /> : null}
                                        {entry.recentReceiptCount ? <Pill label="Receipts" value={entry.recentReceiptCount} tone="neutral" truthState="live" badgeLabel="LOADED" /> : null}
                                        {entry.rollupCompletedCount ? <Pill label="Rollup completed" value={entry.rollupCompletedCount} tone="neutral" truthState="live" badgeLabel="LOADED" /> : null}
                                        {entry.eventStatTotalCount ? <Pill label="Event stats" value={compactNumber(entry.eventStatTotalCount)} tone="neutral" truthState="live" badgeLabel="LOADED" /> : null}
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
                                <Pill label="Custom defs" value={data?.taskRewardConfig?.customTaskCount ?? 0} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                <Pill label="Custom with assignments" value={data?.runtimeTaskAudit?.summary?.customDefinitionsWithAssignments ?? 0} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                <Pill label="Custom drift" value={data?.stats?.runtimeCustomTaskDrift ?? 0} tone={(data?.stats?.runtimeCustomTaskDrift ?? 0) === 0 ? "good" : "warn"} truthState="live" badgeLabel="LOADED" />
                                <Pill label="No runtime signal" value={data?.runtimeTaskAudit?.summary?.customDefinitionsWithoutRuntimeSignals ?? 0} tone="neutral" truthState="live" badgeLabel="LOADED" />
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
                                            <Pill label="Assigned" value={entry.assignedUsers} tone={entry.assignedUsers > 0 ? "good" : "warn"} truthState="live" badgeLabel="LOADED" />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Scope" value={entry.scope} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Tracking" value={entry.trackingSource} tone={entry.trackingSource === "unsupported" ? "bad" : "good"} truthState="live" badgeLabel="LOADED" />
                                            {entry.targetUserId ? <Pill label="Target user" value={entry.targetUserId} tone="neutral" truthState="live" badgeLabel="LOADED" /> : null}
                                            {entry.oneTime ? <Pill label="Mode" value="one-time" tone="neutral" truthState="live" badgeLabel="LOADED" /> : null}
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
