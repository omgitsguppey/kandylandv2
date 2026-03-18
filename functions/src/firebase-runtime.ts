export const REGION = "us-central1"

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
