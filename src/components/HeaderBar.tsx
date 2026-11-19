import { Lock, LogOut } from 'lucide-react';

interface HeaderBarProps {
  mode: 'public' | 'admin-pin' | 'admin';
  hasReceipt: boolean;
  onEnterAdmin: () => void;
  onExitAdmin: () => void;
  onOpenGasSetup?: () => void;
}

export function HeaderBar({
  mode,
  hasReceipt,
  onEnterAdmin,
  onExitAdmin,
  onOpenGasSetup,
}: HeaderBarProps) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-[#8E1616]/10 bg-[#FEF9F9]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            if (mode === 'admin-pin') {
              onExitAdmin();
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-[#8C5E5E] hover:text-[#8E1616] transition-colors whitespace-nowrap shrink-0"
        >
          Portal Klaim Pembayaran
        </a>

        <nav
          aria-label="Navigasi utama"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#7E5454]"
        >
          {mode === 'public' && !hasReceipt && (
            <>
              <a
                href="#bagian-1"
                className="hover:text-[#8E1616] transition-colors whitespace-nowrap shrink-0"
              >
                Data Siswa
              </a>
              <a
                href="#bagian-2"
                className="hover:text-[#8E1616] transition-colors whitespace-nowrap shrink-0"
              >
                Rekening & Bukti
              </a>
              <a
                href="#bagian-3"
                className="hover:text-[#8E1616] transition-colors whitespace-nowrap shrink-0"
              >
                Alasan Klaim
              </a>
            </>
          )}
          {mode === 'public' && hasReceipt && (
            <span className="text-[#8C5E5E] whitespace-nowrap shrink-0">
              Bukti Pengajuan Tiket
            </span>
          )}
          {mode === 'admin' && (
            <>
              <a
                href="#ringkasan-admin"
                className="hover:text-[#8E1616] transition-colors whitespace-nowrap shrink-0"
              >
                Ringkasan Statistik
              </a>
              <a
                href="#tabel-pengajuan"
                className="hover:text-[#8E1616] transition-colors whitespace-nowrap shrink-0"
              >
                Daftar Pengajuan
              </a>
              {onOpenGasSetup && (
                <button
                  type="button"
                  onClick={onOpenGasSetup}
                  className="hover:text-[#8E1616] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Integrasi Apps Script
                </button>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center shrink-0">
          {mode === 'public' ? (
            <button
              type="button"
              onClick={onEnterAdmin}
              className="inline-flex items-center gap-2 rounded-full border border-[#8E1616]/20 bg-white px-5 py-2 text-xs font-semibold text-[#3D0C0C] transition-colors hover:border-[#8E1616]/40 hover:bg-[#FFF0F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8E1616] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5 text-[#8E1616]" aria-hidden="true" />
              Mode Admin
            </button>
          ) : (
            <button
              type="button"
              onClick={onExitAdmin}
              className="inline-flex items-center gap-2 rounded-full bg-[#8E1616] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#731111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8E1616] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              {mode === 'admin-pin' ? 'Kembali ke Formulir' : 'Keluar Admin'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
