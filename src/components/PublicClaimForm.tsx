import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ALLOWED_PROOF_MIME_TYPES,
  BANK_OPTIONS,
  BRANCH_OPTIONS,
  MAX_PROOF_FILE_SIZE_BYTES,
} from '../config/gasConfig';
import { fileToProofPayload, submitClaim } from '../services/claimsService';
import type { ClaimRecord, ClaimSubmissionInput, ProofFile } from '../types/claim';
import {
  formatFileSize,
  formatRupiah,
  parseRupiahInput,
  validateClaimForm,
} from '../utils/claimHelpers';

interface PublicClaimFormProps {
  onSubmitted: (record: ClaimRecord) => void;
}

export function PublicClaimForm({ onSubmitted }: PublicClaimFormProps) {
  const [namaSiswa, setNamaSiswa] = useState('');
  const [nomorRegistrasi, setNomorRegistrasi] = useState('');
  const [nomorPonsel, setNomorPonsel] = useState('');
  const [cabang, setCabang] = useState('');
  const [programKursus, setProgramKursus] = useState('');
  const [periode, setPeriode] = useState('');

  const [selectedBank, setSelectedBank] = useState('');
  const [customBank, setCustomBank] = useState('');
  const [nomorRekening, setNomorRekening] = useState('');
  const [namaPemilikRekening, setNamaPemilikRekening] = useState('');
  const [nominalKlaim, setNominalKlaim] = useState<number>(0);
  const [nominalDisplay, setNominalDisplay] = useState('');
  const [buktiFile, setBuktiFile] = useState<ProofFile | null>(null);
  const [alasanKlaim, setAlasanKlaim] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resolvedBank =
    selectedBank === 'Bank Lainnya' ? customBank.trim() : selectedBank;

  function clearFieldError(field: string) {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleNominalChange(e: ChangeEvent<HTMLInputElement>) {
    const parsed = parseRupiahInput(e.target.value);
    setNominalKlaim(parsed);
    setNominalDisplay(parsed > 0 ? formatRupiah(parsed) : '');
    clearFieldError('nominalKlaim');
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !ALLOWED_PROOF_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_PROOF_MIME_TYPES)[number],
      )
    ) {
      setErrors((prev) => ({
        ...prev,
        buktiTransferSebelumnya:
          'Format berkas tidak didukung. Gunakan file JPG, PNG, atau PDF.',
      }));
      e.target.value = '';
      return;
    }

    if (file.size > MAX_PROOF_FILE_SIZE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        buktiTransferSebelumnya: 'Ukuran berkas maksimal 5 MB.',
      }));
      e.target.value = '';
      return;
    }

    try {
      const payload = await fileToProofPayload(file);
      setBuktiFile(payload);
      clearFieldError('buktiTransferSebelumnya');
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        buktiTransferSebelumnya:
          err instanceof Error ? err.message : 'Gagal memuat file bukti transfer.',
      }));
    }
  }

  function handleRemoveFile() {
    setBuktiFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const payload: ClaimSubmissionInput = {
      namaSiswa,
      nomorRegistrasi,
      nomorPonsel,
      cabang,
      programKursus,
      periode,
      namaBank: resolvedBank,
      nomorRekening,
      namaPemilikRekening: namaPemilikRekening.toUpperCase(),
      nominalKlaim,
      alasanKlaim,
      buktiTransferSebelumnya: buktiFile,
    };

    const validationErrors = validateClaimForm(payload);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstErrorKey = Object.keys(validationErrors)[0];
      const el = document.getElementById(`field-${firstErrorKey}`);
      el?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await submitClaim(payload);
      onSubmitted(created);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Pengajuan gagal dikirim. Silakan coba beberapa saat lagi.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-10 max-w-3xl">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8C5E5E]">
          Layanan Keuangan Siswa
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[#8E1616] sm:text-5xl [text-wrap:balance]">
          Pengajuan Klaim Kelebihan Pembayaran
        </h1>
        <p className="mt-3 text-base leading-relaxed text-[#7E5454]">
          Lengkapi formulir di bawah ini dengan data siswa, rekening tujuan pengembalian, dan
          bukti transfer yang valid. Nomor tiket resmi akan diterbitkan setelah pengajuan dikirim.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-8 rounded-[20px] border border-[#8E1616]/10 bg-white p-6 sm:p-8 space-y-8"
        >
          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Bagian 1: Data Siswa & Program */}
          <section id="bagian-1" className="space-y-5">
            <div className="border-b border-[#8E1616]/10 pb-3">
              <h2 className="text-lg font-bold tracking-tight text-[#3D0C0C]">
                01. Data Siswa & Program
              </h2>
              <p className="mt-1 text-xs text-[#8C5E5E]">
                Pastikan nomor registrasi dan nomor ponsel aktif untuk menerima notifikasi status klaim.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="field-namaSiswa"
                  className="block text-sm font-semibold text-[#3D0C0C]"
                >
                  Nama Lengkap Siswa <span className="text-[#8E1616]">*</span>
                </label>
                <input
                  id="field-namaSiswa"
                  type="text"
                  value={namaSiswa}
                  onChange={(e) => {
                    setNamaSiswa(e.target.value);
                    clearFieldError('namaSiswa');
                  }}
                  placeholder="Masukkan nama lengkap siswa"
                  aria-invalid={Boolean(errors.namaSiswa)}
                  className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#3D0C0C] placeholder:text-[#A37A7A] focus:outline-none focus:ring-2 ${
                    errors.namaSiswa
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-[#8E1616]/15 focus:border-[#8E1616] focus:ring-[#8E1616]/15'
                  }`}
                />
                {errors.namaSiswa && (
                  <p className="mt-1.5 text-xs text-red-700">{errors.namaSiswa}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="field-nomorRegistrasi"
                  className="block text-sm font-semibold text-[#3D0C0C]"
                >
                  Nomor Registrasi <span className="text-[#8E1616]">*</span>
                </label>
                <input
                  id="field-nomorRegistrasi"
                  type="text"
                  value={nomorRegistrasi}
                  onChange={(e) => {
                    setNomorRegistrasi(e.target.value);
                    clearFieldError('nomorRegistrasi');
                  }}
                  placeholder="Contoh: 101010"
                  aria-invalid={Boolean(errors.nomorRegistrasi)}
                  className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-[#3D0C0C] placeholder:font-sans placeholder:text-[#A37A7A] focus:outline-none focus:ring-2 ${
                    errors.nomorRegistrasi
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-[#8E1616]/15 focus:border-[#8E1616] focus:ring-[#8E1616]/15'
                  }`}
                />
                {errors.nomorRegistrasi && (
                  <p className="mt-1.5 text-xs text-red-700">{errors.nomorRegistrasi}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="field-nomorPonsel"
                  className="block text-sm font-semibold text-[#3D0C0C]"
                >
                  Nomor Ponsel (WhatsApp) <span className="text-[#8E1616]">*</span>
                </label>
                <input
                  id="field-nomorPonsel"
                  type="tel"
                  inputMode="tel"
                  value={nomorPonsel}
                  onChange={(e) => {
                    setNomorPonsel(e.target.value);
                    clearFieldError('nomorPonsel');
                  }}
                  placeholder="Contoh: 081234567890"
                  aria-invalid={Boolean(errors.nomorPonsel)}
                  className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-[#3D0C0C] placeholder:font-sans placeholder:text-[#A37A7A] focus:outline-none focus:ring-2 ${
                    errors.nomorPonsel
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-[#8E1616]/15 focus:border-[#8E1616] focus:ring-[#8E1616]/15'
                  }`}
                />
                {errors.nomorPonsel && (
                  <p className="mt-1.5 text-xs text-red-700">{errors.nomorPonsel}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="field-cabang"
                  className="block text-sm font-semibold text-[#3D0C0C]"
                >
                  Cabang <span className="text-[#8E1616]">*</span>
                </label>
                <select
                  id="field-cabang"
                  value={cabang}
                  onChange={(e) => {
                    setCabang(e.target.value);
                    clearFieldError('cabang');
                  }}
                  aria-invalid={Boolean(errors.cabang)}
                  className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#3D0C0C] focus:outline-none focus:ring-2 ${
                    errors.cabang
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-[#8E1616]/15 focus:border-[#8E1616] focus:ring-[#8E1616]/15'
                  }`}
                >
                  <option value="">Pilih cabang kursus...</option>
                  {BRANCH_OPTIONS.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
                {errors.cabang && (
                  <p className="mt-1.5 text-xs text-red-700">{errors.cabang}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="field-programKursus"
                  className="block text-sm font-semibold text-[#3D0C0C]"
                >
                  Program Kursus <span className="text-[#8E1616]">*</span>
                </label>
                <input
                  id="field-programKursus"
                  type="text"
                  value={programKursus}
                  onChange={(e) => {
                    setProgramKursus(e.target.value);
                    clearFieldError('programKursus');
                  }}
                  placeholder="Contoh: IEP 1 Bulan Camp AC"
                  aria-invalid={Boolean(errors.programKursus)}
                  className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#3D0C0C] placeholder:text-[#A37A7A] focus:outline-none focus:ring-2 ${
                    errors.programKursus
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-[#8E1616]/15 focus:border-[#8E1616] focus:ring-[#8E1616]/15'
                  }`}
                />
                {errors.programKursus && (
                  <p className="mt-1.5 text-xs text-red-700">{errors.programKursus}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="field-periode"
                  className="block text-sm font-semibold text-[#3D0C0C]"
                >
                  Periode <span className="text-[#8E1616]">*</span>
                </label>
                <input
                  id="field-periode"
                  type="text"
                  value={periode}
                  onChange={(e) => {
                    setPeriode(e.target.value);
                    clearFieldError('periode');
                  }}
                  placeholder="Contoh: 01/01/2026"
                  aria-invalid={Boolean(errors.periode)}
                  className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-[#3D0C0C] placeholder:font-sans placeholder:text-[#A37A7A] focus:outline-none focus:ring-2 ${
                    errors.periode
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-[#8E1616]/15 focus:border-[#8E1616] focus:ring-[#8E1616]/15'
                  }`}
                />
                {errors.periode && (
                  <p className="mt-1.5 text-xs text-red-700">{errors.periode}</p>
                )}
              </div>
            </div>
          </section>

          {/* Bagian 2: Rekening & Bukti */}
          <section id="bagian-2" className="space-y-5 pt-2">
            <div className="border-b border-[#8E1616]/10 pb-3">
              <h2 className="text-lg font-bold tracking-tight text-[#3D0C0C]">
                02. Rekening Tujuan & Bukti Transfer
              </h2>
              <p className="mt-1 text-xs text-[#8C5E5E]">
                Dana kelebihan pembayaran akan ditransfer ke rekening di bawah ini setelah diverifikasi.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="field-namaBank"
                  className="block text-sm font-semibold text-[#3D0C0C]"
                >
                  Nama Bank Tujuan <span className="text-[#8E1616]">*</span>
                </label>
                <select
                  id="field-namaBank"
                  value={selectedBank}
                  onChange={(e) => {
                    setSelectedBank(e.target.value);
                    clearFieldError('namaBank');
                  }}
                  aria-invalid={Boolean(errors.namaBank)}
                  className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#3D0C0C] focus:outline-none focus:ring-2 ${
                    errors.namaBank
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-[#8E1616]/15 focus:border-[#8E1616] focus:ring-[#8E1616]/15'
                  }`}
                >
                  <option value="">Pilih bank tujuan...</option>
                  {BANK_OPTIONS.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>

                {selectedBank === 'Bank Lainnya' && (
                  <input
                    type="text"
                    value={customBank}
                    onChange={(e) => {
                      setCustomBank(e.target.value);
                      clearFieldError('namaBank');
                    }}
                    placeholder="Ketik nama bank tujuan"
                    className="mt-2 block w-full rounded-xl border border-[#8E1616]/15 bg-white px-3.5 py-2 text-sm text-[#3D0C0C] placeholder:text-[#A37A7A] focus:border-[#8E1616] focus:outline-none focus:ring-2 focus:ring-[#8E1616]/15"
                  />
                )}
                {errors.namaBank && (
                  <p className="mt-1.5 text-xs text-red-700">{errors.namaBank}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="field-nomorRekening"
                  className="block text-sm font-semibold text-[#3D0C0C]"
                >
                  Nomor Rekening <span className="text-[#8E1616]">*</span>
                </label>
                <input
                  id="field-nomorRekening"
                  type="text"
                  inputMode="numeric"
                  value={nomorRekening}
                  onChange={(e) => {
                    setNomorRekening(e.target.value.replace(/[^0-9]/g, ''));
                    clearFieldError('nomorRekening');
                  }}
                  placeholder="Masukkan nomor rekening (hanya angka)"
                  aria-invalid={Boolean(errors.nomorRekening)}
                  className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-[#3D0C0C] placeholder:font-sans placeholder:text-[#A37A7A] focus:outline-none focus:ring-2 ${
                    errors.nomorRekening
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-[#8E1616]/15 focus:border-[#8E1616] focus:ring-[#8E1616]/15'
                  }`}
                />
                {errors.nomorRekening && (
                  <p className="mt-1.5 text-xs text-red-700">{errors.nomorRekening}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="field-namaPemilikRekening"
                  className="block text-sm font-semibold text-[#3D0C0C]"
                >
                  Nama Pemilik Rekening <span className="text-[#8E1616]">*</span>
                </label>
                <input
                  id="field-namaPemilikRekening"
                  type="text"
                  value={namaPemilikRekening}
                  onChange={(e) => {
                    setNamaPemilikRekening(e.target.value.toUpperCase());
                    clearFieldError('namaPemilikRekening');
                  }}
                  placeholder="OTOMATIS HURUF KAPITAL"
                  aria-invalid={Boolean(errors.namaPemilikRekening)}
                  className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm font-medium uppercase tracking-wide text-[#3D0C0C] placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-[#A37A7A] focus:outline-none focus:ring-2 ${
                    errors.namaPemilikRekening
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-[#8E1616]/15 focus:border-[#8E1616] focus:ring-[#8E1616]/15'
                  }`}
                />
                <p className="mt-1 text-xs text-[#8C5E5E]">
                  Otomatis dikonversi ke huruf kapital sesuai buku tabungan.
                </p>
                {errors.namaPemilikRekening && (
                  <p className="mt-1 text-xs text-red-700">{errors.namaPemilikRekening}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="field-nominalKlaim"
                  className="block text-sm font-semibold text-[#3D0C0C]"
                >
                  Nominal Klaim Kelebihan <span className="text-[#8E1616]">*</span>
                </label>
                <input
                  id="field-nominalKlaim"
                  type="text"
                  inputMode="numeric"
                  value={nominalDisplay}
                  onChange={handleNominalChange}
                  placeholder="Rp 0"
                  aria-invalid={Boolean(errors.nominalKlaim)}
                  className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 font-mono text-sm font-semibold tabular-nums text-[#8E1616] placeholder:font-normal placeholder:text-[#A37A7A] focus:outline-none focus:ring-2 ${
                    errors.nominalKlaim
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-[#8E1616]/15 focus:border-[#8E1616] focus:ring-[#8E1616]/15'
                  }`}
                />
                <p className="mt-1 text-xs text-[#8C5E5E]">
                  Masukkan angka nominal kelebihan dalam Rupiah.
                </p>
                {errors.nominalKlaim && (
                  <p className="mt-1 text-xs text-red-700">{errors.nominalKlaim}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="field-buktiTransferSebelumnya"
                  className="block text-sm font-semibold text-[#3D0C0C]"
                >
                  Upload Bukti Transfer Sebelumnya (JPG / PNG / PDF){' '}
                  <span className="text-[#8E1616]">*</span>
                </label>

                <input
                  ref={fileInputRef}
                  id="field-buktiTransferSebelumnya"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  onChange={handleFileChange}
                  className="sr-only"
                />

                {!buktiFile ? (
                  <label
                    htmlFor="field-buktiTransferSebelumnya"
                    className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-8 text-center transition-colors ${
                      errors.buktiTransferSebelumnya
                        ? 'border-red-400 bg-red-50/40 hover:bg-red-50/70'
                        : 'border-[#8E1616]/20 bg-[#FEF9F9] hover:border-[#8E1616]/50 hover:bg-[#FFF0F0]/50'
                    }`}
                  >
                    <Upload className="h-6 w-6 text-[#8E1616]" aria-hidden="true" />
                    <span className="mt-2.5 text-sm font-semibold text-[#3D0C0C]">
                      Pilih berkas bukti transfer dari perangkat Anda
                    </span>
                    <span className="mt-1 text-xs text-[#8C5E5E]">
                      Format JPG, PNG, atau PDF · Ukuran maksimal 5 MB
                    </span>
                  </label>
                ) : (
                  <div className="mt-1.5 flex items-center justify-between gap-4 rounded-2xl border border-[#8E1616]/15 bg-[#FEF9F9] p-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      {buktiFile.mimeType.startsWith('image/') ? (
                        <img
                          src={buktiFile.dataUrl}
                          alt={`Pratinjau ${buktiFile.name}`}
                          referrerPolicy="no-referrer"
                          className="h-12 w-12 shrink-0 rounded-xl border border-[#8E1616]/15 object-cover bg-white"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#8E1616]/15 bg-white text-[#8E1616]">
                          <FileText className="h-6 w-6" aria-hidden="true" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#3D0C0C]">
                          {buktiFile.name}
                        </p>
                        <p className="text-xs text-[#8C5E5E] tabular-nums">
                          {formatFileSize(buktiFile.size)} · Siap diunggah
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      aria-label={`Hapus file ${buktiFile.name}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#8E1616]/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#3D0C0C] hover:bg-[#FFF0F0] hover:text-[#8E1616] transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Ganti
                    </button>
                  </div>
                )}

                {errors.buktiTransferSebelumnya && (
                  <p className="mt-1.5 text-xs text-red-700">
                    {errors.buktiTransferSebelumnya}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Bagian 3: Alasan */}
          <section id="bagian-3" className="space-y-4 pt-2">
            <div className="border-b border-[#8E1616]/10 pb-3">
              <h2 className="text-lg font-bold tracking-tight text-[#3D0C0C]">
                03. Alasan Pengajuan Klaim
              </h2>
              <p className="mt-1 text-xs text-[#8C5E5E]">
                Jelaskan kronologi kelebihan pembayaran secara ringkas dan jelas.
              </p>
            </div>

            <div>
              <label
                htmlFor="field-alasanKlaim"
                className="block text-sm font-semibold text-[#3D0C0C]"
              >
                Keterangan Alasan Pengajuan Klaim Kelebihan Pembayaran{' '}
                <span className="text-[#8E1616]">*</span>
              </label>
              <textarea
                id="field-alasanKlaim"
                rows={4}
                value={alasanKlaim}
                onChange={(e) => {
                  setAlasanKlaim(e.target.value);
                  clearFieldError('alasanKlaim');
                }}
                placeholder="Contoh: Saya melakukan transfer dua kali untuk biaya program IEP 1 Bulan Camp AC pada tanggal 15 November 2026."
                aria-invalid={Boolean(errors.alasanKlaim)}
                className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#3D0C0C] placeholder:text-[#A37A7A] focus:outline-none focus:ring-2 ${
                  errors.alasanKlaim
                    ? 'border-red-500 focus:ring-red-200'
                    : 'border-[#8E1616]/15 focus:border-[#8E1616] focus:ring-[#8E1616]/15'
                }`}
              />
              {errors.alasanKlaim && (
                <p className="mt-1.5 text-xs text-red-700">{errors.alasanKlaim}</p>
              )}
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-[#8E1616]/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#8C5E5E]">
              Dengan mengirim formulir ini, Anda menyatakan bahwa data yang diisi adalah benar.
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#8E1616] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#731111] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8E1616] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan Klaim'}
            </button>
          </div>
        </form>

        {/* Panel Panduan Singkat (Tanpa riwayat / statistik / kontrol admin) */}
        <aside className="lg:col-span-4 rounded-[20px] border border-[#8E1616]/10 bg-white p-6 sm:p-7 space-y-6">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8C5E5E]">
              Panduan Pengisian
            </p>
            <h2 className="mt-1.5 text-lg font-bold tracking-tight text-[#3D0C0C]">
              Ketentuan Pengajuan
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#7E5454]">
              Mohon perhatikan hal berikut sebelum mengirim permohonan pengembalian dana:
            </p>
          </div>

          <ul className="space-y-4 text-sm text-[#3D0C0C]/90">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8E1616]" aria-hidden="true" />
              <span>
                Sertakan foto atau tangkapan layar bukti transfer asli yang memperlihatkan tanggal,
                nominal, dan rekening pengirim.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8E1616]" aria-hidden="true" />
              <span>
                Nama pemilik rekening tujuan harus sesuai dengan identitas di buku tabungan agar
                transfer pengembalian tidak ditolak.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8E1616]" aria-hidden="true" />
              <span>
                Simpan <strong className="font-semibold text-[#8E1616]">Nomor Tiket</strong> yang
                muncul setelah pengiriman sebagai bukti resmi proses verifikasi keuangan.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8E1616]" aria-hidden="true" />
              <span>
                Bukti transfer pengembalian dana akan dikirimkan otomatis ke nomor ponsel yang Anda
                daftarkan setelah dana ditransfer.
              </span>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
