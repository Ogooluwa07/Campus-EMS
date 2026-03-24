import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export type Role = "student" | "organizer" | "admin";

export type UserProfile = {
  uid: string;
  email: string | null;
  fullName?: string;
  role: Role;
  createdAt?: any;
  updatedAt?: any;
};

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loadingAuth: boolean;
  loadingProfile: boolean;
  authReady: boolean;
  profileReady: boolean;
  isAdmin: boolean;
  isOrganizer: boolean;
  isStudent: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeRole(value: any): Role {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "admin" || v === "organizer" || v === "student") return v as Role;
  return "student";
}

/**
 * Ensures a profile doc exists for the user and returns stored data.
 * - If missing: create with role="student" (required by your Firestore rules).
 * - If present but messy: normalize role + backfill missing fields.
 */
async function ensureAndReadProfile(u: User): Promise<UserProfile> {
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        fullName: "",
        email: u.email ?? "",
        role: "student",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  // Read stored values (avoid serverTimestamp sentinel in React state)
  const snap2 = await getDoc(ref);
  const data = (snap2.data() ?? {}) as any;

  const role = normalizeRole(data.role);

  // Backfill/normalize DB fields safely (merge)
  const updates: Record<string, any> = {};
  const storedRole = String(data.role ?? "").trim();

  if (storedRole && storedRole !== role) updates.role = role;

  // If email is missing in DB, store it (helpful for admin/user list later)
  if (!data.email && u.email) updates.email = u.email;

  // Keep consistent updatedAt if we made any changes
  if (Object.keys(updates).length > 0) {
    updates.updatedAt = serverTimestamp();
    await setDoc(ref, updates, { merge: true });
  }

  return {
    uid: u.uid,
    email: u.email,
    fullName: data.fullName ?? data.name ?? "",
    role,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  const fetchProfile = async (u: User | null) => {
    setLoadingProfile(true);
    setProfileReady(false);

    try {
      if (!u) {
        setProfile(null);
        return;
      }

      const p = await ensureAndReadProfile(u);
      setProfile(p);
    } catch (err) {
      console.error("Failed to fetch/ensure profile:", err);
      setProfile(null);
    } finally {
      setLoadingProfile(false);
      setProfileReady(true);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoadingAuth(true);
      setAuthReady(false);

      try {
        setUser(u);
        await fetchProfile(u);
      } finally {
        setLoadingAuth(false);
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  const refreshProfile = async () => {
    await fetchProfile(auth.currentUser);
  };

  const value = useMemo<AuthContextValue>(() => {
    const role = profile?.role;

    return {
      user,
      profile,
      loadingAuth,
      loadingProfile,
      authReady,
      profileReady,
      isAdmin: role === "admin",
      isOrganizer: role === "organizer",
      isStudent: role === "student",
      refreshProfile,
    };
  }, [user, profile, loadingAuth, loadingProfile, authReady, profileReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


