import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const COMMUNITY_TYPES = [
  { value: "church", label: "Church" },
  { value: "sunday_school", label: "Sunday School" },
  { value: "small_group", label: "Small Group" },
  { value: "religious_school", label: "Religious School" },
  { value: "other", label: "Other Community" },
];

export default function PastorSetup() {
  const { user, isPastor, pastoralCommunityId, isHydrating, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [type, setType] = useState("church");
  const [creating, setCreating] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [communityName, setCommunityName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isHydrating && isPastor && pastoralCommunityId && !inviteCode) {
      navigate("/pastor");
    }
  }, [isHydrating, isPastor, pastoralCommunityId, inviteCode, navigate]);

  if (isHydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  const inviteLink = inviteCode
    ? `${window.location.origin}/join/${inviteCode}`
    : null;

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a community name.");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("pastor-dashboard", {
        body: { action: "setup_community", name: name.trim(), type },
      });
      if (error || !data?.community) throw new Error("Could not create community.");
      await refreshProfile();
      setCommunityName(data.community.name);
      setInviteCode(data.community.invite_code);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!inviteLink) return;
    const msg = encodeURIComponent(
      `Join our community on DABAR — a scripture reflection app: ${inviteLink}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  if (inviteCode) {
    return (
      <div className="min-h-screen bg-background px-6 py-12 flex items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <h1 className="font-serif text-2xl text-foreground tracking-wide">
            {communityName} is ready
          </h1>
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            Share this link with your congregation. Their questions will appear in
            your dashboard as aggregated themes — individual questions are never
            shown.
          </p>
          <div className="border border-gold/30 bg-gold/5 rounded-sm px-3 py-3 text-sm font-mono text-foreground break-all">
            {inviteLink}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCopy} variant="outline" className="flex-1">
              {copied ? "Copied!" : "Copy link"}
            </Button>
            <Button onClick={handleWhatsApp} variant="outline" className="flex-1">
              Share via WhatsApp
            </Button>
          </div>
          <Button onClick={() => navigate("/pastor")} className="w-full">
            Go to my dashboard →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-12 flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <h1 className="font-serif text-2xl text-foreground tracking-wide">
          Set up your community
        </h1>
        <p className="font-body text-sm text-muted-foreground leading-relaxed">
          Create a community so your congregation can join. You'll see what themes
          they're exploring in scripture — without seeing individual questions.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-body uppercase tracking-widest">
              Community name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grace Community Church"
              disabled={creating}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-body uppercase tracking-widest">
              Community type
            </label>
            <Select value={type} onValueChange={setType} disabled={creating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMUNITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={creating} className="w-full">
            {creating ? "Creating..." : "Create community"}
          </Button>
        </div>
      </div>
    </div>
  );
}