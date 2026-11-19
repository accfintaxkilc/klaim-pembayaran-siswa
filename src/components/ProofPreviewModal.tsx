import { useState } from 'react';
import { Download, ExternalLink, FileText, X } from 'lucide-react';
import type { ClaimRecord, ProofFile } from '../types/claim';
import { formatFileSize, formatIndonesianDateTime, formatRupiah, getDriveRenderUrl } from '../utils/claimHelpers';

interface ProofPreviewModalProps {
  claim: ClaimRecord;
  onClose: () => void;
}

function ProofViewer({ title, file }: { title: string; file: ProofFile }) {
  const isPdf =
    file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const rawUrl = file.dataUrl || file.remoteUrl || '';
  const renderUrl = rawUrl.startsWith('data:')
    ? rawUrl
    : getDriveRenderUrl(rawUrl, isPdf ? 'application/pdf' : file.mimeType);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-[#3D0C0C]">{title}</h3>
          <p className="text-xs text-[#8C5E5E] tabular-nums">
            {file.name}
            {file.size > 0 ? ` · ${formatFileSize(file.size)}` : ''}
          </p>
        </div>
        {rawUrl && (
          <div className="flex items-center gap-2">
            <a
              href={rawUrl}
              download={file.name}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#8E1616]/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#3D0C0C] hover:bg-[#FFF0F0] whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5 text-[#8E1616]" aria-hidden="true" />
              Unduh
            </a>
            {file.remoteUrl && (
              <a
                href={file.remoteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#8E1616]/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#3D0C0C] hover:bg-[#FFF0F0] whitespace-nowrap shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#8E1616]" aria-hidden="true" />
                Buka Drive
              </a>
            )}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#8E1616]/10 bg-[#FEF9F9]">
        {isPdf ? (
          renderUrl ? (
            <iframe
              title={title}
              src={renderUrl}
              className="h-80 w-full bg-white"
            />
          ) : (
            <div className="flex h-56 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-[#7E5454]">
              <FileText className="h-10 w-10 text-[#8E1616]" aria-hidden="true" />
              <p className="font-semibold text-[#3D0C0C]">{file.name}</p>
              <p className="text-xs text-[#8C5E5E]">
                Gunakan tombol Unduh atau Buka Drive untuk melihat dokumen PDF ini.
              </p>
            </div>
          )
        ) : renderUrl ? (
          <img
            src={renderUrl}
            alt={title}
            referrerPolicy="no-referrer"
            className="max-h-96 w-full object-contain bg-white p-2"
          />
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-[#8C5E5E]">
            Pratinjau tidak tersedia.
          </div>
        )}
      </div>
    </div>
  );
}

export function ProofPreviewModal({ claim, onClose }: ProofPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'awal' | 'refund'>('awal');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="proof-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D0C0C]/45 p-4 backdrop-blur-[2px]"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[20px] border border-[#8E1616]/15 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#8E1616]/10 bg-white px-6 py-4">
          <div>
            <p className="font-mono text-xs font-semibold text-[#8E1616] tabular-nums">
              {claim.ticketNumber}
            </p>
            <h2 id="proof-modal-title" className="text-lg font-extrabold tracking-tight text-[#3D0C0C]">
              Pratinjau Bukti & Detail Klaim
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pratinjau bukti"
            className="rounded-full border border-[#8E1616]/15 p-2 text-[#8C5E5E] hover:bg-[#FFF0F0] hover:text-[#8E1616] cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Ringkasan informasi klaim */}
          <dl className="grid grid-cols-1 gap-4 rounded-2xl border border-[#8E1616]/10 bg-[#FEF9F9] p-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8C5E5E]">
                Siswa
              </dt>
              <dd className="mt-0.5 font-semibold text-[#3D0C0C]">{claim.namaSiswa}</dd>
              <dd className="font-mono text-xs text-[#7E5454] tabular-nums">
                Reg: {claim.nomorRegistrasi} · {claim.nomorPonsel}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8C5E5E]">
                Cabang, Program &amp; Periode
              </dt>
              <dd className="mt-0.5 font-medium text-[#3D0C0C]">{claim.cabang}</dd>
              <dd className="text-xs text-[#7E5454]">{claim.programKursus}</dd>
              <dd className="mt-0.5 font-mono text-xs text-[#8C5E5E] tabular-nums">
                Periode: {claim.periode?.trim() || '-'}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8C5E5E]">
                Nominal & Rekening
              </dt>
              <dd className="mt-0.5 font-mono font-bold text-[#8E1616] tabular-nums">
                {formatRupiah(claim.nominalKlaim)}
              </dd>
              <dd className="text-xs text-[#7E5454]">
                {claim.namaBank} {claim.nomorRekening} ({claim.namaPemilikRekening})
              </dd>
            </div>
            <div className="sm:col-span-3 border-t border-[#8E1616]/10 pt-3">
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8C5E5E]">
                Alasan Pengajuan Klaim
              </dt>
              <dd className="mt-1 text-[#3D0C0C] leading-relaxed">{claim.alasanKlaim}</dd>
              <dd className="mt-1 text-xs text-[#8C5E5E] tabular-nums">
                Diajukan: {formatIndonesianDateTime(claim.createdAt)} · Status: {claim.status}
              </dd>
            </div>
          </dl>

          {claim.buktiTransferPengembalian && (
            <div className="flex items-center gap-1 rounded-full bg-[#FEF9F9] border border-[#8E1616]/10 p-1 w-fit">
              <button
                type="button"
                onClick={() => setActiveTab('awal')}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'awal'
                    ? 'bg-[#8E1616] text-white'
                    : 'text-[#7E5454] hover:text-[#8E1616]'
                }`}
              >
                Bukti Transfer Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('refund')}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'refund'
                    ? 'bg-[#8E1616] text-white'
                    : 'text-[#7E5454] hover:text-[#8E1616]'
                }`}
              >
                Bukti Transfer Pengembalian
              </button>
            </div>
          )}

          {activeTab === 'awal' || !claim.buktiTransferPengembalian ? (
            <ProofViewer
              title="Bukti Transfer Sebelumnya (Dari Siswa)"
              file={claim.buktiTransferSebelumnya}
            />
          ) : (
            <ProofViewer
              title="Bukti Transfer Pengembalian Dana (Dari Finance)"
              file={claim.buktiTransferPengembalian}
            />
          )}
        </div>
      </div>
    </div>
  );
}
