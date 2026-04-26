import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type PriceEntry = { amount: number; currency: string; formatted: string };
type Prices = Record<string, PriceEntry>;

const CACHE_KEY = "dabar_localized_prices_v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

type CachedPayload = {
  prices: Prices;
  currency: string;
  canOverride: boolean;
  cachedAt: number;
};

const readCache = (): CachedPayload | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload;
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (payload: Omit<CachedPayload, "cachedAt">) => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...payload, cachedAt: Date.now() })
    );
  } catch {
    /* quota or disabled */
  }
};

export const useLocalizedPrice = () => {
  const cached = typeof window !== "undefined" ? readCache() : null;
  const [prices, setPrices] = useState<Prices | null>(cached?.prices ?? null);
  const [currency, setCurrency] = useState(cached?.currency ?? "usd");
  const [canOverride, setCanOverride] = useState(cached?.canOverride ?? false);
  const [loading, setLoading] = useState(!cached);

  const fetchPrices = async (force = false) => {
    if (!force && readCache()) {
      // Already hydrated from cache; revalidate silently in background
    } else {
      setLoading(true);
    }
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
      writeCache({
        prices: data.prices,
        currency: data.currency,
        canOverride: data.canOverride,
      });
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

  const getPriceEntry = (plan: string): PriceEntry | null =>
    prices?.[plan] ?? null;

  const ZERO_DECIMAL = new Set([
    "jpy", "krw", "vnd", "idr", "clp", "gnf", "mga", "pyg", "rwf", "ugx", "xaf", "xof",
  ]);

  const formatAmount = (amountMinor: number, currencyCode: string): string => {
    const cur = currencyCode.toLowerCase();
    const isZero = ZERO_DECIMAL.has(cur);
    const amount = isZero ? amountMinor : amountMinor / 100;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: cur.toUpperCase(),
        maximumFractionDigits: isZero ? 0 : 2,
      }).format(amount);
    } catch {
      return `${amount}`;
    }
  };

  const saveCurrencyPreference = async (newCurrency: string) => {
    localStorage.setItem("dabar_preferred_currency", newCurrency);
    localStorage.removeItem(CACHE_KEY);
    try {
      await supabase.functions.invoke("save-currency-preference", {
        body: { currency: newCurrency },
      });
    } catch {
      // Not authenticated — localStorage covers anonymous
    }
    await fetchPrices(true);
  };

  return { formatPrice, getPriceEntry, formatAmount, currency, canOverride, loading, saveCurrencyPreference };
};
