import { useState } from "react";
import { Fingerprint } from "lucide-react";
import { usePasskey } from "@/hooks/usePasskey";

interface Props {
  mode: "login" | "enroll";
  onSuccess?: () => void;
  onError?: (msg: string) => void;
  className?: string;
}

export function PasskeyButton({ mode, onSuccess, onError, className }: Props) {
  const { isSupported, enrollPasskey, signInWithPasskey } = usePasskey();
  const [loading, setLoading] = useState(false);

  if (!isSupported) return null;

  async function handleClick() {
    setLoading(true);
    const result =
      mode === "login"
        ? await signInWithPasskey()
        : await enrollPasskey(navigator.platform || undefined);
    setLoading(false);

    if (result.error) onError?.(result.error);
    else onSuccess?.();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center justify-center gap-2 w-full py-3 px-4 rounded-sm border border-gold/40 text-foreground bg-background hover:bg-gold/10 transition-colors font-body text-sm disabled:opacity-60 disabled:cursor-not-allowed ${className ?? ""}`}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      ) : (
        <Fingerprint size={18} className="text-gold" aria-hidden="true" />
      )}
      {loading
        ? "Verifying…"
        : mode === "login"
          ? "Sign in with Face ID"
          : "Enable Face ID for this device"}
    </button>
  );
}