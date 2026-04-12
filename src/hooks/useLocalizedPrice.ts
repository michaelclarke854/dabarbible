import { useState, useEffect, useCallback } from "react";

const USD_PRICES: Record<string, { monthly?: number; annual?: number; studentMonthly?: number }> = {
  personal: { monthly: 6.99, annual: 59.99, studentMonthly: 4.99 },
  family: { monthly: 12.99, annual: 99.99 },
  community: { monthly: 99 },
  gift: { annual: 59.99 },
};

const REGION_TO_CURRENCY: Record<string, string> = {
  US: "USD", GB: "GBP", AU: "AUD", CA: "CAD",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", IE: "EUR", AT: "EUR", BE: "EUR", PT: "EUR", FI: "EUR",
  NG: "NGN", GH: "GHS", KE: "KES", ZA: "ZAR",
  IN: "INR", PH: "PHP", SG: "SGD", MY: "MYR",
  BR: "BRL", MX: "MXN", JP: "JPY", KR: "KRW",
  NZ: "NZD", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK",
};

export const useLocalizedPrice = () => {
  const [currency, setCurrency] = useState("USD");
  const [rate, setRate] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const detect = async () => {
      try {
        const locale = navigator.language || "en-US";
        const region = new Intl.Locale(locale).maximize().region ?? "US";
        const detected = REGION_TO_CURRENCY[region] ?? "USD";

        if (detected === "USD") {
          setLoading(false);
          return;
        }

        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        if (!res.ok) throw new Error("fetch failed");
        const { rates } = await res.json();
        const r: number = rates[detected] ?? 1;

        setCurrency(detected);
        setRate(r);
      } catch {
        // Silent fallback to USD
      } finally {
        setLoading(false);
      }
    };
    detect();
  }, []);

  const formatPrice = useCallback(
    (usdAmount: number): string => {
      const converted = usdAmount * rate;
      return new Intl.NumberFormat(navigator.language, {
        style: "currency",
        currency,
        maximumFractionDigits: currency === "JPY" || currency === "KRW" ? 0 : 2,
      }).format(converted);
    },
    [currency, rate]
  );

  const formatPlanPrice = useCallback(
    (planKey: string, cycle: "monthly" | "annual" | "studentMonthly" = "monthly"): string => {
      const plan = USD_PRICES[planKey];
      if (!plan) return "";
      let usd: number;
      if (cycle === "annual" && plan.annual) usd = plan.annual;
      else if (cycle === "studentMonthly" && plan.studentMonthly) usd = plan.studentMonthly;
      else usd = plan.monthly;
      return formatPrice(usd);
    },
    [formatPrice]
  );

  return { formatPrice, formatPlanPrice, currency, loading, isNonUSD: currency !== "USD" };
};
