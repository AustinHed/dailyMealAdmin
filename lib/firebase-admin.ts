import "server-only";

import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { Firestore, getFirestore } from "firebase-admin/firestore";

let cachedDb: Firestore | null = null;

function normalizePrivateKey(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  const unwrapped =
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;

  return unwrapped.replace(/\\n/g, "\n");
}

function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() ?? "";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim() ?? "";
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  const missingVars = [
    !projectId ? "FIREBASE_PROJECT_ID" : "",
    !clientEmail ? "FIREBASE_CLIENT_EMAIL" : "",
    !privateKey ? "FIREBASE_PRIVATE_KEY" : "",
  ].filter(Boolean);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing Firebase Admin credentials: ${missingVars.join(", ")}.`,
    );
  }

  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY appears malformed. Use the full key with escaped newlines (\\n) in Vercel.",
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  });
}

export function getAdminDb(): Firestore {
  if (cachedDb) {
    return cachedDb;
  }

  const firebaseAdminApp = getFirebaseAdminApp();
  cachedDb = getFirestore(firebaseAdminApp);
  return cachedDb;
}
