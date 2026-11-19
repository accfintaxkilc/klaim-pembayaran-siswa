import { useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react';
import { ADMIN_PIN } from '../config/gasConfig';

interface AdminPinGateProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AdminPinGate({ onSuccess, onCancel }: AdminPinGateProps) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Masukkan PIN administrator.');
      return;
    }
    if (pin.trim() !== ADMIN_PIN) {
      setError('PIN tidak sesuai. Periksa kembali PIN akses Anda.');
      return;
    }
    setError(null);
    onSuccess();
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-[20px] border border-[#8E1616]/10 bg-white p-6 sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#8E1616]/15 bg-[#FFF0F0] text-[#8E1616]">
          <KeyRound className="h-5 w-5" aria-hidden="true" />
        </div>

        <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.03em] text-[#8E1616]">
          Akses Mode Administrator
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-[#7E5454]">
          Masukkan PIN otorisasi tim keuangan untuk membuka portal verifikasi klaim, statistik,
          pratinjau bukti, dan unggah bukti pengembalian dana.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="admin-pin-input" className="block text-sm font-semibold text-[#3D0C0C]">
              PIN Administrator
            </label>
            <div className="relative mt-1.5">
              <input
                id="admin-pin-input"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                autoFocus
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Masukkan 6 digit PIN"
                aria-invalid={Boolean(error)}
                className={`block w-full rounded-xl border bg-white py-2.5 pl-3.5 pr-11 font-mono text-base tracking-widest text-[#3D0C0C] placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-[#A37A7A] focus:outline-none focus:ring-2 ${
                  error
                    ? 'border-red-500 focus:ring-red-200'
                    : 'border-[#8E1616]/15 focus:border-[#8E1616] focus:ring-[#8E1616]/15'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-[#8C5E5E] hover:text-[#8E1616] cursor-pointer"
              >
                {showPin ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>

            {error && (
              <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-red-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-[#8E1616] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#731111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8E1616] cursor-pointer"
          >
            Buka Portal Administrator
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between border-t border-[#8E1616]/10 pt-4 text-xs text-[#8C5E5E]">
          <span>PIN bawaan: 123456</span>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 font-semibold text-[#3D0C0C] hover:text-[#8E1616] cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Kembali ke Formulir
          </button>
        </div>
      </div>
    </div>
  );
}
