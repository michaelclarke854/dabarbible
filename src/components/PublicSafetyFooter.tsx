import KjvIntegrityBadge from "@/components/KjvIntegrityBadge";

/**
 * Shared safety block rendered at the foot of every public scripture and
 * question page. A search visitor arrives with no onboarding, so crisis
 * routing and the "not pastoral counsel" framing must be present on the page
 * itself.
 */
export function PublicSafetyFooter({ className = "" }: { className?: string }) {
  return (
    <section
      aria-label="Support and framing"
      className={`w-full mt-12 pt-8 border-t border-gold/15 ${className}`}
    >
      <p className="font-body text-[11px] tracking-[0.25em] uppercase text-gold/80 mb-3">
        If you are in crisis
      </p>
      <p className="font-body text-sm leading-relaxed text-muted-foreground">
        If you are thinking about harming yourself, please reach a person now.
        Call or text{" "}
        <a
          href="tel:988"
          className="text-gold underline underline-offset-4 hover:text-gold/80"
        >
          988
        </a>{" "}
        (Suicide &amp; Crisis Lifeline, US), or text{" "}
        <a
          href="sms:741741&body=HOME"
          className="text-gold underline underline-offset-4 hover:text-gold/80"
        >
          HOME to 741741
        </a>{" "}
        (Crisis Text Line). Scripture can sit alongside that help — it is not a
        substitute for it.
      </p>

      <p className="font-body text-sm leading-relaxed text-muted-foreground mt-4">
        This page is not pastoral counsel, and it is not medical, legal or
        financial advice. For those, please speak with your pastor, your doctor
        or a qualified professional.
      </p>

      <div className="mt-5">
        <KjvIntegrityBadge variant="seal" />
      </div>
    </section>
  );
}

export default PublicSafetyFooter;
