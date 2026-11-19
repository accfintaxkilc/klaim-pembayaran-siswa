import type { ClaimStatus } from "../types/claim";

/**
 * KONFIGURASI GOOGLE APPS SCRIPT & PORTAL ADMINISTRATOR
 *
 * Tempelkan URL Web App hasil deploy Google Apps Script (berakhiran /exec)
 * pada konstanta WEB_APP_URL di bawah ini agar seluruh pengajuan klaim,
 * unggah bukti transfer ke Google Drive, dan pembaruan status langsung
 * terhubung ke Google Sheets & Google Drive Anda.
 *
 * Jika WEB_APP_URL masih kosong (""), aplikasi berjalan dalam mode penyimpanan
 * lokal browser (localStorage) agar dapat langsung digunakan & diuji coba.
 */
export const WEB_APP_URL = "";

/**
 * PIN akses untuk membuka Mode Administrator.
 * Ubah sesuai kebutuhan keamanan tim finance Anda.
 */
export const ADMIN_PIN = "123456";

/**
 * Tautan Grup WhatsApp tujuan pengiriman bukti transfer klaim & pesan konfirmasi.
 */
export const WHATSAPP_GROUP_URL =
  "https://chat.whatsapp.com/KFY2HJp5UPo3UG4Zfh5QGz?s=cl&p=i&iam=2";

export const BRANCH_OPTIONS: readonly string[] = [
  "Pare - Offline",
  "Pare - Online",
  "Bogor",
  "Yogya - Mantrijeron",
  "Yogya - Gondokusuman",
  "Lampung",
  "Medan",
  "Makassar - Panakukang",
  "Makassar - Tamalanrea",
  "Bekasi",
  "Semarang",
  "Surabaya",
  "Solo",
];

export const BANK_OPTIONS: readonly string[] = [
  "BCA",
  "BRI",
  "BNI",
  "Mandiri",
  "BSI (Bank Syariah Indonesia)",
  "CIMB Niaga",
  "Permata Bank",
  "Bank Danamon",
  "BTN",
  "Bank Jago",
  "SeaBank",
  "OCBC NISP",
  "Bank Mega",
  "Bank Lainnya",
];

export const CLAIM_STATUS_OPTIONS: readonly {
  value: ClaimStatus;
  label: string;
}[] = [
  { value: "Menunggu Verifikasi", label: "Menunggu Verifikasi" },
  { value: "Verifikasi Admin", label: "Verifikasi Admin" },
  { value: "Disetujui", label: "Disetujui" },
  { value: "Selesai / Ditransfer", label: "Selesai / Ditransfer" },
  { value: "Ditolak", label: "Ditolak" },
];

export const ALLOWED_PROOF_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

export const MAX_PROOF_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
