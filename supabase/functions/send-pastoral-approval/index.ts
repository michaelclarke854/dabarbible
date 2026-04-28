import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");

  if (!supabaseUrl || !serviceRoleKey || !resendKey) {
    console.error("FATAL: Missing env vars in send-pastoral-approval");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: { pastor_name: string; email: string; church_name: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { pastor_name, email, church_name } = body;
  if (!pastor_name || !email) {
    return new Response(
      JSON.stringify({ error: "pastor_name and email required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { data: template, error: tplErr } = await supabase
    .from("email_templates")
    .select("subject, body")
    .eq("template_key", "pastoral_access_approved")
    .eq("is_active", true)
    .single();

  if (tplErr || !template) {
    console.error("Approval email template not found:", tplErr);
    return new Response(JSON.stringify({ error: "Template not found" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const firstName = pastor_name.split(" ")[0] ?? pastor_name;
  const apply = (text: string) =>
    text
      .replace(/\{\{pastor_name\}\}/g, pastor_name)
      .replace(/\{\{first_name\}\}/g, firstName)
      .replace(/\{\{church_name\}\}/g, church_name ?? "your church");

  const subject = apply(template.subject);
  const emailBody = apply(template.body);

  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Mike at DABAR <mike@dabarbible.com>",
      to: email,
      subject,
      text: emailBody,
      headers: {
        "List-Unsubscribe":
          "<mailto:unsubscribe@dabarbible.com?subject=unsubscribe>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });

  if (!sendRes.ok) {
    const err = await sendRes.text();
    console.error("Resend approval email failed:", err);
    return new Response(JSON.stringify({ error: "Email send failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sendData = await sendRes.json().catch(() => ({}));

  // Log to email_send_log for the dashboard
  await supabase.from("email_send_log").insert({
    template_name: "pastoral_access_approved",
    recipient_email: email,
    status: "sent",
    message_id: sendData.id ?? null,
    metadata: { pastor_name, church_name },
  });

  return new Response(JSON.stringify({ success: true, id: sendData.id }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
