import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CrisisCheckinCardProps {
  userId: string;
  onDismiss: () => void;
}

const CrisisCheckinCard = ({ userId, onDismiss }: CrisisCheckinCardProps) => {
  const [showResources, setShowResources] = useState(false);

  const dismiss = async () => {
    await supabase
      .from("profiles")
      .update({ pending_checkin: false } as any)
      .eq("user_id", userId);
    onDismiss();
  };

  const handleBetter = () => dismiss();

  const handleStillStruggling = async () => {
    setShowResources(true);
    await supabase
      .from("profiles")
      .update({ pending_checkin: false } as any)
      .eq("user_id", userId);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-6 py-8 animate-fade-in">
      <div className="bg-card border border-gold/20 rounded-sm p-6 space-y-5">
        <p className="font-serif text-lg text-foreground leading-relaxed">
          Last time you were here, it seemed like you were carrying something heavy.
        </p>
        <p className="font-serif text-base text-muted-foreground">
          How are you doing today?
        </p>

        {!showResources ? (
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={handleBetter}
              className="font-serif text-sm tracking-widest uppercase py-3 bg-gold text-primary-foreground rounded-sm hover:bg-gold-dark transition-all"
            >
              I'm doing better
            </button>
            <button
              onClick={handleStillStruggling}
              className="font-body text-sm tracking-wide py-3 border border-gold/30 text-gold rounded-sm hover:bg-gold/5 transition-all"
            >
              I'm still struggling
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="border-l-2 border-amber-500/60 pl-4 py-3 bg-amber-500/5 rounded-sm">
              <p className="font-serif text-base text-foreground leading-relaxed mb-3">
                You don't have to carry this alone.
              </p>
              <ul className="space-y-2 font-body text-sm text-foreground">
                <li>• <strong>988 Suicide & Crisis Lifeline</strong> — call or text 988</li>
                <li>• <strong>Crisis Text Line</strong> — text HOME to 741741</li>
                <li>• You matter. Help is available right now.</li>
              </ul>
            </div>
            <button
              onClick={() => { setShowResources(false); onDismiss(); }}
              className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Continue →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrisisCheckinCard;
