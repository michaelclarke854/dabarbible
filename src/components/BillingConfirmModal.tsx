interface BillingConfirmModalProps {
  price: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const BillingConfirmModal = ({ price, onConfirm, onCancel, loading }: BillingConfirmModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
    <div className="bg-card rounded-sm shadow-xl max-w-sm w-full p-8 border border-border text-center">
      <h3 className="font-serif text-xl tracking-wide mb-4">Confirm your subscription</h3>
      <p className="font-body text-sm text-foreground/80 leading-relaxed mb-6">
        You'll be charged <span className="text-gold font-serif">{price}</span>, starting today.
        You can cancel any time from Settings. No hidden fees.
      </p>
      <button
        onClick={onConfirm}
        disabled={loading}
        className="w-full font-serif text-sm tracking-widest uppercase py-3 bg-gold text-primary-foreground rounded-sm transition-all hover:bg-gold-dark disabled:opacity-50 mb-3"
      >
        {loading ? "…" : "Confirm and pay"}
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

export default BillingConfirmModal;
