export type ReleaseStage = "alpha" | "beta" | "ga";
export type ReleaseStatus = "active" | "archived";

export interface ReleaseChangelogEntry {
    id: string;
    date: string;
    title: string;
    summary: string;
    areas: string[];
}

export interface ReleaseRecord {
    id: string;
    label: string;
    channel: ReleaseStage;
    status: ReleaseStatus;
    train: string;
    declaredAt: string;
    summary: string;
    releaseNotes: string[];
}

const CURRENT_RELEASE: ReleaseRecord = {
    id: "v1-alpha-2026-03-25",
    label: "V1 Alpha",
    channel: "alpha",
    status: "active",
    train: "alpha",
    declaredAt: "2026-03-25",
    summary: "Current product state is preserved as the alpha baseline before forward experimental development.",
    releaseNotes: [
        "Canonical telemetry, watch-time, task, security, commerce, and orchestration systems are active.",
        "Admin dashboard and debug surfaces have been hardened for parity and source-of-truth confidence.",
        "Phase 7 introduces controlled rollout and release tracking foundations without changing live product behavior.",
    ],
};

const CHANGELOG_ENTRIES: ReleaseChangelogEntry[] = [
    {
        id: "2026-03-25-phase7",
        date: "2026-03-25",
        title: "Rollout and alpha-state foundations",
        summary: "Added phased rollout contracts, sticky experiment support, code-native alpha release tracking, and admin/debug release visibility.",
        areas: ["rollouts", "telemetry", "admin-debug", "release-management"],
    },
    {
        id: "2026-03-25-phase6",
        date: "2026-03-25",
        title: "Slow-connection loading hardening",
        summary: "Reduced unnecessary client-side loading pressure across content-heavy surfaces and slow links.",
        areas: ["drops", "viewer", "dashboard", "notifications", "performance"],
    },
    {
        id: "2026-03-24-v1-sweep",
        date: "2026-03-24",
        title: "V1 regression and stability sweep",
        summary: "Completed the final hardening passes across dependencies, Firebase, runtime freshness, admin parity, and core product loops.",
        areas: ["stability", "firebase", "runtime", "admin", "ledger"],
    },
];

export function getCurrentRelease() {
    return CURRENT_RELEASE;
}

export function getChangelogEntries(limit = CHANGELOG_ENTRIES.length) {
    return CHANGELOG_ENTRIES.slice(0, Math.max(0, limit));
}

export function getReleaseTelemetryContext() {
    return {
        release_id: CURRENT_RELEASE.id,
        release_stage: CURRENT_RELEASE.channel,
        release_status: CURRENT_RELEASE.status,
        release_train: CURRENT_RELEASE.train,
    } as const;
}
