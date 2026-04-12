import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    refreshProfile();
    const timer = setTimeout(() => navigate("/"), 3000);
    return () => clearTimeout(timer);
  }, [refreshProfile, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-4xl text-gold tracking-[0.2em] mb-4">DABAR</h1>
      <p className="text-gold font-serif text-sm tracking-wider mb-8">דָּבָר</p>
      <div className="w-10 h-px bg-gold mb-8" />
      <p className="font-serif text-2xl text-foreground mb-4">Payment confirmed.</p>
      <p className="font-body text-sm text-muted-foreground">
        Your practice continues. Redirecting…
      </p>
    </div>
  );
};

export default PaymentSuccessPage;
