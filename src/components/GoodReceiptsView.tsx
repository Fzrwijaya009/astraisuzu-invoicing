import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { GoodReceipt, FIXED_VENDORS } from '../types';
import { formatIDR, exportGoodReceiptsToExcel } from '../utils/billing';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Search,
  Package,
  CheckCircle,
  Clock,
  ShieldAlert,
  FileSpreadsheet,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  CalendarDays,
  Calendar,
} from 'lucide-react';

interface GoodReceiptsViewProps {
  goodReceipts: GoodReceipt[];
  onNavigateToBilling?: () => void;
  onUpdateGoodReceipt?: (updatedGR: GoodReceipt) => void;
  onDeleteGoodReceipt?: (grId: string) => void;
}

export const GoodReceiptsView: React.FC<GoodReceiptsViewProps> = ({
  goodReceipts,
  onNavigateToBilling,
  onUpdateGoodReceipt,
  onDeleteGoodReceipt,
}) => {
  const { userProfile } = useAuth();
  const isOwner = userProfile?.role === 'owner';

  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [uploadDateFilter, setUploadDateFilter] = useState('');
  // Requirement 4: Filter Bulan pada database transaksi
  const [monthFilter, setMonthFilter] = useState('');

  // Edit State (Owner Only)
  const [editingGR, setEditingGR] = useState<GoodReceipt | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<GoodReceipt>>({});

  // Delete State (Owner Only)
  const [deletingGR, setDeletingGR] = useState<GoodReceipt | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Enforce segregation in view
  const visibleGRs = useMemo(() => {
    return goodReceipts.filter((gr) => {
      // Role segregation: Admin ONLY sees their own vendor
      if (!isOwner && userProfile?.vendor && gr.vendor !== userProfile.vendor) {
        return false;
      }
      if (vendorFilter !== 'ALL' && gr.vendor !== vendorFilter) {
        return false;
      }
      if (statusFilter !== 'ALL' && gr.status !== statusFilter) {
        return false;
      }
      // Requirement 4: Filter Bulan
      if (monthFilter) {
        const [yyyy, mm] = monthFilter.split('-');
        const matchesDot = gr.grDate?.includes(`.${mm}.${yyyy}`) || gr.poDate?.includes(`.${mm}.${yyyy}`);
        const matchesDash = gr.grDate?.startsWith(`${yyyy}-${mm}`) || gr.poDate?.startsWith(`${yyyy}-${mm}`);
        const matchesUpload = gr.uploadedAt?.startsWith(monthFilter);
        if (!matchesDot && !matchesDash && !matchesUpload) {
          return false;
        }
      }
      if (uploadDateFilter && (!gr.uploadedAt || !gr.uploadedAt.startsWith(uploadDateFilter))) {
        return false;
      }
      if (
        searchTerm &&
        !gr.noPo.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !gr.noGr.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !gr.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !gr.tipe.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !gr.material.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !gr.description.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [goodReceipts, isOwner, userProfile, vendorFilter, statusFilter, monthFilter, uploadDateFilter, searchTerm]);

  const handleExportExcel = () => {
    exportGoodReceiptsToExcel(
      visibleGRs,
      `Good_Receipt_${isOwner ? 'Astra_Isuzu_Master' : userProfile?.vendor?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  // Open Edit Modal with prefilled fields
  const handleStartEdit = (gr: GoodReceipt) => {
    setEditingGR(gr);
    setEditFormData({
      noPo: gr.noPo,
      serialNumber: gr.serialNumber,
      tipe: gr.tipe,
      material: gr.material,
      description: gr.description,
      sLoc: gr.sLoc,
      qty: gr.qty,
      amount: gr.amount,
      plan: gr.plan,
      noGr: gr.noGr,
      item: gr.item,
      assignment: gr.assignment,
      grDate: gr.grDate,
      poDate: gr.poDate,
      vendor: gr.vendor,
      status: gr.status,
    });
  };

  // Save Edit (Owner Only)
  const handleSaveEdit = async () => {
    if (!editingGR) return;
    setIsProcessing(true);

    const updatedItem: GoodReceipt = {
      ...editingGR,
      ...editFormData,
      qty: Number(editFormData.qty) || 1,
      amount: Number(editFormData.amount) || 0,
    };

    try {
      const grRef = doc(db, 'goodReceipts', editingGR.id);
      await updateDoc(grRef, {
        ...editFormData,
        qty: Number(editFormData.qty) || 1,
        amount: Number(editFormData.amount) || 0,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Firestore update warning:', err);
    } finally {
      if (onUpdateGoodReceipt) {
        onUpdateGoodReceipt(updatedItem);
      }
      setEditingGR(null);
      setIsProcessing(false);
    }
  };

  // Confirm Delete (Owner Only)
  const handleConfirmDelete = async () => {
    if (!deletingGR) return;
    setIsProcessing(true);

    try {
      const grRef = doc(db, 'goodReceipts', deletingGR.id);
      await deleteDoc(grRef);
    } catch (err) {
      console.warn('Firestore delete warning:', err);
    } finally {
      if (onDeleteGoodReceipt) {
        onDeleteGoodReceipt(deletingGR.id);
      }
      setDeletingGR(null);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Database Master Good Receipt (GR) Aksesoris
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isOwner
              ? 'Tinjau, edit, dan hapus data Good Receipt dari seluruh vendor Astra Isuzu (Hak Otorisasi Master System Owner).'
              : `Segregasi data aktif: Menampilkan data resmi Good Receipt khusus untuk ${userProfile?.vendor}.`}
          </p>
        </div>

        {/* Search & Export */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari No. PO, GR, Serial #, Part..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 shadow-xs transition shrink-0 cursor-pointer"
            title="Download database tampilan saat ini ke format Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Segregation Notice for Admin */}
      {!isOwner && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <b>Data Segregation Enforced:</b> Sesuai aturan bisnis Astra Isuzu, Anda hanya memiliki otorisasi untuk membaca dan memproses Good Receipt milik <b>{userProfile?.vendor}</b>.
            </span>
          </div>
          {onNavigateToBilling && (
            <button
              type="button"
              onClick={onNavigateToBilling}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shrink-0 cursor-pointer"
            >
              Proses Penagihan
            </button>
          )}
        </div>
      )}

      {/* Filters Bar with Month Filter (Requirement 4) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Semua Status ({goodReceipts.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Outstanding')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'Outstanding'
                ? 'bg-indigo-600 text-white'
                : 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
            }`}
          >
            <Clock className="w-3 h-3" />
            Outstanding / Siap Ditagih (
            {goodReceipts.filter((g) => g.status === 'Outstanding').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Invoiced')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'Invoiced'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle className="w-3 h-3" />
            Sudah Ditagih (
            {goodReceipts.filter((g) => g.status === 'Invoiced').length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Requirement 4: Filter Bulan pada Tabel Transaksi */}
          <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-200 rounded-lg px-2.5 py-1">
            <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-blue-900 text-[11px] font-bold">Filter Bulan:</span>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="text-xs bg-transparent text-slate-800 focus:outline-hidden cursor-pointer font-medium"
            />
            {monthFilter && (
              <button
                type="button"
                onClick={() => setMonthFilter('')}
                className="text-blue-600 hover:text-blue-800 font-bold ml-1 cursor-pointer"
                title="Reset filter bulan"
              >
                ✕
              </button>
            )}
          </div>

          {/* Tanggal Upload Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 text-[11px] font-medium">Tgl Upload:</span>
            <input
              type="date"
              value={uploadDateFilter}
              onChange={(e) => setUploadDateFilter(e.target.value)}
              className="text-xs bg-transparent text-slate-800 focus:outline-hidden cursor-pointer"
            />
            {uploadDateFilter && (
              <button
                type="button"
                onClick={() => setUploadDateFilter('')}
                className="text-slate-400 hover:text-slate-700 font-bold ml-1 cursor-pointer"
                title="Reset filter tanggal upload"
              >
                ✕
              </button>
            )}
          </div>

          {/* Vendor Filter (Owner only) */}
          {isOwner && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Vendor:</span>
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Semua Vendor</option>
                {Array.from(new Set(goodReceipts.map((g) => g.vendor))).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Table Matching Exact Attached Columns */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {visibleGRs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">
              Tidak ada data Good Receipt yang ditemukan.
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {isOwner
                ? 'Gunakan menu Upload Master GR untuk menambahkan data penerimaan barang.'
                : 'Belum ada data Good Receipt yang diunggah untuk vendor Anda.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  {isOwner && <th className="py-3 px-3 text-center">Aksi (Owner)</th>}
                  <th className="py-3 px-3">No PO</th>
                  <th className="py-3 px-3">Serial number</th>
                  <th className="py-3 px-3">Tipe</th>
                  <th className="py-3 px-3">Material</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-2 text-center">SLoc</th>
                  <th className="py-3 px-2 text-center">Qty</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-2 text-center">Plan</th>
                  <th className="py-3 px-3">No GR/GL</th>
                  <th className="py-3 px-2 text-center">Item</th>
                  <th className="py-3 px-2 text-center">A</th>
                  <th className="py-3 px-2.5">GR/GL Date</th>
                  <th className="py-3 px-2.5">PO Date</th>
                  <th className="py-3 px-3">Vendor</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {visibleGRs.map((gr) => (
                  <tr key={gr.id} className="hover:bg-slate-50/80 transition">
                    {/* Owner Edit & Delete Buttons */}
                    {isOwner && (
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(gr)}
                            className="p-1 rounded bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 transition cursor-pointer"
                            title="Edit baris data GR ini"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingGR(gr)}
                            className="p-1 rounded bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition cursor-pointer"
                            title="Hapus baris data GR ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                    <td className="py-2.5 px-3 font-bold text-slate-900">{gr.noPo}</td>
                    <td className="py-2.5 px-3 text-slate-600">{gr.serialNumber}</td>
                    <td className="py-2.5 px-3 text-slate-700">{gr.tipe}</td>
                    <td className="py-2.5 px-3 font-semibold text-blue-700">{gr.material}</td>
                    <td className="py-2.5 px-3 font-sans text-xs text-slate-800">{gr.description}</td>
                    <td className="py-2.5 px-2 text-center text-slate-500">{gr.sLoc}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-800">{gr.qty}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatIDR(gr.amount)}</td>
                    <td className="py-2.5 px-2 text-center text-slate-500">{gr.plan}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{gr.noGr}</td>
                    <td className="py-2.5 px-2 text-center text-slate-500">{gr.item}</td>
                    <td className="py-2.5 px-2 text-center text-slate-500">{gr.assignment}</td>
                    <td className="py-2.5 px-2.5 text-slate-600">{gr.grDate}</td>
                    <td className="py-2.5 px-2.5 text-slate-600">{gr.poDate}</td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">{gr.vendor}</td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      {gr.status === 'Outstanding' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Outstanding
                        </span>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Invoiced
                          </span>
                          {gr.invoiceNumber && (
                            <span className="text-[9px] text-blue-600 font-bold mt-0.5 font-mono">
                              {gr.invoiceNumber}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Owner Edit Modal */}
      {editingGR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Data Master Good Receipt
                  </h3>
                  <p className="text-xs text-slate-500">
                    Otorisasi Khusus Master System Owner
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingGR(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  No PO
                </label>
                <input
                  type="text"
                  value={editFormData.noPo || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, noPo: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Serial Number (No. Rangka)
                </label>
                <input
                  type="text"
                  value={editFormData.serialNumber || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, serialNumber: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Tipe Kendaraan
                </label>
                <input
                  type="text"
                  value={editFormData.tipe || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, tipe: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Material (Kode Part)
                </label>
                <input
                  type="text"
                  value={editFormData.material || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, material: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 text-blue-700 font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editFormData.description || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Qty
                </label>
                <input
                  type="number"
                  value={editFormData.qty ?? 1}
                  onChange={(e) => setEditFormData({ ...editFormData, qty: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Amount (Harga dlm Rupiah)
                </label>
                <input
                  type="number"
                  value={editFormData.amount ?? 0}
                  onChange={(e) => setEditFormData({ ...editFormData, amount: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  No GR/GL
                </label>
                <input
                  type="text"
                  value={editFormData.noGr || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, noGr: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nama Vendor
                </label>
                <input
                  type="text"
                  value={editFormData.vendor || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, vendor: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Status Good Receipt
                </label>
                <select
                  value={editFormData.status || 'Outstanding'}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      status: e.target.value as 'Outstanding' | 'Invoiced',
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Outstanding">Outstanding (Siap Ditagih)</option>
                  <option value="Invoiced">Invoiced (Sudah Ditagih)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  GR/GL Date
                </label>
                <input
                  type="text"
                  value={editFormData.grDate || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, grDate: e.target.value })}
                  placeholder="e.g. 20.10.2026"
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingGR(null)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Owner Delete Confirmation Modal */}
      {deletingGR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200">
            <div className="flex items-center gap-3 pb-3 border-b border-rose-100">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Hapus Data Good Receipt?
                </h3>
                <p className="text-xs text-rose-600 font-semibold">
                  Tindakan Otorisasi Master System Owner
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <p className="text-slate-700 leading-relaxed">
                Anda akan menghapus baris Good Receipt No. PO{' '}
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1 py-0.5 rounded">
                  {deletingGR.noPo}
                </span>{' '}
                / No. GR{' '}
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1 py-0.5 rounded">
                  {deletingGR.noGr}
                </span>{' '}
                ({deletingGR.description}) senilai{' '}
                <b>{formatIDR(deletingGR.amount)}</b> dari database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingGR(null)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Hapus Data GR</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
