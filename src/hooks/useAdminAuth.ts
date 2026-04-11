import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async (u: User | null) => {
      if (!u) {
        setIsAdmin(false);
        setRole(null);
        setLoading(false);
        return;
      }
      setUser(u);
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", u.id)
        .maybeSingle();
      const r = data?.role || "free";
      setRole(r);
      setIsAdmin(r === "super_admin" || r === "admin");
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => checkAdmin(session?.user ?? null)
    );

    supabase.auth.getSession().then(({ data }) =>
      checkAdmin(data.session?.user ?? null)
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, isAdmin, role, loading };
}
