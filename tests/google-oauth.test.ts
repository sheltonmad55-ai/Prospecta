import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import path from 'node:path';
import { db, closeDb, id } from '../src/server/db.ts';
import { createUser, credits, userById } from '../src/server/auth.ts';
import { beginGoogleOAuth, completeGoogleOAuth, consumeGoogleFlow, googleConfigured, publicOrigin, type OAuthProvider, type ProviderFactory } from '../src/server/google-oauth.ts';

test('Google OAuth: PKCE, browser binding, single-use return, consent and safe account provisioning', async t => {
  const previous = { mode: process.env.PROSPECTA_MODE, db: process.env.PROSPECTA_DB_PATH, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY, app: process.env.APP_URL };
  closeDb();
  process.env.PROSPECTA_DB_PATH = path.join(mkdtempSync(path.join(process.cwd(), 'data-test-')), 'oauth.sqlite');
  process.env.PROSPECTA_MODE = 'live';
  process.env.SUPABASE_URL = 'https://oauth-test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-placeholder-not-a-real-key';
  process.env.APP_URL = 'http://127.0.0.1:4317';
  const request = new Request('http://127.0.0.1:4317/api/auth/google');
  const consent = { intent: 'register' as const, acceptedTerms: true, marketing: false };
  const identity = { id: id(), email: 'verified@test.invalid', email_confirmed_at: new Date().toISOString(), user_metadata: { full_name: 'Utilizador Google', role: 'admin' } };
  const factory: ProviderFactory = values => ({
    async begin(redirectTo) {
      assert.equal(redirectTo, 'http://127.0.0.1:4317/api/auth/callback');
      values['prospecta-oauth-code-verifier'] = 'private-test-verifier';
      return { url: 'https://oauth-test.supabase.co/auth/v1/authorize?provider=google&code_challenge=test', error: false };
    },
    async exchange(code) {
      assert.equal(code, 'valid-test-code');
      assert.equal(values['prospecta-oauth-code-verifier'], 'private-test-verifier');
      return { user: identity, accessToken: 'verified-test-access-token', error: false };
    },
    async verify(token) { assert.equal(token, 'verified-test-access-token'); return { user: identity, error: false }; },
  });
  const callback = (cookie: string) => new Request('http://127.0.0.1:4317/api/auth/callback?code=valid-test-code', { headers: { cookie: cookie.split(';')[0] } });
  try {
    await t.test('actual Supabase SDK constructs a Google PKCE request without network or real keys', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => { throw new Error('Network intentionally unavailable in this test'); };
      try {
        const start = await beginGoogleOAuth(request, consent);
        const url = new URL(start.redirectUrl);
        assert.equal(url.searchParams.get('provider'), 'google');
        assert.equal(url.searchParams.get('code_challenge_method'), 's256');
        assert.ok(url.searchParams.get('code_challenge'));
        const flow = consumeGoogleFlow(callback(start.cookie));
        assert.ok(JSON.parse(flow.storage)['prospecta-oauth-code-verifier']);
      } finally { globalThis.fetch = originalFetch; }
    });
    await t.test('missing setup and missing terms fail honestly', async () => {
      assert.equal(googleConfigured(), true);
      await assert.rejects(beginGoogleOAuth(request, { ...consent, acceptedTerms: false }, factory), /Aceite os termos/);
      delete process.env.SUPABASE_URL; delete process.env.NEXT_PUBLIC_SUPABASE_URL; assert.equal(googleConfigured(), false);
      await assert.rejects(beginGoogleOAuth(request, consent, factory), /ainda não está activado/);
      process.env.SUPABASE_URL = 'https://oauth-test.supabase.co';
    });
    await t.test('valid verified return creates one owner account and 20 credits', async () => {
      const start = await beginGoogleOAuth(request, consent, factory);
      assert.match(start.cookie, /HttpOnly; SameSite=Lax/);
      assert.ok(!start.cookie.includes('verifier'));
      const result = await completeGoogleOAuth(callback(start.cookie), 'valid-test-code', factory);
      assert.equal(result.user.id, identity.id); assert.equal(result.user.role, 'owner');
      assert.equal(credits(result.user.workspaceId).available, 20);
      assert.ok(db().prepare('SELECT id FROM user_consents WHERE user_id=? AND source=?').get(identity.id, 'google'));
      assert.equal((db().prepare('SELECT storage FROM oauth_flows WHERE used=1').get() as { storage: string }).storage, '{}');
      await assert.rejects(completeGoogleOAuth(callback(start.cookie), 'valid-test-code', factory), /já foi utilizada/);
      assert.equal(credits(result.user.workspaceId).available, 20);
    });
    await t.test('missing or expired browser flow cannot be exchanged', async () => {
      assert.throws(() => consumeGoogleFlow(new Request(request.url)), /não foi encontrada/);
      const start = await beginGoogleOAuth(request, consent, factory);
      db().prepare("UPDATE oauth_flows SET expires_at='2000-01-01T00:00:00Z'").run();
      await assert.rejects(completeGoogleOAuth(callback(start.cookie), 'valid-test-code', factory), /expirou/);
    });
    await t.test('existing account signs in without another grant', async () => {
      const start = await beginGoogleOAuth(request, { intent: 'login', acceptedTerms: false, marketing: false }, factory);
      const result = await completeGoogleOAuth(callback(start.cookie), 'valid-test-code', factory);
      assert.equal(result.user.id, identity.id); assert.equal(credits(result.user.workspaceId).available, 20);
    });
    await t.test('unverified or mismatched identities fail closed', async () => {
      for (const fake of [{ ...identity, email_confirmed_at: undefined }, { ...identity, id: id() }]) {
        const bad: ProviderFactory = values => { const base = factory(values); return { ...base, verify: async () => ({ user: fake, error: false }) }; };
        const start = await beginGoogleOAuth(request, consent, bad);
        await assert.rejects(completeGoogleOAuth(callback(start.cookie), 'valid-test-code', bad), /confirmar a conta/);
      }
    });
    await t.test('new users must accept registration terms; existing e-mails are not silently linked', async () => {
      const other = { ...identity, id: id(), email: 'new-google@test.invalid' };
      const otherFactory: ProviderFactory = values => { const base = factory(values); return { ...base, exchange: async () => ({ user: other, accessToken: 'test', error: false }), verify: async () => ({ user: other, error: false }) }; };
      const login = await beginGoogleOAuth(request, { intent: 'login', acceptedTerms: false, marketing: false }, otherFactory);
      await assert.rejects(completeGoogleOAuth(callback(login.cookie), 'valid-test-code', otherFactory), /aceite os termos/);
      assert.equal(userById(other.id), null);
      createUser('Conta anterior', other.email, 'uma palavra passe longa');
      const signup = await beginGoogleOAuth(request, consent, otherFactory);
      await assert.rejects(completeGoogleOAuth(callback(signup.cookie), 'valid-test-code', otherFactory), /outra conta/);
      assert.equal(userById(other.id), null);
    });
    await t.test('redirect destinations and missing PKCE verifier are rejected', async () => {
      const malicious: ProviderFactory = values => ({ ...factory(values), begin: async () => ({ url: 'https://example.org/steal', error: false }) });
      await assert.rejects(beginGoogleOAuth(request, consent, malicious), /ligação inválida/);
      const noProof: ProviderFactory = () => ({ ...factory({}), begin: async () => ({ url: 'https://oauth-test.supabase.co/auth/v1/authorize', error: false }) } as OAuthProvider);
      await assert.rejects(beginGoogleOAuth(request, consent, noProof), /autenticação segura/);
      process.env.APP_URL = 'http://example.org'; assert.throws(() => publicOrigin(request), /HTTPS/);
    });
  } finally {
    closeDb();
    for (const [key, value] of Object.entries({ PROSPECTA_MODE: previous.mode, PROSPECTA_DB_PATH: previous.db, SUPABASE_URL: previous.url, SUPABASE_ANON_KEY: previous.key, APP_URL: previous.app })) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
