import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, AlertTriangle, Download, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { isIOSNative } from "@/lib/platform";

interface PrivacySettingsProps {
  userId: string;
  onClose: () => void;
}

const PrivacySettings = ({ userId, onClose }: PrivacySettingsProps) => {
  const { isPastor, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const nativeIOS = isIOSNative();
  const [activating, setActivating] = useState(false);
  const [reflectionCount, setReflectionCount] = useState(0);
  const [accountEmail, setAccountEmail] = useState("");
  const [deleteJournalConfirm, setDeleteJournalConfirm] = useState("");
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleActivatePastor = async () => {
    setActivating(true);
    try {
      const { error } = await supabase.functions.invoke("pastor-dashboard", {
        body: { action: "activate_pastor" },
      });
      if (error) throw new Error(error.message);
      await refreshProfile();
      toast.success("Pastor Dashboard activated.");
      onClose();
      navigate("/pastor/setup");
    } catch {
      toast.error("Could not activate. Please try again.");
    } finally {
      setActivating(false);
    }
  };

  useEffect(() => {
    (async () => {
      const [{ count }, { data: { user } }] = await Promise.all([
        supabase
          .from("reflection_entries")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .is("deleted_at", null),
        supabase.auth.getUser(),
      ]);
      setReflectionCount(count || 0);
      setAccountEmail(user?.email || "");
    })();
  }, [userId]);

  // Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleDeleteJournal = async () => {
    if (deleteJournalConfirm !== "DELETE") return;
    setProcessing(true);
    try {
      // Soft-delete reflections
      const { error: refErr } = await supabase
        .from("reflection_entries")
        .update({ deleted_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("deleted_at", null);
      if (refErr) throw refErr;

      // Cascade: clear derived patterns + insights so prompts don't resurface deleted material
      await Promise.all([
        supabase.from("user_patterns").delete().eq("user_id", userId),
        // journal_insights has no user-DELETE policy by design — they stay as historical aggregates
      ]);

      toast.success(
        `${reflectionCount} entries deleted. You have 30 days to contact support to recover them.`
      );
      setReflectionCount(0);
      setDeleteJournalConfirm("");
    } catch {
      toast.error("Failed to delete entries.");
    } finally {
      setProcessing(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-data");
      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dabar-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Your data has been exported.");
    } catch {
      toast.error("Failed to export data.");
    } finally {
      setExporting(false);
    }
  };

  const accountDeleteReady =
    deleteAccountConfirm === "DELETE" &&
    emailConfirm.trim().toLowerCase() === accountEmail.toLowerCase() &&
    accountEmail.length > 0;

  const handleDeleteAccount = async () => {
    if (!accountDeleteReady) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { userId, confirmEmail: emailConfirm.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await supabase.auth.signOut();
      toast.success("Your account has been deleted.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      toast.error(`Failed to delete account. ${msg}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Privacy and Data settings"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="font-serif text-lg text-foreground tracking-wide">Privacy & Data</h2>
        <button
          onClick={onClose}
          aria-label="Close privacy settings"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 max-w-lg mx-auto w-full space-y-10">
        {/* Pastor Dashboard activation */}
        {!isPastor && (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-gold" />
                <h3 className="font-serif text-sm text-gold uppercase tracking-widest">
                  Are you a pastor or community leader?
                </h3>
              </div>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">
                Activate the Pastor Dashboard to see what themes your congregation
                is exploring in scripture — without ever seeing individual questions.
              </p>
              <button
                onClick={handleActivatePastor}
                disabled={activating}
                className="w-full border border-gold/30 text-gold text-sm font-body py-2.5 rounded-sm hover:bg-gold/10 transition-colors disabled:opacity-30"
              >
                {activating ? "Activating…" : "Activate Pastor Dashboard"}
              </button>
            </div>
            <div className="h-px bg-border" />
          </>
        )}
        {isPastor && (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-gold" />
                <h3 className="font-serif text-sm text-gold uppercase tracking-widest">
                  Pastor Dashboard
                </h3>
              </div>
              <button
                onClick={() => {
                  onClose();
                  navigate("/pastor");
                }}
                className="w-full border border-gold/30 text-gold text-sm font-body py-2.5 rounded-sm hover:bg-gold/10 transition-colors"
              >
                Open Pastor Dashboard →
              </button>
            </div>
            <div className="h-px bg-border" />
          </>
        )}

        {/* Export Data */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Download size={14} className="text-gold" />
            <h3 className="font-serif text-sm text-gold uppercase tracking-widest">Export my data</h3>
          </div>
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            {nativeIOS
              ? "Download all your data — questions, journal entries, saved verses, patterns, and more — as a JSON file."
              : "Download all your data — questions, journal entries, saved verses, patterns, subscriptions, and more — as a JSON file."}
          </p>
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="w-full border border-gold/30 text-gold text-sm font-body py-2.5 rounded-sm hover:bg-gold/10 transition-colors disabled:opacity-30"
          >
            {exporting ? "Exporting…" : "Export my data"}
          </button>
        </div>

        <div className="h-px bg-border" />

        {/* Delete Journal Entries */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-gold" />
            <h3 className="font-serif text-sm text-gold uppercase tracking-widest">Delete all journal entries</h3>
          </div>
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            This will delete <span className="text-foreground font-medium">{reflectionCount}</span> entries and clear any pattern prompts derived from them.
            You have 30 days to contact support to recover entries.
          </p>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-body">Type DELETE to confirm:</p>
            <input
              value={deleteJournalConfirm}
              onChange={(e) => setDeleteJournalConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-gold transition-colors"
            />
            <button
              onClick={handleDeleteJournal}
              disabled={processing || deleteJournalConfirm !== "DELETE"}
              className="w-full border border-destructive/30 text-destructive text-sm font-body py-2.5 rounded-sm hover:bg-destructive/10 transition-colors disabled:opacity-30"
            >
              Delete all journal entries
            </button>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Delete Account */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-destructive" />
            <h3 className="font-serif text-sm text-destructive uppercase tracking-widest">Delete my account and all data</h3>
          </div>
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            {nativeIOS
              ? "This will permanently delete your account and remove all associated data."
              : "This will permanently delete your account, cancel any subscription, and remove all associated data."}
            <span className="text-destructive font-medium"> This cannot be undone.</span>
          </p>
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-body">
                Re-enter your account email to confirm it's you:
              </p>
              <input
                type="email"
                value={emailConfirm}
                onChange={(e) => setEmailConfirm(e.target.value)}
                placeholder={accountEmail || "your@email.com"}
                autoComplete="off"
                className="w-full bg-transparent border border-destructive/30 rounded-sm px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-destructive transition-colors"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-body">Then type DELETE:</p>
              <input
                value={deleteAccountConfirm}
                onChange={(e) => setDeleteAccountConfirm(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-transparent border border-destructive/30 rounded-sm px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-destructive transition-colors"
              />
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={processing || !accountDeleteReady}
              className="w-full bg-destructive text-destructive-foreground text-sm font-body py-2.5 rounded-sm hover:bg-destructive/90 transition-colors disabled:opacity-30"
            >
              {processing ? "Deleting…" : "Delete my account permanently"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;
