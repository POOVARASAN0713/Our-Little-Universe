import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  type User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
);

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const AUTHORIZED_EMAILS = (
  process.env.NEXT_PUBLIC_AUTHORIZED_EMAILS ||
  "thisispoovu03@gmail.com,shivadharshinid13@gmail.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function getFriendlyAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Authentication failed. Please try again.";
  const code = (error as { code?: string }).code || "";
  const msg = (error as { message?: string }).message || "";

  switch (code) {
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled. Click Continue with Google to try again.";
    case "auth/popup-blocked":
      return "Sign-in popup was blocked by your browser. Please allow popups or use redirect.";
    case "auth/unauthorized-domain":
      return `This domain is not authorized in Firebase. Add ${typeof window !== "undefined" ? window.location.hostname : "your domain"} to Firebase Console → Authentication → Settings → Authorized domains.`;
    case "auth/operation-not-allowed":
      return "Google Sign-In is not enabled in Firebase. Enable it in Firebase Console → Authentication → Sign-in method → Google.";
    case "auth/network-request-failed":
      return "Network connection issue. Please check your internet connection.";
    case "auth/cancelled-popup-request":
      return "A sign-in request is already in progress.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email address.";
    default:
      return msg || "Google sign-in could not be completed. Check your Firebase settings.";
  }
}

export async function loginWithGoogle(): Promise<User | null> {
  if (!firebaseConfigured) {
    throw new Error("Firebase credentials are not configured in .env.local.");
  }
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === "auth/popup-blocked") {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
}

export async function checkRedirectLogin(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (error) {
    console.error("Firebase redirect result error:", error);
    throw error;
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
}
