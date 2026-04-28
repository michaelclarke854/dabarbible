import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { verifySvixSignature } from "../_shared/verify-svix.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-signature, svix-timestamp",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Read raw body once — required for signature verification AND parsing
  const rawBody = await req.text();

  // Verify Svix signature (Resend webhooks). Fails closed if secret missing.
  const verification = await verifySvixSignature(req, rawBody);
  if (!verification.ok) {
    console.warn(
      `[outreach-resend-webhook] Rejected: ${verification.reason}`,
    );
    return new Response(verification.reason, {
      status: verification.status,
      headers: corsHeaders,
    });
  }

  let event: Record<string, any>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const type: string = event.type ?? "";
  const data = event.data ?? {};
  const resendId: string | undefined = data.email_id ?? data.message_id ?? data.id;

  if (!resendId) {
    return new Response("No message ID", { status: 400, headers: corsHeaders });
  }

  const now = new Date().toISOString();
  const statusMap: Record<string, string> = {
    "email.delivered": "delivered",
    "email.opened": "opened",
    "email.clicked": "clicked",
    "email.bounced": "bounced",
    "email.complained": "bounced",
  };

  const newStatus = statusMap[type];
  if (!newStatus) {
    return new Response("Unknown event type", { status: 200, headers: corsHeaders });
  }

  const updateData: Record<string, string> = { status: newStatus };
  if (type === "email.delivered") updateData.delivered_at = now;
  if (type === "email.opened") updateData.opened_at = now;
  if (type === "email.clicked") updateData.clicked_at = now;

  await supabase
    .from("outreach_email_log")
    .update(updateData)
    .eq("resend_id", resendId);

  if (type === "email.bounced" || type === "email.complained") {
    const { data: logRow } = await supabase
      .from("outreach_email_log")
      .select("lead_id")
      .eq("resend_id", resendId)
      .maybeSingle();

    if (logRow?.lead_id) {
      await supabase
        .from("pastor_leads")
        .update({ status: "bounced", suppressed: true })
        .eq("id", logRow.lead_id);
    }
  }

  return new Response("OK", { status: 200, headers: corsHeaders });
});