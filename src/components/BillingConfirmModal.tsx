import { Link } from "react-router-dom";

interface BillingConfirmModalProps {
  price: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  trialEndsAt?: string | null;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric" });

const BillingConfirmModal = ({ price, onConfirm, onCancel, loading, trialEndsAt }: BillingConfirmModalProps) => {
  const onTrial = trialEndsAt && new Date(trialEndsAt) > new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
      <div className="bg-card rounded-sm shadow-xl max-w-sm w-full p-8 border border-border text-center">
        <h3 className="font-serif text-xl tracking-wide mb-4">Confirm your subscription</h3>
        <p className="font-body text-sm text-foreground/80 leading-relaxed mb-6">
          {onTrial ? (
            <>
              Your separate free trial ends <span className="text-gold font-serif">{formatDate(trialEndsAt!)}</span>.
              This paid plan is <span className="text-gold font-serif">{price}</span>; check the payment page for when its first charge begins. To cancel a web plan, email support@dabarbible.com.
            </>
          ) : (
            <>
              You'll be charged <span className="text-gold font-serif">{price}</span>, starting today.
              To cancel a web plan, email support@dabarbible.com. It renews automatically at the selected interval until cancelled.
            </>
          )}
        </p>
        <p className="font-body text-xs text-muted-foreground mb-4"><Link to="/terms" className="text-gold underline">Terms of Use</Link> · <Link to="/privacy" className="text-gold underline">Privacy Policy</Link></p>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="w-full font-serif text-sm tracking-widest uppercase py-3 bg-gold text-primary-foreground rounded-sm transition-all hover:bg-gold-dark disabled:opacity-50 mb-3"
        >
          {loading ? "…" : onTrial ? "Continue my practice" : "Confirm and pay"}
        </button>
        <button
          onClick={onCancel}
          className="w-full font-body text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default BillingConfirmModal;
