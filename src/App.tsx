import { useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminPinGate } from './components/AdminPinGate';
import { GasSetupModal } from './components/GasSetupModal';
import { HeaderBar } from './components/HeaderBar';
import { PublicClaimForm } from './components/PublicClaimForm';
import { TicketReceipt } from './components/TicketReceipt';
import type { ClaimRecord } from './types/claim';

export default function App() {
  const [mode, setMode] = useState<'public' | 'admin-pin' | 'admin'>('public');
  const [submittedClaim, setSubmittedClaim] = useState<ClaimRecord | null>(null);
  const [showGasSetup, setShowGasSetup] = useState(false);

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#FEF9F9] text-[#3D0C0C]">
      <HeaderBar
        mode={mode}
        hasReceipt={Boolean(submittedClaim)}
        onEnterAdmin={() => setMode('admin-pin')}
        onExitAdmin={() => setMode('public')}
        onOpenGasSetup={mode === 'admin' ? () => setShowGasSetup(true) : undefined}
      />

      <main className="flex-1">
        {mode === 'public' && !submittedClaim && (
          <PublicClaimForm onSubmitted={(record) => setSubmittedClaim(record)} />
        )}

        {mode === 'public' && submittedClaim && (
          <TicketReceipt
            claim={submittedClaim}
            onCreateAnother={() => setSubmittedClaim(null)}
          />
        )}

        {mode === 'admin-pin' && (
          <AdminPinGate
            onSuccess={() => setMode('admin')}
            onCancel={() => setMode('public')}
          />
        )}

        {mode === 'admin' && (
          <AdminDashboard onOpenGasSetup={() => setShowGasSetup(true)} />
        )}
      </main>

      <footer className="no-print border-t border-[#8E1616]/10 bg-white/70 py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-xs text-[#8C5E5E] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>Portal Pengajuan Klaim Kelebihan Pembayaran Siswa</span>
          <span>
            {mode === 'public'
              ? 'Layanan Pengajuan Resmi · Simpan Nomor Tiket Anda'
              : 'Mode Administrator Terproteksi PIN'}
          </span>
        </div>
      </footer>

      {showGasSetup && mode === 'admin' && (
        <GasSetupModal onClose={() => setShowGasSetup(false)} />
      )}
    </div>
  );
}
