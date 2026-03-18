import {rtdb} from "./firebase-admin.js"

export async function incrementRealtimeNode(path: string, patch: Record<string, unknown>) {
  await rtdb.ref(path).transaction((current) => {
    const next = typeof current === "object" && current !== null ? {...current as Record<string, unknown>} : {}
    Object.entries(patch).forEach(([key, value]) => {
      if (typeof value === "number") {
        const currentValue = typeof next[key] === "number" ? next[key] as number : 0
        next[key] = currentValue + value
      } else {
        next[key] = value
      }
    })
    return next
  })
}
