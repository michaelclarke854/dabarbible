import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Shield, AlertTriangle, Trash2, BookOpen, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { formatTimestamp } from "@/utils/formatTimestamp";

// ─── Journal Stats (no content, counts only) ────────────
function JournalStatsSection({ userId, callerRole }: { userId: string; callerRole: string }) {
  const [stats, setStats] = useState({ activeReflections: 0, deletedReflections: 0, savedWisdom: 0 });
  const [deletedEntries, setDeletedEntries] = useState<any[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Count active reflections
      const { count: activeCount } = await supabase
        .from("reflection_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("deleted_at", null);

      // Count deleted reflections
      const { count: deletedCount } = await supabase
        .from("reflection_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("deleted_at", "is", null);

      // Count saved wisdom
      const { count: wisdomCount } = await supabase
        .from("wisdom_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("saved_to_journal", true);

      setStats({
        activeReflections: activeCount || 0,
        deletedReflections: deletedCount || 0,
        savedWisdom: wisdomCount || 0,
      });
    })();
  }, [userId]);

  const loadDeletedEntries = async () => {
    if (showDeleted) { setShowDeleted(false); return; }
    const { data } = await supabase
      .from("reflection_entries")
      .select("id, created_at, deleted_at, body")
      .eq("user_id", userId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    // Show metadata only — word count, no content
    setDeletedEntries((data || []).map((e) => ({
      id: e.id,
      created_at: e.created_at,
      deleted_at: e.deleted_at,
      wordCount: (e.body || "").split(/\s+/).filter(Boolean).length,
      canRestore: new Date().getTime() - new Date(e.deleted_at!).getTime() < 30 * 24 * 60 * 60 * 1000,
    })));
    setShowDeleted(true);
  };

  const restoreEntry = async (entryId: string) => {
    setRestoring(entryId);
    await supabase
      .from("reflection_entries")
      .update({ deleted_at: null } as any)
      .eq("id", entryId);
    setDeletedEntries((prev) => prev.filter((e) => e.id !== entryId));
    setStats((prev) => ({
      ...prev,
      activeReflections: prev.activeReflections + 1,
      deletedReflections: prev.deletedReflections - 1,
    }));
    toast.success("Entry restored");
    setRestoring(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen size={14} className="text-gold" />
        <span className="font-serif text-xs text-gold uppercase tracking-widest">Journal</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <span className="text-muted-foreground">Reflections</span>
        <span className="text-foreground">{stats.activeReflections} active, {stats.deletedReflections} deleted</span>
        <span className="text-muted-foreground">Saved wisdom</span>
        <span className="text-foreground">{stats.savedWisdom}</span>
      </div>

      {stats.deletedReflections > 0 && (
        <button
          onClick={loadDeletedEntries}
          className="text-gold text-xs hover:text-gold-light transition-colors"
        >
          {showDeleted ? "Hide deleted entries" : "View deleted entries"}
        </button>
      )}

      {showDeleted && deletedEntries.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {deletedEntries.map((e) => (
            <div key={e.id} className="bg-secondary/50 rounded-sm p-3 text-xs space-y-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-muted-foreground">Created {formatTimestamp(e.created_at)}</p>
                  <p className="text-muted-foreground">Deleted {formatTimestamp(e.deleted_at)}</p>
                  <p className="text-muted-foreground">{e.wordCount} words</p>
                </div>
                {e.canRestore ? (
                  <button
                    onClick={() => restoreEntry(e.id)}
                    disabled={restoring === e.id}
                    className="text-gold text-xs hover:text-gold-light transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <RotateCcw size={12} />
                    Restore
                  </button>
                ) : (
                  <span className="text-destructive/60 text-xs italic">Permanently deleted</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface UserEditDrawerProps {
  userId: string;
  callerRole: string;
  onClose: () => void;
  onUpdated: () => void;
}

export default function UserEditDrawer({ userId, callerRole, onClose, onUpdated }: UserEditDrawerProps) {
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [betaNote, setBetaNote] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: h }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("role_change_log").select("*").eq("target_user_id", userId).order("changed_at", { ascending: false }),
      ]);
      setProfile(p);
      setHistory(h || []);
      setSelectedRole(p?.role || "free");
      setLoading(false);
    })();
  }, [userId]);

  const callUpdateRole = async (body: Record<string, any>) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-user-role", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("User updated.");
      onUpdated();
      // Refresh
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
      const { data: h } = await supabase.from("role_change_log").select("*").eq("target_user_id", userId).order("changed_at", { ascending: false });
      setProfile(p);
      setHistory(h || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to update user.");
    } finally {
      setProcessing(false);
    }
  };

  const isSuperAdmin = callerRole === "super_admin";
  const roleOptions = [
    "free", "personal", "family_owner", "family_member",
    "community_admin", "community_member", "beta", "admin",
  ];

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 w-96 bg-card border-l border-border z-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-card border-l border-border z-50 overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
        <h3 className="font-serif text-gold text-sm uppercase tracking-widest">User Details</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={18} />
        </button>
      </div>

      <div className="px-6 py-4 space-y-6">
        {/* Section A — User Summary */}
        <div className="space-y-3">
          <p className="font-serif text-xs text-gold uppercase tracking-widest">Summary</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">User ID</span>
            <span className="text-foreground font-mono text-xs">{userId.slice(0, 12)}…</span>
            <span className="text-muted-foreground">Age Group</span>
            <span className="text-foreground">{profile?.age_group || "—"}</span>
            <span className="text-muted-foreground">Role</span>
            <span className="text-gold font-serif uppercase text-xs">{profile?.role}</span>
            <span className="text-muted-foreground">Plan</span>
            <span className="text-gold font-serif uppercase text-xs">{profile?.plan}</span>
            <span className="text-muted-foreground">Status</span>
            <span className={`text-xs ${profile?.is_suspended ? "text-destructive" : "text-green-500"}`}>
              {profile?.is_suspended ? "Suspended" : "Active"}
            </span>
            <span className="text-muted-foreground">Joined</span>
            <span className="text-foreground text-xs">{new Date(profile?.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Section B — Beta Access */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-serif text-xs text-gold uppercase tracking-widest">Beta Access</span>
            <span className="text-xs px-2 py-0.5 rounded bg-gold/10 text-gold font-serif">β</span>
          </div>

          {profile?.role === "beta" ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs">
                Granted {profile.beta_granted_at ? new Date(profile.beta_granted_at).toLocaleDateString() : "—"}
                {profile.beta_notes && ` — "${profile.beta_notes}"`}
              </p>
              <button
                onClick={() => callUpdateRole({ target_user_id: userId, new_role: "free", notes: "Beta revoked" })}
                disabled={processing}
                className="text-destructive text-xs hover:underline disabled:opacity-50"
              >
                Revoke Beta Access
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs leading-relaxed">
                Grants full Personal plan features for testing. No billing required. User receives a feedback button.
              </p>
              <input
                placeholder="Reason for grant (optional)"
                value={betaNote}
                onChange={(e) => setBetaNote(e.target.value)}
                className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground"
              />
              <button
                onClick={() => callUpdateRole({ target_user_id: userId, new_role: "beta", notes: betaNote })}
                disabled={processing}
                className="bg-gold text-primary-foreground font-serif text-xs uppercase tracking-widest px-4 py-2 rounded-sm hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                Grant Beta Access
              </button>
            </div>
          )}
        </div>

        {/* Section C — Role Change (super_admin only) */}
        {isSuperAdmin && (
          <>
            <div className="h-px bg-border" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-gold" />
                <span className="font-serif text-xs text-gold uppercase tracking-widest">Change Role</span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Warning: This overrides billing alignment. The user's subscription plan remains unchanged.
              </p>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-foreground"
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button
                onClick={() => callUpdateRole({ target_user_id: userId, new_role: selectedRole })}
                disabled={processing || selectedRole === profile?.role}
                className="bg-gold text-primary-foreground font-serif text-xs uppercase tracking-widest px-4 py-2 rounded-sm hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                Apply Role
              </button>
            </div>
          </>
        )}

        {/* Section D — Journal Stats (no content shown) */}
        <div className="h-px bg-border" />
        <JournalStatsSection userId={userId} callerRole={callerRole} />

        {/* Section E — Role History */}
        <div className="h-px bg-border" />
        <div className="space-y-3">
          <p className="font-serif text-xs text-gold uppercase tracking-widest">Role History</p>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-xs italic">No role changes recorded.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.map((h) => (
                <div key={h.id} className="bg-secondary/50 rounded-sm p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-foreground">{h.old_role} → <span className="text-gold">{h.new_role}</span></span>
                    <span className="text-muted-foreground">{new Date(h.changed_at).toLocaleDateString()}</span>
                  </div>
                  {h.notes && <p className="text-muted-foreground italic">{h.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section E — Danger Zone (super_admin only) */}
        {isSuperAdmin && profile?.role !== "super_admin" && (
          <>
            <div className="h-px bg-border" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-destructive" />
                <span className="font-serif text-xs text-destructive uppercase tracking-widest">Danger Zone</span>
              </div>

              {!profile?.is_suspended ? (
                <button
                  onClick={() => callUpdateRole({ target_user_id: userId, action: "suspend", notes: "Suspended by admin" })}
                  disabled={processing}
                  className="w-full border border-destructive/30 text-destructive text-xs py-2 rounded-sm hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  Suspend Account
                </button>
              ) : (
                <button
                  onClick={() => callUpdateRole({ target_user_id: userId, action: "unsuspend" })}
                  disabled={processing}
                  className="w-full border border-gold/30 text-gold text-xs py-2 rounded-sm hover:bg-gold/10 transition-colors disabled:opacity-50"
                >
                  Unsuspend Account
                </button>
              )}

              <div className="space-y-2 mt-4">
                <p className="text-muted-foreground text-xs">Type DELETE to permanently remove this user:</p>
                <input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="w-full bg-input border border-destructive/30 rounded-sm px-3 py-2 text-xs text-foreground"
                  placeholder="DELETE"
                />
                <button
                  onClick={() => callUpdateRole({ target_user_id: userId, action: "delete" })}
                  disabled={processing || deleteConfirm !== "DELETE"}
                  className="w-full bg-destructive text-destructive-foreground text-xs py-2 rounded-sm hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  Delete Permanently
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
