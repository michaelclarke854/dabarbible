import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller profile
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    const callerRole = callerProfile?.role;
    if (!callerRole || !["super_admin", "admin"].includes(callerRole)) {
      return new Response(JSON.stringify({ error: "Forbidden — admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { target_user_id, new_role, notes, action } = body;

    if (!target_user_id) {
      return new Response(JSON.stringify({ error: "target_user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle suspend/unsuspend actions
    if (action === "suspend" || action === "unsuspend") {
      if (callerRole !== "super_admin") {
        return new Response(JSON.stringify({ error: "Only super_admin can suspend/unsuspend" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", target_user_id)
        .single();

      if (targetProfile?.role === "super_admin") {
        return new Response(JSON.stringify({ error: "Cannot suspend super_admin" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "suspend") {
        await supabase
          .from("profiles")
          .update({
            is_suspended: true,
            suspended_at: new Date().toISOString(),
            suspended_by: caller.id,
            role: "suspended",
            previous_role: targetProfile?.role,
            role_changed_at: new Date().toISOString(),
            role_changed_by: caller.id,
          })
          .eq("user_id", target_user_id);

        await supabase.from("role_change_log").insert({
          target_user_id,
          changed_by: caller.id,
          old_role: targetProfile?.role,
          new_role: "suspended",
          notes: notes || "Account suspended",
        });
      } else {
        const previousRole = targetProfile?.role === "suspended"
          ? (await supabase.from("profiles").select("previous_role").eq("user_id", target_user_id).single()).data?.previous_role || "free"
          : targetProfile?.role || "free";

        await supabase
          .from("profiles")
          .update({
            is_suspended: false,
            suspended_at: null,
            suspended_by: null,
            role: previousRole,
            role_changed_at: new Date().toISOString(),
            role_changed_by: caller.id,
          })
          .eq("user_id", target_user_id);

        await supabase.from("role_change_log").insert({
          target_user_id,
          changed_by: caller.id,
          old_role: "suspended",
          new_role: previousRole,
          notes: notes || "Account unsuspended",
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle delete action
    if (action === "delete") {
      if (callerRole !== "super_admin") {
        return new Response(JSON.stringify({ error: "Only super_admin can delete users" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", target_user_id)
        .single();

      if (targetProfile?.role === "super_admin") {
        return new Response(JSON.stringify({ error: "Cannot delete super_admin" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: deleteError } = await supabase.auth.admin.deleteUser(target_user_id);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, deleted: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Role change logic
    if (!new_role) {
      return new Response(JSON.stringify({ error: "new_role required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validRoles = [
      "free", "personal", "family_owner", "family_member",
      "community_admin", "community_member", "beta", "admin", "suspended",
    ];
    if (!validRoles.includes(new_role)) {
      return new Response(JSON.stringify({ error: `Invalid role: ${new_role}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // super_admin can never be assigned via this function
    if (new_role === "super_admin") {
      return new Response(JSON.stringify({ error: "super_admin cannot be assigned" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get target user profile
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("role, user_id")
      .eq("user_id", target_user_id)
      .single();

    if (!targetProfile) {
      return new Response(JSON.stringify({ error: "Target user not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetProfile.role === "super_admin") {
      return new Response(JSON.stringify({ error: "Cannot modify super_admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin can only grant/revoke beta
    if (callerRole === "admin") {
      if (new_role !== "beta" && new_role !== "free") {
        return new Response(
          JSON.stringify({ error: "Admins can only grant or revoke beta access" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build update
    const update: Record<string, any> = {
      role: new_role,
      previous_role: targetProfile.role,
      role_changed_at: new Date().toISOString(),
      role_changed_by: caller.id,
    };

    if (new_role === "beta") {
      update.beta_granted_at = new Date().toISOString();
      update.beta_granted_by = caller.id;
      update.beta_notes = notes || null;
    }

    if (new_role === "free" && targetProfile.role === "beta") {
      update.beta_granted_at = null;
      update.beta_granted_by = null;
      update.beta_notes = null;
    }

    await supabase.from("profiles").update(update).eq("user_id", target_user_id);

    // Log the change
    await supabase.from("role_change_log").insert({
      target_user_id,
      changed_by: caller.id,
      old_role: targetProfile.role,
      new_role,
      notes: notes || null,
    });

    return new Response(JSON.stringify({ success: true, old_role: targetProfile.role, new_role }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("update-user-role error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
