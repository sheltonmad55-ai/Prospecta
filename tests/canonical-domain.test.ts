import test from 'node:test';
import assert from 'node:assert/strict';
import { CANONICAL_HOST, CANONICAL_ORIGIN, getCanonicalUrl } from '../src/server/auth.ts';
import { middleware } from '../src/middleware.ts';
import { NextRequest } from 'next/server.js';

test('Canonical domain: constants and URL generation', () => {
  assert.equal(CANONICAL_HOST, 'prospecta-mz.vercel.app');
  assert.equal(CANONICAL_ORIGIN, 'https://prospecta-mz.vercel.app');
  assert.equal(getCanonicalUrl(), 'https://prospecta-mz.vercel.app/');
  assert.equal(getCanonicalUrl('login'), 'https://prospecta-mz.vercel.app/login');
  assert.equal(getCanonicalUrl('/radar'), 'https://prospecta-mz.vercel.app/radar');
});

test('Canonical domain middleware: redirects secondary vercel.app domains to canonical in production', () => {
  const origVercel = process.env.VERCEL;
  try {
    process.env.VERCEL = '1';

    // 1. Preview deployment domain -> 308 redirect to canonical
    const previewReq = new NextRequest('https://prospecta-git-preview-shelton.vercel.app/leads?page=2', {
      headers: { host: 'prospecta-git-preview-shelton.vercel.app' }
    });
    const redirectRes = middleware(previewReq);
    assert.equal(redirectRes.status, 308);
    assert.equal(redirectRes.headers.get('location'), 'https://prospecta-mz.vercel.app/leads?page=2');

    // 2. Canonical production domain -> no redirect (passes through)
    const canonicalReq = new NextRequest('https://prospecta-mz.vercel.app/leads', {
      headers: { host: 'prospecta-mz.vercel.app' }
    });
    const canonicalRes = middleware(canonicalReq);
    assert.equal(canonicalRes.status, 200);

    // 3. Localhost / internal development -> passes through
    const localReq = new NextRequest('http://localhost:3000/leads', {
      headers: { host: 'localhost:3000' }
    });
    const localRes = middleware(localReq);
    assert.equal(localRes.status, 200);
  } finally {
    if (origVercel !== undefined) process.env.VERCEL = origVercel;
    else delete process.env.VERCEL;
  }
});
