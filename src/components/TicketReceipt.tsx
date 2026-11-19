import { useState } from 'react';
import { Check, CheckCircle2, Copy, PlusCircle, Printer } from 'lucide-react';
import type { ClaimRecord } from '../types/claim';
import { formatIndonesianDateTime, formatRupiah } from '../utils/claimHelpers';

interface TicketReceiptProps {
  claim: ClaimRecord;
  onCreateAnother: () => void;
}

export function TicketReceipt({ claim, onCreateAnother }: TicketReceiptProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopyTicket() {
    try {
      await navigator.clipboard.writeText(claim.ticketNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Abaikan jika clipboard tidak tersedia
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-[20px] border border-[#8E1616]/10 bg-white p-6 sm:p-10">
        <div className="flex flex-col items-start gap-4 border-b border-[#8E1616]/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F0] text-[#8E1616] border border-[#8E1616]/15">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-[-0.03em] text-[#8E1616] sm:text-2xl">
                Pengajuan Klaim Berhasil Dikirim
              </h1>
              <p className="mt-1 text-sm text-[#7E5454]">
                Simpan nomor tiket di bawah ini sebagai bukti pengajuan Anda.
              </p>
            </div>
          </div>
        </div>

        {/* Kartu Nomor Tiket */}
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#8E1616]/15 bg-[#FEF9F9] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8C5E5E]">
              Nomor Tiket Pengajuan
            </p>
            <p
              data-testid="ticket-number"
              className="mt-1 font-mono text-2xl font-extrabold tracking-tight text-[#8E1616] tabular-nums sm:text-3xl"
            >
              {claim.ticketNumber}
            </p>
            <p className="mt-1 text-xs text-[#7E5454] tabular-nums">
              Diajukan pada {formatIndonesianDateTime(claim.createdAt)} · Status: {claim.status}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyTicket}
            className="no-print inline-flex items-center justify-center gap-2 rounded-full border border-[#8E1616]/20 bg-white px-4 py-2 text-xs font-semibold text-[#3D0C0C] transition-colors hover:bg-[#FFF0F0] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                Tersalin
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[#8E1616]" aria-hidden="true" />
                Salin Nomor Tiket
              </>
            )}
          </button>
        </div>

        {/* Ringkasan Data Tiket */}
        <dl className="mt-8 grid grid-cols-1 gap-x-6 gap-y-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8C5E5E]">
              Nama Lengkap Siswa
            </dt>
            <dd className="mt-1 font-semibold text-[#3D0C0C]">{claim.namaSiswa}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8C5E5E]">
              Nomor Registrasi
            </dt>
            <dd className="mt-1 font-mono font-medium text-[#3D0C0C] tabular-nums">
              {claim.nomorRegistrasi}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8C5E5E]">
              Nomor Ponsel
            </dt>
            <dd className="mt-1 font-mono font-medium text-[#3D0C0C] tabular-nums">
              {claim.nomorPonsel}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8C5E5E]">
              Cabang, Program &amp; Periode
            </dt>
            <dd className="mt-1 font-medium text-[#3D0C0C]">
              {claim.cabang} · {claim.programKursus}
            </dd>
            {claim.periode && (
              <dd className="mt-0.5 font-mono text-xs text-[#7E5454] tabular-nums">
                Periode: {claim.periode}
              </dd>
            )}
          </div>
          <div>
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8C5E5E]">
              Rekening Tujuan Pengembalian
            </dt>
            <dd className="mt-1 font-medium text-[#3D0C0C]">
              {claim.namaBank} · <span className="font-mono tabular-nums">{claim.nomorRekening}</span>
            </dd>
            <dd className="text-xs text-[#7E5454]">a.n. {claim.namaPemilikRekening}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8C5E5E]">
              Nominal Klaim Kelebihan
            </dt>
            <dd className="mt-1 font-mono text-lg font-extrabold text-[#8E1616] tabular-nums">
              {formatRupiah(claim.nominalKlaim)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8C5E5E]">
              Lampiran Bukti Transfer
            </dt>
            <dd className="mt-1 text-[#3D0C0C]">{claim.buktiTransferSebelumnya.name}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8C5E5E]">
              Alasan Pengajuan
            </dt>
            <dd className="mt-1 leading-relaxed text-[#7E5454]">{claim.alasanKlaim}</dd>
          </div>
        </dl>

        <div className="no-print mt-8 flex flex-col gap-3 border-t border-[#8E1616]/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#8E1616]/20 bg-white px-5 py-2.5 text-sm font-semibold text-[#3D0C0C] transition-colors hover:bg-[#FFF0F0] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="h-4 w-4 text-[#8E1616]" aria-hidden="true" />
            Cetak Bukti Tiket
          </button>
          <button
            type="button"
            onClick={onCreateAnother}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#8E1616] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#731111] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            Ajukan Klaim Baru
          </button>
        </div>
      </div>
    </div>
  );
}
