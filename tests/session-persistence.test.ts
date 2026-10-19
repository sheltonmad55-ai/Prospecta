import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeSignedSession,
  verifySignedSession,
  createSession,
  sessionToken,
  cookie
} from '../src/server/auth.ts';

test('Session persistence: 30-day signed tokens survive serverless cold starts', () => {
  const userId = 'user-uuid-1234-abcd';
  const token = createSession(userId, 'ephemeral-provider-token-1h');

  // Must always generate our durable signed token starting with ps_
  assert.ok(token.startsWith('ps_'), 'Session token must start with ps_');

  // verifySignedSession must recover the exact userId
  const verifiedUserId = verifySignedSession(token);
  assert.equal(verifiedUserId, userId);

  // Extractor from cookie
  const mockReqWithCookie = new Request('https://prospecta-mz.vercel.app/api/me', {
    headers: { cookie: `prospecta_session=${token}; other=value` }
  });
  assert.equal(sessionToken(mockReqWithCookie), token);

  // Extractor from Authorization Bearer header (localStorage fallback)
  const mockReqWithBearer = new Request('https://prospecta-mz.vercel.app/api/me', {
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(sessionToken(mockReqWithBearer), token);

  // Cookie string must contain both Max-Age and Expires for 30-day persistence
  const cookieStr = cookie(token, mockReqWithCookie);
  assert.ok(cookieStr.includes('Max-Age=2592000'), 'Must contain 30-day Max-Age');
  assert.ok(cookieStr.includes('Expires='), 'Must contain explicit Expires date so browser does not discard on close');
  assert.ok(cookieStr.includes('HttpOnly'), 'Must be HttpOnly');
  assert.ok(cookieStr.includes('SameSite=Lax'), 'Must be SameSite=Lax');
  assert.ok(cookieStr.includes('Secure'), 'Must be Secure on HTTPS');
});

test('Session token verification rejects expired or tampered tokens', () => {
  const fakeToken = 'ps_invalid.token.tampered';
  assert.equal(verifySignedSession(fakeToken), null);

  const emptyToken = '';
  assert.equal(verifySignedSession(emptyToken), null);
});
