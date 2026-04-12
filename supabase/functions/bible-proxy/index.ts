const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get("ref");
    const translation = url.searchParams.get("translation") || "kjv";

    if (!ref) {
      return new Response(
        JSON.stringify({ error: "Missing 'ref' query parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiUrl = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${encodeURIComponent(translation)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const body = await response.text();
      console.error(`Bible API error: ${response.status} - ${body}`);
      return new Response(
        JSON.stringify({ error: `Bible API returned ${response.status}`, text: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" },
    });
  } catch (error) {
    console.error("Bible proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch from Bible API", text: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
