import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { GoodReceipt, Invoice, FIXED_VENDORS } from '../types';
import { formatIDR } from '../utils/billing';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Package,
  ArrowUpRight,
  Building2,
  AlertCircle,
  FileText,
  Filter,
  ShieldAlert,
} from 'lucide-react';

interface DashboardViewProps {
  goodReceipts: GoodReceipt[];
  invoices: Invoice[];
  onNavigateTab: (tab: any) => void;
  onSelectInvoice: (inv: Invoice) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  goodReceipts,
  invoices,
  onNavigateTab,
  onSelectInvoice,
}) => {
  const { userProfile } = useAuth();
  const isOwner = userProfile?.role === 'owner';
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>('ALL');

  // Filtered datasets based on user role: Admin ONLY sees their own company (Requirement 1)
  const visibleInvoices = useMemo(() => {
    if (!isOwner) {
      const vendorName = userProfile?.vendor || '';
      return invoices.filter((inv) => inv.vendor === vendorName);
    }
    if (selectedVendorFilter !== 'ALL') {
      return invoices.filter((inv) => inv.vendor === selectedVendorFilter);
    }
    return invoices;
  }, [invoices, isOwner, userProfile, selectedVendorFilter]);

  const visibleGRs = useMemo(() => {
    if (!isOwner) {
      const vendorName = userProfile?.vendor || '';
      return goodReceipts.filter((gr) => gr.vendor === vendorName);
    }
    if (selectedVendorFilter !== 'ALL') {
      return goodReceipts.filter((gr) => gr.vendor === selectedVendorFilter);
    }
    return goodReceipts;
  }, [goodReceipts, isOwner, userProfile, selectedVendorFilter]);

  // Aggregated KPIs
  const metrics = useMemo(() => {
    const totalTagihanValue = visibleInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalTagihanCount = visibleInvoices.length;

    const openInvoices = visibleInvoices.filter((inv) => inv.status === 'Open');
    const openValue = openInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const openCount = openInvoices.length;

    const scheduledInvoices = visibleInvoices.filter(
      (inv) => inv.status === 'Approval Owners' || inv.status === 'Pembayaran Dijadwalkan'
    );
    const scheduledValue = scheduledInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const scheduledCount = scheduledInvoices.length;

    const paidInvoices = visibleInvoices.filter(
      (inv) => inv.status === 'Sudah Dibayarkan'
    );
    const paidValue = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const paidCount = paidInvoices.length;

    const outstandingGRs = visibleGRs.filter((gr) => gr.status === 'Outstanding');
    const outstandingGRValue = outstandingGRs.reduce((sum, gr) => sum + gr.amount, 0);
    const outstandingGRCount = outstandingGRs.length;

    // Breakdown for each of the 3 official vendors
    const vendorStats = FIXED_VENDORS.map((vendorName) => {
      const vendorInvoices = invoices.filter((i) => i.vendor === vendorName);
      const total = vendorInvoices.reduce((s, i) => s + i.totalAmount, 0);
      const count = vendorInvoices.length;
      return { vendorName, total, count };
    });

    const sumAllVendors = vendorStats.reduce((s, v) => s + v.total, 0);

    return {
      totalTagihanValue,
      totalTagihanCount,
      openValue,
      openCount,
      scheduledValue,
      scheduledCount,
      paidValue,
      paidCount,
      outstandingGRValue,
      outstandingGRCount,
      vendorStats,
      sumAllVendors,
    };
  }, [visibleInvoices, visibleGRs, invoices]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Monitoring Tagihan Vendor Aksesoris Astra Isuzu
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isOwner
              ? 'Monitoring performa transaksi seluruh vendor aksesoris resmi Astra Isuzu (Otorisasi Master System).'
              : `Performa transaksi resmi khusus untuk ${userProfile?.vendor}.`}
          </p>
        </div>

        {/* Vendor Selector Filter (For Owner Only - Requirement 1 & 2) */}
        {isOwner && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedVendorFilter}
              onChange={(e) => setSelectedVendorFilter(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-700 shadow-xs cursor-pointer"
            >
              <option value="ALL">Semua Vendor Aksesoris</option>
              {FIXED_VENDORS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Segregation Banner for Admin */}
      {!isOwner && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <b>Segregasi Akun Vendor:</b> Dashboard ini khusus menyajikan performa transaksi dan status tagihan untuk <b>{userProfile?.vendor}</b>.
            </span>
          </div>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Tagihan */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Tagihan
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight font-mono">
              {formatIDR(metrics.totalTagihanValue)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
              <span>Akumulasi Tagihan Terbit</span>
              <span className="font-semibold text-slate-700">
                {metrics.totalTagihanCount} Dokumen
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Tagihan Open (Menunggu Approval) */}
        <div className="bg-white rounded-xl p-5 border border-amber-200 shadow-xs hover:border-amber-300 transition bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Tagihan Open
            </span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl lg:text-2xl font-extrabold text-amber-900 tracking-tight font-mono">
              {formatIDR(metrics.openValue)}
            </div>
            <div className="flex items-center justify-between text-xs text-amber-800/80 mt-2 pt-2 border-t border-amber-100">
              <span>Menunggu Approval Owners</span>
              <span className="font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                {metrics.openCount} Invoice
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Approval Owners */}
        <div className="bg-white rounded-xl p-5 border border-indigo-200 shadow-xs hover:border-indigo-300 transition bg-indigo-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              Approval Owners
            </span>
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl lg:text-2xl font-extrabold text-indigo-900 tracking-tight font-mono">
              {formatIDR(metrics.scheduledValue)}
            </div>
            <div className="flex items-center justify-between text-xs text-indigo-800/80 mt-2 pt-2 border-t border-indigo-100">
              <span>Disetujui / Dijadwalkan</span>
              <span className="font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900">
                {metrics.scheduledCount} Approved
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Outstanding Good Receipts */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Good Receipt Siap Tagih
            </span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight font-mono">
              {formatIDR(metrics.outstandingGRValue)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
              <span>Status Outstanding</span>
              <span className="font-semibold text-slate-800">
                {metrics.outstandingGRCount} Item GR
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vendor Breakdown Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-800">
                {isOwner ? 'Komposisi Tagihan per Vendor' : 'Status Tagihan Vendor'}
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">
              {isOwner ? '3 Vendor Resmi' : userProfile?.vendor}
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {isOwner ? (
              metrics.vendorStats.map((item, idx) => {
                const percentage =
                  metrics.sumAllVendors > 0
                    ? Math.round((item.total / metrics.sumAllVendors) * 100)
                    : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800 truncate">
                        {item.vendorName}
                      </span>
                      <span className="font-mono font-bold text-blue-700 shrink-0 ml-2">
                        {formatIDR(item.total)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{item.count} Invoice terdaftar</span>
                      <span>{percentage}%</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Perusahaan:</span>
                    <span className="font-bold text-slate-900">{userProfile?.vendor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Tagihan Terbit:</span>
                    <span className="font-mono font-bold text-blue-700">
                      {formatIDR(metrics.totalTagihanValue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sudah Dibayarkan:</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {formatIDR(metrics.paidValue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Outstanding GR:</span>
                    <span className="font-bold text-slate-800">
                      {metrics.outstandingGRCount} Item
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Invoicing Guidance Box */}
            <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-blue-900">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                Ketentuan Aksesoris Astra Isuzu
              </p>
              <p className="text-[11px] text-blue-700 mt-1 leading-relaxed">
                Penagihan hanya dapat diproses untuk Good Receipt yang telah berstatus resmi "Outstanding" dan dicentang oleh Admin Vendor masing-masing.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Invoices Table */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Aktivitas Register Tagihan Terbaru
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('register-invoice')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
              >
                Lihat Semua <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 overflow-x-auto">
              {visibleInvoices.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  Belum ada invoice yang terdaftar.
                  {!isOwner && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => onNavigateTab('create-invoice')}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 cursor-pointer"
                      >
                        Buat Tagihan Sekarang
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-2.5">No. Unik Tagihan</th>
                      <th className="py-2.5">Vendor</th>
                      <th className="py-2.5">Total Tagihan</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleInvoices.slice(0, 5).map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 font-mono font-bold text-slate-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 text-slate-600 font-medium truncate max-w-[150px]">
                          {inv.vendor}
                        </td>
                        <td className="py-3 font-mono font-semibold text-slate-900">
                          {formatIDR(inv.totalAmount)}
                        </td>
                        <td className="py-3">
                          {inv.status === 'Open' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
                              Open
                            </span>
                          ) : inv.status === 'Approval Owners' || inv.status === 'Pembayaran Dijadwalkan' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-indigo-600" />
                              Approval Owners
                            </span>
                          ) : inv.status === 'Sudah Dibayarkan' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                              Sudah Dibayarkan
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                              Ditolak
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onSelectInvoice(inv)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition cursor-pointer"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Quick Action Prompt */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Real-time sinkron dengan Cloud Firestore
            </span>
            {isOwner ? (
              <button
                type="button"
                onClick={() => onNavigateTab('upload-gr')}
                className="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                + Upload Master Good Receipt
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigateTab('create-invoice')}
                className="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                + Buat Tagihan Baru ({visibleGRs.filter((g) => g.status === 'Outstanding').length} Item Siap)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
