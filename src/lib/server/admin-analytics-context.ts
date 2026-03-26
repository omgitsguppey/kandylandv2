import "server-only";

import { describeSecurityEvent } from "@/lib/security-events";

import {
    getTelemetryParamNumber,
    getTelemetryParamString,
    type TelemetryLogRecord,
    toNumber,
    toStringValue,
    type ViewerDropInsight,
    type ViewerUserOption,
} from "./admin-analytics-shared";

export interface AnalyticsSurfaceContextItem {
    key: string;
    label: string;
    count: number;
    uniqueUsers: number;
    experienceCount: number;
    lastSeenAt: number;
    exampleEvent: string;
}

export interface AnalyticsUserJourneyItem {
    uid: string;
    username: string;
    eventCount: number;
    watchSeconds: number;
    lastSeenAt: number;
    primaryPath: string;
}

export interface AnalyticsExperienceContextItem {
    key: string;
    label: string;
    eventCount: number;
    uniqueUsers: number;
    watchSeconds: number;
    conversionCount: number;
}

export interface SecurityReasonInsight {
    reason: string;
    label: string;
    severity: string;
    count: number;
    uniqueUsers: number;
    lastSeenAt: number;
}

export interface RealtimeSurfaceMixItem {
    key: string;
    label: string;
    activeUsers: number;
    lastSeenAt: number;
}

function humanizeLabel(value: string) {
    return value
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function describePathLabel(path: string) {
    if (!path || path === "/") {
        return "Home";
    }

    if (path.startsWith("/dashboard/viewer")) return "Viewer";
    if (path.startsWith("/dashboard/library")) return "Library";
    if (path.startsWith("/dashboard/profile")) return "Profile";
    if (path.startsWith("/dashboard")) return "Dashboard";
    if (path.startsWith("/drops")) return "Drops";
    if (path.startsWith("/experiences")) return "Experiences";
    if (path.startsWith("/creators")) return "Creators";
    if (path.startsWith("/faq")) return "FAQ";
    if (path.startsWith("/admin/analytics")) return "Admin Analytics";
    if (path.startsWith("/admin/debug")) return "Admin Debug";
    if (path.startsWith("/admin")) return "Admin";
    if (path.startsWith("/privacy")) return "Privacy";
    if (path.startsWith("/terms")) return "Policies";

    return humanizeLabel(path.replaceAll("/", " "));
}

function resolveSurfaceLabel(input: {
    eventName: string;
    pagePath: string;
    componentName: string;
}) {
    if (input.componentName) {
        return input.componentName;
    }

    const eventName = input.eventName.toLowerCase();
    if (eventName.startsWith("viewer_")) return "Viewer";
    if (eventName.startsWith("security_")) return "Content Protection";
    if (eventName.includes("notification")) return "Notifications";
    if (eventName.includes("auth") || eventName.includes("onboarding")) return "Auth & Onboarding";
    if (eventName.includes("task")) return "Daily Tasks";
    if (eventName.includes("wallet") || eventName.includes("purchase") || eventName.includes("checkout")) return "Wallet & Commerce";
    if (eventName.includes("drop") || eventName.includes("unlock")) return input.pagePath.startsWith("/dashboard/viewer") ? "Viewer" : "Drops";

    return describePathLabel(input.pagePath);
}

function buildExperienceKey(input: {
    dropId: string;
    dropTitle: string;
    semanticScopeLabel: string;
    pagePath: string;
}) {
    if (input.dropId) {
        return {
            key: input.dropId,
            label: input.dropTitle || input.dropId,
        };
    }

    if (input.semanticScopeLabel) {
        return {
            key: input.semanticScopeLabel.toLowerCase().replace(/\s+/g, "-"),
            label: input.semanticScopeLabel,
        };
    }

    if (input.pagePath.startsWith("/experiences")) {
        return {
            key: "experience-hub",
            label: "Experiences",
        };
    }

    return null;
}

export function buildHistoricalAnalyticsContext(input: {
    telemetryLogs: TelemetryLogRecord[];
    guestBatchDocs: Array<{ data: () => FirebaseFirestore.DocumentData }>;
    viewerDropInsights: ViewerDropInsight[];
    viewerUsers: ViewerUserOption[];
    securityEventDocs: Array<{ data: () => FirebaseFirestore.DocumentData }>;
}) {
    const surfaceMap = new Map<string, {
        key: string;
        label: string;
        count: number;
        uniqueUsers: Set<string>;
        experienceKeys: Set<string>;
        lastSeenAt: number;
        exampleEvent: string;
    }>();
    const userMap = new Map<string, {
        uid: string;
        username: string;
        eventCount: number;
        watchSeconds: number;
        lastSeenAt: number;
        pathCounts: Map<string, number>;
    }>();
    const experienceMap = new Map<string, {
        key: string;
        label: string;
        eventCount: number;
        uniqueUsers: Set<string>;
        watchSeconds: number;
        conversionCount: number;
    }>();
    const securityReasonMap = new Map<string, {
        reason: string;
        label: string;
        severity: string;
        count: number;
        uniqueUsers: Set<string>;
        lastSeenAt: number;
    }>();

    input.telemetryLogs.forEach((record) => {
        const pagePath = getTelemetryParamString(record, "page_path") || "/";
        const componentName = getTelemetryParamString(record, "component_name");
        const surfaceLabel = resolveSurfaceLabel({
            eventName: record.eventName,
            pagePath,
            componentName,
        });
        const surfaceKey = surfaceLabel.toLowerCase().replace(/\s+/g, "-");
        const userKey = record.userId || record.username || "guest";
        const dropId = getTelemetryParamString(record, "drop_id");
        const dropTitle = getTelemetryParamString(record, "drop_title");
        const semanticScopeLabel = getTelemetryParamString(record, "semantic_scope_label");
        const watchSeconds = Math.max(
            getTelemetryParamNumber(record, "session_watch_seconds"),
            getTelemetryParamNumber(record, "watch_seconds"),
        );

        const surface = surfaceMap.get(surfaceKey) || {
            key: surfaceKey,
            label: surfaceLabel,
            count: 0,
            uniqueUsers: new Set<string>(),
            experienceKeys: new Set<string>(),
            lastSeenAt: 0,
            exampleEvent: record.eventName,
        };
        surface.count += 1;
        surface.uniqueUsers.add(userKey);
        surface.lastSeenAt = Math.max(surface.lastSeenAt, record.timestamp);
        surface.exampleEvent = surface.exampleEvent || record.eventName;

        const experience = buildExperienceKey({
            dropId,
            dropTitle,
            semanticScopeLabel,
            pagePath,
        });
        if (experience) {
            surface.experienceKeys.add(experience.key);
            const currentExperience = experienceMap.get(experience.key) || {
                key: experience.key,
                label: experience.label,
                eventCount: 0,
                uniqueUsers: new Set<string>(),
                watchSeconds: 0,
                conversionCount: 0,
            };
            currentExperience.eventCount += 1;
            currentExperience.uniqueUsers.add(userKey);
            currentExperience.watchSeconds += watchSeconds;
            if (record.eventName === "unlock_drop_success" || record.eventName === "viewer_asset_consumed" || record.eventName === "viewer_asset_completed") {
                currentExperience.conversionCount += 1;
            }
            experienceMap.set(experience.key, currentExperience);
        }

        surfaceMap.set(surfaceKey, surface);

        if (record.userId || record.username) {
            const uid = record.userId || record.username || "unknown";
            const currentUser = userMap.get(uid) || {
                uid,
                username: record.username || record.userId || "Unknown user",
                eventCount: 0,
                watchSeconds: 0,
                lastSeenAt: 0,
                pathCounts: new Map<string, number>(),
            };
            currentUser.eventCount += 1;
            currentUser.watchSeconds += watchSeconds;
            currentUser.lastSeenAt = Math.max(currentUser.lastSeenAt, record.timestamp);
            currentUser.pathCounts.set(pagePath, (currentUser.pathCounts.get(pagePath) || 0) + 1);
            userMap.set(uid, currentUser);
        }
    });

    input.guestBatchDocs.forEach((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const events = Array.isArray(data.events) ? data.events as Array<Record<string, unknown>> : [];
        events.forEach((event) => {
            const pagePath = toStringValue(event.path) || "/";
            const surfaceLabel = resolveSurfaceLabel({
                eventName: toStringValue(event.type) || "guest_event",
                pagePath,
                componentName: "",
            });
            const surfaceKey = surfaceLabel.toLowerCase().replace(/\s+/g, "-");
            const surface = surfaceMap.get(surfaceKey) || {
                key: surfaceKey,
                label: surfaceLabel,
                count: 0,
                uniqueUsers: new Set<string>(),
                experienceKeys: new Set<string>(),
                lastSeenAt: 0,
                exampleEvent: toStringValue(event.type) || "guest_event",
            };
            surface.count += 1;
            surface.uniqueUsers.add("guest");
            surface.lastSeenAt = Math.max(surface.lastSeenAt, toNumber(event.timestamp) || toNumber(data.receivedAtMs));
            surfaceMap.set(surfaceKey, surface);
        });
    });

    input.viewerDropInsights.forEach((item) => {
        const currentExperience = experienceMap.get(item.dropId) || {
            key: item.dropId,
            label: item.dropTitle,
            eventCount: 0,
            uniqueUsers: new Set<string>(),
            watchSeconds: 0,
            conversionCount: 0,
        };
        currentExperience.label = item.dropTitle || currentExperience.label;
        currentExperience.eventCount += item.sessionCount + item.assetStarts + item.downloads + item.relatedClicks;
        currentExperience.watchSeconds += item.totalWatchSeconds;
        currentExperience.conversionCount += item.convertedSessionCount + item.completedSessionCount;
        for (let count = 0; count < item.uniqueViewerCount; count += 1) {
            currentExperience.uniqueUsers.add(`viewer-${item.dropId}-${count}`);
        }
        experienceMap.set(item.dropId, currentExperience);
    });

    input.viewerUsers.forEach((item) => {
        const currentUser = userMap.get(item.uid) || {
            uid: item.uid,
            username: item.username || item.uid,
            eventCount: 0,
            watchSeconds: 0,
            lastSeenAt: 0,
            pathCounts: new Map<string, number>(),
        };
        currentUser.watchSeconds = Math.max(currentUser.watchSeconds, item.totalWatchSeconds);
        currentUser.eventCount = Math.max(currentUser.eventCount, item.sessionCount + item.viewCount);
        userMap.set(item.uid, currentUser);
    });

    input.securityEventDocs.forEach((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const reason = toStringValue(data.reason);
        const descriptor = describeSecurityEvent(reason);
        const current = securityReasonMap.get(descriptor.reason) || {
            reason: descriptor.reason,
            label: descriptor.label,
            severity: descriptor.severity,
            count: 0,
            uniqueUsers: new Set<string>(),
            lastSeenAt: 0,
        };
        current.count += 1;
        current.lastSeenAt = Math.max(current.lastSeenAt, toNumber(data.timestamp));
        const userId = toStringValue(data.userId) || "unknown";
        current.uniqueUsers.add(userId);
        securityReasonMap.set(descriptor.reason, current);
    });

    const componentContexts: AnalyticsSurfaceContextItem[] = Array.from(surfaceMap.values())
        .map((entry) => ({
            key: entry.key,
            label: entry.label,
            count: entry.count,
            uniqueUsers: entry.uniqueUsers.size,
            experienceCount: entry.experienceKeys.size,
            lastSeenAt: entry.lastSeenAt,
            exampleEvent: entry.exampleEvent,
        }))
        .sort((left, right) => right.count - left.count || right.lastSeenAt - left.lastSeenAt)
        .slice(0, 10);

    const userJourneys: AnalyticsUserJourneyItem[] = Array.from(userMap.values())
        .map((entry) => ({
            uid: entry.uid,
            username: entry.username,
            eventCount: entry.eventCount,
            watchSeconds: entry.watchSeconds,
            lastSeenAt: entry.lastSeenAt,
            primaryPath: Array.from(entry.pathCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] || "/dashboard",
        }))
        .sort((left, right) =>
            right.eventCount - left.eventCount
            || right.watchSeconds - left.watchSeconds
            || right.lastSeenAt - left.lastSeenAt,
        )
        .slice(0, 8);

    const experienceContexts: AnalyticsExperienceContextItem[] = Array.from(experienceMap.values())
        .map((entry) => ({
            key: entry.key,
            label: entry.label,
            eventCount: entry.eventCount,
            uniqueUsers: entry.uniqueUsers.size,
            watchSeconds: entry.watchSeconds,
            conversionCount: entry.conversionCount,
        }))
        .sort((left, right) =>
            right.watchSeconds - left.watchSeconds
            || right.eventCount - left.eventCount
            || right.uniqueUsers - left.uniqueUsers,
        )
        .slice(0, 8);

    const securityReasons: SecurityReasonInsight[] = Array.from(securityReasonMap.values())
        .map((entry) => ({
            reason: entry.reason,
            label: entry.label,
            severity: entry.severity,
            count: entry.count,
            uniqueUsers: entry.uniqueUsers.size,
            lastSeenAt: entry.lastSeenAt,
        }))
        .sort((left, right) => right.count - left.count || right.lastSeenAt - left.lastSeenAt)
        .slice(0, 10);

    return {
        componentContexts,
        userJourneys,
        experienceContexts,
        securityReasons,
    };
}

export function buildRealtimeSurfaceMix(input: {
    activeUsers: Array<Record<string, unknown>>;
}) {
    const surfaceMap = new Map<string, {
        key: string;
        label: string;
        activeUsers: number;
        lastSeenAt: number;
    }>();

    input.activeUsers.forEach((entry) => {
        const pagePath = toStringValue(entry.lastPagePath) || "/";
        const componentName = toStringValue(entry.lastComponentName);
        const eventName = toStringValue(entry.lastEventName);
        const surfaceLabel = resolveSurfaceLabel({
            eventName,
            pagePath,
            componentName,
        });
        const key = surfaceLabel.toLowerCase().replace(/\s+/g, "-");
        const current = surfaceMap.get(key) || {
            key,
            label: surfaceLabel,
            activeUsers: 0,
            lastSeenAt: 0,
        };
        current.activeUsers += 1;
        current.lastSeenAt = Math.max(current.lastSeenAt, toNumber(entry.lastSeenAt));
        surfaceMap.set(key, current);
    });

    return Array.from(surfaceMap.values())
        .sort((left, right) => right.activeUsers - left.activeUsers || right.lastSeenAt - left.lastSeenAt)
        .slice(0, 6);
}
