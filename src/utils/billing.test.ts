import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatIDR,
  generateInvoiceReference,
  calculateCumulativeTotal,
  parseRawGoodReceipts,
  generateCsvTemplate,
  SEED_GOOD_RECEIPTS,
} from './billing.js';

test('formatIDR formats currency correctly in Indonesian Rupiah', () => {
  assert.equal(formatIDR(1870000).replace(/\s/g, ' '), 'Rp 1.870.000');
  assert.equal(formatIDR(560000).replace(/\s/g, ' '), 'Rp 560.000');
  assert.equal(formatIDR(0).replace(/\s/g, ' '), 'Rp 0');
});

test('generateInvoiceReference formats prefix based on vendor', () => {
  const refJKI = generateInvoiceReference('PT. Jaya Kreasi Indonesia');
  assert.match(refJKI, /^TAG\/JKI\/\d{8}\/\d{4}$/);

  const refTPI = generateInvoiceReference('PT. Terang Part Indonesia');
  assert.match(refTPI, /^TAG\/TPI\/\d{8}\/\d{4}$/);
});

test('calculateCumulativeTotal accumulates item amount values', () => {
  const items = [
    { amount: 1870000 },
    { amount: 1870000 },
    { amount: 560000 },
  ];
  assert.equal(calculateCumulativeTotal(items), 4300000);
});

test('parseRawGoodReceipts parses Astra Isuzu attached format properly', () => {
  const rawRows = [
    {
      'No PO': '6400905798',
      'Serial number': 'MHCNMR81HTJ141557',
      'Tipe': 'NMRTHD65E402R1S',
      'Material': '2EIC4-19P18-NS',
      'Description': 'Rust Protection (Cabin+Door) N',
      'SLoc': '2000',
      'Qty': 1,
      'Amount': '1.870.000',
      'Plan': 'I000',
      'No GR/GL': '5146108892',
      'Item': '1',
      'A': 'H',
      'GR/GL Date': '20.10.2026',
      'PO Date': '27.08.2026',
      'Vendor': 'PT. Jaya Kreasi Indonesia',
    },
    {
      'No PO': '6400905798',
      'Serial number': 'MHCNMR81HTJ141557',
      'Tipe': 'NMRTHD65E402R1S',
      'Material': '2EIC4-19P18-NI',
      'Description': 'Glass Protector',
      'SLoc': '2000',
      'Qty': 1,
      'Amount': '560.000',
      'Plan': 'I000',
      'No GR/GL': '5146108892',
      'Item': '1',
      'A': 'H',
      'GR/GL Date': '20.10.2026',
      'PO Date': '27.08.2026',
      'Vendor': 'PT. Terang Part Indonesia',
    },
  ];

  const res = parseRawGoodReceipts(rawRows, 'owner@astraisuzu.co.id');
  assert.equal(res.errors.length, 0);
  assert.equal(res.valid.length, 2);
  assert.equal(res.valid[0].noPo, '6400905798');
  assert.equal(res.valid[0].serialNumber, 'MHCNMR81HTJ141557');
  assert.equal(res.valid[0].amount, 1870000);
  assert.equal(res.valid[1].amount, 560000);
  assert.equal(res.valid[0].vendor, 'PT. Jaya Kreasi Indonesia');
  assert.equal(res.valid[1].vendor, 'PT. Terang Part Indonesia');
});

test('SEED_GOOD_RECEIPTS contains 18 exact rows from Astra Isuzu attached image', () => {
  assert.equal(SEED_GOOD_RECEIPTS.length, 18);
  const jkiCount = SEED_GOOD_RECEIPTS.filter(
    (g) => g.vendor === 'PT. Jaya Kreasi Indonesia'
  ).length;
  const tpiCount = SEED_GOOD_RECEIPTS.filter(
    (g) => g.vendor === 'PT. Terang Part Indonesia'
  ).length;
  assert.equal(jkiCount, 9);
  assert.equal(tpiCount, 9);
});
