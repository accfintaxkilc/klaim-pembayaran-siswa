import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Download,
  Eye,
  RefreshCw,
  Search,
  Send,
  Settings,
} from 'lucide-react';
import {
  BRANCH_OPTIONS,
  CLAIM_STATUS_OPTIONS,
} from '../config/gasConfig';
import {
  fetchClaims,
  isGasConfigured,
  updateClaimStatus,
} from '../services/claimsService';
import type { ClaimRecord, ClaimStatus } from '../types/claim';
import {
  buildClaimsCsv,
  computeClaimStats,
  filterClaims,
  formatIndonesianDateTime,
  formatRupiah,
} from '../utils/claimHelpers';
import { ProofPreviewModal } from './ProofPreviewModal';
import { RefundTransferModal } from './RefundTransferModal';

interface AdminDashboardProps {
  onOpenGasSetup: () => void;
}

const STATUS_SELECT_STYLES: Record<ClaimStatus, string> = {
  'Menunggu Verifikasi': 'border-amber-300 bg-amber-50 text-amber-900',
  'Verifikasi Admin': 'border-sky-300 bg-sky-50 text-sky-900',
  Disetujui: 'border-green-200 bg-green-50 text-green-800',
  'Selesai / Ditransfer': 'border-[#24664A] bg-[#2E7D5B] text-white font-bold',
  Ditolak: 'border-red-300 bg-red-100/70 text-red-900',
};

export function AdminDashboard({ onOpenGasSetup }: AdminDashboardProps) {
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingTicket, setUpdatingTicket] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [branchFilter, setBranchFilter] = useState<string>('Semua');

  const [previewClaim, setPreviewClaim] = useState<ClaimRecord | null>(null);
  const [refundClaim, setRefundClaim] = useState<ClaimRecord | null>(null);
  const [showGlobalRefundMenu, setShowGlobalRefundMenu] = useState(false);

  async function loadData() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchClaims();
      setClaims(data);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Gagal memuat daftar pengajuan klaim.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const stats = useMemo(() => computeClaimStats(claims), [claims]);
  const filteredClaims = useMemo(
    () => filterClaims(claims, searchQuery, statusFilter, branchFilter),
    [claims, searchQuery, statusFilter, branchFilter],
  );

  async function handleStatusChange(ticketNumber: string, nextStatus: ClaimStatus) {
    setActionError(null);
    setUpdatingTicket(ticketNumber);
    const currentClaim = claims.find((item) => item.ticketNumber === ticketNumber);
    try {
      const updated = await updateClaimStatus(ticketNumber, nextStatus, currentClaim);
      setClaims((prev) =>
        prev.map((item) => (item.ticketNumber === ticketNumber ? updated : item)),
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Gagal memperbarui status pengajuan.',
      );
    } finally {
      setUpdatingTicket(null);
    }
  }

  function handleRefundUpdated(updated: ClaimRecord) {
    setClaims((prev) =>
      prev.map((item) =>
        item.ticketNumber === updated.ticketNumber ? updated : item,
      ),
    );
  }

  function handleExportCsv() {
    const csvContent = buildClaimsCsv(filteredClaims);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateSlug = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `klaim-kelebihan-pembayaran-${dateSlug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 space-y-8">
      {/* Header Konteks Admin */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8C5E5E]">
            Portal Administrator Keuangan
          </p>
          <h1 className="mt-1.5 text-3xl font-extrabold tracking-[-0.04em] text-[#8E1616] sm:text-5xl">
            Verifikasi Klaim Siswa
          </h1>
          <p className="mt-2 text-sm text-[#7E5454]">
            Sumber data:{' '}
            <span className="font-semibold text-[#3D0C0C]">
              {isGasConfigured()
                ? 'Google Apps Script (Sheets & Drive)'
                : 'Penyimpanan Lokal Browser (Siap dihubungkan ke WEB_APP_URL)'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowGlobalRefundMenu(true)}
            disabled={claims.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-[#8E1616] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#731111] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            Upload Bukti Transfer Klaim
          </button>
          <button
            type="button"
            onClick={onOpenGasSetup}
            className="inline-flex items-center gap-2 rounded-full border border-[#8E1616]/20 bg-white px-4 py-2.5 text-xs font-semibold text-[#3D0C0C] hover:bg-[#FFF0F0] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5 text-[#8E1616]" aria-hidden="true" />
            Konfigurasi Apps Script
          </button>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-[#8E1616]/20 bg-white px-4 py-2.5 text-xs font-semibold text-[#3D0C0C] hover:bg-[#FFF0F0] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-[#8E1616] ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Muat Ulang
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredClaims.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-[#3D0C0C] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#2A0808] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Ekspor CSV
          </button>
        </div>
      </div>

      {/* Resume Statistik */}
      <section
        id="ringkasan-admin"
        aria-label="Resume statistik pengajuan klaim"
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-[20px] border border-[#8E1616]/10 bg-white p-6">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8C5E5E]">
            Total Klaim
          </p>
          <p
            data-testid="stat-total-klaim"
            className="mt-2 font-mono text-3xl font-extrabold text-[#8E1616] tabular-nums"
          >
            {stats.totalKlaim}
          </p>
          <p className="mt-1.5 text-xs text-[#7E5454] tabular-nums">
            {stats.selesaiDitransfer} selesai ditransfer
          </p>
        </div>

        <div className="rounded-[20px] border border-[#8E1616]/10 bg-white p-6">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8C5E5E]">
            Menunggu Verifikasi
          </p>
          <p
            data-testid="stat-menunggu"
            className="mt-2 font-mono text-3xl font-extrabold text-[#B22222] tabular-nums"
          >
            {stats.menungguVerifikasi}
          </p>
          <p className="mt-1.5 text-xs text-[#7E5454] tabular-nums">
            {stats.verifikasiAdmin > 0
              ? `${stats.verifikasiAdmin} dalam verifikasi admin`
              : 'Perlu pemeriksaan admin & finance'}
          </p>
        </div>

        <div className="rounded-[20px] border border-[#8E1616]/10 bg-white p-6">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8C5E5E]">
            Disetujui
          </p>
          <p
            data-testid="stat-disetujui"
            className="mt-2 font-mono text-3xl font-extrabold text-[#8E1616] tabular-nums"
          >
            {stats.disetujui}
          </p>
          <p className="mt-1.5 text-xs text-[#7E5454]">Siap diproses transfer balik</p>
        </div>

        <div className="rounded-[20px] border border-[#8E1616]/10 bg-white p-6">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8C5E5E]">
            Total Nominal
          </p>
          <p
            data-testid="stat-total-nominal"
            className="mt-2 font-mono text-2xl font-extrabold text-[#8E1616] tabular-nums"
          >
            {formatRupiah(stats.totalNominal)}
          </p>
          <p className="mt-2 text-xs text-[#7E5454]">Akumulasi seluruh klaim tercatat</p>
        </div>
      </section>

      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter, Pencarian, dan Tabel Daftar Pengajuan */}
      <section
        id="tabel-pengajuan"
        className="rounded-[20px] border border-[#8E1616]/10 bg-white overflow-hidden"
      >
        <div className="border-b border-[#8E1616]/10 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C5E5E]"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Cari pengajuan klaim"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor tiket, nama siswa, no. registrasi, ponsel, atau bank..."
                className="block w-full rounded-full border border-[#8E1616]/15 bg-[#FEF9F9]/50 py-2 pl-10 pr-4 text-sm text-[#3D0C0C] placeholder:text-[#A37A7A] focus:border-[#8E1616] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8E1616]/15"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                aria-label="Filter berdasarkan cabang"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="rounded-full border border-[#8E1616]/15 bg-white px-4 py-2 text-xs font-semibold text-[#3D0C0C] focus:border-[#8E1616] focus:outline-none focus:ring-2 focus:ring-[#8E1616]/15"
              >
                <option value="Semua">Semua Cabang</option>
                {BRANCH_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <span className="text-xs text-[#8C5E5E] tabular-nums whitespace-nowrap">
                Menampilkan {filteredClaims.length} dari {claims.length} data
              </span>
            </div>
          </div>

          {/* Filter Tab Status */}
          <div
            role="tablist"
            aria-label="Filter status pengajuan"
            className="flex items-center gap-1 overflow-x-auto rounded-full bg-[#FEF9F9] border border-[#8E1616]/10 p-1 w-full sm:w-fit"
          >
            {(['Semua', ...CLAIM_STATUS_OPTIONS.map((s) => s.value)] as const).map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    statusFilter === tab
                      ? 'bg-[#8E1616] text-white'
                      : 'text-[#7E5454] hover:text-[#8E1616]'
                  }`}
                >
                  {tab}
                </button>
              ),
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3" aria-busy="true">
            {[1, 2, 3].map((row) => (
              <div
                key={row}
                className="h-12 w-full animate-pulse rounded-xl bg-[#FEF9F9]"
              />
            ))}
          </div>
        ) : loadError ? (
          <div className="p-10 text-center space-y-3">
            <AlertCircle className="mx-auto h-8 w-8 text-[#8E1616]" aria-hidden="true" />
            <p className="text-sm font-semibold text-[#3D0C0C]">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadData()}
              className="rounded-full border border-[#8E1616]/20 bg-white px-4 py-2 text-xs font-semibold text-[#3D0C0C] hover:bg-[#FFF0F0] cursor-pointer"
            >
              Coba Muat Ulang
            </button>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-sm font-semibold text-[#3D0C0C]">
              Tidak ada pengajuan yang sesuai
            </p>
            <p className="text-xs text-[#7E5454]">
              Ubah kata kunci pencarian atau atur ulang filter status dan cabang.
            </p>
            {(searchQuery || statusFilter !== 'Semua' || branchFilter !== 'Semua') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('Semua');
                  setBranchFilter('Semua');
                }}
                className="mt-2 inline-flex rounded-full border border-[#8E1616]/20 bg-white px-4 py-1.5 text-xs font-semibold text-[#3D0C0C] hover:bg-[#FFF0F0] cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#8E1616]/10 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8C5E5E]">
                  <th scope="col" className="px-2.5 py-3.5 font-semibold whitespace-nowrap">
                    Tiket & Tanggal
                  </th>
                  <th scope="col" className="px-2.5 py-3.5 font-semibold whitespace-nowrap">
                    Siswa
                  </th>
                  <th scope="col" className="px-2.5 py-3.5 font-semibold whitespace-nowrap">
                    Cabang & Program
                  </th>
                  <th scope="col" className="px-2.5 py-3.5 font-semibold whitespace-nowrap">
                    Periode
                  </th>
                  <th scope="col" className="px-2.5 py-3.5 font-semibold whitespace-nowrap">
                    Rekening Tujuan
                  </th>
                  <th scope="col" className="px-2.5 py-3.5 font-semibold text-right whitespace-nowrap">
                    Nominal Klaim
                  </th>
                  <th scope="col" className="px-2.5 py-3.5 font-semibold whitespace-nowrap">
                    Bukti Transfer
                  </th>
                  <th scope="col" className="px-2.5 py-3.5 font-semibold whitespace-nowrap">
                    Persetujuan Status
                  </th>
                  <th scope="col" className="px-2.5 py-3.5 font-semibold whitespace-nowrap">
                    Transfer & Ponsel
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8E1616]/5 bg-white">
                {filteredClaims.map((claim) => (
                  <tr
                    key={claim.ticketNumber}
                    className="hover:bg-[#FEF9F9]/80 transition-colors"
                  >
                    <td className="px-2.5 py-4 align-top whitespace-nowrap">
                      <div className="font-mono text-xs font-semibold text-[#3D0C0C] tabular-nums">
                        {claim.ticketNumber}
                      </div>
                      <div className="mt-0.5 text-xs text-[#8C5E5E] tabular-nums">
                        {formatIndonesianDateTime(claim.createdAt)}
                      </div>
                    </td>

                    <td className="px-2.5 py-4 align-top">
                      <div className="font-semibold text-[#3D0C0C]">{claim.namaSiswa}</div>
                      <div className="mt-0.5 font-mono text-xs text-[#7E5454] tabular-nums">
                        Reg {claim.nomorRegistrasi} · {claim.nomorPonsel}
                      </div>
                    </td>

                    <td className="px-2.5 py-4 align-top">
                      <div className="font-medium text-[#3D0C0C]">{claim.cabang}</div>
                      <div
                        className="mt-0.5 text-xs text-[#7E5454] max-w-[160px] truncate"
                        title={claim.programKursus}
                      >
                        {claim.programKursus}
                      </div>
                    </td>

                    <td className="px-2.5 py-4 align-top whitespace-nowrap">
                      <span className="font-mono text-xs font-medium text-[#3D0C0C] tabular-nums">
                        {claim.periode?.trim() || '-'}
                      </span>
                    </td>

                    <td className="px-2.5 py-4 align-top">
                      <div className="font-medium text-[#3D0C0C]">
                        {claim.namaBank} ·{' '}
                        <span className="font-mono text-xs tabular-nums">
                          {claim.nomorRekening}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-[#7E5454]">
                        {claim.namaPemilikRekening}
                      </div>
                    </td>

                    <td className="px-2.5 py-4 align-top text-right whitespace-nowrap">
                      <span className="font-mono font-bold text-[#8E1616] tabular-nums">
                        {formatRupiah(claim.nominalKlaim)}
                      </span>
                    </td>

                    <td className="px-2.5 py-4 align-top whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setPreviewClaim(claim)}
                        aria-label={`Pratinjau bukti ${claim.ticketNumber}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#8E1616]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#3D0C0C] hover:bg-[#FFF0F0] cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-[#8E1616]" aria-hidden="true" />
                        Pratinjau
                      </button>
                    </td>

                    <td className="px-2.5 py-4 align-top whitespace-nowrap">
                      <select
                        aria-label={`Status persetujuan ${claim.ticketNumber}`}
                        value={claim.status}
                        disabled={updatingTicket === claim.ticketNumber}
                        onChange={(e) =>
                          void handleStatusChange(
                            claim.ticketNumber,
                            e.target.value as ClaimStatus,
                          )
                        }
                        className={`w-36 rounded-lg border px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#8E1616]/20 cursor-pointer ${
                          STATUS_SELECT_STYLES[claim.status]
                        }`}
                      >
                        {CLAIM_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-2.5 py-4 align-top whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setRefundClaim(claim)}
                        aria-label={`Upload bukti transfer dan kirim ke ${claim.namaSiswa}`}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                          claim.buktiTransferPengembalian
                            ? 'border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                            : 'bg-[#8E1616] text-white hover:bg-[#731111]'
                        }`}
                      >
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        {claim.buktiTransferPengembalian
                          ? 'Terkirim / Ubah'
                          : 'Upload & Kirim'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {previewClaim && (
        <ProofPreviewModal
          claim={previewClaim}
          onClose={() => setPreviewClaim(null)}
        />
      )}

      {(refundClaim || showGlobalRefundMenu) && (
        <RefundTransferModal
          claim={refundClaim}
          claims={showGlobalRefundMenu ? claims : undefined}
          onUpdated={handleRefundUpdated}
          onClose={() => {
            setRefundClaim(null);
            setShowGlobalRefundMenu(false);
          }}
        />
      )}
    </div>
  );
}
