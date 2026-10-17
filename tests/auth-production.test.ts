import test from 'node:test';
import assert from 'node:assert/strict';
import { cookie, supabaseConfigured, getSupabaseEnv } from '../src/server/auth.ts';
import { mode } from '../src/server/providers.ts';

test('Production & Supabase Auth configuration: environment detection, flags, and cookies', () => {
  const originalMode = process.env.PROSPECTA_MODE;
  const originalNextUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalNextKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_ANON_KEY;

  try {
    // 1. When NEXT_PUBLIC_SUPABASE_URL is set, mode() must return 'live'
    delete process.env.PROSPECTA_MODE;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://demo-mz.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-test';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;

    assert.equal(mode(), 'live', "mode() should be 'live' when NEXT_PUBLIC_SUPABASE_URL is set");
    assert.equal(supabaseConfigured(), true, 'supabaseConfigured() should be true');
    const env = getSupabaseEnv();
    assert.equal(env.url, 'https://demo-mz.supabase.co');
    assert.equal(env.key, 'anon-key-test');

    // 2. Cookie security flags: HTTPS request
    const httpsReq = new Request('https://prospecta-mz.vercel.app/api/auth/login');
    const setCookie = cookie('test-token-jwt', httpsReq);
    assert.ok(setCookie.includes('prospecta_session=test-token-jwt'), 'Must contain prospecta_session');
    assert.ok(setCookie.includes('Path=/'), 'Must contain Path=/');
    assert.ok(setCookie.includes('HttpOnly'), 'Must contain HttpOnly');
    assert.ok(setCookie.includes('SameSite=Lax'), 'Must contain SameSite=Lax');
    assert.ok(setCookie.includes('Secure'), 'Must contain Secure flag on HTTPS');
    assert.ok(setCookie.includes('Max-Age=604800'), 'Must contain 7-day Max-Age');

    // 3. Clear cookie on logout
    const clearCookie = cookie('', httpsReq);
    assert.ok(clearCookie.includes('Max-Age=0'), 'Logout cookie must have Max-Age=0');

  } finally {
    if (originalMode !== undefined) process.env.PROSPECTA_MODE = originalMode; else delete process.env.PROSPECTA_MODE;
    if (originalNextUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = originalNextUrl; else delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (originalNextKey !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalNextKey; else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (originalUrl !== undefined) process.env.SUPABASE_URL = originalUrl; else delete process.env.SUPABASE_URL;
    if (originalKey !== undefined) process.env.SUPABASE_ANON_KEY = originalKey; else delete process.env.SUPABASE_ANON_KEY;
  }
});
