import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GoodReceipt, Invoice } from '../types';
import { formatIDR } from '../utils/billing';
import {
  ShieldAlert,
  Trash2,
  AlertTriangle,
  Database,
  FileText,
  RotateCcw,
  CheckCircle2,
  Lock,
  Loader2,
  HelpCircle,
  HardDrive,
} from 'lucide-react';

interface SettingsDataViewProps {
  goodReceipts: GoodReceipt[];
  invoices: Invoice[];
  onClearGoodReceipts: () => Promise<void>;
  onClearInvoices: () => Promise<void>;
  onClearAllData: () => Promise<void>;
}

export const SettingsDataView: React.FC<SettingsDataViewProps> = ({
  goodReceipts,
  invoices,
  onClearGoodReceipts,
  onClearInvoices,
  onClearAllData,
}) => {
  const { userProfile } = useAuth();
  const isOwner = userProfile?.role === 'owner';

  const [confirmTarget, setConfirmTarget] = useState<'gr' | 'invoices' | 'all' | null>(null);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOwner) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <Lock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">Akses Ditolak</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Menu Pengaturan & Hapus Master Data hanya dapat diakses oleh akun dengan hak otorisasi <b>Master System (Owner)</b> Astra Isuzu.
        </p>
      </div>
    );
  }

  const totalGRAmount = goodReceipts.reduce((acc, curr) => acc + curr.amount, 0);
  const totalInvoiceAmount = invoices.reduce((acc, curr) => acc + curr.totalAmount, 0);

  const handleExecuteClear = async () => {
    setIsProcessing(true);
    setSuccessMsg('');
    try {
      if (confirmTarget === 'gr') {
        await onClearGoodReceipts();
        setSuccessMsg('Seluruh database Good Receipt berhasil dihapus dari sistem.');
      } else if (confirmTarget === 'invoices') {
        await onClearInvoices();
        setSuccessMsg('Seluruh data transaksi tagihan berhasil dihapus dari sistem.');
      } else if (confirmTarget === 'all') {
        await onClearAllData();
        setSuccessMsg('Seluruh database Good Receipt dan transaksi tagihan berhasil dibersihkan (Clean Start).');
      }
      setConfirmTarget(null);
      setConfirmationInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Otorisasi Khusus: Master System (Owner)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Pengaturan & Pembersihan Master Data
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola dan bersihkan data transaksi sistem. Seluruh tindakan pembersihan di halaman ini hanya dapat diotorisasi oleh Owner.
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-emerald-700 text-xs font-semibold hover:text-emerald-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Database Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Database Good Receipt</span>
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {goodReceipts.length}{' '}
            <span className="text-xs font-normal text-slate-500 font-sans">Dokumen</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Akumulasi nilai: <b>{formatIDR(totalGRAmount)}</b>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Transaksi Tagihan</span>
            <FileText className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {invoices.length}{' '}
            <span className="text-xs font-normal text-slate-500 font-sans">Invoice</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Akumulasi nilai: <b>{formatIDR(totalInvoiceAmount)}</b>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Status Data</span>
            <HardDrive className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-base font-bold text-slate-900">
            {goodReceipts.length === 0 && invoices.length === 0 ? (
              <span className="text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Database Bersih
              </span>
            ) : (
              <span className="text-blue-700">Aktif Digunakan</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Sinkronisasi Cloud Firestore aktif
          </div>
        </div>
      </div>

      {/* Danger Zone Controls */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Zona Otorisasi Hapus Data (Master System)</span>
        </h2>

        {/* Action Card 1: Delete All Good Receipts */}
        <div className="p-5 rounded-2xl bg-white border border-rose-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-rose-600" />
              <span>Hapus Semua Database Good Receipt (GR)</span>
            </h3>
            <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
              Menghapus seluruh <b>{goodReceipts.length} dokumen</b> Good Receipt yang ada di database sistem. Tindakan ini hanya dapat dilakukan oleh Owner.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmTarget('gr');
              setConfirmationInput('');
            }}
            disabled={goodReceipts.length === 0}
            className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>Hapus Semua GR ({goodReceipts.length})</span>
          </button>
        </div>

        {/* Action Card 2: Delete All Invoices */}
        <div className="p-5 rounded-2xl bg-white border border-rose-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-600" />
              <span>Hapus Semua Transaksi Tagihan (Invoice)</span>
            </h3>
            <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
              Menghapus seluruh <b>{invoices.length} tagihan</b> transaksi vendor yang telah terdaftar. Item Good Receipt terkait akan dikembalikan ke status "Outstanding".
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmTarget('invoices');
              setConfirmationInput('');
            }}
            disabled={invoices.length === 0}
            className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>Hapus Semua Tagihan ({invoices.length})</span>
          </button>
        </div>

        {/* Action Card 3: Clear All (Clean Start for Production) */}
        <div className="p-5 rounded-2xl bg-rose-50/50 border-2 border-rose-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                Pembersihan Total
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Reset Total Seluruh Database (Clean Start)
              </h3>
            </div>
            <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
              Menghapus seluruh data demo, seluruh transaksi tagihan, dan seluruh Good Receipt agar sistem siap digunakan murni dari data berkas resmi Excel yang baru.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmTarget('all');
              setConfirmationInput('');
            }}
            disabled={goodReceipts.length === 0 && invoices.length === 0}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition disabled:opacity-40 cursor-pointer shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Hapus Semua Data</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal Safeguard */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-300">
            <div className="flex items-center gap-3 pb-3 border-b border-rose-100">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Konfirmasi Otorisasi Owner
                </h3>
                <p className="text-xs text-rose-600 font-semibold">
                  Tindakan ini permanen dan tidak dapat dibatalkan
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <p className="text-slate-700 leading-relaxed">
                {confirmTarget === 'gr' && (
                  <>
                    Anda akan menghapus seluruh <b>{goodReceipts.length} item Good Receipt</b> dari database Firestore.
                  </>
                )}
                {confirmTarget === 'invoices' && (
                  <>
                    Anda akan menghapus seluruh <b>{invoices.length} transaksi tagihan</b> dari database Firestore.
                  </>
                )}
                {confirmTarget === 'all' && (
                  <>
                    Anda akan menghapus <b>seluruh Good Receipt ({goodReceipts.length} item)</b> dan <b>seluruh Tagihan ({invoices.length} dokumen)</b> untuk memulai database bersih (Clean Start).
                  </>
                )}
              </p>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Ketik <code className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-mono font-bold">HAPUS</code> untuk melanjutkan:
                </label>
                <input
                  type="text"
                  placeholder="Ketik HAPUS di sini..."
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-center font-bold tracking-widest focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteClear}
                disabled={confirmationInput.trim().toUpperCase() !== 'HAPUS' || isProcessing}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Konfirmasi Hapus Permanen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
