import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Search targets — denomination directories with publicly listed pastor emails ──
const SEARCH_TARGETS = [
  { query: 'site:sabatx.org directory pastor email', denomination: 'baptist',      country: 'US', language: 'en' },
  { query: 'site:csbc.com directory pastor email church',  denomination: 'baptist', country: 'US', language: 'en' },
  { query: 'site:acts29.com find-a-church lead pastor email contact', denomination: 'evangelical', country: 'US', language: 'en' },
  { query: 'site:vineyardusa.org find church pastor email contact',   denomination: 'evangelical', country: 'US', language: 'en' },
  { query: 'site:pcanet.org church directory pastor email',           denomination: 'presbyterian', country: 'US', language: 'en' },

  { query: 'site:umc.org church finder pastor contact email',        denomination: 'methodist',   country: 'US', language: 'en' },
  { query: 'site:episcopalchurch.org parish directory pastor email', denomination: 'anglican',    country: 'US', language: 'en' },

  { query: 'site:achurchnearyou.com minister email contact church',  denomination: 'anglican',    country: 'GB', language: 'en' },
  { query: 'site:baptist.org.uk church directory pastor email',      denomination: 'baptist',     country: 'GB', language: 'en' },

  { query: 'site:rccg.org parish pastor email contact Nigeria',      denomination: 'pentecostal', country: 'NG', language: 'en' },
  { query: 'evangelical church Nigeria pastor email contact directory 2024', denomination: 'evangelical', country: 'NG', language: 'en' },

  { query: 'diretório igrejas pastor email contato Brasil evangelica', denomination: 'evangelical', country: 'BR', language: 'pt' },
  { query: 'site:batistas.org.br igreja pastor email contato',          denomination: 'baptist',     country: 'BR', language: 'pt' },

  { query: 'site:baptist.org.au church pastor email contact',          denomination: 'baptist',     country: 'AU', language: 'en' },
  { query: 'evangelical church Australia pastor email directory 2024', denomination: 'evangelical', country: 'AU', language: 'en' },
];

const EXTRACTION_SYSTEM_PROMPT = `You are a research assistant finding publicly listed pastor contact information from official church directories and denomination websites.

CRITICAL RULES:
1. Only extract email addresses that are explicitly published on the page you searched
2. Only use emails from official church websites or denomination directories
3. Never fabricate, guess, or infer email addresses
4. If you cannot find a publicly listed email for a pastor → skip them entirely
5. Each lead must have: pastor_name, church_name, email, and source_url (the exact page the email appears on)
6. Church size estimate: small (<100), medium (100-500), large (500+) — estimate from context
7. Maximum 8 leads per search query — quality over quantity

Output ONLY a valid JSON array of leads. No other text. Empty array if nothing found.

Schema for each lead:
{
  "pastor_name": "string — full name as listed",
  "church_name": "string — church name as listed",
  "email": "string — exact email as listed on the page",
  "source_url": "string — exact URL where email was found",
  "church_size": "small|medium|large",
  "notes": "string — any relevant context (optional)"
}`;

type Lead = {
  pastor_name: string;
  church_name: string;
  email: string;
  source_url: string;
  church_size?: string;
  notes?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl    = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anthropicKey   = Deno.env.get('ANTHROPIC_API_KEY');

  if (!supabaseUrl || !serviceRoleKey || !anthropicKey) {
    console.error('FATAL: Missing required env vars in expand-pastor-leads');
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Load existing emails to avoid duplicates
  const { data: existingLeads } = await supabase
    .from('pastor_leads')
    .select('email');
  const existingEmails = new Set(
    (existingLeads ?? []).map((l: { email: string }) => l.email.toLowerCase().trim()),
  );

  let totalFound = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  const sourcesSearched: string[] = [];
  const errors: string[] = [];

  // Rotate 5 targets per run by day-of-year
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const startIndex = (dayOfYear % Math.ceil(SEARCH_TARGETS.length / 5)) * 5;
  const targetsThisRun = SEARCH_TARGETS.slice(startIndex, startIndex + 5);

  for (const target of targetsThisRun) {
    try {
      console.log(`[expand] Searching: ${target.query}`);
      sourcesSearched.push(target.query);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 2000,
          system: EXTRACTION_SYSTEM_PROMPT,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{
            role: 'user',
            content: `Search for publicly listed pastor email addresses using this query: "${target.query}"

After searching, extract up to 8 pastor leads where the email is explicitly listed on the page.
Return ONLY a JSON array. Empty array if nothing found with publicly listed emails.`,
          }],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error(`[expand] Claude API error (${response.status}):`, err);
        errors.push(`Claude error for query "${target.query}": ${response.status}`);
        continue;
      }

      const claudeData = await response.json();

      let rawJSON = '';
      for (const block of claudeData.content ?? []) {
        if (block.type === 'text') {
          rawJSON = block.text.trim();
          break;
        }
      }

      if (!rawJSON) {
        console.log(`[expand] No text response for query: ${target.query}`);
        continue;
      }

      let leads: Lead[];
      try {
        const clean = rawJSON.replace(/```json|```/g, '').trim();
        leads = JSON.parse(clean);
        if (!Array.isArray(leads)) leads = [];
      } catch (parseErr) {
        console.error(`[expand] JSON parse failed for query "${target.query}":`, parseErr);
        errors.push(`Parse error for query "${target.query}"`);
        continue;
      }

      totalFound += leads.length;

      for (const lead of leads) {
        if (!lead.pastor_name?.trim() || !lead.church_name?.trim() || !lead.email?.trim()) {
          totalSkipped++;
          continue;
        }

        const email = lead.email.toLowerCase().trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          console.log(`[expand] Invalid email format: ${email}`);
          totalSkipped++;
          continue;
        }

        // Skip clearly generic addresses (gmail/yahoo allowed for small churches)
        if (
          email.startsWith('info@')    || email.startsWith('admin@') ||
          email.startsWith('office@')  || email.startsWith('contact@')
        ) {
          console.log(`[expand] Skipping generic address: ${email}`);
          totalSkipped++;
          continue;
        }

        if (existingEmails.has(email)) {
          totalSkipped++;
          continue;
        }

        if (!lead.source_url?.startsWith('http')) {
          console.log(`[expand] Missing valid source_url for ${email} — skipping`);
          totalSkipped++;
          continue;
        }

        const { error: insertError } = await supabase
          .from('pastor_leads')
          .insert({
            pastor_name:       lead.pastor_name.trim(),
            church_name:       lead.church_name.trim(),
            email,
            denomination:      target.denomination,
            country_code:      target.country,
            language:          target.language,
            church_size:       lead.church_size ?? 'medium',
            source:            'directory',
            source_url:        lead.source_url,
            email_verified:    true,
            email_verified_at: new Date().toISOString(),
            internal_notes:    lead.notes ?? null,
          });

        if (insertError) {
          if (insertError.code === '23505') {
            totalSkipped++;
          } else {
            console.error(`[expand] Insert error for ${email}:`, insertError);
            errors.push(`Insert failed: ${email} — ${insertError.message}`);
          }
          continue;
        }

        existingEmails.add(email);
        totalInserted++;
        console.log(`[expand] Inserted: ${lead.pastor_name} at ${lead.church_name} (${email})`);

        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (err) {
      console.error(`[expand] Error processing target "${target.query}":`, err);
      errors.push(`Unexpected error: ${String(err)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  await supabase.from('lead_gen_log').insert({
    leads_found:      totalFound,
    leads_inserted:   totalInserted,
    leads_skipped:    totalSkipped,
    sources_searched: sourcesSearched,
    errors:           errors.length > 0 ? errors : null,
    status:           errors.length > totalInserted ? 'partial' : 'complete',
  });

  const summary = {
    found:    totalFound,
    inserted: totalInserted,
    skipped:  totalSkipped,
    errors:   errors.length,
    sources:  sourcesSearched.length,
  };

  console.log('[expand] Run complete:', summary);

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});