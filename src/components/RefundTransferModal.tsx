import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Send,
  Share2,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {
  ALLOWED_PROOF_MIME_TYPES,
  MAX_PROOF_FILE_SIZE_BYTES,
  WHATSAPP_GROUP_URL,
} from '../config/gasConfig';
import {
  fileToProofPayload,
  uploadRefundProofAndNotify,
} from '../services/claimsService';
import type { ClaimRecord, ProofFile } from '../types/claim';
import {
  buildWhatsAppRefundMessage,
  buildWhatsAppShareTextUrl,
  buildWhatsAppUrl,
  formatFileSize,
  formatRupiah,
  normalizePhoneToWa,
} from '../utils/claimHelpers';

interface RefundTransferModalProps {
  claim: ClaimRecord | null;
  claims?: ClaimRecord[];
  onUpdated: (updated: ClaimRecord) => void;
  onClose: () => void;
}

async function proofFileToFileObject(proof: ProofFile): Promise<File> {
  const response = await fetch(proof.dataUrl);
  const blob = await response.blob();
  return new File([blob], proof.name, { type: proof.mimeType || blob.type });
}

async function copyImageProofToClipboard(proof: ProofFile): Promise<void> {
  if (!proof.mimeType.startsWith('image/') || !navigator.clipboard?.write) {
    throw new Error('Browser tidak mendukung salin gambar langsung.');
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Gagal memuat gambar lampiran.'));
    img.src = proof.dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || 800;
  canvas.height = img.naturalHeight || 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Kanvas tidak tersedia.');
  ctx.drawImage(img, 0, 0);

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Gagal mengonversi gambar ke PNG.'));
    }, 'image/png');
  });

  await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
}

export function RefundTransferModal({
  claim: initialClaim,
  claims = [],
  onUpdated,
  onClose,
}: RefundTransferModalProps) {
  const selectableClaims = claims.length > 0 ? claims : initialClaim ? [initialClaim] : [];
  const [selectedTicket, setSelectedTicket] = useState<string>(
    initialClaim?.ticketNumber ??
      selectableClaims.find((c) => c.status === 'Disetujui')?.ticketNumber ??
      selectableClaims[0]?.ticketNumber ??
      '',
  );

  const claim =
    selectableClaims.find((c) => c.ticketNumber === selectedTicket) ??
    initialClaim ??
    selectableClaims[0];

  const [refundProof, setRefundProof] = useState<ProofFile | null>(
    claim?.buktiTransferPengembalian ?? null,
  );
  const [note, setNote] = useState(claim?.catatanPengembalian ?? '');
  const [message, setMessage] = useState(() =>
    claim
      ? buildWhatsAppRefundMessage(
          claim,
          claim.buktiTransferPengembalian?.name,
          claim.catatanPengembalian,
        )
      : '',
  );
  const [sendToGroup, setSendToGroup] = useState(true);
  const [sendToPhone, setSendToPhone] = useState(true);
  const [markAsTransferred, setMarkAsTransferred] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [completedRecord, setCompletedRecord] = useState<ClaimRecord | null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedImg, setCopiedImg] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [copiedDriveLink, setCopiedDriveLink] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!claim) {
    return null;
  }

  function handleSelectTicket(ticket: string) {
    setSelectedTicket(ticket);
    const nextClaim = selectableClaims.find((c) => c.ticketNumber === ticket);
    if (nextClaim) {
      setRefundProof(nextClaim.buktiTransferPengembalian ?? null);
      setNote(nextClaim.catatanPengembalian ?? '');
      setMessage(
        buildWhatsAppRefundMessage(
          nextClaim,
          nextClaim.buktiTransferPengembalian?.name,
          nextClaim.catatanPengembalian,
        ),
      );
      setCompletedRecord(null);
      setError(null);
      setShareFeedback(null);
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !ALLOWED_PROOF_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_PROOF_MIME_TYPES)[number],
      )
    ) {
      setError('Format file harus JPG, PNG, atau PDF.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_PROOF_FILE_SIZE_BYTES) {
      setError('Ukuran berkas maksimal 5 MB.');
      e.target.value = '';
      return;
    }

    try {
      const payload = await fileToProofPayload(file);
      setRefundProof(payload);
      setMessage(buildWhatsAppRefundMessage(claim, payload.name, note));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membaca berkas.');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!refundProof) {
      setError('Unggah bukti transfer pengembalian terlebih dahulu.');
      return;
    }
    if (!sendToGroup && !sendToPhone) {
      setError('Pilih minimal satu tujuan pengiriman (Grup WhatsApp atau Nomor Ponsel Siswa).');
      return;
    }
    if (!message.trim()) {
      setError('Pesan notifikasi tidak boleh kosong.');
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      const updated = await uploadRefundProofAndNotify({
        claim,
        refundProof,
        message: message.trim(),
        note,
        markAsTransferred,
        sendToGroup,
        sendToPhone,
      });
      onUpdated(updated);
      setCompletedRecord(updated);
      const nextMessage = updated.pesanNotifikasiTerkirim || message.trim();
      if (updated.pesanNotifikasiTerkirim) {
        setMessage(updated.pesanNotifikasiTerkirim);
      }
      if (updated.buktiTransferPengembalian) {
        setRefundProof(updated.buktiTransferPengembalian);
      }
      if (sendToGroup && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(nextMessage);
          setCopiedMsg(true);
          setShareFeedback('Teks rincian klaim disalin ke clipboard. Siap ditempel (Ctrl+V) di Grup WhatsApp.');
        } catch {
          // Abaikan jika izin clipboard dibatasi
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan bukti pengembalian dana.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  const finalMessage = completedRecord?.pesanNotifikasiTerkirim ?? message;
  const savedAttachment = completedRecord?.buktiTransferPengembalian ?? refundProof;
  const waShareTextUrl = buildWhatsAppShareTextUrl(finalMessage);

  async function handleCopyMessage() {
    try {
      await navigator.clipboard.writeText(finalMessage);
      setCopiedMsg(true);
      setShareFeedback('Teks rincian klaim (nama s.d. nominal) disalin. Tempel (Ctrl+V) di Grup WhatsApp.');
      setTimeout(() => setCopiedMsg(false), 2500);
    } catch {
      // Abaikan
    }
  }

  async function handleCopyShareLink() {
    try {
      await navigator.clipboard.writeText(waShareTextUrl);
      setCopiedShareLink(true);
      setShareFeedback('Link pesan WA (wa.me/?text=...) disalin. Saat dibuka, rincian klaim langsung terisi otomatis.');
      setTimeout(() => setCopiedShareLink(false), 2500);
    } catch {
      // Abaikan
    }
  }

  async function handleCopyDriveLink() {
    if (!savedAttachment?.remoteUrl) return;
    try {
      await navigator.clipboard.writeText(savedAttachment.remoteUrl);
      setCopiedDriveLink(true);
      setShareFeedback('Tautan bukti transfer Google Drive disalin.');
      setTimeout(() => setCopiedDriveLink(false), 2500);
    } catch {
      // Abaikan
    }
  }

  async function handleCopyImage() {
    if (!savedAttachment) return;
    try {
      await copyImageProofToClipboard(savedAttachment);
      setCopiedImg(true);
      setShareFeedback('Gambar bukti disalin ke clipboard (menggantikan teks). Tempel (Ctrl+V) gambar di grup, lalu salin teks rincian jika belum terkirim.');
      setTimeout(() => setCopiedImg(false), 3000);
    } catch (err) {
      setShareFeedback(
        err instanceof Error
          ? err.message
          : 'Salin gambar tidak tersedia; gunakan tombol Unduh Bukti.',
      );
    }
  }

  async function handleShareFile() {
    if (!savedAttachment || !navigator.share) return;
    try {
      const fileObj = await proofFileToFileObject(savedAttachment);
      if (navigator.canShare && !navigator.canShare({ files: [fileObj] })) {
        setShareFeedback('Perangkat tidak mendukung lampiran file langsung; gunakan Salin Gambar atau Unduh Bukti.');
        return;
      }
      await navigator.share({
        title: `Bukti Pengembalian ${claim.ticketNumber}`,
        text: finalMessage,
        files: [fileObj],
      });
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        setShareFeedback('Gagal membuka menu berbagi file perangkat.');
      }
    }
  }

  const normalizedPhone = normalizePhoneToWa(claim.nomorPonsel);
  const waUrl = buildWhatsAppUrl(claim.nomorPonsel, finalMessage);
  const canWebShareFiles = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D0C0C]/45 p-4 backdrop-blur-[2px]"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[20px] border border-[#8E1616]/15 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#8E1616]/10 bg-white px-6 py-4">
          <div>
            <p className="font-mono text-xs font-semibold text-[#8E1616] tabular-nums">
              {claim.ticketNumber}
            </p>
            <h2 id="refund-modal-title" className="text-lg font-extrabold tracking-tight text-[#3D0C0C]">
              Upload Bukti Transfer Klaim & Kirim Pesan
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal upload bukti transfer"
            className="rounded-full border border-[#8E1616]/15 p-2 text-[#8C5E5E] hover:bg-[#FFF0F0] hover:text-[#8E1616] cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {claims.length > 0 && !completedRecord && (
            <div>
              <label
                htmlFor="refund-ticket-selector"
                className="block text-sm font-semibold text-[#3D0C0C]"
              >
                Pilih Tiket Pengajuan Siswa
              </label>
              <select
                id="refund-ticket-selector"
                value={claim.ticketNumber}
                onChange={(e) => handleSelectTicket(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-[#8E1616]/15 bg-white px-3.5 py-2.5 text-sm text-[#3D0C0C] focus:border-[#8E1616] focus:outline-none focus:ring-2 focus:ring-[#8E1616]/15"
              >
                {selectableClaims.map((item) => (
                  <option key={item.ticketNumber} value={item.ticketNumber}>
                    {item.ticketNumber} — {item.namaSiswa} ({formatRupiah(item.nominalKlaim)}) · {item.status}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Info Tujuan Transfer & Nomor Ponsel Terekam */}
          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[#8E1616]/10 bg-[#FEF9F9] p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8C5E5E]">
                Penerima & Nomor Ponsel Terekam
              </p>
              <p className="mt-0.5 font-semibold text-[#3D0C0C]">{claim.namaSiswa}</p>
              <p className="font-mono text-xs font-semibold text-[#8E1616] tabular-nums">
                {claim.nomorPonsel} (WA: +{normalizedPhone})
              </p>
              <p className="mt-0.5 text-xs text-[#7E5454] tabular-nums">
                {claim.cabang} · Periode: {claim.periode?.trim() || '-'}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8C5E5E]">
                Rekening Tujuan & Nominal
              </p>
              <p className="mt-0.5 font-mono font-bold text-[#8E1616] tabular-nums">
                {formatRupiah(claim.nominalKlaim)}
              </p>
              <p className="text-xs text-[#7E5454]">
                {claim.namaBank} · {claim.nomorRekening} (a.n. {claim.namaPemilikRekening})
              </p>
            </div>
          </div>

          {completedRecord ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-semibold">
                    Bukti transfer tersimpan & pesan rincian klaim siap dikirim.
                  </p>
                  <p className="text-xs leading-relaxed text-emerald-800">
                    Tautan undangan grup (<code className="font-mono">chat.whatsapp.com</code>) tidak
                    mendukung pengisian teks otomatis dari URL. Gunakan tombol{' '}
                    <strong>Pilih Grup & Kirim Teks Otomatis</strong> agar rincian nama hingga
                    nominal langsung terisi di WhatsApp, atau salin teks di bawah ini lalu tempel
                    (<kbd className="rounded bg-white/80 px-1">Ctrl+V</kbd>) di dalam grup.
                  </p>
                </div>
              </div>

              {/* Pratinjau Teks Rincian Klaim yang Dapat Disalin */}
              <div className="rounded-2xl border border-[#8E1616]/15 bg-[#FEF9F9] p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8C5E5E]">
                    Rincian Klaim untuk Grup & Siswa
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#8E1616]/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#3D0C0C] hover:bg-[#FFF0F0] cursor-pointer"
                    >
                      {copiedMsg ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                          Rincian Disalin
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-[#8E1616]" aria-hidden="true" />
                          Salin Rincian Klaim
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopyShareLink()}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#8E1616]/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#3D0C0C] hover:bg-[#FFF0F0] cursor-pointer"
                    >
                      {copiedShareLink ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                          Link WA Disalin
                        </>
                      ) : (
                        <>
                          <Link2 className="h-3.5 w-3.5 text-[#8E1616]" aria-hidden="true" />
                          Salin Link Pesan WA
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <pre
                  data-testid="completed-claim-message"
                  className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-[#8E1616]/10 bg-white p-3 font-sans text-xs leading-relaxed text-[#3D0C0C]"
                >
                  {finalMessage}
                </pre>
              </div>

              {savedAttachment && (
                <div className="flex flex-col gap-3 rounded-2xl border border-[#8E1616]/15 bg-[#FEF9F9] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {savedAttachment.mimeType.startsWith('image/') ? (
                      <img
                        src={savedAttachment.dataUrl}
                        alt={`Lampiran ${savedAttachment.name}`}
                        referrerPolicy="no-referrer"
                        className="h-14 w-14 shrink-0 rounded-xl border border-[#8E1616]/15 object-cover bg-white"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#8E1616]/15 bg-white text-[#8E1616]">
                        <FileText className="h-6 w-6" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#3D0C0C]">
                        {savedAttachment.name}
                      </p>
                      <p className="text-xs text-[#8C5E5E] tabular-nums">
                        {savedAttachment.size > 0 ? formatFileSize(savedAttachment.size) : 'Lampiran siap'}
                        {savedAttachment.remoteUrl
                          ? ' · Link Google Drive tersedia'
                          : ' · Hubungkan WEB_APP_URL untuk link Google Drive'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {savedAttachment.remoteUrl && (
                      <button
                        type="button"
                        onClick={() => void handleCopyDriveLink()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#8E1616]/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#3D0C0C] hover:bg-[#FFF0F0] cursor-pointer"
                      >
                        {copiedDriveLink ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                            Link Drive Disalin
                          </>
                        ) : (
                          <>
                            <Link2 className="h-3.5 w-3.5 text-[#8E1616]" aria-hidden="true" />
                            Salin Link Bukti Drive
                          </>
                        )}
                      </button>
                    )}

                    {savedAttachment.mimeType.startsWith('image/') && (
                      <button
                        type="button"
                        onClick={() => void handleCopyImage()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#8E1616]/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#3D0C0C] hover:bg-[#FFF0F0] cursor-pointer"
                      >
                        {copiedImg ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                            Gambar Disalin
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-[#8E1616]" aria-hidden="true" />
                            Salin Gambar Bukti
                          </>
                        )}
                      </button>
                    )}

                    <a
                      href={savedAttachment.dataUrl || savedAttachment.remoteUrl}
                      download={savedAttachment.name}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#8E1616]/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#3D0C0C] hover:bg-[#FFF0F0]"
                    >
                      <Download className="h-3.5 w-3.5 text-[#8E1616]" aria-hidden="true" />
                      Unduh Bukti
                    </a>

                    {canWebShareFiles && (
                      <button
                        type="button"
                        onClick={() => void handleShareFile()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#8E1616]/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#3D0C0C] hover:bg-[#FFF0F0] cursor-pointer"
                      >
                        <Share2 className="h-3.5 w-3.5 text-[#8E1616]" aria-hidden="true" />
                        Bagikan File
                      </button>
                    )}
                  </div>
                </div>
              )}

              {shareFeedback && (
                <p className="text-xs font-medium text-[#8E1616]">{shareFeedback}</p>
              )}

              <div className="flex flex-col gap-3 border-t border-[#8E1616]/10 pt-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  {sendToGroup && (
                    <>
                      <a
                        href={waShareTextUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#8E1616] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#731111] whitespace-nowrap shrink-0"
                      >
                        <Send className="h-4 w-4" aria-hidden="true" />
                        Pilih Grup & Kirim Teks Otomatis
                      </a>
                      <a
                        href={WHATSAPP_GROUP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-[#8E1616] bg-white px-5 py-2.5 text-sm font-semibold text-[#8E1616] transition-colors hover:bg-[#FFF0F0] whitespace-nowrap shrink-0"
                      >
                        <Users className="h-4 w-4" aria-hidden="true" />
                        Buka Grup Tujuan
                      </a>
                    </>
                  )}

                  {sendToPhone && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 whitespace-nowrap shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      Kirim ke WhatsApp Siswa ({claim.nomorPonsel})
                    </a>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-[#8E1616]/20 bg-white px-5 py-2 text-xs font-semibold text-[#3D0C0C] hover:bg-[#FFF0F0] cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="refund-proof-input"
                  className="block text-sm font-semibold text-[#3D0C0C]"
                >
                  Upload Bukti Transfer Pengembalian (JPG / PNG / PDF){' '}
                  <span className="text-[#8E1616]">*</span>
                </label>

                <input
                  ref={fileInputRef}
                  id="refund-proof-input"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  onChange={handleFileChange}
                  className="sr-only"
                />

                {!refundProof ? (
                  <label
                    htmlFor="refund-proof-input"
                    className="mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#8E1616]/20 bg-[#FEF9F9] px-6 py-4 text-center transition-colors hover:border-[#8E1616]/50 hover:bg-[#FFF0F0]/50"
                  >
                    <Upload className="h-5 w-5 text-[#8E1616]" aria-hidden="true" />
                    <span className="mt-2 text-sm font-semibold text-[#3D0C0C]">
                      Pilih bukti transfer pengembalian dana
                    </span>
                    <span className="mt-1 text-xs text-[#8C5E5E]">
                      JPG, PNG, atau PDF · Maksimal 5 MB
                    </span>
                  </label>
                ) : (
                  <div className="mt-1.5 flex items-center justify-between gap-4 rounded-2xl border border-[#8E1616]/15 bg-[#FEF9F9] p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {refundProof.mimeType.startsWith('image/') ? (
                        <img
                          src={refundProof.dataUrl}
                          alt={`Bukti pengembalian ${refundProof.name}`}
                          referrerPolicy="no-referrer"
                          className="h-11 w-11 shrink-0 rounded-xl border border-[#8E1616]/15 object-cover bg-white"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#8E1616]/15 bg-white text-[#8E1616]">
                          <FileText className="h-5 w-5" aria-hidden="true" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#3D0C0C]">
                          {refundProof.name}
                        </p>
                        <p className="text-xs text-[#8C5E5E] tabular-nums">
                          {refundProof.size > 0
                            ? `${formatFileSize(refundProof.size)} · `
                            : ''}
                          Siap dikirim
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRefundProof(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-[#8E1616]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#3D0C0C] hover:bg-[#FFF0F0] hover:text-[#8E1616] cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Ganti
                    </button>
                  </div>
                )}
              </div>

              {/* Opsi Tujuan Pengiriman */}
              <fieldset className="rounded-2xl border border-[#8E1616]/10 bg-[#FEF9F9] p-4 space-y-2.5">
                <legend className="px-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8C5E5E]">
                  Opsi Tujuan Pengiriman Bukti & Pesan
                </legend>
                <label className="flex items-start gap-2.5 text-sm text-[#3D0C0C] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendToGroup}
                    onChange={(e) => setSendToGroup(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#8E1616]/30 accent-[#8E1616]"
                  />
                  <span>
                    <strong className="font-semibold">Kirim ke Grup WhatsApp</strong>
                    <span className="block font-mono text-[11px] text-[#7E5454] break-all">
                      {WHATSAPP_GROUP_URL}
                    </span>
                  </span>
                </label>
                <label className="flex items-center gap-2.5 text-sm text-[#3D0C0C] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendToPhone}
                    onChange={(e) => setSendToPhone(e.target.checked)}
                    className="h-4 w-4 rounded border-[#8E1616]/30 accent-[#8E1616]"
                  />
                  <span>
                    <strong className="font-semibold">Kirim ke Nomor Ponsel Siswa</strong>{' '}
                    <span className="font-mono text-xs text-[#7E5454]">({claim.nomorPonsel})</span>
                  </span>
                </label>
              </fieldset>

              <div>
                <label htmlFor="refund-note" className="block text-sm font-semibold text-[#3D0C0C]">
                  Catatan Internal / Referensi Bank (Opsional)
                </label>
                <input
                  id="refund-note"
                  type="text"
                  value={note}
                  onChange={(e) => {
                    const nextNote = e.target.value;
                    setNote(nextNote);
                    setMessage(buildWhatsAppRefundMessage(claim, refundProof?.name, nextNote));
                  }}
                  placeholder="Contoh: Transfer via BCA Bisnis Ref #99201"
                  className="mt-1.5 block w-full rounded-xl border border-[#8E1616]/15 bg-white px-3.5 py-2 text-sm text-[#3D0C0C] placeholder:text-[#A37A7A] focus:border-[#8E1616] focus:outline-none focus:ring-2 focus:ring-[#8E1616]/15"
                />
              </div>

              <div>
                <label htmlFor="refund-wa-message" className="block text-sm font-semibold text-[#3D0C0C]">
                  Pratinjau Pesan Rincian Klaim (Nama s.d. Nominal)
                </label>
                <textarea
                  id="refund-wa-message"
                  rows={8}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-[#8E1616]/15 bg-white px-3.5 py-2.5 text-xs leading-relaxed text-[#3D0C0C] focus:border-[#8E1616] focus:outline-none focus:ring-2 focus:ring-[#8E1616]/15"
                />
              </div>

              <label className="flex items-center gap-2.5 text-sm text-[#3D0C0C] cursor-pointer">
                <input
                  type="checkbox"
                  checked={markAsTransferred}
                  onChange={(e) => setMarkAsTransferred(e.target.checked)}
                  className="h-4 w-4 rounded border-[#8E1616]/30 accent-[#8E1616]"
                />
                Otomatis ubah status klaim menjadi <strong>Selesai / Ditransfer</strong>
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-[#8E1616]/10 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-[#8E1616]/20 bg-white px-5 py-2.5 text-sm font-semibold text-[#3D0C0C] hover:bg-[#FFF0F0] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#8E1616] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#731111] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {isSaving ? 'Menyimpan & Menyiapkan...' : 'Simpan Bukti & Kirim'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
