import { useEffect, useState } from "react";
import { Fingerprint, X } from "lucide-react";
import { toast } from "sonner";
import { usePasskey } from "@/hooks/usePasskey";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Subtle, dismissible banner inviting the user to enable Face ID / Touch ID
 * after sign-in. Appears once per user (until enrolled or dismissed) and only
 * when the device actually supports WebAuthn.
 */
export function PasskeyEnrollPrompt() {
  const { user } = useAuth();
  const { isSupported, enrollPasskey } = usePasskey();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const enrolledKey = user ? `dabar_passkey_enrolled_${user.id}` : "";
  const dismissedKey = user ? `dabar_passkey_prompt_dismissed_${user.id}` : "";

  useEffect(() => {
    if (!user || !isSupported) return;
    try {
      if (localStorage.getItem(enrolledKey)) return;
      if (localStorage.getItem(dismissedKey)) return;
    } catch {
      return;
    }
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [user, isSupported, enrolledKey, dismissedKey]);

  if (!user || !isSupported || !visible) return null;

  const handleEnable = async () => {
    setLoading(true);
    const result = await enrollPasskey(navigator.platform || undefined);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    try { localStorage.setItem(enrolledKey, "1"); } catch {}
    toast.success("Face ID enabled. Next time, sign in with a glance.");
    setVisible(false);
  };

  const handleDismiss = () => {
    try { localStorage.setItem(dismissedKey, "1"); } catch {}
    setVisible(false);
  };

  return (
    <div className="mx-4 mt-3 mb-2 relative rounded-sm border border-gold/30 bg-gold/5 px-4 py-3 flex items-center gap-3">
      <Fingerprint size={18} className="text-gold shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-serif text-sm text-foreground leading-snug">
          Sign in faster with Face ID
        </p>
        <p className="font-body text-xs text-muted-foreground leading-snug mt-0.5">
          Skip the password next time on this device.
        </p>
      </div>
      <button
        type="button"
        onClick={handleEnable}
        disabled={loading}
        className="font-serif text-[11px] tracking-widest uppercase px-3 py-2 rounded-sm bg-gold text-primary-foreground hover:bg-gold-dark transition-colors disabled:opacity-50"
      >
        {loading ? "…" : "Enable"}
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default PasskeyEnrollPrompt;