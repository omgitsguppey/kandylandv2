import {App, getApps, initializeApp} from "firebase-admin/app"
import {getDatabase} from "firebase-admin/database"
import {getFirestore} from "firebase-admin/firestore"

import {resolveDatabaseUrl, resolveProjectId, resolveStorageBucket} from "./firebase-runtime.js"

const APP_NAME = "analytics-functions"

function getOrCreateAdminApp(): App {
  const existing = getApps().find((app) => app.name === APP_NAME)
  if (existing) {
    return existing
  }

  const projectId = resolveProjectId()
  return initializeApp({
    projectId,
    databaseURL: resolveDatabaseUrl(projectId),
    storageBucket: resolveStorageBucket(projectId),
  }, APP_NAME)
}

const adminApp = getOrCreateAdminApp()

export const db = getFirestore(adminApp)
export const rtdb = getDatabase(adminApp)
