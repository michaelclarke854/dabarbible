import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type PriceEntry = { amount: number; currency: string; formatted: string };
type Prices = Record<string, PriceEntry>;

export const useLocalizedPrice = () => {
  const [prices, setPrices] = useState<Prices | null>(null);
  const [currency, setCurrency] = useState("usd");
  const [canOverride, setCanOverride] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "get-localized-pricing",
        {
          body: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }
      );
      if (error) throw error;
      setPrices(data.prices);
      setCurrency(data.currency);
      setCanOverride(data.canOverride);
    } catch {
      // Silent fallback — USD
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const formatPrice = (plan: string): string =>
    prices?.[plan]?.formatted ?? "—";

  const saveCurrencyPreference = async (newCurrency: string) => {
    localStorage.setItem("dabar_preferred_currency", newCurrency);
    try {
      await supabase.functions.invoke("save-currency-preference", {
        body: { currency: newCurrency },
      });
    } catch {
      // Not authenticated — localStorage covers anonymous
    }
    await fetchPrices();
  };

  return { formatPrice, currency, canOverride, loading, saveCurrencyPreference };
};
