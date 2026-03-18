import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local" });
loadDotenv();

import {
  buildFirebaseClientRuntimeSnapshot,
  getFirebaseRuntimeWarnings,
} from "../src/lib/firebase-runtime";

const snapshot = buildFirebaseClientRuntimeSnapshot();
const warnings = getFirebaseRuntimeWarnings();
const fatalWarnings = warnings.filter((warning) => warning.includes("does not match"));
const missingWarnings = warnings.filter((warning) => !warning.includes("does not match"));

console.log("Firebase runtime snapshot:");
console.log(JSON.stringify({
  projectId: snapshot.projectId,
  authDomain: snapshot.authDomain,
  storageBucket: snapshot.storageBucket,
  databaseURL: snapshot.databaseURL,
  messagingSenderIdPresent: Boolean(snapshot.messagingSenderId),
  appIdPresent: Boolean(snapshot.appId),
  vapidKeyPresent: Boolean(snapshot.vapidKey),
  appCheckEnabled: snapshot.appCheckEnabled,
}, null, 2));

if (missingWarnings.length > 0) {
  console.warn("Firebase runtime warnings:");
  missingWarnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (fatalWarnings.length > 0) {
  console.error("Firebase runtime mismatches:");
  fatalWarnings.forEach((warning) => console.error(`- ${warning}`));
  process.exit(1);
}

console.log("Firebase runtime check passed.");
