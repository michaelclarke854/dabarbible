import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function JoinCommunity() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { user, refreshProfile, isHydrating } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<
    "loading" | "joining" | "success" | "error" | "need_auth"
  >("loading");
  const [communityName, setCommunityName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isHydrating) return;
    if (!inviteCode) {
      navigate("/");
      return;
    }
    localStorage.setItem("dabar_pending_invite", inviteCode);
    if (!user) {
      setStatus("need_auth");
      return;
    }

    (async () => {
      setStatus("joining");
      try {
        const { data: community, error: lookupErr } = await supabase
          .from("pastoral_communities")
          .select("id, name")
          .eq("invite_code", inviteCode)
          .single();

        if (lookupErr || !community) throw new Error("This invite link is invalid.");
        setCommunityName(community.name);

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
        setStatus("success");
        toast.success(`You've joined ${community.name}!`);
        setTimeout(() => navigate("/"), 2500);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
        setStatus("error");
      }
    })();
  }, [inviteCode, user, isHydrating, navigate, refreshProfile]);

  if (status === "need_auth")
    return (
      <div className="min-h-screen bg-background px-6 py-12 flex items-center justify-center">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="font-serif text-2xl text-foreground tracking-wide">
            You've been invited
          </h1>
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            Create a free account to join and explore scripture with your community.
          </p>
          <Button onClick={() => navigate("/?auth=signup")} className="w-full">
            Create free account →
          </Button>
        </div>
      </div>
    );

  if (status === "loading" || status === "joining")
    return (
      <div className="min-h-screen bg-background px-6 py-12 flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        <p className="font-body text-sm text-muted-foreground">Joining community...</p>
      </div>
    );

  if (status === "success")
    return (
      <div className="min-h-screen bg-background px-6 py-12 flex flex-col items-center justify-center gap-3 text-center">
        <h1 className="font-serif text-xl text-foreground tracking-wide">
          You've joined {communityName}
        </h1>
        <p className="font-body text-sm text-muted-foreground">
          Redirecting you to DABAR...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-background px-6 py-12 flex flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-serif text-xl text-destructive tracking-wide">
        Could not join community
      </h1>
      <p className="font-body text-sm text-muted-foreground">{errorMsg}</p>
      <Button onClick={() => navigate("/")}>Go to DABAR</Button>
    </div>
  );
}