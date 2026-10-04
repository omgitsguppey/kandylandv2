import {setGlobalOptions} from "firebase-functions/v2"

export const REGION = "us-central1"

// Every endpoint module imports this bootstrap before constructing its SDK
// export, so defaults apply to both direct and re-exported functions.
setGlobalOptions({
  region: REGION,
  memory: "512MiB",
  minInstances: 0,
  maxInstances: 10,
})

export function resolveProjectId() {
  return process.env.GCLOUD_PROJECT ||
    process.env.PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "kandydrops-by-ikandy"
}

export function resolveDatabaseUrl(projectId: string) {
  return process.env.FIREBASE_DATABASE_URL ||
    process.env.DATABASE_URL ||
    `https://${projectId}-default-rtdb.firebaseio.com`
}

export function resolveStorageBucket(projectId: string) {
  return process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${projectId}.appspot.com`
}

export function buildFunctionsFirebaseRuntimeSnapshot() {
  const projectId = resolveProjectId()
  return {
    projectId,
    databaseUrl: resolveDatabaseUrl(projectId),
    storageBucket: resolveStorageBucket(projectId),
    region: REGION,
  }
}
