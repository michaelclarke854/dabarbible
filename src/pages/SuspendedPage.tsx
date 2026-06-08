import { Helmet } from "react-helmet-async";

const SuspendedPage = () => (
  <>
    <Helmet>
      <title>Account Suspended — Dabar Bible</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
    <h1 className="font-serif text-5xl text-gold tracking-[0.25em]">DABAR</h1>
    <p className="text-gold font-serif text-lg tracking-wider mt-2">דָּבָר</p>
    <div className="w-12 h-px bg-gold mt-6 mb-8" />
    <p className="font-serif text-2xl text-foreground">Your account has been paused.</p>
    <p className="font-body text-sm text-muted-foreground mt-4 max-w-sm leading-relaxed">
      If you believe this is an error, please contact{" "}
      <a href="mailto:support@dabarbible.com" className="text-gold hover:text-gold-light transition-colors">
        support@dabarbible.com
      </a>
    </p>
  </div>
  </>
);

export default SuspendedPage;
