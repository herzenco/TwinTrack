// supabase/functions/generate-invite/index.ts
// Supabase Edge Function (Deno runtime)
//
// Generates a 6-character alphanumeric invite code for a twin pair.
// - Validates that the requesting user is an owner of the pair.
// - Stores the code in the invites table with a 48-hour expiry.
// - Rate limits: max 10 generations per hour per user.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const INVITE_CODE_LENGTH = 6;
const INVITE_EXPIRY_HOURS = 48;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_HOURS = 1;

// Characters used for invite codes (unambiguous alphanumeric)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface RequestBody {
  pair_id: string;
}

interface ErrorResponse {
  error: string;
}

interface SuccessResponse {
  code: string;
  expires_at: string;
}

function generateInviteCode(): string {
  const array = new Uint8Array(INVITE_CODE_LENGTH);
  crypto.getRandomValues(array);
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += CODE_CHARS[array[i] % CODE_CHARS.length];
  }
  return code;
}

function jsonResponse(body: ErrorResponse | SuccessResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // -----------------------------------------------------------------------
  // Authenticate
  // -----------------------------------------------------------------------
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing authorization header' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse({ error: 'Server configuration error' }, 500);
  }

  // Create a client scoped to the authenticated user for auth verification
  const userClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // -----------------------------------------------------------------------
  // Parse and validate request body
  // -----------------------------------------------------------------------
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { pair_id } = body;
  if (!pair_id || typeof pair_id !== 'string') {
    return jsonResponse({ error: 'pair_id is required' }, 400);
  }

  // -----------------------------------------------------------------------
  // Use service-role client for privileged operations
  // -----------------------------------------------------------------------
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // -----------------------------------------------------------------------
  // Verify user is an owner of the pair
  // -----------------------------------------------------------------------
  const { data: membership, error: memberError } = await adminClient
    .from('pair_members')
    .select('role')
    .eq('pair_id', pair_id)
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership) {
    return jsonResponse({ error: 'You are not a member of this pair' }, 403);
  }

  if (membership.role !== 'owner') {
    return jsonResponse({ error: 'Only pair owners can generate invite codes' }, 403);
  }

  // -----------------------------------------------------------------------
  // Rate limit: max 10 invite generations per hour per user
  // -----------------------------------------------------------------------
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { count: recentCount, error: countError } = await adminClient
    .from('invites')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', user.id)
    .gte('created_at', windowStart);

  if (countError) {
    return jsonResponse({ error: 'Failed to check rate limit' }, 500);
  }

  if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
    return jsonResponse(
      { error: 'Rate limit exceeded. Maximum 10 invite codes per hour.' },
      429,
    );
  }

  // -----------------------------------------------------------------------
  // Generate unique invite code (retry on collision)
  // -----------------------------------------------------------------------
  const expiresAt = new Date(
    Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const MAX_RETRIES = 5;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = generateInviteCode();

    const { data: invite, error: insertError } = await adminClient
      .from('invites')
      .insert({
        pair_id,
        code,
        created_by: user.id,
        expires_at: expiresAt,
      })
      .select('code, expires_at')
      .single();

    if (!insertError && invite) {
      return jsonResponse(
        { code: invite.code as string, expires_at: invite.expires_at as string },
        201,
      );
    }

    // If the error is a unique constraint violation on the code, retry
    if (insertError && insertError.code === '23505') {
      continue;
    }

    // Any other error is unexpected
    return jsonResponse({ error: 'Failed to create invite code' }, 500);
  }

  return jsonResponse(
    { error: 'Failed to generate a unique invite code. Please try again.' },
    500,
  );
});
