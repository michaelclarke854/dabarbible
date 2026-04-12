import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type UserRole =
  | "super_admin" | "admin" | "beta" | "free" | "personal"
  | "family_owner" | "family_member" | "community_admin"
  | "community_member" | "suspended";

export type UserPlan = "free" | "trial" | "personal" | "family" | "community";

interface TrialState {
  isOnTrial: boolean;
  trialEndsAt: string | null;
  trialStartedAt: string | null;
  trialConverted: boolean;
  trialNudgeSent: { day14: boolean; day21: boolean; day28: boolean };
  daysLeft: number;
  trialExpired: boolean;
}

interface AuthContextValue {
  user: User | null;
  role: UserRole;
  plan: UserPlan;
  isSuspended: boolean;
  ageGroup: string | null;
  languagePreference: string;
  preferredBibleVersion: string;
  isAdmin: boolean;
  isBeta: boolean;
  hasFullAccess: boolean;
  loading: boolean;
  isHydrating: boolean;
  emailUnconfirmed: boolean;
  userEmail: string | null;
  trial: TrialState;
  needsAgeGate: boolean;
  refreshProfile: () => Promise<void>;
  setLanguagePreference: (lang: string) => void;
  setPreferredBibleVersion: (v: string) => void;
  setPendingConfirmation: (email: string | null) => void;
  clearAgeGate: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const FULL_ACCESS_ROLES: UserRole[] = [
  "super_admin", "admin", "beta", "personal",
  "family_owner", "family_member", "community_admin", "community_member",
];

const DEFAULT_NUDGE = { day14: false, day21: false, day28: false };

function computeTrialState(profile: any): TrialState {
  const plan = profile?.plan || "free";
  const trialEndsAt = profile?.trial_ends_at || null;
  const trialStartedAt = profile?.trial_started_at || null;
  const trialConverted = profile?.trial_converted || false;
  const trialNudgeSent = profile?.trial_nudge_sent || DEFAULT_NUDGE;

  const isOnTrial = plan === "trial" && !!trialEndsAt;
  let daysLeft = 0;
  let trialExpired = false;

  if (trialEndsAt) {
    const now = new Date();
    const ends = new Date(trialEndsAt);
    daysLeft = Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    trialExpired = plan === "trial" && now >= ends;
  }

  return { isOnTrial, trialEndsAt, trialStartedAt, trialConverted, trialNudgeSent, daysLeft, trialExpired };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("free");
  const [plan, setPlan] = useState<UserPlan>("free");
  const [isSuspended, setIsSuspended] = useState(false);
  const [ageGroup, setAgeGroup] = useState<string | null>(null);
  const [languagePreference, setLanguagePreference] = useState("en");
  const [preferredBibleVersion, setPreferredBibleVersion] = useState("KJV");
  const [loading, setLoading] = useState(true);
  const [isHydrating, setIsHydrating] = useState(true);
  const [emailUnconfirmed, setEmailUnconfirmed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [trial, setTrial] = useState<TrialState>({
    isOnTrial: false, trialEndsAt: null, trialStartedAt: null,
    trialConverted: false, trialNudgeSent: DEFAULT_NUDGE, daysLeft: 0, trialExpired: false,
  });

  const isFetchingRef = useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, plan, is_suspended, age_group, language_preference, preferred_bible_version, trial_started_at, trial_ends_at, trial_converted, trial_nudge_sent")
        .eq("user_id", userId)
        .single();

      if (profile) {
        const profileRole = (profile.role || "free") as UserRole;
        const profilePlan = (profile.plan || "free") as UserPlan;
        setRole(profileRole);
        setPlan(profilePlan);
        setIsSuspended(profile.is_suspended || false);
        setAgeGroup(profile.age_group || null);
        setLanguagePreference(profile.language_preference || "en");
        setPreferredBibleVersion((profile as any).preferred_bible_version || "KJV");
        setTrial(computeTrialState(profile));
      }
    } catch (error) {
      console.error("fetchProfile error:", error);
    } finally {
      isFetchingRef.current = false;
      setIsHydrating(false);
      setLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      isFetchingRef.current = false; // Allow re-fetch on explicit refresh
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        setUserEmail(u?.email ?? null);

        if (u) {
          // Check for unconfirmed email
          if (!u.email_confirmed_at) {
            setEmailUnconfirmed(true);
            setIsHydrating(false);
            setLoading(false);
            return;
          }
          setEmailUnconfirmed(false);
          fetchProfile(u.id);
        } else {
          setRole("free");
          setPlan("free");
          setIsSuspended(false);
          setAgeGroup(null);
          setEmailUnconfirmed(false);
          setTrial({ isOnTrial: false, trialEndsAt: null, trialStartedAt: null, trialConverted: false, trialNudgeSent: DEFAULT_NUDGE, daysLeft: 0, trialExpired: false });
          setIsHydrating(false);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const hasFullAccess = FULL_ACCESS_ROLES.includes(role) || (plan === "trial" && !trial.trialExpired);

  const setPendingConfirmation = useCallback((email: string | null) => {
    if (email) {
      setEmailUnconfirmed(true);
      setUserEmail(email);
    } else {
      setEmailUnconfirmed(false);
      setUserEmail(null);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    role,
    plan,
    isSuspended,
    ageGroup,
    languagePreference,
    preferredBibleVersion,
    isAdmin: role === "super_admin" || role === "admin",
    isBeta: role === "beta",
    hasFullAccess,
    loading,
    isHydrating,
    emailUnconfirmed,
    userEmail,
    trial,
    refreshProfile,
    setLanguagePreference,
    setPreferredBibleVersion,
    setPendingConfirmation,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
