import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function JoinCommunity() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { user, refreshProfile, isHydrating } = useAuth();
  const navigate = useNavigate();

  type LookupStatus = "lookup" | "invalid" | "ready";
  type JoinStatus = "idle" | "joining" | "success" | "error";

  const [lookupStatus, setLookupStatus] = useState<LookupStatus>("lookup");
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");
  const [community, setCommunity] = useState<{ id: string; name: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const autoJoinedRef = useRef(false);

  // Step 1: look up the community by invite code (works for anon + authenticated)
  useEffect(() => {
    if (!inviteCode) {
      navigate("/");
      return;
    }
    localStorage.setItem("dabar_pending_invite", inviteCode);

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("lookup_community_by_invite", {
        _invite_code: inviteCode,
      });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : null;
      if (error || !row) {
        setLookupStatus("invalid");
      } else {
        setCommunity({ id: row.id, name: row.name });
        setLookupStatus("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteCode, navigate]);

  // Step 2: join (separate so it can be retried)
  const joinCommunity = useCallback(async () => {
    if (!user || !community) return;
    setJoinStatus("joining");
    setErrorMsg("");
    try {
      const { error: memberErr } = await supabase
        .from("pastoral_community_members")
        .upsert(
          { community_id: community.id, user_id: user.id },
          { onConflict: "community_id,user_id" }
        );
      if (memberErr) throw new Error("Could not join community.");

      await supabase
        .from("profiles")
        .update({ pastoral_community_id: community.id })
        .eq("user_id", user.id);

      await refreshProfile();
      localStorage.removeItem("dabar_pending_invite");
      setJoinStatus("success");
      toast.success(`You've joined ${community.name}!`);
      setTimeout(() => navigate("/"), 2500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setJoinStatus("error");
    }
  }, [user, community, refreshProfile, navigate]);

  // Auto-join once when signed-in user lands on a valid invite
  useEffect(() => {
    if (
      !isHydrating &&
      user &&
      lookupStatus === "ready" &&
      joinStatus === "idle" &&
      !autoJoinedRef.current
    ) {
      autoJoinedRef.current = true;
      joinCommunity();
    }
  }, [isHydrating, user, lookupStatus, joinStatus, joinCommunity]);

  // ── Invalid invite code ────────────────────────────────────────────────
  if (lookupStatus === "invalid") {
    return (
      <div className="min-h-screen bg-background px-6 py-12 flex flex-col items-center justify-center gap-4 text-center">
        <h1 className="font-serif text-xl text-destructive tracking-wide">
          This invite link is invalid
        </h1>
        <p className="font-body text-sm text-muted-foreground max-w-md">
          The link may have been mistyped or the community no longer exists. Please
          ask your pastor or community leader for a fresh link.
        </p>
        <Button onClick={() => navigate("/")}>Go to DABAR</Button>
      </div>
    );
  }

  // ── Looking up the community ───────────────────────────────────────────
  if (lookupStatus === "lookup" || isHydrating) {
    return (
      <div className="min-h-screen bg-background px-6 py-12 flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        <p className="font-body text-sm text-muted-foreground">Loading invite...</p>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────
  if (joinStatus === "success") {
    return (
      <div className="min-h-screen bg-background px-6 py-12 flex flex-col items-center justify-center gap-3 text-center">
        <h1 className="font-serif text-xl text-foreground tracking-wide">
          You've joined {community?.name}
        </h1>
        <p className="font-body text-sm text-muted-foreground">
          Redirecting you to DABAR...
        </p>
      </div>
    );
  }

  // ── Ready: needs auth, joining, or join failed — all show community name ─
  return (
    <div className="min-h-screen bg-background px-6 py-12 flex items-center justify-center">
      <div className="w-full max-w-md space-y-5 text-center">
        <p className="font-body text-xs text-gold uppercase tracking-widest">
          You've been invited to join
        </p>
        <h1 className="font-serif text-2xl text-foreground tracking-wide">
          {community?.name}
        </h1>

        {!user && (
          <>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Create a free account to join and explore scripture with your community.
            </p>
            <Button onClick={() => navigate("/?auth=signup")} className="w-full">
              Create free account →
            </Button>
          </>
        )}

        {user && joinStatus === "joining" && (
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            <p className="font-body text-sm text-muted-foreground">
              Joining {community?.name}...
            </p>
          </div>
        )}

        {user && joinStatus === "error" && (
          <div className="space-y-3 pt-2">
            <p className="font-body text-sm text-destructive">
              {errorMsg || "Could not join. Please try again."}
            </p>
            <Button onClick={joinCommunity} className="w-full">
              Try again
            </Button>
            <button
              onClick={() => navigate("/")}
              className="text-xs font-body text-muted-foreground hover:text-foreground"
            >
              Cancel and go to DABAR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}