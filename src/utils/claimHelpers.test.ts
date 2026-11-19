import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendProofUrlToMessage,
  buildClaimsCsv,
  buildWhatsAppRefundMessage,
  buildWhatsAppShareTextUrl,
  buildWhatsAppUrl,
  computeClaimStats,
  extractGoogleDriveFileId,
  filterClaims,
  formatRupiah,
  generateTicketNumber,
  getDriveRenderUrl,
  normalizePhoneToWa,
  parseRupiahInput,
  validateClaimForm,
} from './claimHelpers';
import type { ClaimRecord, ClaimSubmissionInput } from '../types/claim';

const sampleProof = {
  name: 'bukti-tf.png',
  mimeType: 'image/png',
  size: 12000,
  dataUrl: 'data:image/png;base64,AAAA',
};

const sampleClaims: ClaimRecord[] = [
  {
    id: '1',
    ticketNumber: 'KLM-20261118-1001',
    createdAt: '2026-11-18T02:00:00.000Z',
    updatedAt: '2026-11-18T02:00:00.000Z',
    namaSiswa: 'Alya Putri',
    nomorRegistrasi: '101010',
    nomorPonsel: '081234567890',
    cabang: 'Pare - Offline',
    programKursus: 'IEP 1 Bulan Camp AC',
    periode: '01/01/2026',
    namaBank: 'BCA',
    nomorRekening: '8820192831',
    namaPemilikRekening: 'ALYA PUTRI',
    nominalKlaim: 500000,
    alasanKlaim: 'Kelebihan transfer biaya asrama periode November.',
    buktiTransferSebelumnya: sampleProof,
    status: 'Menunggu Verifikasi',
  },
  {
    id: '2',
    ticketNumber: 'KLM-20261118-1002',
    createdAt: '2026-11-18T03:00:00.000Z',
    updatedAt: '2026-11-18T04:00:00.000Z',
    namaSiswa: 'Rizky Pratama',
    nomorRegistrasi: '202020',
    nomorPonsel: '+62 856-7788-9900',
    cabang: 'Yogya - Mantrijeron',
    programKursus: 'TOEFL Preparation 2 Minggu',
    periode: '10/01/2026',
    namaBank: 'Mandiri',
    nomorRekening: '1370019283746',
    namaPemilikRekening: 'RIZKY PRATAMA',
    nominalKlaim: 750000,
    alasanKlaim: 'Double transfer pembayaran kursus.',
    buktiTransferSebelumnya: sampleProof,
    status: 'Disetujui',
  },
];

test('formatRupiah and parseRupiahInput handle Indonesian currency formatting', () => {
  assert.equal(formatRupiah(500000), 'Rp 500.000');
  assert.equal(formatRupiah(0), 'Rp 0');
  assert.equal(parseRupiahInput('Rp 1.250.000'), 1250000);
  assert.equal(parseRupiahInput('abc'), 0);
});

test('normalizePhoneToWa normalizes 08, +62, and 8 prefixes cleanly', () => {
  assert.equal(normalizePhoneToWa('0812-3456-7890'), '6281234567890');
  assert.equal(normalizePhoneToWa('+62 856 7788 9900'), '6285677889900');
  assert.equal(normalizePhoneToWa('8123456789'), '628123456789');
});

test('generateTicketNumber formats KLM-YYYYMMDD-XXXX deterministically', () => {
  const date = new Date(2026, 10, 18); // Nov 18, 2026
  assert.equal(generateTicketNumber(date, 4829), 'KLM-20261118-4829');
});

test('validateClaimForm catches missing required fields and passes valid payload', () => {
  const emptyInput: ClaimSubmissionInput = {
    namaSiswa: '',
    nomorRegistrasi: '',
    nomorPonsel: '',
    cabang: '',
    programKursus: '',
    periode: '',
    namaBank: '',
    nomorRekening: '',
    namaPemilikRekening: '',
    nominalKlaim: 0,
    alasanKlaim: '',
    buktiTransferSebelumnya: null,
  };
  const emptyErrors = validateClaimForm(emptyInput);
  assert.equal(Object.keys(emptyErrors).length, 12);

  const validInput: ClaimSubmissionInput = {
    namaSiswa: 'Budi Santoso',
    nomorRegistrasi: '101010',
    nomorPonsel: '081234567890',
    cabang: 'Pare - Offline',
    programKursus: 'IEP 1 Bulan Camp AC',
    periode: '01/01/2026',
    namaBank: 'BCA',
    nomorRekening: '1234567890',
    namaPemilikRekening: 'BUDI SANTOSO',
    nominalKlaim: 350000,
    alasanKlaim: 'Saya tidak sengaja mentransfer dua kali untuk tagihan yang sama.',
    buktiTransferSebelumnya: sampleProof,
  };
  const validErrors = validateClaimForm(validInput);
  assert.equal(Object.keys(validErrors).length, 0);
});

test('computeClaimStats calculates totals and status counts accurately', () => {
  const withAdminVerify: ClaimRecord[] = [
    ...sampleClaims,
    { ...sampleClaims[0], id: '3', ticketNumber: 'KLM-20261118-1003', status: 'Verifikasi Admin' },
  ];
  const stats = computeClaimStats(withAdminVerify);
  assert.equal(stats.totalKlaim, 3);
  assert.equal(stats.menungguVerifikasi, 1);
  assert.equal(stats.verifikasiAdmin, 1);
  assert.equal(stats.disetujui, 1);
  assert.equal(stats.totalNominal, 1750000);
});

test('filterClaims matches query, status, and branch filters', () => {
  const withAdminVerify: ClaimRecord[] = [
    ...sampleClaims,
    { ...sampleClaims[0], id: '3', ticketNumber: 'KLM-20261118-1003', status: 'Verifikasi Admin' },
  ];
  assert.equal(filterClaims(sampleClaims, '101010', 'Semua', 'Semua').length, 1);
  assert.equal(filterClaims(sampleClaims, '', 'Disetujui', 'Semua').length, 1);
  assert.equal(filterClaims(withAdminVerify, '', 'Verifikasi Admin', 'Semua').length, 1);
  assert.equal(filterClaims(sampleClaims, '', 'Semua', 'Yogya - Mantrijeron').length, 1);
  assert.equal(filterClaims(sampleClaims, 'tidak-ada', 'Semua', 'Semua').length, 0);
});

test('buildClaimsCsv generates BOM-prefixed CSV with escaped cells', () => {
  const csv = buildClaimsCsv(sampleClaims);
  assert.ok(csv.startsWith('\uFEFFNomor Tiket,'));
  assert.ok(csv.includes('KLM-20261118-1001'));
  assert.ok(csv.includes('ALYA PUTRI'));
});

test('buildWhatsAppUrl and message include full claim details without attachment text and share URL', () => {
  const claimWithDriveUrl: ClaimRecord = {
    ...sampleClaims[0],
    buktiTransferPengembalian: {
      ...sampleProof,
      remoteUrl: 'https://drive.google.com/file/d/1AbCDefG123/view',
    },
  };
  const msg = buildWhatsAppRefundMessage(claimWithDriveUrl, 'bukti-pengembalian.jpg');
  assert.ok(
    msg.startsWith(
      '*KONFIRMASI PENGEMBALIAN KLAIM SISWA*\nKampung Inggris Language Center\n\n',
    ),
  );
  assert.ok(msg.includes('Alya Putri'));
  assert.ok(msg.includes('KLM-20261118-1001'));
  assert.ok(msg.includes('101010'));
  assert.ok(msg.includes('Pare - Offline'));
  assert.ok(msg.includes('Periode: 01/01/2026'));
  assert.ok(msg.includes('BCA'));
  assert.ok(msg.includes('Rp 500.000'));
  assert.equal(msg.includes('Lampiran Bukti Transfer'), false);
  assert.equal(msg.includes('Tautan Bukti Drive'), false);

  const url = buildWhatsAppUrl(sampleClaims[0].nomorPonsel, msg);
  assert.ok(url.startsWith('https://wa.me/6281234567890?text='));

  const shareUrl = buildWhatsAppShareTextUrl(msg);
  assert.ok(shareUrl.startsWith('https://wa.me/?text='));
  assert.ok(decodeURIComponent(shareUrl).includes('Rp 500.000'));
  assert.equal(decodeURIComponent(shareUrl).includes('Lampiran Bukti Transfer'), false);
});

test('appendProofUrlToMessage appends Drive attachment link without duplicating', () => {
  const base = 'Halo Siswa, transfer selesai.';
  const url = 'https://drive.google.com/file/d/1AbCDefG123/view';
  const withUrl = appendProofUrlToMessage(base, url);
  assert.ok(withUrl.includes(url));
  assert.equal(appendProofUrlToMessage(withUrl, url), withUrl);
});

test('extractGoogleDriveFileId and getDriveRenderUrl format image and PDF URLs cleanly', () => {
  const driveView = 'https://drive.google.com/file/d/1XyZ987_abc/view?usp=drivesdk';
  assert.equal(extractGoogleDriveFileId(driveView), '1XyZ987_abc');
  assert.equal(
    getDriveRenderUrl(driveView, 'image/png'),
    'https://drive.google.com/thumbnail?id=1XyZ987_abc&sz=w1600',
  );
  assert.equal(
    getDriveRenderUrl(driveView, 'application/pdf'),
    'https://drive.google.com/file/d/1XyZ987_abc/preview',
  );
});
