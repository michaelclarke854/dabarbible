import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const USD_PRICES_CENTS: Record<string, number> = {
  personal: 699,
  family: 1299,
  community: 9900,
};

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "usd", GB: "gbp", AU: "aud", CA: "cad", NZ: "nzd",
  DE: "eur", FR: "eur", IT: "eur", ES: "eur", NL: "eur",
  PT: "eur", BE: "eur", AT: "eur", IE: "eur", FI: "eur",
  GR: "eur", LU: "eur", CY: "eur", MT: "eur", SK: "eur",
  NG: "ngn", GH: "ghs", KE: "kes", ZA: "zar", TZ: "tzs",
  UG: "ugx", RW: "rwf", ET: "etb", CM: "xaf", CI: "xof",
  IN: "inr", PH: "php", SG: "sgd", MY: "myr", ID: "idr",
  BR: "brl", MX: "mxn", CO: "cop", CL: "clp", PE: "pen",
  JP: "jpy", KR: "krw", CH: "chf", SE: "sek", NO: "nok",
  DK: "dkk", PL: "pln", HU: "huf", RO: "ron", CZ: "czk",
  AE: "aed", SA: "sar", EG: "egp", IL: "ils", TR: "try",
  HK: "hkd", TH: "thb", VN: "vnd", UA: "uah", ZM: "zmw",
};

const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  "America/New_York": "US", "America/Chicago": "US", "America/Los_Angeles": "US",
  "America/Denver": "US", "America/Phoenix": "US", "America/Anchorage": "US",
  "Pacific/Honolulu": "US",
  "Europe/London": "GB", "Europe/Berlin": "DE", "Europe/Paris": "FR",
  "Europe/Amsterdam": "NL", "Europe/Rome": "IT", "Europe/Madrid": "ES",
  "Europe/Lisbon": "PT", "Europe/Brussels": "BE", "Europe/Vienna": "AT",
  "Europe/Dublin": "IE", "Europe/Helsinki": "FI", "Europe/Athens": "GR",
  "Africa/Lagos": "NG", "Africa/Accra": "GH", "Africa/Nairobi": "KE",
  "Africa/Johannesburg": "ZA", "Africa/Dar_es_Salaam": "TZ",
  "Africa/Kampala": "UG", "Africa/Kigali": "RW", "Africa/Addis_Ababa": "ET",
  "Asia/Kolkata": "IN", "Asia/Manila": "PH", "Asia/Singapore": "SG",
  "Asia/Kuala_Lumpur": "MY", "Asia/Jakarta": "ID",
  "America/Sao_Paulo": "BR", "America/Mexico_City": "MX",
  "America/Bogota": "CO", "America/Santiago": "CL", "America/Lima": "PE",
  "Asia/Tokyo": "JP", "Asia/Seoul": "KR",
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Winnipeg": "CA",
  "Europe/Zurich": "CH", "Europe/Stockholm": "SE", "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK", "Europe/Warsaw": "PL", "Europe/Budapest": "HU",
  "Europe/Bucharest": "RO", "Europe/Prague": "CZ",
  "Asia/Dubai": "AE", "Asia/Riyadh": "SA", "Africa/Cairo": "EG",
  "Asia/Jerusalem": "IL", "Europe/Istanbul": "TR",
  "Asia/Hong_Kong": "HK", "Asia/Bangkok": "TH", "Asia/Ho_Chi_Minh": "VN",
  "Europe/Kiev": "UA", "Africa/Lusaka": "ZM",
};

const ZERO_DECIMAL = new Set([
  "jpy", "krw", "vnd", "idr", "clp", "gnf", "mga", "pyg", "rwf", "ugx", "xaf", "xof",
]);

function formatCurrency(amountMinor: number, currency: string): string {
  const amount = ZERO_DECIMAL.has(currency) ? amountMinor : amountMinor / 100;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: ZERO_DECIMAL.has(currency) ? 0 : 2,
  }).format(amount);
}

serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, authorization, x-client-info, apikey",
  };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // Signal 1: saved user preference
  let savedCurrency: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    try {
      const sb = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        const { data: p } = await sb
          .from("profiles")
          .select("preferred_currency")
          .eq("user_id", user.id)
          .single();
        savedCurrency = (p as any)?.preferred_currency ?? null;
      }
    } catch { /* not authenticated */ }
  }

  // Signal 2: CF-IPCountry
  const cfCountry = req.headers.get("cf-ipcountry");
  const ipCountry = cfCountry && cfCountry !== "XX" ? cfCountry : null;

  // Signal 3: client timezone
  const body = await req.json().catch(() => ({}));
  const clientTimezone: string | null = body.timezone ?? null;
  const timezoneCountry = clientTimezone
    ? TIMEZONE_TO_COUNTRY[clientTimezone] ?? null
    : null;

  // Resolve priority
  let currency: string;
  let method: string;

  if (savedCurrency) {
    currency = savedCurrency.toLowerCase();
    method = "user_preference";
  } else if (ipCountry && timezoneCountry && ipCountry === timezoneCountry) {
    currency = COUNTRY_TO_CURRENCY[ipCountry] ?? "usd";
    method = "ip_timezone_corroborated";
  } else if (ipCountry && !timezoneCountry) {
    currency = COUNTRY_TO_CURRENCY[ipCountry] ?? "usd";
    method = "ip_only";
  } else if (timezoneCountry) {
    currency = COUNTRY_TO_CURRENCY[timezoneCountry] ?? "usd";
    method = "timezone_only";
  } else {
    currency = "usd";
    method = "fallback";
  }

  const buildUsdPrices = () => {
    const out: Record<string, object> = {};
    for (const [plan, cents] of Object.entries(USD_PRICES_CENTS)) {
      out[plan] = { amount: cents, currency: "usd", formatted: formatCurrency(cents, "usd") };
    }
    return out;
  };

  if (currency === "usd") {
    return new Response(
      JSON.stringify({ prices: buildUsdPrices(), currency: "usd", method, canOverride: !savedCurrency }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  // Try Stripe FX Quotes — falls back to USD if not enabled
  try {
    const fxQuote = await (stripe as any).fx_quotes.create({
      to_currency: "usd",
      from_currencies: [currency],
      lock_duration: "hour",
    });

    const rate = fxQuote.rates?.[currency]?.exchange_rate;
    if (!rate) throw new Error(`No rate for ${currency}`);

    const prices: Record<string, object> = {};
    for (const [plan, usdCents] of Object.entries(USD_PRICES_CENTS)) {
      const localMinor = ZERO_DECIMAL.has(currency)
        ? Math.round((usdCents / 100) / rate)
        : Math.round(((usdCents / 100) / rate) * 100);
      prices[plan] = {
        amount: localMinor,
        currency,
        formatted: formatCurrency(localMinor, currency),
      };
    }

    return new Response(
      JSON.stringify({ prices, currency, method, canOverride: !savedCurrency }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch {
    // FX Quotes not enabled — silent USD fallback
    return new Response(
      JSON.stringify({ prices: buildUsdPrices(), currency: "usd", method: "fx_fallback", canOverride: true }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
