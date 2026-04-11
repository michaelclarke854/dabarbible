import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

const AuthModal = ({ isOpen, onClose, message }: AuthModalProps) => {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
        onClose();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back.");
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error(error.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-6">
      <div className="bg-parchment rounded-sm shadow-xl max-w-sm w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-lg"
        >
          ×
        </button>

        {message && (
          <p className="font-serif text-sm text-foreground/80 text-center mb-6 leading-relaxed">
            {message}
          </p>
        )}

        <h3 className="font-serif text-xl text-center mb-6 tracking-wide">
          {mode === "signup" ? "Create Account" : "Sign In"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full bg-transparent border-b border-border pb-2 text-sm font-body outline-none focus:border-gold transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="w-full bg-transparent border-b border-border pb-2 text-sm font-body outline-none focus:border-gold transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full font-serif text-sm tracking-widest uppercase py-3 bg-gold text-primary-foreground rounded-sm transition-all hover:bg-gold-dark disabled:opacity-50"
          >
            {loading ? "…" : mode === "signup" ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-body">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full font-body text-sm py-3 border border-border rounded-sm hover:border-gold transition-colors"
        >
          Continue with Google
        </button>

        <p className="text-center mt-6 text-xs font-body text-muted-foreground">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button onClick={() => setMode("signin")} className="text-gold hover:underline">
                Sign in
              </button>
            </>
          ) : (
            <>
              Need an account?{" "}
              <button onClick={() => setMode("signup")} className="text-gold hover:underline">
                Create one
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
