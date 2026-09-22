import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import firebaseConfigData from "../../firebase-applet-config.json";
import { UserAccount, SavedUserLocation, TemperatureUnit } from "../types/weather";

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

// Initialize Firebase App instance safely (singleton pattern)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore (with designated firestoreDatabaseId if configured)
export const db = firebaseConfigData.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigData.firestoreDatabaseId)
  : getFirestore(app);

export { onAuthStateChanged };
export type { FirebaseUser };

const googleProvider = new GoogleAuthProvider();

export const DEFAULT_SAVED_LOCATIONS: SavedUserLocation[] = [
  {
    name: "Hyderabad",
    region: "Telangana",
    country: "India",
    latitude: 17.385,
    longitude: 78.4867,
  },
  {
    name: "Vijayawada",
    region: "Andhra Pradesh",
    country: "India",
    latitude: 16.5062,
    longitude: 80.648,
  },
];

/**
 * Generate a default UserAccount object for a newly signed-in or guest Firebase user
 */
export function createDefaultUserAccount(firebaseUser: FirebaseUser): UserAccount {
  const isGoogle = firebaseUser.providerData.some((p) => p.providerId === "google.com");
  const timeFormatted = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return {
    id: firebaseUser.uid,
    name:
      firebaseUser.displayName ||
      (firebaseUser.email ? firebaseUser.email.split("@")[0] : "Weather Explorer"),
    email: firebaseUser.email || `${firebaseUser.uid.slice(0, 8)}@weathergpt.app`,
    avatarUrl:
      firebaseUser.photoURL ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
        firebaseUser.email || firebaseUser.uid
      )}`,
    provider: isGoogle ? "google" : "email",
    twoFactorEnabled: false,
    twoFactorMethod: "authenticator",
    createdAt: timeFormatted,
    lastLogin: timeFormatted,
    savedLocations: DEFAULT_SAVED_LOCATIONS,
    preferences: {
      unit: "C",
      weatherAlerts: true,
      rainWarnings: true,
      aiStyle: "simple",
    },
    securityLogs: [
      {
        id: `log-${Date.now()}`,
        action: "Cloud Account Synced via Firebase",
        device: "Active Browser Session",
        location: "Firestore Cloud Database",
        timestamp: timeFormatted,
      },
    ],
  };
}

/**
 * Fetch or initialize a user profile document in Firestore using authenticated user ID
 */
export async function syncUserFromFirestore(firebaseUser: FirebaseUser): Promise<UserAccount> {
  try {
    const userRef = doc(db, "users", firebaseUser.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as UserAccount;
      // Ensure all fields exist
      const merged: UserAccount = {
        ...createDefaultUserAccount(firebaseUser),
        ...data,
        id: firebaseUser.uid,
        name: firebaseUser.displayName || data.name || "Weather User",
        email: firebaseUser.email || data.email,
        avatarUrl: firebaseUser.photoURL || data.avatarUrl,
        lastLogin: new Date().toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      };

      // Update last login in background
      await setDoc(userRef, merged, { merge: true });
      return merged;
    } else {
      // First time user document creation in Firestore
      const newAccount = createDefaultUserAccount(firebaseUser);
      await setDoc(userRef, newAccount);
      return newAccount;
    }
  } catch (error) {
    console.warn("Firestore syncUserFromFirestore error, falling back to local memory:", error);
    return createDefaultUserAccount(firebaseUser);
  }
}

/**
 * Persist whole UserAccount state directly to Firestore using authenticated UID
 */
export async function saveUserAccountToFirestore(user: UserAccount): Promise<void> {
  if (!user || !user.id) return;
  try {
    const userRef = doc(db, "users", user.id);
    await setDoc(userRef, user, { merge: true });
  } catch (err) {
    console.error("Failed to save user account state to Firestore:", err);
  }
}

/**
 * Persist user preferences (temperature unit, weather alerts, AI style) to Firestore
 */
export async function savePreferencesToFirestore(
  userId: string,
  preferences: Partial<UserAccount["preferences"]>
): Promise<void> {
  if (!userId) return;
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(
      userRef,
      {
        preferences,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Failed to save preferences to Firestore:", err);
  }
}

/**
 * Persist saved locations to Firestore
 */
export async function saveLocationsToFirestore(
  userId: string,
  savedLocations: SavedUserLocation[]
): Promise<void> {
  if (!userId) return;
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(
      userRef,
      {
        savedLocations,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Failed to save locations to Firestore:", err);
  }
}

/**
 * Real-time Firestore subscription for authenticated user document
 */
export function subscribeToUserFirestore(
  userId: string,
  callback: (user: UserAccount) => void
) {
  if (!userId) return () => {};
  const userRef = doc(db, "users", userId);
  return onSnapshot(
    userRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserAccount;
        callback(data);
      }
    },
    (error) => {
      console.warn("Firestore subscription listener warning:", error);
    }
  );
}

/**
 * Google Sign In with Firebase Authentication
 */
export async function loginWithGoogle(): Promise<UserAccount> {
  const result = await signInWithPopup(auth, googleProvider);
  return await syncUserFromFirestore(result.user);
}

/**
 * Email & Password Sign In with Firebase Authentication
 */
export async function loginWithEmail(email: string, pass: string): Promise<UserAccount> {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return await syncUserFromFirestore(result.user);
}

/**
 * Email & Password Sign Up with Firebase Authentication
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  name: string
): Promise<UserAccount> {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  if (name && auth.currentUser) {
    try {
      await updateProfile(auth.currentUser, { displayName: name });
    } catch (e) {}
  }
  const account = createDefaultUserAccount(result.user);
  if (name) account.name = name;
  const userRef = doc(db, "users", result.user.uid);
  await setDoc(userRef, account);
  return account;
}

/**
 * Anonymous Guest Sign In with Firestore Persistence
 */
export async function loginAsGuest(): Promise<UserAccount> {
  const result = await signInAnonymously(auth);
  return await syncUserFromFirestore(result.user);
}

/**
 * Sign Out
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
