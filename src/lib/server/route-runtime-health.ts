import "server-only";
import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/server/firebase-admin";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import {
    ROUTE_RUNTIME_HEALTH_TARGETS,
    type RouteRuntimeHealthItem,
    type RouteRuntimeHealthKey,
    type RouteRuntimeHealthLastResult,
} from "@/lib/route-runtime-health";
import { buildAdminModuleVerification, coerceAdminSurfaceState, type AdminSurfaceState } from "@/lib/admin-parity";

export const ROUTE_RUNTIME_HEALTH_COLLECTION = "route_runtime_health";

function toRouteRuntimeHealthDocId(key: RouteRuntimeHealthKey) {
    return encodeURIComponent(key);
}

function toNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toStringOrNull(value: unknown) {
    return typeof value === "string" && value.trim().length > 0 ? value.slice(0, 240) : null;
}

function resolveLastResult(statusCode: number): RouteRuntimeHealthLastResult {
    if (statusCode >= 500) {
        return "server_error";
    }

    if (statusCode >= 400) {
        return "client_error";
    }

    return "success";
}

function buildDefaultRouteRuntimeHealthItem(key: RouteRuntimeHealthKey): RouteRuntimeHealthItem {
    const target = ROUTE_RUNTIME_HEALTH_TARGETS[key];

    return {
        key,
        routeName: target.routeName,
        method: target.method,
        title: target.title,
        slowThresholdMs: target.slowThresholdMs,
        successCount: 0,
        clientErrorCount: 0,
        serverErrorCount: 0,
        slowCount: 0,
        averageLatencyMs: 0,
        maxLatencyMs: 0,
        lastLatencyMs: 0,
        lastResult: "no_sample",
        lastStatusCode: 0,
        lastErrorMessage: null,
        firstObservedAtMs: 0,
        updatedAtMs: 0,
        lastSuccessAtMs: 0,
        lastClientErrorAtMs: 0,
        lastServerErrorAtMs: 0,
    };
}

export async function recordRouteRuntimeSample(input: {
    key: RouteRuntimeHealthKey;
    durationMs: number;
    statusCode: number;
    errorMessage?: string | null;
}) {
    if (!adminDb || typeof adminDb.runTransaction !== "function") {
        return;
    }

    const target = ROUTE_RUNTIME_HEALTH_TARGETS[input.key];
    const nowMs = Date.now();
    const durationMs = Math.max(0, Math.round(input.durationMs));
    const lastResult = resolveLastResult(input.statusCode);
    const isSlow = durationMs >= target.slowThresholdMs;

    try {
        const ref = adminDb.collection(ROUTE_RUNTIME_HEALTH_COLLECTION).doc(toRouteRuntimeHealthDocId(input.key));
        await adminDb.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(ref);
            const existing = snapshot.exists ? snapshot.data() as Partial<RouteRuntimeHealthItem> : {};
            const existingTotal =
                toNumber(existing.successCount)
                + toNumber(existing.clientErrorCount)
                + toNumber(existing.serverErrorCount);
            const nextTotal = existingTotal + 1;
            const previousAverageLatencyMs = toNumber(existing.averageLatencyMs);
            const nextAverageLatencyMs = Math.round(((previousAverageLatencyMs * existingTotal) + durationMs) / nextTotal);

            transaction.set(ref, {
                key: input.key,
                routeName: target.routeName,
                method: target.method,
                title: target.title,
                slowThresholdMs: target.slowThresholdMs,
                successCount: toNumber(existing.successCount) + (lastResult === "success" ? 1 : 0),
                clientErrorCount: toNumber(existing.clientErrorCount) + (lastResult === "client_error" ? 1 : 0),
                serverErrorCount: toNumber(existing.serverErrorCount) + (lastResult === "server_error" ? 1 : 0),
                slowCount: toNumber(existing.slowCount) + (isSlow ? 1 : 0),
                averageLatencyMs: nextAverageLatencyMs,
                maxLatencyMs: Math.max(toNumber(existing.maxLatencyMs), durationMs),
                lastLatencyMs: durationMs,
                lastResult,
                lastStatusCode: input.statusCode,
                lastErrorMessage: lastResult === "success" ? null : toStringOrNull(input.errorMessage),
                updatedAtMs: nowMs,
                firstObservedAtMs: toNumber(existing.firstObservedAtMs) || nowMs,
                lastSuccessAtMs: lastResult === "success" ? nowMs : toNumber(existing.lastSuccessAtMs),
                lastClientErrorAtMs: lastResult === "client_error" ? nowMs : toNumber(existing.lastClientErrorAtMs),
                lastServerErrorAtMs: lastResult === "server_error" ? nowMs : toNumber(existing.lastServerErrorAtMs),
            } satisfies RouteRuntimeHealthItem, { merge: true });
        });
    } catch (error) {
        recordRouteWarning("route-runtime-health", "Route runtime health write failed", error, {
            channel: "runtime",
            detail: {
                routeKey: input.key,
                statusCode: input.statusCode,
            },
        });
    }
}

export async function listRouteRuntimeHealth(limitCount = Object.keys(ROUTE_RUNTIME_HEALTH_TARGETS).length) {
    if (!adminDb) {
        return (Object.keys(ROUTE_RUNTIME_HEALTH_TARGETS) as RouteRuntimeHealthKey[])
            .slice(0, limitCount)
            .map((key) => buildDefaultRouteRuntimeHealthItem(key));
    }

    try {
        const snapshot = await adminDb.collection(ROUTE_RUNTIME_HEALTH_COLLECTION)
            .orderBy("updatedAtMs", "desc")
            .limit(limitCount)
            .get();

        const persistedByKey = snapshot.docs.reduce<Map<RouteRuntimeHealthKey, RouteRuntimeHealthItem>>((map, doc) => {
            const item = doc.data() as RouteRuntimeHealthItem;
            const existing = map.get(item.key);
            if (!existing || toNumber(item.updatedAtMs) > toNumber(existing.updatedAtMs)) {
                map.set(item.key, item);
            }
            return map;
        }, new Map<RouteRuntimeHealthKey, RouteRuntimeHealthItem>());

        return (Object.keys(ROUTE_RUNTIME_HEALTH_TARGETS) as RouteRuntimeHealthKey[])
            .map((key) => persistedByKey.get(key) ?? buildDefaultRouteRuntimeHealthItem(key))
            .sort((left, right) => {
                const updatedDelta = toNumber(right.updatedAtMs) - toNumber(left.updatedAtMs);
                if (updatedDelta !== 0) {
                    return updatedDelta;
                }

                return left.title.localeCompare(right.title);
            })
            .slice(0, limitCount);
    } catch (error) {
        recordRouteWarning("route-runtime-health", "Route runtime health read failed", error, {
            channel: "runtime",
            detail: {
                limitCount,
            },
        });
        return (Object.keys(ROUTE_RUNTIME_HEALTH_TARGETS) as RouteRuntimeHealthKey[])
            .slice(0, limitCount)
            .map((key) => buildDefaultRouteRuntimeHealthItem(key));
    }
}

async function injectAdminRouteVerification(routeKey: RouteRuntimeHealthKey, response: Response) {
  if (!String(routeKey).startsWith("admin/")) {
    return response;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return response;
  }

  try {
    const payload = await response.clone().json();
    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload) ||
      payload.verification
    ) {
      return response;
    }

    const record = payload as Record<string, unknown>;
    const freshnessTimestamp =
      toNumber(record.refreshedAtMs) ||
      toNumber(record.updatedAtMs) ||
      toNumber(record.generatedAtMs) ||
      toNumber(record.fetchedAtMs) ||
      toNumber(record.timestamp) ||
      null;
    const explicitState =
      record.liveTruthLabel ??
      record.activeUsersTruthLabel ??
      record.truthState ??
      record.truthLabel ??
      record.sourceState;
    const issues = Array.isArray(record.issues) ? record.issues.filter(Boolean) : [];
    const hasSourceEvidence =
      typeof explicitState === "string" ||
      freshnessTimestamp !== null ||
      typeof record.sourceLabel === "string" ||
      typeof record.liveSourceLabel === "string" ||
      typeof record.activeUsersSourceLabel === "string" ||
      typeof record.canonicalSource === "string";
    const status: AdminSurfaceState = !response.ok || record.success === false || typeof record.error === "string"
      ? "failed"
      : typeof explicitState === "string"
        ? coerceAdminSurfaceState(explicitState)
        : issues.length > 0
          ? "degraded"
          : hasSourceEvidence
            ? "live"
            : "degraded";
    const degradedReason = status === "failed"
      ? (typeof record.error === "string" ? record.error : `HTTP ${response.status}`)
      : status === "degraded" && !hasSourceEvidence
        ? "Route returned JSON without explicit source-state evidence."
        : issues.length > 0
          ? String(issues[0]).slice(0, 240)
          : null;
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return NextResponse.json({
      ...payload,
      verification: buildAdminModuleVerification({
        module: String(routeKey).replace(/[:/[\]]+/g, "_"),
        canonicalSource: String(routeKey),
        fallbackSource: status === "fallback" ? "route_payload_fallback" : null,
        freshnessTimestamp,
        status,
        degradedReason,
        sources: [{
          key: String(routeKey),
          label: String(routeKey),
          role: "canonical",
          status,
          freshnessTimestamp,
          detail: hasSourceEvidence ? null : "No explicit source-state evidence in payload.",
        }],
      }),
    }, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    recordRouteWarning("route-runtime-health", "Admin route verification injection failed", error, {
      channel: "runtime",
      detail: {
        routeKey,
        statusCode: response.status,
      },
    });
    return response;
  }
}

export function withRouteRuntimeHealth(
  routeKey: RouteRuntimeHealthKey,
  handler: (request: NextRequest, ...args: any[]) => Promise<Response> | Response
) {
  return async (request: NextRequest, ...args: any[]) => {
    const startTime = Date.now();
    try {
      const response = await handler(request, ...args);
      const verifiedResponse = await injectAdminRouteVerification(routeKey, response);
      await recordRouteRuntimeSample({
        key: routeKey,
        durationMs: Date.now() - startTime,
        statusCode: verifiedResponse.status,
      }).catch((err) => recordRouteWarning("withRouteRuntimeHealth", "Route runtime health sample recording failed (success path)", err, {
        channel: "runtime",
        detail: { routeKey, statusCode: verifiedResponse.status },
      }));
      return verifiedResponse;
    } catch (e: any) {
      await recordRouteRuntimeSample({
        key: routeKey,
        durationMs: Date.now() - startTime,
        statusCode: 500,
        errorMessage: e instanceof Error ? e.message : String(e),
      }).catch((err) => recordRouteWarning("withRouteRuntimeHealth", "Route runtime health sample recording failed (error path)", err, {
        channel: "runtime",
        detail: { routeKey, statusCode: 500 },
      }));
      throw e;
    }
  };
}
