import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-5xl text-gold tracking-[0.25em]">DABAR</h1>
      <p className="text-gold font-serif text-lg tracking-wider mt-2">דָּבָר</p>
      <div className="w-12 h-px bg-gold mt-6 mb-8" />
      <p className="font-serif text-2xl text-foreground">This path does not lead here.</p>
      <p className="font-body text-sm text-muted-foreground mt-4 max-w-sm leading-relaxed">
        The page you are looking for does not exist.
      </p>
      <Link
        to="/"
        className="mt-8 font-serif tracking-widest text-sm uppercase px-8 py-3 border border-gold text-gold rounded-sm hover:bg-gold hover:text-primary-foreground transition-all"
      >
        Return to Dabar
      </Link>
    </div>
  );
};

export default NotFound;
