import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type UserRole =
  | "super_admin" | "admin" | "beta" | "free" | "personal"
  | "family_owner" | "family_member" | "community_admin"
  | "community_member" | "suspended";

export type UserPlan = "free" | "personal" | "family" | "community";

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
  refreshProfile: () => Promise<void>;
  setLanguagePreference: (lang: string) => void;
  setPreferredBibleVersion: (v: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const FULL_ACCESS_ROLES: UserRole[] = [
  "super_admin", "admin", "beta", "personal",
  "family_owner", "family_member", "community_admin", "community_member",
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("free");
  const [plan, setPlan] = useState<UserPlan>("free");
  const [isSuspended, setIsSuspended] = useState(false);
  const [ageGroup, setAgeGroup] = useState<string | null>(null);
  const [languagePreference, setLanguagePreference] = useState("en");
  const [preferredBibleVersion, setPreferredBibleVersion] = useState("KJV");
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, plan, is_suspended, age_group, language_preference, preferred_bible_version")
      .eq("user_id", userId)
      .single();

    if (profile) {
      setRole((profile.role || "free") as UserRole);
      setPlan((profile.plan || "free") as UserPlan);
      setIsSuspended(profile.is_suspended || false);
      setAgeGroup(profile.age_group || null);
      setLanguagePreference(profile.language_preference || "en");
      setPreferredBibleVersion((profile as any).preferred_bible_version || "KJV");
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          fetchProfile(u.id).finally(() => setLoading(false));
        } else {
          setRole("free");
          setPlan("free");
          setIsSuspended(false);
          setAgeGroup(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

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
    hasFullAccess: FULL_ACCESS_ROLES.includes(role),
    loading,
    refreshProfile,
    setLanguagePreference,
    setPreferredBibleVersion,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
