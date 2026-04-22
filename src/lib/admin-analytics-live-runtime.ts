import type {
  RealtimeActiveUserItem,
  RealtimePoint,
  SurfaceMixItem,
} from "@/types/admin-analytics";

export type AdminAnalyticsLiveFeedStatus =
  | "realtime"
  | "partial"
  | "polled"
  | "failed";

export type AdminAnalyticsLiveActor = RealtimeActiveUserItem & {
  actorType: "identified" | "guest";
  sourceLabel: string;
  truthLabel: "live" | "fallback";
  sessionKey?: string;
};

export interface AdminAnalyticsLiveSignals {
  feedStatus: AdminAnalyticsLiveFeedStatus;
  feedDetail: string;
  generatedAtMs: number | null;
  totalActive: number;
  deepTrackerActive: number;
  guestActive: number;
  data: RealtimePoint[];
  activeUsers: AdminAnalyticsLiveActor[];
  surfaceMix: SurfaceMixItem[];
  issues: string[];
  liveTruthLabel: "live" | "fallback" | "partial" | "failed";
  liveSourceLabel: string;
  activeUsersTruthLabel: "live" | "fallback" | "partial" | "failed";
  activeUsersSourceLabel: string;
}

type ListenerState = {
  eventFactsLoaded: boolean;
  guestBatchesLoaded: boolean;
  guestSessionsLoaded: boolean;
  watchSessionsLoaded: boolean;
  eventFactsFailed: boolean;
  guestBatchesFailed: boolean;
  guestSessionsFailed: boolean;
  watchSessionsFailed: boolean;
};

type SnapshotDoc = {
  id: string;
  data(): Record<string, unknown>;
};

const ACTIVE_WINDOW_MS = 30 * 60 * 1000;
const AUTHENTICATED_PAGE_VIEW_EVENT_NAMES = new Set([
  "dashboard_viewed",
  "library_viewed",
  "profile_settings_viewed",
  "experience_hub_viewed",
  "drops_page_viewed",
  "faq_page_viewed",
  "home_page_viewed",
  "privacy_page_viewed",
  "terms_page_viewed",
  "admin_dashboard_viewed",
  "admin_analytics_viewed",
  "admin_debug_viewed",
  "admin_users_viewed",
  "admin_content_viewed",
  "admin_drops_viewed",
  "semantic_page_viewed",
]);

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  return 0;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readParams(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function resolveMinutesAgo(nowMs: number, timestampMs: number) {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0 || timestampMs > nowMs) {
    return null;
  }

  const minutesAgo = Math.floor((nowMs - timestampMs) / 60_000);
  if (minutesAgo < 0 || minutesAgo >= 30) {
    return null;
  }

  return minutesAgo;
}

function buildBuckets() {
  return Array.from({ length: 30 }, (_, minute) => ({
    minute,
    actorKeys: new Set<string>(),
    views: 0,
  }));
}

function applyPresence(
  buckets: ReturnType<typeof buildBuckets>,
  actorKey: string,
  timestampMs: number,
  nowMs: number,
  pageViews = 0,
) {
  const minute = resolveMinutesAgo(nowMs, timestampMs);
  if (minute === null) {
    return;
  }

  buckets[minute]?.actorKeys.add(actorKey);
  if (pageViews > 0) {
    buckets[minute].views += pageViews;
  }
}

function finalizeBuckets(
  buckets: ReturnType<typeof buildBuckets>,
): RealtimePoint[] {
  return buckets
    .map((bucket) => ({
      minute: bucket.minute,
      users: bucket.actorKeys.size,
      views: bucket.views,
    }))
    .sort((left, right) => right.minute - left.minute);
}

function humanizeLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function describePathLabel(path: string) {
  if (!path || path === "/") return "Home";
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
  actorType: "identified" | "guest";
  eventName: string;
  pagePath: string;
  componentName: string;
}) {
  if (input.componentName) {
    return input.componentName;
  }

  if (input.actorType === "guest") {
    return describePathLabel(input.pagePath);
  }

  const eventName = input.eventName.toLowerCase();
  if (eventName.startsWith("viewer_")) return "Viewer";
  if (eventName.startsWith("security_")) return "Content Protection";
  if (eventName.includes("notification")) return "Notifications";
  if (eventName.includes("auth") || eventName.includes("onboarding")) {
    return "Auth & Onboarding";
  }
  if (eventName.includes("task")) return "Daily Tasks";
  if (
    eventName.includes("wallet") ||
    eventName.includes("purchase") ||
    eventName.includes("checkout")
  ) {
    return "Wallet & Commerce";
  }
  if (eventName.includes("drop") || eventName.includes("unlock")) {
    return input.pagePath.startsWith("/dashboard/viewer") ? "Viewer" : "Drops";
  }

  return describePathLabel(input.pagePath);
}

function sortActors(items: AdminAnalyticsLiveActor[]) {
  return items
    .slice()
    .sort((left, right) => right.lastSeenAt - left.lastSeenAt)
    .slice(0, 12);
}

function buildSurfaceMix(items: AdminAnalyticsLiveActor[]): SurfaceMixItem[] {
  const surfaceMap = new Map<
    string,
    { key: string; label: string; activeUsers: number; lastSeenAt: number }
  >();

  items.forEach((item) => {
    const label = resolveSurfaceLabel({
      actorType: item.actorType,
      eventName: item.lastEventName,
      pagePath: item.lastPagePath,
      componentName: item.lastComponentName,
    });
    const key = label.toLowerCase().replace(/\s+/g, "-");
    const current = surfaceMap.get(key) ?? {
      key,
      label,
      activeUsers: 0,
      lastSeenAt: 0,
    };
    current.activeUsers += 1;
    current.lastSeenAt = Math.max(current.lastSeenAt, item.lastSeenAt);
    surfaceMap.set(key, current);
  });

  return Array.from(surfaceMap.values())
    .sort(
      (left, right) =>
        right.activeUsers - left.activeUsers || right.lastSeenAt - left.lastSeenAt,
    )
    .slice(0, 8);
}

function isAuthenticatedPageView(eventName: string) {
  return (
    AUTHENTICATED_PAGE_VIEW_EVENT_NAMES.has(eventName) ||
    eventName.endsWith("_viewed")
  );
}

export function buildAdminAnalyticsLiveSignals(input: {
  eventFactDocs?: SnapshotDoc[] | null;
  guestBatchDocs?: SnapshotDoc[] | null;
  guestSessionDocs?: SnapshotDoc[] | null;
  watchSessionDocs?: SnapshotDoc[] | null;
  listenerState?: Partial<ListenerState>;
  nowMs?: number;
}): AdminAnalyticsLiveSignals {
  const nowMs = input.nowMs ?? Date.now();
  const eventFactDocs = input.eventFactDocs ?? [];
  const guestBatchDocs = input.guestBatchDocs ?? [];
  const guestSessionDocs = input.guestSessionDocs ?? [];
  const watchSessionDocs = input.watchSessionDocs ?? [];
  const listenerState: ListenerState = {
    eventFactsLoaded: input.listenerState?.eventFactsLoaded === true,
    guestBatchesLoaded: input.listenerState?.guestBatchesLoaded === true,
    guestSessionsLoaded: input.listenerState?.guestSessionsLoaded === true,
    watchSessionsLoaded: input.listenerState?.watchSessionsLoaded === true,
    eventFactsFailed: input.listenerState?.eventFactsFailed === true,
    guestBatchesFailed: input.listenerState?.guestBatchesFailed === true,
    guestSessionsFailed: input.listenerState?.guestSessionsFailed === true,
    watchSessionsFailed: input.listenerState?.watchSessionsFailed === true,
  };

  const loadedCount = [
    listenerState.eventFactsLoaded,
    listenerState.guestBatchesLoaded,
    listenerState.guestSessionsLoaded,
    listenerState.watchSessionsLoaded,
  ].filter(Boolean).length;
  const failedCount = [
    listenerState.eventFactsFailed,
    listenerState.guestBatchesFailed,
    listenerState.guestSessionsFailed,
    listenerState.watchSessionsFailed,
  ].filter(Boolean).length;

  const buckets = buildBuckets();
  const identifiedActors = new Map<string, AdminAnalyticsLiveActor>();
  const guestActors = new Map<string, AdminAnalyticsLiveActor>();

  eventFactDocs.forEach((doc) => {
    const data = doc.data();
    const timestampMs = readNumber(data.timestamp);
    if (resolveMinutesAgo(nowMs, timestampMs) === null) {
      return;
    }

    const userId = readString(data.userId);
    if (!userId) {
      return;
    }

    const params = readParams(data.params);
    const eventName = readString(data.eventName);
    const pagePath = readString(data.pagePath) || readString(params.page_path) || "/";
    const actor = identifiedActors.get(userId);
    const nextActor: AdminAnalyticsLiveActor = {
      uid: userId,
      username: readString(data.username) || userId,
      lastSeenAt: timestampMs,
      lastEventName: eventName || "live_event",
      lastPagePath: pagePath,
      lastDropTitle:
        readString(data.dropTitle) || readString(params.drop_title),
      lastSemanticScopeLabel: readString(params.semantic_scope_label),
      lastComponentName: readString(params.component_name),
      lastEventModules: Array.isArray(params.event_modules)
        ? params.event_modules
            .filter((entry): entry is string => typeof entry === "string")
            .join(", ")
        : readString(params.event_modules),
      actorType: "identified",
      sourceLabel: "analytics_event_facts",
      truthLabel: "live",
    };

    if (!actor || nextActor.lastSeenAt >= actor.lastSeenAt) {
      identifiedActors.set(userId, nextActor);
    }

    applyPresence(
      buckets,
      `user:${userId}`,
      timestampMs,
      nowMs,
      isAuthenticatedPageView(eventName) ? 1 : 0,
    );
  });

  watchSessionDocs.forEach((doc) => {
    const data = doc.data();
    const timestampMs = readNumber(data.lastSeenAtMs);
    if (resolveMinutesAgo(nowMs, timestampMs) === null) {
      return;
    }

    const userId = readString(data.userId);
    if (!userId) {
      return;
    }

    const current = identifiedActors.get(userId);
    const nextActor: AdminAnalyticsLiveActor = {
      uid: userId,
      username: readString(data.username) || current?.username || userId,
      lastSeenAt: timestampMs,
      lastEventName:
        data.isClosed === true ? "viewer_session_closed" : "viewer_session_active",
      lastPagePath: readString(data.pagePath) || current?.lastPagePath || "/dashboard/viewer",
      lastDropTitle: readString(data.dropTitle) || current?.lastDropTitle || "",
      lastSemanticScopeLabel: "Viewer",
      lastComponentName: current?.lastComponentName || "",
      lastEventModules: current?.lastEventModules || "viewer",
      actorType: "identified",
      sourceLabel: "analytics_watch_sessions",
      truthLabel: "live",
    };

    if (!current || nextActor.lastSeenAt >= current.lastSeenAt) {
      identifiedActors.set(userId, nextActor);
    }

    applyPresence(buckets, `user:${userId}`, timestampMs, nowMs);
  });

  guestBatchDocs.forEach((doc) => {
    const data = doc.data();
    const sessionKey =
      readString(data.sessionKey) || readString(data.clientSessionId) || doc.id;
    if (!sessionKey) {
      return;
    }

    const events = Array.isArray(data.events)
      ? (data.events as Array<Record<string, unknown>>)
      : [];
    let latestTimestampMs = 0;
    let latestEventType = "";
    let latestPagePath = "/";
    let latestInteractionTypes = new Set<string>();

    events.forEach((event) => {
      const timestampMs =
        readNumber(event.timestamp) || readNumber(data.receivedAtMs);
      if (resolveMinutesAgo(nowMs, timestampMs) === null) {
        return;
      }

      const eventType = readString(event.type);
      const pagePath = readString(event.path) || "/";
      latestInteractionTypes.add(eventType);
      if (timestampMs >= latestTimestampMs) {
        latestTimestampMs = timestampMs;
        latestEventType = eventType;
        latestPagePath = pagePath;
      }

      applyPresence(
        buckets,
        `guest:${sessionKey}`,
        timestampMs,
        nowMs,
        eventType === "page_view" ? 1 : 0,
      );
    });

    if (latestTimestampMs <= 0) {
      return;
    }

    const current = guestActors.get(sessionKey);
    const nextActor: AdminAnalyticsLiveActor = {
      uid: `guest:${sessionKey}`,
      username: "Guest",
      lastSeenAt: latestTimestampMs,
      lastEventName: latestEventType || "guest_activity",
      lastPagePath: latestPagePath,
      lastDropTitle: "",
      lastSemanticScopeLabel: describePathLabel(latestPagePath),
      lastComponentName: "",
      lastEventModules: Array.from(latestInteractionTypes)
        .filter(Boolean)
        .slice(0, 4)
        .join(", "),
      actorType: "guest",
      sourceLabel: "analytics_guest_batches",
      truthLabel: "live",
      sessionKey,
    };

    if (!current || nextActor.lastSeenAt >= current.lastSeenAt) {
      guestActors.set(sessionKey, nextActor);
    }
  });

  guestSessionDocs.forEach((doc) => {
    const data = doc.data();
    const sessionKey =
      readString(data.sessionKey) || readString(data.clientSessionId) || doc.id;
    const timestampMs = readNumber(data.lastReceivedAtMs);
    if (!sessionKey || resolveMinutesAgo(nowMs, timestampMs) === null) {
      return;
    }

    const pagePath = Array.isArray(data.pagePaths)
      ? readString((data.pagePaths as unknown[])[0])
      : "/";
    const interactionTypes = Array.isArray(data.interactionTypes)
      ? (data.interactionTypes as unknown[])
          .filter((entry): entry is string => typeof entry === "string")
          .slice(0, 4)
          .join(", ")
      : "";
    const current = guestActors.get(sessionKey);
    const nextActor: AdminAnalyticsLiveActor = {
      uid: `guest:${sessionKey}`,
      username: "Guest",
      lastSeenAt: timestampMs,
      lastEventName: current?.lastEventName || "guest_session_active",
      lastPagePath: current?.lastPagePath || pagePath || "/",
      lastDropTitle: "",
      lastSemanticScopeLabel: describePathLabel(current?.lastPagePath || pagePath || "/"),
      lastComponentName: "",
      lastEventModules: current?.lastEventModules || interactionTypes,
      actorType: "guest",
      sourceLabel: current?.sourceLabel || "analytics_sessions",
      truthLabel: "live",
      sessionKey,
    };

    if (!current || nextActor.lastSeenAt >= current.lastSeenAt) {
      guestActors.set(sessionKey, nextActor);
    }

    applyPresence(buckets, `guest:${sessionKey}`, timestampMs, nowMs);
  });

  const activeUsers = sortActors([
    ...Array.from(identifiedActors.values()),
    ...Array.from(guestActors.values()),
  ]);
  const generatedAtMs =
    activeUsers[0]?.lastSeenAt ??
    (Math.max(
      ...[
        ...eventFactDocs.map((doc) => readNumber(doc.data().timestamp)),
        ...guestBatchDocs.map((doc) => readNumber(doc.data().receivedAtMs)),
        ...guestSessionDocs.map((doc) => readNumber(doc.data().lastReceivedAtMs)),
        ...watchSessionDocs.map((doc) => readNumber(doc.data().lastSeenAtMs)),
        0,
      ],
    ) || null);

  const issues: string[] = [];
  if (listenerState.eventFactsFailed) {
    issues.push("Identified event realtime lane fell back to polled data.");
  }
  if (listenerState.guestBatchesFailed) {
    issues.push("Guest batch realtime lane fell back to polled data.");
  }
  if (listenerState.guestSessionsFailed) {
    issues.push("Guest session realtime lane fell back to polled data.");
  }
  if (listenerState.watchSessionsFailed) {
    issues.push("Viewer watch-session realtime lane fell back to polled data.");
  }

  let feedStatus: AdminAnalyticsLiveFeedStatus = "polled";
  let feedDetail =
    "Realtime analytics observers have not loaded yet. Showing the polled admin summary.";

  if (loadedCount === 4 && failedCount === 0) {
    feedStatus = "realtime";
    feedDetail =
      "Realtime Firestore observers are active for identified events, guest batches, guest sessions, and watch sessions.";
  } else if (loadedCount > 0 && failedCount > 0) {
    feedStatus = "partial";
    feedDetail =
      "Realtime analytics observers are only partially connected. Some live lanes are streaming, while failed lanes are falling back to polled data.";
  } else if (loadedCount > 0) {
    feedStatus = "partial";
    feedDetail =
      "Realtime analytics observers are warming up. Some live lanes are active, but not every canonical source has loaded yet.";
  } else if (failedCount > 0) {
    feedStatus = "failed";
    feedDetail =
      "Realtime analytics observers failed closed. Admin analytics is falling back to the polled route snapshot.";
  }

  return {
    feedStatus,
    feedDetail,
    generatedAtMs,
    totalActive: activeUsers.length,
    deepTrackerActive: identifiedActors.size,
    guestActive: guestActors.size,
    data: finalizeBuckets(buckets),
    activeUsers,
    surfaceMix: buildSurfaceMix(activeUsers),
    issues,
    liveTruthLabel:
      feedStatus === "failed"
        ? "failed"
        : feedStatus === "polled"
          ? "fallback"
          : "live",
    liveSourceLabel:
      feedStatus === "failed"
        ? "polled_admin_analytics_realtime"
        : "analytics_event_facts + analytics_guest_batches + analytics_sessions + analytics_watch_sessions",
    activeUsersTruthLabel:
      feedStatus === "failed"
        ? "failed"
        : feedStatus === "polled"
          ? "fallback"
          : "live",
    activeUsersSourceLabel:
      feedStatus === "failed"
        ? "polled_admin_analytics_realtime"
        : "analytics_event_facts + analytics_guest_batches + analytics_sessions + analytics_watch_sessions",
  };
}
