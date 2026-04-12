import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    setStatus("loading");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("success");
      setTimeout(() => navigate("/"), 2000);
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-4xl text-gold tracking-[0.2em] mb-4">DABAR</h1>
        <p className="font-serif text-xl text-foreground mb-2">Password updated successfully.</p>
        <p className="font-body text-sm text-muted-foreground">Redirecting you back to the app…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-4xl text-gold tracking-[0.2em] text-center mb-2">DABAR</h1>
        <p className="text-gold font-serif text-sm tracking-wider text-center mb-8">דָּבָר</p>

        <h2 className="font-serif text-xl text-foreground text-center mb-6">Set a new password</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            required
            minLength={8}
            className="w-full bg-transparent border-b border-border pb-2 text-sm font-body outline-none focus:border-gold transition-colors"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            required
            minLength={8}
            className="w-full bg-transparent border-b border-border pb-2 text-sm font-body outline-none focus:border-gold transition-colors"
          />
          {errorMsg && (
            <p className="text-xs text-destructive font-body">{errorMsg}</p>
          )}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full font-serif text-sm tracking-widest uppercase py-3 bg-gold text-primary-foreground rounded-sm transition-all hover:bg-gold-dark disabled:opacity-50"
          >
            {status === "loading" ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
