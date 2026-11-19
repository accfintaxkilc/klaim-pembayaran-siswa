import type { ClaimRecord, ClaimStats, ClaimSubmissionInput } from '../types/claim';

export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `Rp ${safe.toLocaleString('id-ID')}`;
}

export function parseRupiahInput(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return 0;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizePhoneToWa(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith('8')) {
    return `62${digits}`;
  }
  return digits;
}

export function generateTicketNumber(date: Date = new Date(), randomSuffix?: number): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const rand =
    randomSuffix !== undefined
      ? String(randomSuffix).padStart(4, '0').slice(0, 4)
      : String(Math.floor(1000 + Math.random() * 9000));
  return `KLM-${yyyy}${mm}${dd}-${rand}`;
}

export function formatIndonesianDateTime(isoString: string): string {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return isoString;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function validateClaimForm(input: ClaimSubmissionInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.namaSiswa.trim()) {
    errors.namaSiswa = 'Nama lengkap siswa wajib diisi.';
  } else if (input.namaSiswa.trim().length < 3) {
    errors.namaSiswa = 'Nama lengkap minimal 3 karakter.';
  }

  if (!input.nomorRegistrasi.trim()) {
    errors.nomorRegistrasi = 'Nomor registrasi wajib diisi.';
  }

  const phoneDigits = input.nomorPonsel.replace(/[^0-9]/g, '');
  if (!phoneDigits) {
    errors.nomorPonsel = 'Nomor ponsel wajib diisi.';
  } else if (phoneDigits.length < 9 || phoneDigits.length > 15) {
    errors.nomorPonsel = 'Masukkan nomor ponsel aktif yang valid (9–15 digit).';
  }

  if (!input.cabang.trim()) {
    errors.cabang = 'Pilih cabang kursus terlebih dahulu.';
  }

  if (!input.programKursus.trim()) {
    errors.programKursus = 'Program kursus wajib diisi.';
  }

  if (!input.periode.trim()) {
    errors.periode = 'Periode wajib diisi.';
  }

  if (!input.namaBank.trim()) {
    errors.namaBank = 'Nama bank tujuan wajib diisi.';
  }

  const rekDigits = input.nomorRekening.replace(/[^0-9]/g, '');
  if (!rekDigits) {
    errors.nomorRekening = 'Nomor rekening tujuan wajib diisi.';
  } else if (rekDigits.length < 5) {
    errors.nomorRekening = 'Nomor rekening minimal 5 digit angka.';
  }

  if (!input.namaPemilikRekening.trim()) {
    errors.namaPemilikRekening = 'Nama pemilik rekening wajib diisi.';
  }

  if (!Number.isFinite(input.nominalKlaim) || input.nominalKlaim <= 0) {
    errors.nominalKlaim = 'Nominal klaim kelebihan harus lebih besar dari Rp 0.';
  }

  if (!input.buktiTransferSebelumnya) {
    errors.buktiTransferSebelumnya = 'Unggah bukti transfer sebelumnya (JPG, PNG, atau PDF).';
  }

  if (!input.alasanKlaim.trim()) {
    errors.alasanKlaim = 'Keterangan alasan pengajuan klaim wajib diisi.';
  } else if (input.alasanKlaim.trim().length < 10) {
    errors.alasanKlaim = 'Jelaskan alasan pengajuan klaim minimal 10 karakter.';
  }

  return errors;
}

export function computeClaimStats(claims: ClaimRecord[]): ClaimStats {
  return claims.reduce<ClaimStats>(
    (acc, item) => {
      acc.totalKlaim += 1;
      acc.totalNominal += Number.isFinite(item.nominalKlaim) ? item.nominalKlaim : 0;

      if (item.status === 'Menunggu Verifikasi') {
        acc.menungguVerifikasi += 1;
      } else if (item.status === 'Verifikasi Admin') {
        acc.verifikasiAdmin += 1;
      } else if (item.status === 'Disetujui') {
        acc.disetujui += 1;
      } else if (item.status === 'Selesai / Ditransfer') {
        acc.selesaiDitransfer += 1;
      } else if (item.status === 'Ditolak') {
        acc.ditolak += 1;
      }
      return acc;
    },
    {
      totalKlaim: 0,
      menungguVerifikasi: 0,
      verifikasiAdmin: 0,
      disetujui: 0,
      selesaiDitransfer: 0,
      ditolak: 0,
      totalNominal: 0,
    },
  );
}

export function filterClaims(
  claims: ClaimRecord[],
  query: string,
  statusFilter: string,
  branchFilter: string,
): ClaimRecord[] {
  const q = query.trim().toLowerCase();
  return claims.filter((item) => {
    if (statusFilter !== 'Semua' && item.status !== statusFilter) {
      return false;
    }
    if (branchFilter !== 'Semua' && item.cabang !== branchFilter) {
      return false;
    }
    if (!q) return true;

    const haystack = [
      item.ticketNumber,
      item.namaSiswa,
      item.nomorRegistrasi,
      item.nomorPonsel,
      item.cabang,
      item.programKursus,
      item.periode ?? '',
      item.namaBank,
      item.nomorRekening,
      item.namaPemilikRekening,
      item.status,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(q);
  });
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildClaimsCsv(claims: ClaimRecord[]): string {
  const headers = [
    'Nomor Tiket',
    'Tanggal Pengajuan',
    'Nama Lengkap Siswa',
    'Nomor Registrasi',
    'Nomor Ponsel',
    'Cabang',
    'Program Kursus',
    'Periode',
    'Nama Bank Tujuan',
    'Nomor Rekening',
    'Nama Pemilik Rekening',
    'Nominal Klaim (IDR)',
    'Alasan Pengajuan',
    'Status',
    'Nama File Bukti Sebelumnya',
    'Nama File Bukti Pengembalian',
    'Waktu Notifikasi Terkirim',
  ];

  const rows = claims.map((c) => [
    c.ticketNumber,
    formatIndonesianDateTime(c.createdAt),
    c.namaSiswa,
    c.nomorRegistrasi,
    c.nomorPonsel,
    c.cabang,
    c.programKursus,
    c.periode ?? '',
    c.namaBank,
    c.nomorRekening,
    c.namaPemilikRekening,
    c.nominalKlaim,
    c.alasanKlaim,
    c.status,
    c.buktiTransferSebelumnya?.name ?? '',
    c.buktiTransferPengembalian?.name ?? '',
    c.notifikasiTerkirimAt ? formatIndonesianDateTime(c.notifikasiTerkirimAt) : '',
  ]);

  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ];

  return `\uFEFF${lines.join('\r\n')}`;
}

export function buildWhatsAppRefundMessage(
  claim: ClaimRecord,
  _refundProofName?: string,
  refundNote?: string,
): string {
  const lines = [
    `*KONFIRMASI PENGEMBALIAN KLAIM SISWA*`,
    `Kampung Inggris Language Center`,
    '',
    `• Nama Siswa: *${claim.namaSiswa}*`,
    `• No. Tiket: *${claim.ticketNumber}*`,
    `• No. Registrasi: ${claim.nomorRegistrasi}`,
    `• No. Ponsel: ${claim.nomorPonsel}`,
    `• Cabang / Program: ${claim.cabang} — ${claim.programKursus}`,
    `• Periode: ${claim.periode?.trim() || '-'}`,
    `• Rekening Tujuan: ${claim.namaBank} - ${claim.nomorRekening} (a.n. ${claim.namaPemilikRekening})`,
    `• Nominal Klaim: *${formatRupiah(claim.nominalKlaim)}*`,
  ];

  if (refundNote?.trim()) {
    lines.push(`• Catatan Finance: ${refundNote.trim()}`);
  }

  lines.push('', 'Status: *SELESAI / DITRANSFER*. Silakan periksa mutasi rekening. Terima kasih.');
  return lines.join('\n');
}

export function appendProofUrlToMessage(message: string, proofUrl?: string): string {
  const cleanUrl = proofUrl?.trim();
  if (!cleanUrl) return message;
  if (message.includes(cleanUrl)) return message;
  return `${message.trim()}\n\n• Tautan Lampiran Bukti Transfer: ${cleanUrl}`;
}

export function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  const matchPath = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchPath?.[1]) return matchPath[1];
  const matchQuery = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchQuery?.[1]) return matchQuery[1];
  return null;
}

export function getDriveRenderUrl(url: string, mimeType: string): string {
  const fileId = extractGoogleDriveFileId(url);
  if (!fileId) return url;
  if (mimeType === 'application/pdf') {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized = normalizePhoneToWa(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppShareTextUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
