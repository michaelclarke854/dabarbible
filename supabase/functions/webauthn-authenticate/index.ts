import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from 'npm:@simplewebauthn/server@9';
import { Buffer } from 'node:buffer';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
    const sessionId = url.searchParams.get('sessionId');

    if (action === 'start') {
      if (!sessionId) return json({ error: 'sessionId required' }, 400);

      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        userVerification: 'preferred',
      });

      await admin.from('webauthn_challenges').insert({
        session_id: sessionId,
        challenge: options.challenge,
        type: 'authentication',
      });

      return json(options);
    }

    if (action === 'finish') {
      if (!sessionId) return json({ error: 'sessionId required' }, 400);

      const body = await req.json();

      const { data: row } = await admin
        .from('webauthn_challenges')
        .select('*')
        .eq('session_id', sessionId)
        .eq('type', 'authentication')
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (!row) return json({ error: 'Challenge expired. Please try again.' }, 400);

      const credId = body.credential.id;
      const { data: passkey } = await admin
        .from('user_passkeys')
        .select('*')
        .eq('credential_id', credId)
        .maybeSingle();

      if (!passkey) return json({ error: 'Passkey not found' }, 404);

      const publicKey = Uint8Array.from(Buffer.from(passkey.public_key, 'base64'));
      const credentialID = Uint8Array.from(Buffer.from(passkey.credential_id, 'base64url'));

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: body.credential,
          expectedChallenge: row.challenge,
          expectedOrigin: ORIGIN,
          expectedRPID: RP_ID,
          authenticator: {
            credentialID,
            credentialPublicKey: publicKey,
            counter: passkey.counter,
          },
        });
      } catch (e) {
        console.error('Authentication verification failed:', e);
        return json({ error: 'Verification failed' }, 400);
      }

      if (!verification.verified) return json({ error: 'Assertion not verified' }, 400);

      await admin
        .from('user_passkeys')
        .update({ counter: verification.authenticationInfo.newCounter })
        .eq('id', passkey.id);

      await admin.from('webauthn_challenges').delete().eq('id', row.id);

      const { data: userRes } = await admin.auth.admin.getUserById(passkey.user_id);
      const user = userRes?.user;
      if (!user?.email) return json({ error: 'User not found' }, 404);

      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: user.email,
      });

      if (linkError || !linkData?.properties?.hashed_token) {
        console.error('generateLink error:', linkError);
        return json({ error: 'Failed to issue session' }, 500);
      }

      return json({
        verified: true,
        token_hash: linkData.properties.hashed_token,
        email: user.email,
      });
    }

    return json({ error: 'Invalid action. Use ?action=start or ?action=finish' }, 400);
  } catch (err) {
    console.error('[webauthn-authenticate] Unexpected error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});