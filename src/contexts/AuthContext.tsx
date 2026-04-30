import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { trackEvent } from "@/lib/trackEvent";

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
  isPastor: boolean;
  pastoralCommunityId: string | null;
  hasFullAccess: boolean;
  loading: boolean;
  isHydrating: boolean;
  emailUnconfirmed: boolean;
  userEmail: string | null;
  trial: TrialState;
  needsAgeGate: boolean;
  pendingCheckin: boolean;
  needsOnboardingIntent: boolean;
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
  const [needsAgeGate, setNeedsAgeGate] = useState(false);
  const [pendingCheckin, setPendingCheckin] = useState(false);
  const [isPastor, setIsPastor] = useState(false);
  const [pastoralCommunityId, setPastoralCommunityId] = useState<string | null>(null);
  const [needsOnboardingIntent, setNeedsOnboardingIntent] = useState(false);

  const isFetchingRef = useRef(false);
  // Track which user IDs we've already fired signup_completed for (per session)
  const signupTrackedRef = useRef<Set<string>>(new Set());

  const fetchProfile = useCallback(async (userId: string) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, plan, is_suspended, age_group, language_preference, preferred_bible_version, trial_started_at, trial_ends_at, trial_converted, trial_nudge_sent, pending_checkin, is_pastor, pastoral_community_id, onboarding_completed_at")
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
        setPendingCheckin((profile as any).pending_checkin || false);
        setIsPastor((profile as any).is_pastor || false);
        setPastoralCommunityId((profile as any).pastoral_community_id || null);
        setNeedsOnboardingIntent(!(profile as any).onboarding_completed_at);
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
          // Identity linking: multiple identities (email + google) sharing
          // the same email are the same account — just use the existing user ID.
          // Supabase already merges them if "Allow linking" is on, but even
          // without that dashboard toggle the user object arrives with a
          // single consolidated id, so fetchProfile(u.id) is always correct.

          // Check for unconfirmed email
          if (!u.email_confirmed_at) {
            setEmailUnconfirmed(true);
            setIsHydrating(false);
            setLoading(false);
            return;
          }
          setEmailUnconfirmed(false);
          setNeedsAgeGate(false);
          fetchProfile(u.id).then(() => {
            // If user signed in/up via an invite link, complete the join flow.
            const pendingInvite = typeof window !== 'undefined'
              ? localStorage.getItem('dabar_pending_invite')
              : null;
            if (pendingInvite && !window.location.pathname.startsWith('/join/')) {
              window.location.href = `/join/${pendingInvite}`;
              return;
            }
            // Fire signup_completed once per new account.
            // Heuristic: user.created_at within 5 minutes of now → first session.
            if (!signupTrackedRef.current.has(u.id)) {
              signupTrackedRef.current.add(u.id);
              const createdAt = u.created_at ? new Date(u.created_at).getTime() : 0;
              const isNewSignup = createdAt && (Date.now() - createdAt) < 5 * 60 * 1000;
              if (isNewSignup) {
                trackEvent('signup_completed', {
                  screen: 'auth',
                  metadata: { method: u.app_metadata?.provider ?? 'email' },
                  userId: u.id,
                });
              }
            }
            // Fire trial_started once per user — uses trial_nudge_sent jsonb as the persistent flag.
            (async () => {
              const { data: p } = await supabase
                .from('profiles')
                .select('plan, trial_nudge_sent')
                .eq('user_id', u.id)
                .single();
              const nudge = (p?.trial_nudge_sent as Record<string, unknown>) ?? {};
              if (p?.plan === 'trial' && !nudge.trial_started_tracked) {
                trackEvent('trial_started', { screen: 'onboarding', userId: u.id });
                await supabase
                  .from('profiles')
                  .update({ trial_nudge_sent: { ...nudge, trial_started_tracked: true } as never })
                  .eq('user_id', u.id);
              }
            })();
            // Check if Google OAuth user needs age gate
            const isGoogleUser = u.app_metadata?.provider === "google";
            if (isGoogleUser) {
              supabase
                .from("profiles")
                .select("age_group")
                .eq("user_id", u.id)
                .single()
                .then(({ data: profileData }) => {
                  if (!profileData?.age_group) {
                    setNeedsAgeGate(true);
                  }
                });
            }
            // Sync anonymous currency preference
            const stored = localStorage.getItem("dabar_preferred_currency");
            if (stored) {
              supabase.functions
                .invoke("save-currency-preference", { body: { currency: stored } })
                .then(() => localStorage.removeItem("dabar_preferred_currency"))
                .catch(() => {});
            }
          });
        } else {
          setRole("free");
          setPlan("free");
          setIsSuspended(false);
          setAgeGroup(null);
          setEmailUnconfirmed(false);
          setIsPastor(false);
          setPastoralCommunityId(null);
          setNeedsOnboardingIntent(false);
          setTrial({ isOnTrial: false, trialEndsAt: null, trialStartedAt: null, trialConverted: false, trialNudgeSent: DEFAULT_NUDGE, daysLeft: 0, trialExpired: false });
          setNeedsAgeGate(false);
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

  const clearAgeGate = useCallback(() => {
    setNeedsAgeGate(false);
    if (user) {
      isFetchingRef.current = false;
      fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

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
    isPastor,
    pastoralCommunityId,
    hasFullAccess,
    loading,
    isHydrating,
    emailUnconfirmed,
    userEmail,
    trial,
    needsAgeGate,
    pendingCheckin,
    needsOnboardingIntent,
    refreshProfile,
    setLanguagePreference,
    setPreferredBibleVersion,
    setPendingConfirmation,
    clearAgeGate,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
