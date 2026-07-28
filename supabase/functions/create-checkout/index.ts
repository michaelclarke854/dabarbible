const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-dabar-native-ios, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BILLING_ENDPOINT =
  "https://xlwzvfsnnnrcgfmgkqkr.supabase.co/functions/v1/create-checkout-session";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const secret = Deno.env.get("BILLING_SHARED_SECRET");
  if (!secret) {
    return json(
      { error: "BILLING_SHARED_SECRET is not configured for this project." },
      500,
    );
  }

  let body: { plan_id?: unknown; customer_email?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const plan_id = typeof body.plan_id === "string" ? body.plan_id.trim() : "";
  const customer_email =
    typeof body.customer_email === "string" ? body.customer_email.trim() : "";

  if (!plan_id) return json({ error: "plan_id is required" }, 400);
  if (!customer_email) return json({ error: "customer_email is required" }, 400);

  try {
    const upstream = await fetch(BILLING_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-billing-secret": secret,
      },
      body: JSON.stringify({ app_key: "dabarbible", plan_id, customer_email }),
    });

    const text = await upstream.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text || "Billing service returned an empty response." };
    }

    return json(payload, upstream.status);
  } catch (e) {
    console.error("create-checkout proxy error:", e);
    return json(
      { error: e instanceof Error ? e.message : "Billing service unreachable" },
      502,
    );
  }
});
