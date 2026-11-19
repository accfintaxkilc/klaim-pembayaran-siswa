import { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import {
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  WEB_APP_URL,
  isGasConfigured,
} from '../services/claimsService';

interface GasSetupModalProps {
  onClose: () => void;
}

export function GasSetupModal({ onClose }: GasSetupModalProps) {
  const [copied, setCopied] = useState(false);
  const configured = isGasConfigured();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Abaikan
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gas-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D0C0C]/45 p-4 backdrop-blur-[2px]"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[20px] border border-[#8E1616]/15 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#8E1616]/10 bg-white px-6 py-4">
          <div>
            <h2 id="gas-modal-title" className="text-lg font-extrabold tracking-tight text-[#3D0C0C]">
              Integrasi Google Apps Script (Sheets & Drive)
            </h2>
            <p className="text-xs text-[#7E5454]">
              Status koneksi saat ini:{' '}
              <span className={configured ? 'font-semibold text-emerald-700' : 'font-semibold text-[#8E1616]'}>
                {configured ? 'Terhubung ke WEB_APP_URL' : 'Mode Penyimpanan Lokal (WEB_APP_URL belum diisi)'}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panduan Apps Script"
            className="rounded-full border border-[#8E1616]/15 p-2 text-[#8C5E5E] hover:bg-[#FFF0F0] hover:text-[#8E1616] cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 p-6 text-sm text-[#3D0C0C]">
          <div className="rounded-2xl border border-[#8E1616]/10 bg-[#FEF9F9] p-4 space-y-2">
            <p className="font-semibold text-[#3D0C0C]">Langkah Konfigurasi:</p>
            <ol className="list-decimal pl-5 space-y-1.5 text-xs leading-relaxed text-[#7E5454]">
              <li>
                Buka Google Sheets baru, lalu klik <strong>Extensions &gt; Apps Script</strong> dan
                tempel skrip di bawah ini (isi <code>FOLDER_ID</code> dengan ID folder Google Drive Anda).
              </li>
              <li>
                Klik <strong>Deploy &gt; New deployment &gt; Web app</strong>, atur akses ke{' '}
                <strong>Anyone</strong>, lalu salin URL <code>/exec</code> yang dihasilkan.
              </li>
              <li>
                Tempel URL tersebut pada konstanta <code className="font-mono font-semibold text-[#8E1616]">WEB_APP_URL</code> di bagian atas file{' '}
                <code className="font-mono">src/config/gasConfig.ts</code>.
              </li>
            </ol>
            {configured && (
              <p className="pt-1 font-mono text-xs text-[#8E1616] break-all">
                WEB_APP_URL aktif: {WEB_APP_URL}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8C5E5E]">
                Template Google Apps Script (Code.gs)
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#8E1616]/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#3D0C0C] hover:bg-[#FFF0F0] cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    Skrip Tersalin
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-[#8E1616]" aria-hidden="true" />
                    Salin Skrip Code.gs
                  </>
                )}
              </button>
            </div>
            <pre className="max-h-72 overflow-auto rounded-2xl border border-[#8E1616]/15 bg-[#2A0808] p-4 font-mono text-xs leading-relaxed text-[#FEF9F9]">
              {GOOGLE_APPS_SCRIPT_TEMPLATE}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
