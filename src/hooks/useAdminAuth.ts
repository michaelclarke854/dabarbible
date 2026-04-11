import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async (u: User | null) => {
      if (!u) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setUser(u);
      // Check user_roles table for admin role
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
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

  return { user, isAdmin, loading };
}
