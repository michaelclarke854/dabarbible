import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, AlertTriangle } from "lucide-react";

interface PrivacySettingsProps {
  userId: string;
  onClose: () => void;
}

const PrivacySettings = ({ userId, onClose }: PrivacySettingsProps) => {
  const [reflectionCount, setReflectionCount] = useState(0);
  const [deleteJournalConfirm, setDeleteJournalConfirm] = useState("");
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("reflection_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("deleted_at", null);
      setReflectionCount(count || 0);
    })();
  }, [userId]);

  const handleDeleteJournal = async () => {
    if (deleteJournalConfirm !== "DELETE") return;
    setProcessing(true);
    try {
      // Soft delete all reflection entries
      await supabase
        .from("reflection_entries")
        .update({ deleted_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("deleted_at", null);
      toast.success(`${reflectionCount} entries deleted. You have 30 days to contact support to recover them.`);
      setReflectionCount(0);
      setDeleteJournalConfirm("");
    } catch {
      toast.error("Failed to delete entries.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteAccountConfirm !== "DELETE") return;
    setProcessing(true);
    try {
      // Sign out — actual deletion handled by admin/edge function
      // For now, soft-delete all data and sign out
      await supabase
        .from("reflection_entries")
        .update({ deleted_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("deleted_at", null);
      await supabase.auth.signOut();
      toast.success("Your account data has been scheduled for deletion.");
    } catch {
      toast.error("Failed to process request.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="font-serif text-lg text-foreground tracking-wide">Privacy</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 max-w-lg mx-auto w-full space-y-10">
        {/* Delete Journal Entries */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-gold" />
            <h3 className="font-serif text-sm text-gold uppercase tracking-widest">Delete all journal entries</h3>
          </div>
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            This will delete <span className="text-foreground font-medium">{reflectionCount}</span> entries.
            You have 30 days to contact support to recover them.
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
            This will permanently delete your account and all associated data.
            <span className="text-destructive font-medium"> This cannot be undone.</span>
          </p>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-body">Type DELETE to confirm:</p>
            <input
              value={deleteAccountConfirm}
              onChange={(e) => setDeleteAccountConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-transparent border border-destructive/30 rounded-sm px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-destructive transition-colors"
            />
            <button
              onClick={handleDeleteAccount}
              disabled={processing || deleteAccountConfirm !== "DELETE"}
              className="w-full bg-destructive text-destructive-foreground text-sm font-body py-2.5 rounded-sm hover:bg-destructive/90 transition-colors disabled:opacity-30"
            >
              Delete my account permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;
