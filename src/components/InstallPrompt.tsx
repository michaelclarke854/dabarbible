import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

const DISMISSED_KEY = "dabar_install_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPrompt = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // Skip if already installed (running in standalone mode)
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      // Wait 30 seconds before surfacing
      setTimeout(() => setVisible(true), 30_000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    setDeferred(null);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  if (!visible || !deferred) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-40 animate-fade-in-up">
      <div className="bg-scripture-card border border-gold/30 rounded-sm shadow-[0_0_24px_rgba(196,151,58,0.15)] p-4 flex items-center gap-3">
        <Download size={16} className="text-gold flex-shrink-0" />
        <p className="flex-1 font-body text-xs text-foreground/90 leading-snug">
          Add Dabar to your home screen for instant access.
        </p>
        <button
          onClick={handleInstall}
          className="font-body text-xs uppercase tracking-wider px-3 py-1.5 bg-gold text-primary-foreground rounded-sm hover:bg-gold-dark transition-colors"
        >
          Add
        </button>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
