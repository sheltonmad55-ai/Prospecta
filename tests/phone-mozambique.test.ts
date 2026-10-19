import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isMozambiqueMobile,
  isMozambiqueLandline,
  getMozambiquePhoneKind,
  getMozambiqueLocalDigits
} from '../src/lib/contracts.ts';

test('Mozambique phone digits extractor', () => {
  assert.equal(getMozambiqueLocalDigits('+258 84 828 3875'), '848283875');
  assert.equal(getMozambiqueLocalDigits('258870200011'), '870200011');
  assert.equal(getMozambiqueLocalDigits('848283875'), '848283875');
  assert.equal(getMozambiqueLocalDigits('+258 21 490 000'), '21490000');
  assert.equal(getMozambiqueLocalDigits(null), '');
  assert.equal(getMozambiqueLocalDigits(undefined), '');
});

test('Mozambique mobile numbers (Vodacom, Movitel, Tmcel) are correctly recognized as mobile and NOT landline', () => {
  const mobileNumbers = [
    '+258 87 020 0011', // Movitel (from Muliba screenshot)
    '+258 84 828 3875', // Vodacom (from Coconuts screenshot)
    '+258 84 431 6034', // Vodacom (from The Backroom screenshot)
    '+258 85 111 2233', // Vodacom
    '+258 86 555 6677', // Movitel
    '+258 82 999 8877', // Tmcel
    '+258 83 444 3322', // Tmcel
    '848283875',        // Without +258
    '870200011',        // Without +258
  ];

  for (const phone of mobileNumbers) {
    assert.equal(isMozambiqueMobile(phone), true, `${phone} must be identified as mobile`);
    assert.equal(isMozambiqueLandline(phone), false, `${phone} must NOT be identified as landline`);
    assert.equal(getMozambiquePhoneKind(phone), 'mobile', `${phone} kind must be mobile`);
  }
});

test('Mozambique landline numbers (Maputo 21, Beira 23, Nampula 26, etc.) are correctly recognized as landline and NOT mobile', () => {
  const landlineNumbers = [
    '+258 21 490 000',  // Maputo
    '+258 21 300 000',  // Maputo
    '+258 23 320 000',  // Beira / Sofala
    '+258 24 210 000',  // Quelimane / Zambézia
    '+258 25 120 000',  // Tete
    '+258 26 210 000',  // Nampula
    '+258 27 220 000',  // Pemba / Cabo Delgado
    '+258 28 220 000',  // Xai-Xai / Gaza
    '+258 29 320 000',  // Inhambane
    '21490000',         // Local without +258
    '23320000',         // Local without +258
  ];

  for (const phone of landlineNumbers) {
    assert.equal(isMozambiqueLandline(phone), true, `${phone} must be identified as landline`);
    assert.equal(isMozambiqueMobile(phone), false, `${phone} must NOT be identified as mobile`);
    assert.equal(getMozambiquePhoneKind(phone), 'landline', `${phone} kind must be landline`);
  }
});

test('Invalid, foreign or empty numbers are classified as unknown and NEVER as landline', () => {
  const nonMozNumbers = [
    null,
    undefined,
    '',
    '+351 91 234 5678', // Portugal
    '+1 555 123 4567',  // USA
    '12345',
    'abc-def'
  ];

  for (const phone of nonMozNumbers) {
    assert.equal(isMozambiqueLandline(phone), false);
    assert.equal(isMozambiqueMobile(phone), false);
    assert.equal(getMozambiquePhoneKind(phone), 'unknown');
  }
});
