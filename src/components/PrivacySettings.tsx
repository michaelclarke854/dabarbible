import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, AlertTriangle, Download } from "lucide-react";

interface PrivacySettingsProps {
  userId: string;
  onClose: () => void;
}

const PrivacySettings = ({ userId, onClose }: PrivacySettingsProps) => {
  const [reflectionCount, setReflectionCount] = useState(0);
  const [deleteJournalConfirm, setDeleteJournalConfirm] = useState("");
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState("");
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const handleExportData = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-data");
      if (error) throw error;

      // Download as JSON file
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

  const handleDeleteAccount = async () => {
    if (deleteAccountConfirm !== "DELETE") return;
    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", {
        body: { userId },
      });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Your account has been deleted.");
    } catch {
      toast.error("Failed to delete account. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="font-serif text-lg text-foreground tracking-wide">Privacy & Data</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 max-w-lg mx-auto w-full space-y-10">
        {/* Export Data */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Download size={14} className="text-gold" />
            <h3 className="font-serif text-sm text-gold uppercase tracking-widest">Export my data</h3>
          </div>
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            Download all your data — questions, journal entries, saved verses, and patterns — as a JSON file.
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
            This will permanently delete your account, cancel any subscription, and remove all associated data.
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

        <div className="text-center pt-4">
          <a
            href="/privacy-promise"
            className="font-body text-xs text-gold/70 hover:text-gold transition-colors underline-offset-4 hover:underline"
          >
            Read our Privacy Promise →
          </a>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;
