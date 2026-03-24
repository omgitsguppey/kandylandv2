import {FieldValue} from "firebase-admin/firestore"

import {db} from "./firebase-admin.js"

function sanitizeDetail(detail: Record<string, unknown> | undefined) {
  if (!detail) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(detail)
      .slice(0, 20)
      .map(([key, value]) => {
        if (typeof value === "string") {
          return [key, value.slice(0, 500)]
        }
        if (typeof value === "number" || typeof value === "boolean" || value === null) {
          return [key, value]
        }
        return [key, JSON.stringify(value).slice(0, 500)]
      }),
  )
}

export async function recordOrchestrationDiagnostic(input: {
  severity?: "info" | "warn" | "error"
  message: string
  detail?: Record<string, unknown>
}) {
  try {
    await db.collection("server_diagnostics").add({
      channel: "middleware",
      severity: input.severity || "warn",
      message: input.message.slice(0, 240),
      detail: sanitizeDetail(input.detail),
      createdAt: FieldValue.serverTimestamp(),
      createdAtMs: Date.now(),
    })
  } catch (error) {
    console.warn("Failed to record orchestration diagnostic:", error)
  }
}
