import test from 'node:test';
import assert from 'node:assert/strict';
import { getMetaAdLibraryUrl } from '../src/lib/contracts.ts';
import { checkMetaAds, getMetaAdLibrarySearchUrl } from '../src/server/meta-ads.ts';

test('Meta Ad Library URL generation generates valid Mozambican search link', () => {
  const url = getMetaAdLibraryUrl('Barbearia Central');
  assert.ok(url.includes('facebook.com/ads/library'));
  assert.ok(url.includes('country=MZ'));
  assert.ok(url.includes('q=Barbearia%20Central'));
  assert.ok(url.includes('active_status=active'));

  const serverUrl = getMetaAdLibrarySearchUrl('Clínica Sorriso Beira');
  assert.ok(serverUrl.includes('q=Cl%C3%ADnica%20Sorriso%20Beira'));
});

test('checkMetaAds provides safe fallback when access token is not configured', async () => {
  delete process.env.META_AD_LIBRARY_ACCESS_TOKEN;
  const result = await checkMetaAds('Empresa Teste');
  assert.equal(result.hasActiveAds, false);
  assert.equal(result.checkedViaApi, false);
  assert.ok(result.directUrl.includes('facebook.com/ads/library'));
  assert.ok(result.directUrl.includes('Empresa%20Teste'));
});
