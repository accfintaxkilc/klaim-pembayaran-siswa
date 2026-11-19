export type ClaimStatus =
  | 'Menunggu Verifikasi'
  | 'Verifikasi Admin'
  | 'Disetujui'
  | 'Selesai / Ditransfer'
  | 'Ditolak';

export interface ProofFile {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  remoteUrl?: string;
}

export interface ClaimRecord {
  id: string;
  ticketNumber: string;
  createdAt: string;
  updatedAt: string;
  namaSiswa: string;
  nomorRegistrasi: string;
  nomorPonsel: string;
  cabang: string;
  programKursus: string;
  periode?: string;
  namaBank: string;
  nomorRekening: string;
  namaPemilikRekening: string;
  nominalKlaim: number;
  alasanKlaim: string;
  buktiTransferSebelumnya: ProofFile;
  buktiTransferPengembalian?: ProofFile;
  catatanPengembalian?: string;
  pesanNotifikasiTerkirim?: string;
  tujuanNotifikasi?: 'grup' | 'ponsel' | 'keduanya';
  notifikasiTerkirimAt?: string;
  status: ClaimStatus;
}

export interface ClaimSubmissionInput {
  namaSiswa: string;
  nomorRegistrasi: string;
  nomorPonsel: string;
  cabang: string;
  programKursus: string;
  periode: string;
  namaBank: string;
  nomorRekening: string;
  namaPemilikRekening: string;
  nominalKlaim: number;
  alasanKlaim: string;
  buktiTransferSebelumnya: ProofFile | null;
}

export interface ClaimStats {
  totalKlaim: number;
  menungguVerifikasi: number;
  verifikasiAdmin: number;
  disetujui: number;
  selesaiDitransfer: number;
  ditolak: number;
  totalNominal: number;
}
