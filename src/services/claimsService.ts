import {
  WEB_APP_URL as CONFIG_WEB_APP_URL,
  WHATSAPP_GROUP_URL,
} from '../config/gasConfig';
import type {
  ClaimRecord,
  ClaimStatus,
  ClaimSubmissionInput,
  ProofFile,
} from '../types/claim';
import {
  generateTicketNumber,
  normalizePhoneToWa,
} from '../utils/claimHelpers';
import { getLocalClaims, saveLocalClaimRecord } from './localClaimsDb';

/**
 * URL Google Apps Script Web App (/exec).
 * Diambil dari src/config/gasConfig.ts (bisa juga langsung diisi di sana).
 */
export const WEB_APP_URL = CONFIG_WEB_APP_URL;

function createSampleReceiptSvgDataUrl(opts: {
  bank: string;
  sender: string;
  amount: string;
  date: string;
  ref: string;
}): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="360" viewBox="0 0 560 360">
    <rect width="560" height="360" fill="#FEF9F9"/>
    <rect x="24" y="24" width="512" height="312" rx="16" fill="#FFFFFF" stroke="#8E1616" stroke-opacity="0.18" stroke-width="1.5"/>
    <rect x="24" y="24" width="512" height="60" rx="16" fill="#8E1616"/>
    <text x="48" y="61" font-family="sans-serif" font-size="18" font-weight="700" fill="#FFFFFF">BUKTI TRANSFER ELEKTRONIK · ${opts.bank}</text>
    <text x="48" y="122" font-family="sans-serif" font-size="13" fill="#8C5E5E">Status Transaksi</text>
    <text x="48" y="144" font-family="sans-serif" font-size="16" font-weight="700" fill="#16A34A">BERHASIL</text>
    <text x="300" y="122" font-family="sans-serif" font-size="13" fill="#8C5E5E">Tanggal &amp; Waktu</text>
    <text x="300" y="144" font-family="sans-serif" font-size="14" font-weight="600" fill="#3D0C0C">${opts.date}</text>
    <line x1="48" y1="168" x2="512" y2="168" stroke="#8E1616" stroke-opacity="0.12"/>
    <text x="48" y="198" font-family="sans-serif" font-size="13" fill="#8C5E5E">Pengirim / Rekening Sumber</text>
    <text x="48" y="220" font-family="sans-serif" font-size="15" font-weight="600" fill="#3D0C0C">${opts.sender}</text>
    <text x="48" y="254" font-family="sans-serif" font-size="13" fill="#8C5E5E">Nominal Transfer</text>
    <text x="48" y="282" font-family="monospace" font-size="22" font-weight="700" fill="#8E1616">${opts.amount}</text>
    <text x="300" y="254" font-family="sans-serif" font-size="13" fill="#8C5E5E">Nomor Referensi</text>
    <text x="300" y="280" font-family="monospace" font-size="14" font-weight="600" fill="#3D0C0C">${opts.ref}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const SEED_CLAIMS: ClaimRecord[] = [
  {
    id: 'seed-1',
    ticketNumber: 'KLM-20261116-4812',
    createdAt: '2026-11-16T03:15:00.000Z',
    updatedAt: '2026-11-16T03:15:00.000Z',
    namaSiswa: 'Nadia Kusuma Wardani',
    nomorRegistrasi: '101010',
    nomorPonsel: '081234567891',
    cabang: 'Pare - Offline',
    programKursus: 'IEP 1 Bulan Camp AC',
    periode: '10/11/2026',
    namaBank: 'BCA',
    nomorRekening: '8820194421',
    namaPemilikRekening: 'NADIA KUSUMA WARDANI',
    nominalKlaim: 450000,
    alasanKlaim:
      'Terjadi transfer ganda untuk pelunasan biaya program IEP 1 Bulan Camp AC periode November.',
    buktiTransferSebelumnya: {
      name: 'struk-bca-nadia.svg',
      mimeType: 'image/png',
      size: 184200,
      dataUrl: createSampleReceiptSvgDataUrl({
        bank: 'BCA',
        sender: 'NADIA KUSUMA WARDANI',
        amount: 'Rp 2.450.000',
        date: '16 Nov 2026, 09:40 WIB',
        ref: 'TRF-20261116-8812',
      }),
    },
    status: 'Menunggu Verifikasi',
  },
  {
    id: 'seed-2',
    ticketNumber: 'KLM-20261115-2194',
    createdAt: '2026-11-15T07:20:00.000Z',
    updatedAt: '2026-11-16T01:45:00.000Z',
    namaSiswa: 'Fajar Ramadhan',
    nomorRegistrasi: '102485',
    nomorPonsel: '085699112233',
    cabang: 'Yogya - Mantrijeron',
    programKursus: 'TOEFL Scoring & Class 1 Bulan',
    periode: '10/11/2026',
    namaBank: 'Mandiri',
    nomorRekening: '1370009182731',
    namaPemilikRekening: 'FAJAR RAMADHAN',
    nominalKlaim: 600000,
    alasanKlaim:
      'Pindah paket dari Camp VIP ke Non-Camp sehingga terdapat selisih kelebihan biaya akomodasi.',
    buktiTransferSebelumnya: {
      name: 'livin-mandiri-fajar.svg',
      mimeType: 'image/png',
      size: 215000,
      dataUrl: createSampleReceiptSvgDataUrl({
        bank: 'MANDIRI',
        sender: 'FAJAR RAMADHAN',
        amount: 'Rp 1.850.000',
        date: '15 Nov 2026, 14:12 WIB',
        ref: 'MDR-99201831',
      }),
    },
    status: 'Disetujui',
  },
  {
    id: 'seed-3',
    ticketNumber: 'KLM-20261114-7730',
    createdAt: '2026-11-14T04:00:00.000Z',
    updatedAt: '2026-11-15T06:30:00.000Z',
    namaSiswa: 'Siti Nurhaliza',
    nomorRegistrasi: '100892',
    nomorPonsel: '082188776655',
    cabang: 'Makassar - Panakukang',
    programKursus: 'English Master 2 Bulan',
    periode: '01/11/2026',
    namaBank: 'BRI',
    nomorRekening: '003401009988501',
    namaPemilikRekening: 'SITI NURHALIZA',
    nominalKlaim: 350000,
    alasanKlaim:
      'Kelebihan nominal transfer karena tidak memasukkan kode promo diskon alumni saat pembayaran.',
    buktiTransferSebelumnya: {
      name: 'brimo-siti.svg',
      mimeType: 'image/png',
      size: 164500,
      dataUrl: createSampleReceiptSvgDataUrl({
        bank: 'BRI',
        sender: 'SITI NURHALIZA',
        amount: 'Rp 2.150.000',
        date: '14 Nov 2026, 10:55 WIB',
        ref: 'BRI-77482019',
      }),
    },
    buktiTransferPengembalian: {
      name: 'refund-bri-siti.svg',
      mimeType: 'image/png',
      size: 148000,
      dataUrl: createSampleReceiptSvgDataUrl({
        bank: 'BCA FINANCE',
        sender: 'TIM FINANCE KLAIM',
        amount: 'Rp 350.000',
        date: '15 Nov 2026, 13:30 WIB',
        ref: 'RFD-KLM-7730',
      }),
    },
    catatanPengembalian: 'Dana refund telah ditransfer ke BRI a.n. SITI NURHALIZA.',
    notifikasiTerkirimAt: '2026-11-15T06:31:00.000Z',
    status: 'Selesai / Ditransfer',
  },
];

export function isGasConfigured(): boolean {
  return WEB_APP_URL.trim().length > 0;
}

export async function fileToProofPayload(file: File): Promise<ProofFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: typeof reader.result === 'string' ? reader.result : '',
      });
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas bukti transfer.'));
    reader.readAsDataURL(file);
  });
}

async function postToGas<T>(payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(WEB_APP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Google Apps Script mengembalikan status ${response.status}.`);
  }
  const data = await response.json();
  if (data && data.ok === false) {
    throw new Error(data.error || 'Terjadi kesalahan pada Google Apps Script.');
  }
  return data as T;
}

export async function fetchClaims(): Promise<ClaimRecord[]> {
  if (isGasConfigured()) {
    const url = `${WEB_APP_URL}${WEB_APP_URL.includes('?') ? '&' : '?'}action=list`;
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Gagal memuat data dari Google Apps Script (${response.status}).`);
    }
    const data = await response.json();
    if (Array.isArray(data?.claims)) {
      return data.claims as ClaimRecord[];
    }
    if (Array.isArray(data)) {
      return data as ClaimRecord[];
    }
    throw new Error('Format respons Google Apps Script tidak valid.');
  }

  return getLocalClaims(SEED_CLAIMS);
}

export async function submitClaim(input: ClaimSubmissionInput): Promise<ClaimRecord> {
  if (!input.buktiTransferSebelumnya) {
    throw new Error('Bukti transfer sebelumnya wajib dilampirkan.');
  }

  const now = new Date();
  const ticketNumber = generateTicketNumber(now);
  const record: ClaimRecord = {
    id: crypto.randomUUID ? crypto.randomUUID() : `claim-${Date.now()}`,
    ticketNumber,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    namaSiswa: input.namaSiswa.trim(),
    nomorRegistrasi: input.nomorRegistrasi.trim(),
    nomorPonsel: input.nomorPonsel.trim(),
    cabang: input.cabang.trim(),
    programKursus: input.programKursus.trim(),
    periode: input.periode.trim(),
    namaBank: input.namaBank.trim(),
    nomorRekening: input.nomorRekening.trim(),
    namaPemilikRekening: input.namaPemilikRekening.trim().toUpperCase(),
    nominalKlaim: input.nominalKlaim,
    alasanKlaim: input.alasanKlaim.trim(),
    buktiTransferSebelumnya: input.buktiTransferSebelumnya,
    status: 'Menunggu Verifikasi',
  };

  if (isGasConfigured()) {
    const result = await postToGas<{ ok: boolean; claim?: ClaimRecord; proofUrl?: string }>({
      action: 'submitClaim',
      claim: record,
    });
    if (result.claim) {
      return result.claim;
    }
    if (result.proofUrl) {
      record.buktiTransferSebelumnya = {
        ...record.buktiTransferSebelumnya,
        remoteUrl: result.proofUrl,
      };
    }
    return record;
  }

  return saveLocalClaimRecord(record, SEED_CLAIMS);
}

export async function updateClaimStatus(
  ticketNumber: string,
  status: ClaimStatus,
  currentClaim?: ClaimRecord,
): Promise<ClaimRecord> {
  const updatedAt = new Date().toISOString();

  if (isGasConfigured()) {
    const result = await postToGas<{ ok: boolean; claim?: ClaimRecord }>({
      action: 'updateStatus',
      ticketNumber,
      status,
      updatedAt,
    });
    if (result.claim) {
      return result.claim;
    }
    if (currentClaim) {
      return { ...currentClaim, status, updatedAt };
    }
    throw new Error(`Status diperbarui, namun detail tiket ${ticketNumber} tidak tersedia.`);
  }

  const existing = await getLocalClaims(SEED_CLAIMS);
  const target = existing.find((item) => item.ticketNumber === ticketNumber);
  if (!target) {
    throw new Error(`Tiket ${ticketNumber} tidak ditemukan.`);
  }
  const updated: ClaimRecord = { ...target, status, updatedAt };
  return saveLocalClaimRecord(updated, SEED_CLAIMS);
}

export async function uploadRefundProofAndNotify(params: {
  claim: ClaimRecord;
  refundProof: ProofFile;
  message: string;
  note?: string;
  markAsTransferred?: boolean;
  sendToGroup?: boolean;
  sendToPhone?: boolean;
}): Promise<ClaimRecord> {
  const nowIso = new Date().toISOString();
  const {
    claim,
    refundProof,
    message,
    note,
    markAsTransferred,
    sendToGroup = true,
    sendToPhone = true,
  } = params;
  const nextStatus: ClaimStatus =
    markAsTransferred === false ? claim.status : 'Selesai / Ditransfer';
  const tujuanNotifikasi: 'grup' | 'ponsel' | 'keduanya' =
    sendToGroup && sendToPhone ? 'keduanya' : sendToGroup ? 'grup' : 'ponsel';

  if (isGasConfigured()) {
    const result = await postToGas<{
      ok: boolean;
      claim?: ClaimRecord;
      refundProofUrl?: string;
      finalMessage?: string;
    }>({
      action: 'uploadRefundProof',
      ticketNumber: claim.ticketNumber,
      refundProof,
      phoneNormalized: sendToPhone ? normalizePhoneToWa(claim.nomorPonsel) : '',
      sendToGroup,
      sendToPhone,
      groupUrl: WHATSAPP_GROUP_URL,
      message,
      note: note || '',
      status: markAsTransferred === false ? undefined : 'Selesai / Ditransfer',
      updatedAt: nowIso,
    });

    if (result.claim) {
      return result.claim;
    }

    const proofUrl = result.refundProofUrl || refundProof.remoteUrl;
    const finalMessage = result.finalMessage || message;

    return {
      ...claim,
      buktiTransferPengembalian: {
        ...refundProof,
        remoteUrl: proofUrl,
      },
      catatanPengembalian: note?.trim() || claim.catatanPengembalian,
      pesanNotifikasiTerkirim: finalMessage,
      tujuanNotifikasi,
      notifikasiTerkirimAt: nowIso,
      status: nextStatus,
      updatedAt: nowIso,
    };
  }

  const existing = await getLocalClaims(SEED_CLAIMS);
  const target = existing.find((c) => c.ticketNumber === claim.ticketNumber) ?? claim;

  const updated: ClaimRecord = {
    ...target,
    buktiTransferPengembalian: refundProof,
    catatanPengembalian: note?.trim() || target.catatanPengembalian,
    pesanNotifikasiTerkirim: message,
    tujuanNotifikasi,
    notifikasiTerkirimAt: nowIso,
    status: nextStatus,
    updatedAt: nowIso,
  };

  return saveLocalClaimRecord(updated, SEED_CLAIMS);
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// Salin kode ini ke Google Apps Script (Extensions > Apps Script di Google Sheets)
const FOLDER_ID = 'GANTI_DENGAN_ID_FOLDER_GOOGLE_DRIVE';
const SHEET_NAME = 'KlaimPembayaran';
// Opsional: isi URL & Token Gateway WhatsApp (mis. Fonnte/Wablas) untuk kirim lampiran & pesan otomatis dari server GAS
const WA_GATEWAY_URL = '';
const WA_GATEWAY_TOKEN = '';
// ID Grup WhatsApp (format JID gateway mis. 120363xxxxxx@g.us) untuk grup: ${WHATSAPP_GROUP_URL}
const WA_GROUP_ID = '';

function getOrCreateSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'ID', 'Nomor Tiket', 'Tanggal Pengajuan', 'Diperbarui',
      'Nama Siswa', 'Nomor Registrasi', 'Nomor Ponsel', 'Cabang',
      'Program Kursus', 'Nama Bank', 'Nomor Rekening', 'Pemilik Rekening',
      'Nominal Klaim', 'Alasan Klaim', 'Status',
      'URL Bukti Sebelumnya', 'Nama Bukti Sebelumnya', 'Mime Bukti Sebelumnya',
      'URL Bukti Pengembalian', 'Nama Bukti Pengembalian', 'Mime Bukti Pengembalian',
      'Catatan Pengembalian', 'Waktu Notifikasi', 'Periode'
    ]);
  }
  return sheet;
}

function saveBase64ToDrive_(proof, prefix) {
  if (!proof || !proof.dataUrl) return { viewUrl: '', downloadUrl: '' };
  const parts = proof.dataUrl.split(',');
  const base64Data = parts.length > 1 ? parts[1] : parts[0];
  const decoded = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(decoded, proof.mimeType || 'application/octet-stream', prefix + '_' + proof.name);
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileId = file.getId();
  return {
    viewUrl: file.getUrl(),
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + fileId
  };
}

function sendWhatsAppFromGas_(phone, message, mediaUrl) {
  if (!WA_GATEWAY_URL || !phone) return;
  const payload = { target: phone, message: message };
  if (mediaUrl) {
    payload.url = mediaUrl;
  }
  UrlFetchApp.fetch(WA_GATEWAY_URL, {
    method: 'post',
    headers: { Authorization: WA_GATEWAY_TOKEN },
    payload: payload,
    muteHttpExceptions: true
  });
}

function doGet(e) {
  const sheet = getOrCreateSheet_();
  const rows = sheet.getDataRange().getValues();
  const claims = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[1]) continue;
    claims.push({
      id: r[0],
      ticketNumber: r[1],
      createdAt: r[2],
      updatedAt: r[3],
      namaSiswa: r[4],
      nomorRegistrasi: String(r[5]),
      nomorPonsel: String(r[6]),
      cabang: r[7],
      programKursus: r[8],
      namaBank: r[9],
      nomorRekening: String(r[10]),
      namaPemilikRekening: r[11],
      nominalKlaim: Number(r[12]) || 0,
      alasanKlaim: r[13],
      status: r[14],
      buktiTransferSebelumnya: {
        name: r[16] || 'bukti',
        mimeType: r[17] || 'image/png',
        size: 0,
        dataUrl: r[15],
        remoteUrl: r[15]
      },
      buktiTransferPengembalian: r[18] ? {
        name: r[19] || 'refund',
        mimeType: r[20] || 'image/png',
        size: 0,
        dataUrl: r[18],
        remoteUrl: r[18]
      } : undefined,
      catatanPengembalian: r[21] || '',
      notifikasiTerkirimAt: r[22] || '',
      periode: r[23] || ''
    });
  }
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, claims: claims.reverse() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const sheet = getOrCreateSheet_();

  if (payload.action === 'submitClaim') {
    const c = payload.claim;
    const saved = saveBase64ToDrive_(c.buktiTransferSebelumnya, c.ticketNumber + '_awal');
    sheet.appendRow([
      c.id, c.ticketNumber, c.createdAt, c.updatedAt,
      c.namaSiswa, c.nomorRegistrasi, c.nomorPonsel, c.cabang,
      c.programKursus, c.namaBank, c.nomorRekening, c.namaPemilikRekening,
      c.nominalKlaim, c.alasanKlaim, c.status,
      saved.viewUrl, c.buktiTransferSebelumnya.name, c.buktiTransferSebelumnya.mimeType || 'image/png',
      '', '', '', '', '', c.periode || ''
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, proofUrl: saved.viewUrl }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] === payload.ticketNumber) {
      const rowNum = i + 1;
      if (payload.action === 'updateStatus') {
        sheet.getRange(rowNum, 4).setValue(payload.updatedAt);
        sheet.getRange(rowNum, 15).setValue(payload.status);
        return ContentService
          .createTextOutput(JSON.stringify({ ok: true }))
          .setMimeType(ContentService.MimeType.JSON);
      } else if (payload.action === 'uploadRefundProof') {
        const savedRefund = saveBase64ToDrive_(payload.refundProof, payload.ticketNumber + '_refund');
        const finalMessage = payload.message;
        sheet.getRange(rowNum, 4).setValue(payload.updatedAt);
        if (payload.status) sheet.getRange(rowNum, 15).setValue(payload.status);
        sheet.getRange(rowNum, 19).setValue(savedRefund.viewUrl);
        sheet.getRange(rowNum, 20).setValue(payload.refundProof.name);
        sheet.getRange(rowNum, 21).setValue(payload.refundProof.mimeType || 'image/png');
        sheet.getRange(rowNum, 22).setValue(payload.note || '');
        sheet.getRange(rowNum, 23).setValue(payload.updatedAt);
        if (payload.sendToPhone !== false && payload.phoneNormalized) {
          sendWhatsAppFromGas_(payload.phoneNormalized, finalMessage, savedRefund.downloadUrl);
        }
        if (payload.sendToGroup !== false && WA_GROUP_ID) {
          sendWhatsAppFromGas_(WA_GROUP_ID, finalMessage, savedRefund.downloadUrl);
        }
        return ContentService
          .createTextOutput(JSON.stringify({
            ok: true,
            refundProofUrl: savedRefund.viewUrl,
            downloadUrl: savedRefund.downloadUrl,
            finalMessage: finalMessage
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      break;
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: 'Tiket tidak ditemukan di Google Sheets.' }))
    .setMimeType(ContentService.MimeType.JSON);
}`;
