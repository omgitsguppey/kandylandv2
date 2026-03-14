import {App, getApps, initializeApp} from "firebase-admin/app"
import {getDatabase} from "firebase-admin/database"
import {getFirestore} from "firebase-admin/firestore"

const APP_NAME = "analytics-functions"

function resolveProjectId() {
  return process.env.GCLOUD_PROJECT ||
    process.env.PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "kandydrops-by-ikandy"
}

function resolveDatabaseUrl(projectId: string) {
  return process.env.FIREBASE_DATABASE_URL ||
    process.env.DATABASE_URL ||
    `https://${projectId}-default-rtdb.firebaseio.com`
}

function getOrCreateAdminApp(): App {
  const existing = getApps().find((app) => app.name === APP_NAME)
  if (existing) {
    return existing
  }

  const projectId = resolveProjectId()
  return initializeApp({
    projectId,
    databaseURL: resolveDatabaseUrl(projectId),
  }, APP_NAME)
}

const adminApp = getOrCreateAdminApp()

export const db = getFirestore(adminApp)
export const rtdb = getDatabase(adminApp)
