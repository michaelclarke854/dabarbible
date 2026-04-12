import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_CURRENCIES = [
  "usd", "gbp", "eur", "aud", "cad", "nzd", "ngn", "ghs", "kes", "zar", "tzs",
  "inr", "php", "sgd", "myr", "idr", "brl", "mxn", "cop", "clp", "jpy", "krw",
  "chf", "sek", "nok", "dkk", "pln", "huf", "ron", "czk", "aed", "try", "hkd",
];

serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, authorization, x-client-info, apikey",
  };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401, headers: cors });

  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
  if (authError || !user) return new Response("Unauthorized", { status: 401, headers: cors });

  const { currency } = await req.json().catch(() => ({ currency: null }));
  if (!currency || !ALLOWED_CURRENCIES.includes(currency.toLowerCase())) {
    return new Response("Invalid currency", { status: 400, headers: cors });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ preferred_currency: currency.toLowerCase() })
    .eq("user_id", user.id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
