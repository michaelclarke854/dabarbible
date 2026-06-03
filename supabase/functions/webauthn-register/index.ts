import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from 'npm:@simplewebauthn/server@9';
import { Buffer } from 'node:buffer';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RP_NAME = 'DABAR';
const RP_ID = Deno.env.get('WEBAUTHN_RP_ID') ?? 'dabarbible.com';
const ORIGIN = Deno.env.get('WEBAUTHN_ORIGIN') ?? 'https://dabarbible.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return json({ error: 'Unauthorized' }, 401);
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    if (action === 'start') {
      const { data: existing } = await admin
        .from('user_passkeys')
        .select('credential_id')
        .eq('user_id', user.id);

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userID: user.id,
        userName: user.email ?? user.id,
        userDisplayName: user.user_metadata?.full_name ?? user.email ?? 'DABAR user',
        attestationType: 'none',
        excludeCredentials: (existing ?? []).map((c) => ({
          id: c.credential_id,
          type: 'public-key' as const,
        })),
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      });

      await admin.from('webauthn_challenges').insert({
        user_id: user.id,
        challenge: options.challenge,
        type: 'registration',
      });

      return json(options);
    }

    if (action === 'finish') {
      const body = await req.json();

      const { data: row } = await admin
        .from('webauthn_challenges')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'registration')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!row) return json({ error: 'Challenge expired. Please try again.' }, 400);

      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response: body.credential,
          expectedChallenge: row.challenge,
          expectedOrigin: ORIGIN,
          expectedRPID: RP_ID,
        });
      } catch (e) {
        console.error('Registration verification failed:', e);
        return json({ error: 'Verification failed' }, 400);
      }

      if (!verification.verified || !verification.registrationInfo) {
        return json({ error: 'Credential not verified' }, 400);
      }

      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

      await admin.from('user_passkeys').insert({
        user_id: user.id,
        credential_id: Buffer.from(credentialID).toString('base64url'),
        public_key: Buffer.from(credentialPublicKey).toString('base64'),
        counter,
        device_name: body.deviceName ?? null,
      });

      await admin.from('webauthn_challenges').delete().eq('id', row.id);

      return json({ verified: true });
    }

    return json({ error: 'Invalid action. Use ?action=start or ?action=finish' }, 400);
  } catch (err) {
    console.error('[webauthn-register] Unexpected error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});