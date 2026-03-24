import {FieldValue} from "firebase-admin/firestore"

import {
  type AnalyticsEventFact,
  buildIncrementUpdate,
  type GuestAnalyticsBatch,
  type GuestBatchEvent,
  toTimeKeys,
} from "./analytics-core.js"
import {db} from "./firebase-admin.js"

type AnalyticsSemanticCategory = "global" | "user" | "admin" | "drop"

interface SemanticMetricDelta {
  viewCount?: number;
  viewDurationMs?: number;
  engagedViewCount?: number;
  passiveViewCount?: number;
  bounceCount?: number;
  exitCount?: number;
  clickCount?: number;
  hoverCount?: number;
  pagePath?: string;
  signInCount?: number;
  returnCount?: number;
  logoutCount?: number;
  watchSecondsTotal?: number;
  watchSessionCount?: number;
}

const ANALYTICS_SEMANTIC_CATEGORY_LABELS: Record<AnalyticsSemanticCategory, string> = {
  global: "Global",
  user: "User",
  admin: "Admin",
  drop: "KandyDrop",
}

function humanizeAnalyticsKey(value: string | null | undefined) {
  if (!value) {
    return "Unknown"
  }

  return value
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (match: string) => match.toUpperCase())
    .trim()
}

const LEGACY_PAGE_EVENT_PATHS: Record<string, string> = {
  home_page_viewed: "/",
  privacy_page_viewed: "/privacy",
  terms_page_viewed: "/terms",
  dashboard_viewed: "/dashboard",
  library_viewed: "/dashboard/library",
  profile_settings_viewed: "/dashboard/profile",
  experience_hub_viewed: "/experiences",
  drops_page_viewed: "/drops",
  faq_page_viewed: "/faq",
  admin_dashboard_viewed: "/admin",
  admin_analytics_viewed: "/admin/analytics",
  admin_debug_viewed: "/admin/debug",
  admin_users_viewed: "/admin/users",
  admin_content_viewed: "/admin/content",
  admin_drops_viewed: "/admin/drops",
  admin_queue_viewed: "/admin/queue",
  admin_roster_viewed: "/admin/roster",
  admin_user_detail_viewed: "/admin/user",
}

function getLegacyPagePathForEvent(eventName: string | null | undefined) {
  if (!eventName) {
    return ""
  }

  return LEGACY_PAGE_EVENT_PATHS[eventName] || ""
}

function normalizePagePath(input: string | null | undefined) {
  if (!input) {
    return "/"
  }

  const trimmed = input.trim()
  if (!trimmed) {
    return "/"
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}

function buildFallbackSemanticContext(pagePath: string, dropId?: string, dropCategory?: string) {
  if (dropId || pagePath.startsWith("/dashboard/viewer")) {
    return {
      category: "drop" as const,
      scopeKey: "drop_viewer",
      scopeLabel: "Drop viewer",
      surfaceKey: dropId ? `drop:${dropId}` : "drop:viewer",
      surfaceLabel: dropId ? `Drop ${dropId}` : "Drop viewer",
    }
  }

  if (pagePath.startsWith("/drops")) {
    return {
      category: "drop" as const,
      scopeKey: "drop_catalog",
      scopeLabel: "Drop catalog",
      surfaceKey: dropCategory ? `drop-category:${dropCategory}` : "drop:catalog",
      surfaceLabel: dropCategory ? `${humanizeAnalyticsKey(dropCategory)} drops` : "Drop catalog",
    }
  }

  if (pagePath.startsWith("/admin/analytics")) {
    return {
      category: "admin" as const,
      scopeKey: "admin_analytics",
      scopeLabel: "Admin analytics",
      surfaceKey: "admin:analytics",
      surfaceLabel: "Admin analytics",
    }
  }

  if (pagePath.startsWith("/admin/users") || pagePath.startsWith("/admin/user")) {
    return {
      category: "admin" as const,
      scopeKey: "admin_users",
      scopeLabel: "Admin roster",
      surfaceKey: "admin:users",
      surfaceLabel: "Admin roster",
    }
  }

  if (pagePath.startsWith("/admin")) {
    return {
      category: "admin" as const,
      scopeKey: "admin_dashboard",
      scopeLabel: "Admin workspace",
      surfaceKey: "admin:workspace",
      surfaceLabel: "Admin workspace",
    }
  }

  if (pagePath.startsWith("/dashboard/library")) {
    return {
      category: "user" as const,
      scopeKey: "user_library",
      scopeLabel: "User library",
      surfaceKey: "user:library",
      surfaceLabel: "User library",
    }
  }

  if (pagePath.startsWith("/dashboard/profile")) {
    return {
      category: "user" as const,
      scopeKey: "user_profile",
      scopeLabel: "Profile settings",
      surfaceKey: "user:profile",
      surfaceLabel: "Profile settings",
    }
  }

  if (pagePath.startsWith("/experiences")) {
    return {
      category: "user" as const,
      scopeKey: "user_experiences",
      scopeLabel: "Experiences hub",
      surfaceKey: "user:experiences",
      surfaceLabel: "Experiences hub",
    }
  }

  if (pagePath.startsWith("/dashboard")) {
    return {
      category: "user" as const,
      scopeKey: "user_dashboard",
      scopeLabel: "User dashboard",
      surfaceKey: "user:dashboard",
      surfaceLabel: "User dashboard",
    }
  }

  if (pagePath === "/faq") {
    return {
      category: "global" as const,
      scopeKey: "global_faq",
      scopeLabel: "FAQ",
      surfaceKey: "global:faq",
      surfaceLabel: "FAQ",
    }
  }

  if (pagePath === "/") {
    return {
      category: "global" as const,
      scopeKey: "global_home",
      scopeLabel: "Homepage",
      surfaceKey: "global:home",
      surfaceLabel: "Homepage",
    }
  }

  return {
    category: "global" as const,
    scopeKey: "global_site",
    scopeLabel: "Public site",
    surfaceKey: "global:site",
    surfaceLabel: "Public site",
  }
}

export function resolveAnalyticsSemanticContext(input: {
  pagePath?: string | null;
  dropId?: string | null;
  dropCategory?: string | null;
  semanticCategory?: string | null;
  semanticCategoryLabel?: string | null;
  semanticScopeKey?: string | null;
  semanticScopeLabel?: string | null;
  semanticSurfaceKey?: string | null;
  semanticSurfaceLabel?: string | null;
}) {
  const pagePath = normalizePagePath(input.pagePath)
  const dropId = input.dropId?.trim() || undefined
  const dropCategory = input.dropCategory?.trim() || undefined
  const fallback = buildFallbackSemanticContext(pagePath, dropId, dropCategory)
  const category = (input.semanticCategory?.trim() as AnalyticsSemanticCategory | undefined) || fallback.category

  return {
    category,
    categoryLabel: input.semanticCategoryLabel?.trim() || ANALYTICS_SEMANTIC_CATEGORY_LABELS[category],
    scopeKey: input.semanticScopeKey?.trim() || fallback.scopeKey,
    scopeLabel: input.semanticScopeLabel?.trim() || fallback.scopeLabel,
    surfaceKey: input.semanticSurfaceKey?.trim() || fallback.surfaceKey,
    surfaceLabel: input.semanticSurfaceLabel?.trim() || fallback.surfaceLabel,
    pagePath,
    dropId,
    dropCategory,
  }
}

function asNumber(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function asString(value: unknown) {
  return typeof value === "string" ? value : ""
}

function createDocKey(dayKey: string, category: string, scopeKey: string) {
  const encodedScope = Buffer.from(scopeKey).toString("base64url").slice(0, 120) || "root"
  return `${dayKey}__${category}__${encodedScope}`
}

function buildGuestSemanticDelta(record: Record<string, unknown>): SemanticMetricDelta | null {
  const type = asString(record.type)

  if (type === "page_view") {
    return {
      viewCount: 1,
      pagePath: asString(record.path),
    }
  }

  if (type === "click") {
    return {
      clickCount: 1,
      pagePath: asString(record.path),
    }
  }

  if (type === "hover") {
    return {
      hoverCount: 1,
      pagePath: asString(record.path),
    }
  }

  if (type === "page_leave") {
    const durationMs = Math.max(0, asNumber(record.durationMs))
    const interactionState = asString(record.interactionState)
    const exitIntent = asString(record.exitIntent)
    return {
      viewDurationMs: durationMs,
      engagedViewCount: interactionState === "engaged" ? 1 : 0,
      passiveViewCount: interactionState === "passive" ? 1 : 0,
      bounceCount: exitIntent === "bounce" ? 1 : 0,
      exitCount: 1,
      pagePath: asString(record.path),
    }
  }

  return null
}

function buildTelemetrySemanticDelta(input: {
  eventName: string;
  params?: Record<string, unknown>;
  pagePath?: string;
  dropId?: string;
  dropCategory?: string;
  durationMs?: number;
  watchSeconds?: number;
  sessionWatchSeconds?: number;
}) {
  const eventName = asString(input.eventName)
  const pagePath = asString(input.pagePath) || getLegacyPagePathForEvent(eventName)
  const clickCount = asNumber(input.params?.click_count)

  switch (eventName) {
  case "semantic_page_viewed":
    return {viewCount: 1, pagePath}
  case "semantic_page_engaged":
    return {
      engagedViewCount: 1,
      viewDurationMs: Math.max(0, asNumber(input.durationMs)),
      pagePath,
    }
  case "semantic_page_passive":
    return {
      passiveViewCount: 1,
      viewDurationMs: Math.max(0, asNumber(input.durationMs)),
      pagePath,
    }
  case "semantic_page_bounced":
    return {
      bounceCount: 1,
      exitCount: 1,
      pagePath,
    }
  case "semantic_page_exited":
    return {exitCount: 1, pagePath}
  case "semantic_target_clicked":
    return {
      clickCount: Math.max(1, clickCount || 1),
      pagePath,
    }
  case "auth_sign_in_success":
  case "auth_google_sign_in_success":
  case "auth_sign_up_success":
    return {signInCount: 1, pagePath}
  case "auth_session_restored":
    return {returnCount: 1, pagePath}
  case "auth_logout":
    return {logoutCount: 1, pagePath}
  case "viewer_session_completed": {
    const watchSeconds = Math.max(
      asNumber(input.sessionWatchSeconds),
      asNumber(input.watchSeconds),
    )
    return {
      watchSecondsTotal: watchSeconds,
      watchSessionCount: watchSeconds > 0 ? 1 : 0,
      pagePath: pagePath || "/dashboard/viewer",
    }
  }
  default:
    return null
  }
}

async function writeRollup(input: {
  timestamp: number;
  delta: SemanticMetricDelta;
  pagePath?: string;
  dropId?: string;
  dropCategory?: string;
  semanticCategory?: string;
  semanticCategoryLabel?: string;
  semanticScopeKey?: string;
  semanticScopeLabel?: string;
  semanticSurfaceKey?: string;
  semanticSurfaceLabel?: string;
  sourceKey: string;
}) {
  const {dayKey} = toTimeKeys(input.timestamp)
  const context = resolveAnalyticsSemanticContext({
    pagePath: input.pagePath,
    dropId: input.dropId,
    dropCategory: input.dropCategory,
    semanticCategory: input.semanticCategory,
    semanticCategoryLabel: input.semanticCategoryLabel,
    semanticScopeKey: input.semanticScopeKey,
    semanticScopeLabel: input.semanticScopeLabel,
    semanticSurfaceKey: input.semanticSurfaceKey,
    semanticSurfaceLabel: input.semanticSurfaceLabel,
  })
  const docId = createDocKey(dayKey, context.category, context.scopeKey)
  const rollupRef = db.collection("analytics_semantic_daily").doc(docId)

  await rollupRef.set({
    dayKey,
    category: context.category,
    categoryLabel: context.categoryLabel,
    scopeKey: context.scopeKey,
    scopeLabel: context.scopeLabel,
    surfaceKey: context.surfaceKey,
    surfaceLabel: context.surfaceLabel,
    pagePath: context.pagePath,
    dropId: context.dropId || null,
    dropCategory: context.dropCategory || null,
    viewCount: buildIncrementUpdate(input.delta.viewCount ?? 0),
    viewDurationMs: buildIncrementUpdate(input.delta.viewDurationMs ?? 0),
    engagedViewCount: buildIncrementUpdate(input.delta.engagedViewCount ?? 0),
    passiveViewCount: buildIncrementUpdate(input.delta.passiveViewCount ?? 0),
    bounceCount: buildIncrementUpdate(input.delta.bounceCount ?? 0),
    exitCount: buildIncrementUpdate(input.delta.exitCount ?? 0),
    clickCount: buildIncrementUpdate(input.delta.clickCount ?? 0),
    hoverCount: buildIncrementUpdate(input.delta.hoverCount ?? 0),
    signInCount: buildIncrementUpdate(input.delta.signInCount ?? 0),
    returnCount: buildIncrementUpdate(input.delta.returnCount ?? 0),
    logoutCount: buildIncrementUpdate(input.delta.logoutCount ?? 0),
    watchSecondsTotal: buildIncrementUpdate(input.delta.watchSecondsTotal ?? 0),
    watchSessionCount: buildIncrementUpdate(input.delta.watchSessionCount ?? 0),
    pagesVisited: FieldValue.arrayUnion(input.delta.pagePath || context.pagePath),
    sourceKeys: FieldValue.arrayUnion(input.sourceKey),
    updatedAt: FieldValue.serverTimestamp(),
    lastEventAtMs: input.timestamp,
  }, {merge: true})
}

export async function recordSemanticRollupFromEventFact(input: {
  eventFact: AnalyticsEventFact;
  sourceKey: string;
}) {
  const eventFact = input.eventFact
  const eventFactRecord = eventFact as unknown as Record<string, unknown>
  const params = typeof eventFact.params === "object" && eventFact.params !== null
    ? eventFact.params as Record<string, unknown>
    : {}
  const pagePath = asString(eventFact.pagePath) || asString(params.page_path) || getLegacyPagePathForEvent(asString(eventFact.eventName))
  const dropId = asString(eventFact.dropId) || asString(params.drop_id)
  const dropCategory = asString(eventFact.dropCategory) || asString(params.drop_category)
  const delta = buildTelemetrySemanticDelta({
    eventName: asString(eventFact.eventName),
    params,
    pagePath,
    dropId,
    dropCategory,
    durationMs: asNumber(eventFact.durationMs) || asNumber(params.duration_ms),
    watchSeconds: asNumber(eventFact.watchSeconds) || asNumber(params.watch_seconds),
    sessionWatchSeconds: asNumber(eventFact.sessionWatchSeconds) || asNumber(params.session_watch_seconds),
  })

  if (!delta) {
    return
  }

  await writeRollup({
    timestamp: asNumber(eventFact.timestamp) || Date.now(),
    delta,
    pagePath,
    dropId,
    dropCategory,
    semanticCategory: asString(eventFactRecord.semanticCategory) || asString(params.semantic_category),
    semanticCategoryLabel: asString(eventFactRecord.semanticCategoryLabel) || asString(params.semantic_category_label),
    semanticScopeKey: asString(eventFactRecord.semanticScopeKey) || asString(params.semantic_scope_key),
    semanticScopeLabel: asString(eventFactRecord.semanticScopeLabel) || asString(params.semantic_scope_label),
    semanticSurfaceKey: asString(eventFactRecord.semanticSurfaceKey) || asString(params.semantic_surface_key),
    semanticSurfaceLabel: asString(eventFactRecord.semanticSurfaceLabel) || asString(params.semantic_surface_label),
    sourceKey: input.sourceKey,
  })
}

export async function recordSemanticRollupFromGuestBatch(input: {
  batch: GuestAnalyticsBatch;
  sourceKey: string;
}) {
  const timestamp = asNumber(input.batch.receivedAtMs) || Date.now()
  const events = Array.isArray(input.batch.events) ? input.batch.events as GuestBatchEvent[] : []
  await Promise.all(events.map(async (event) => {
    const delta = buildGuestSemanticDelta(event as unknown as Record<string, unknown>)
    if (!delta) {
      return
    }

    await writeRollup({
      timestamp,
      delta,
      pagePath: asString(event.path),
      dropId: asString(event.dropId),
      dropCategory: asString(event.dropCategory),
      semanticCategory: asString((event as unknown as Record<string, unknown>).semanticCategory),
      semanticCategoryLabel: asString((event as unknown as Record<string, unknown>).semanticCategoryLabel),
      semanticScopeKey: asString((event as unknown as Record<string, unknown>).semanticScopeKey),
      semanticScopeLabel: asString((event as unknown as Record<string, unknown>).semanticScopeLabel),
      semanticSurfaceKey: asString((event as unknown as Record<string, unknown>).semanticSurfaceKey),
      semanticSurfaceLabel: asString((event as unknown as Record<string, unknown>).semanticSurfaceLabel),
      sourceKey: input.sourceKey,
    })
  }))
}
