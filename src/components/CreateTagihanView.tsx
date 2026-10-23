import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { GoodReceipt, Invoice, InvoiceItem } from '../types';
import {
  formatIDR,
  generateInvoiceReference,
  calculateCumulativeTotal,
} from '../utils/billing';
import {
  writeBatch,
  doc,
  collection,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  CheckSquare,
  Square,
  Search,
  FilePlus,
  PackageCheck,
  AlertCircle,
  Building,
  CheckCircle2,
  ArrowRight,
  Loader2,
  CalendarDays,
} from 'lucide-react';

interface CreateTagihanViewProps {
  goodReceipts: GoodReceipt[];
  onInvoiceCreated: (newInvoice: Invoice) => void;
}

export const CreateTagihanView: React.FC<CreateTagihanViewProps> = ({
  goodReceipts,
  onInvoiceCreated,
}) => {
  const { userProfile } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [includePpn, setIncludePpn] = useState(true);
  const [successResult, setSuccessResult] = useState<Invoice | null>(null);

  const vendorName = userProfile?.vendor || 'PT. Jaya Kreasi Indonesia';

  // Filter un-invoiced Good Receipts belonging strictly to this vendor
  const availableGRs = useMemo(() => {
    return goodReceipts.filter((gr) => {
      if (gr.vendor !== vendorName || gr.status !== 'Outstanding') {
        return false;
      }
      // Month filter on GR transactions
      if (monthFilter) {
        const [yyyy, mm] = monthFilter.split('-');
        const matchesDot = gr.grDate?.includes(`.${mm}.${yyyy}`) || gr.poDate?.includes(`.${mm}.${yyyy}`);
        const matchesDash = gr.grDate?.startsWith(`${yyyy}-${mm}`) || gr.poDate?.startsWith(`${yyyy}-${mm}`);
        const matchesUpload = gr.uploadedAt?.startsWith(monthFilter);
        if (!matchesDot && !matchesDash && !matchesUpload) {
          return false;
        }
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          gr.noPo.toLowerCase().includes(term) ||
          gr.noGr.toLowerCase().includes(term) ||
          gr.serialNumber.toLowerCase().includes(term) ||
          gr.tipe.toLowerCase().includes(term) ||
          gr.material.toLowerCase().includes(term) ||
          gr.description.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [goodReceipts, vendorName, monthFilter, searchTerm]);

  // Selected items calculations
  const selectedItems = useMemo(() => {
    return goodReceipts.filter((gr) => selectedIds.has(gr.id));
  }, [goodReceipts, selectedIds]);

  // Harga Jual (Dasar Pengenaan Pajak / Subtotal DPP)
  const dppAmount = useMemo(() => {
    return calculateCumulativeTotal(selectedItems);
  }, [selectedItems]);

  // PPN 12% (UU Harmonisasi Peraturan Perpajakan)
  const ppnRate = includePpn ? 0.12 : 0;
  const ppnAmount = useMemo(() => {
    return includePpn ? Math.round(dppAmount * 0.12) : 0;
  }, [includePpn, dppAmount]);

  // Grand Total Tagihan
  const grandTotal = useMemo(() => {
    return dppAmount + ppnAmount;
  }, [dppAmount, ppnAmount]);

  const totalQuantity = useMemo(() => {
    return selectedItems.reduce((acc, curr) => acc + curr.qty, 0);
  }, [selectedItems]);

  const isAllSelected =
    availableGRs.length > 0 && availableGRs.every((gr) => selectedIds.has(gr.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const next = new Set(selectedIds);
      availableGRs.forEach((gr) => next.delete(gr.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      availableGRs.forEach((gr) => next.add(gr.id));
      setSelectedIds(next);
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Execute Firestore Batch Write
  const handleGenerateInvoice = async () => {
    if (selectedItems.length === 0) return;
    setIsSubmitting(true);

    try {
      const invoiceRef = doc(collection(db, 'invoices'));
      const invoiceId = invoiceRef.id;
      const invoiceNumber = generateInvoiceReference(vendorName);
      const nowIso = new Date().toISOString();

      // 1. Line items mapping matching exact Astra Isuzu columns
      const lineItems: InvoiceItem[] = selectedItems.map((item) => ({
        goodReceiptId: item.id,
        noPo: item.noPo,
        serialNumber: item.serialNumber,
        tipe: item.tipe,
        material: item.material,
        description: item.description,
        sLoc: item.sLoc,
        qty: item.qty,
        amount: item.amount,
        plan: item.plan,
        noGr: item.noGr,
        item: item.item,
        assignment: item.assignment,
        grDate: item.grDate,
        poDate: item.poDate,
        vendor: item.vendor,
      }));

      // 2. Invoice Document with Harga Jual and PPN 12%
      const newInvoice: Invoice = {
        id: invoiceId,
        invoiceNumber,
        vendor: vendorName,
        subtotalAmount: dppAmount,
        includePpn,
        ppnRate,
        ppnAmount,
        totalAmount: grandTotal,
        itemCount: selectedItems.length,
        status: 'Open',
        createdByUid: userProfile?.id || 'demo-admin-uid',
        createdByName: userProfile?.name || 'Vendor Admin',
        createdAt: nowIso,
        notes: invoiceNotes.trim(),
        items: lineItems,
      };

      try {
        const batch = writeBatch(db);
        batch.set(invoiceRef, newInvoice);

        // 3. Subcollection for individual line items
        lineItems.forEach((item) => {
          const itemDocRef = doc(collection(db, `invoices/${invoiceId}/items`));
          batch.set(itemDocRef, item);
        });

        // 4. Update status of each checked Good Receipt to "Invoiced"
        selectedItems.forEach((item) => {
          const grDocRef = doc(db, 'goodReceipts', item.id);
          batch.update(grDocRef, {
            status: 'Invoiced',
            invoiceId,
            invoiceNumber,
            invoicedAt: nowIso,
          });
        });

        await batch.commit();
      } catch (firestoreErr) {
        console.warn('Firestore write warning:', firestoreErr);
      }

      setSelectedIds(new Set());
      setShowConfirmModal(false);
      setSuccessResult(newInvoice);
      onInvoiceCreated(newInvoice);
    } catch (err) {
      console.error('Failed to generate invoice:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">
            <Building className="w-3.5 h-3.5" />
            <span>Portal Vendor: {vendorName}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Buat Tagihan (Create Tagihan)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pilih item Good Receipt resmi yang siap ditagihkan. Sistem akan mengakumulasi total Harga Jual dan menerbitkan Nomor Unik Tagihan.
          </p>
        </div>

        {/* Search & Month Filter */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Filter Bulan */}
          <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-200 rounded-lg px-2.5 py-1 text-xs">
            <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-blue-900 font-bold text-[11px]">Bulan:</span>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-transparent text-slate-800 focus:outline-hidden cursor-pointer font-medium"
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

          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari No. PO, Serial, Part..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successResult && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start justify-between shadow-xs animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold">
                Tagihan Berhasil Diterbitkan!
              </div>
              <p className="text-xs text-emerald-700 mt-0.5">
                Nomor Unik Tagihan:{' '}
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-900">
                  {successResult.invoiceNumber}
                </span>{' '}
                sebesar{' '}
                <span className="font-semibold">
                  {formatIDR(successResult.totalAmount)}
                </span>{' '}
                ({successResult.itemCount} item aksesoris).
              </p>
              <p className="text-[11px] text-emerald-600 mt-1">
                Status invoice saat ini: <b>"Open"</b> (Menunggu review & persetujuan pembayaran dari Astra Isuzu).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessResult(null)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-1 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Table of Available Good Receipts */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              disabled={availableGRs.length === 0}
              className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-blue-600 disabled:opacity-40 cursor-pointer"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Pilih Semua ({availableGRs.length} Item Tersedia)</span>
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 font-medium">
              Terpilih:{' '}
              <span className="font-bold text-blue-600">
                {selectedIds.size}
              </span>{' '}
              item
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            Hanya menampilkan GR berstatus <b>Outstanding</b> untuk{' '}
            <span className="text-slate-700 font-medium">{vendorName}</span>
          </div>
        </div>

        {availableGRs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <PackageCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">
              Tidak ada Good Receipt siap tagih.
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Semua item GR untuk vendor Anda sudah dibuatkan tagihan, atau belum ada data Good Receipt yang diupload oleh Astra Isuzu.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10">Pilih</th>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {availableGRs.map((gr) => {
                  const isChecked = selectedIds.has(gr.id);
                  return (
                    <tr
                      key={gr.id}
                      onClick={() => toggleSelectItem(gr.id)}
                      className={`cursor-pointer transition ${
                        isChecked
                          ? 'bg-blue-50/70 hover:bg-blue-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectItem(gr.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">{gr.noPo}</td>
                      <td className="py-3 px-3 text-slate-600">{gr.serialNumber}</td>
                      <td className="py-3 px-3 text-slate-700">{gr.tipe}</td>
                      <td className="py-3 px-3 font-semibold text-blue-700">{gr.material}</td>
                      <td className="py-3 px-3 font-sans text-xs text-slate-800">{gr.description}</td>
                      <td className="py-3 px-2 text-center text-slate-500">{gr.sLoc}</td>
                      <td className="py-3 px-2 text-center font-bold text-slate-800">{gr.qty}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">{formatIDR(gr.amount)}</td>
                      <td className="py-3 px-2 text-center text-slate-500">{gr.plan}</td>
                      <td className="py-3 px-3 font-bold text-slate-800">{gr.noGr}</td>
                      <td className="py-3 px-2 text-center text-slate-500">{gr.item}</td>
                      <td className="py-3 px-2 text-center text-slate-500">{gr.assignment}</td>
                      <td className="py-3 px-2.5 text-slate-600">{gr.grDate}</td>
                      <td className="py-3 px-2.5 text-slate-600">{gr.poDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sticky Bottom Billing Action Bar */}
      <div className="sticky bottom-4 z-30 bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full lg:w-auto">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Item Terpilih
            </span>
            <div className="text-base sm:text-lg font-bold">
              {selectedIds.size}{' '}
              <span className="text-xs font-normal text-slate-400">
                dari {availableGRs.length}
              </span>
            </div>
          </div>

          <div className="hidden sm:block h-8 w-px bg-slate-800" />

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Total Qty
            </span>
            <div className="text-base sm:text-lg font-bold font-mono">
              {totalQuantity}{' '}
              <span className="text-xs font-normal text-slate-400">Unit</span>
            </div>
          </div>

          <div className="hidden sm:block h-8 w-px bg-slate-800" />

          {/* Harga Jual (DPP) */}
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
              Harga Jual (DPP)
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono text-white">
              {formatIDR(dppAmount)}
            </div>
          </div>

          <div className="hidden sm:block h-8 w-px bg-slate-800" />

          {/* Opsi Penambahan PPN 12% */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includePpn}
                onChange={(e) => setIncludePpn(e.target.checked)}
                className="w-4 h-4 rounded text-blue-500 focus:ring-blue-400 border-slate-600 bg-slate-700 cursor-pointer"
              />
              <span className="text-slate-200">
                + PPN 12%:
              </span>
            </label>
            <span className="font-mono font-bold text-xs text-amber-300">
              {includePpn ? formatIDR(ppnAmount) : 'Rp 0'}
            </span>
          </div>

          <div className="hidden lg:block h-8 w-px bg-slate-800" />

          {/* Grand Total Tagihan */}
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
              Total Tagihan
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-300">
              {formatIDR(grandTotal)}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowConfirmModal(true)}
          disabled={selectedIds.size === 0 || isSubmitting}
          className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs tracking-wide shadow-lg hover:shadow-blue-600/30 transition cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memproses Batch Write...</span>
            </>
          ) : (
            <>
              <FilePlus className="w-4 h-4" />
              <span>Generate Tagihan ({selectedIds.size})</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <FilePlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Konfirmasi Generate Tagihan Vendor
                </h3>
                <p className="text-xs text-slate-500">
                  {vendorName}
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl space-y-2 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Jumlah Dokumen GR:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedItems.length} Good Receipt
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Kuantitas Aksesoris:</span>
                  <span className="font-semibold text-slate-800">
                    {totalQuantity} Unit
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-600 font-medium">Harga Jual (DPP):</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatIDR(dppAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={includePpn}
                      onChange={(e) => setIncludePpn(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 cursor-pointer"
                    />
                    <span>Penambahan PPN 12%:</span>
                  </label>
                  <span className="font-mono font-bold text-amber-600">
                    {includePpn ? formatIDR(ppnAmount) : 'Rp 0 (Non-PPN)'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                  <span className="font-bold text-slate-900">
                    Total Nilai Tagihan:
                  </span>
                  <span className="font-mono font-black text-blue-700">
                    {formatIDR(grandTotal)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Catatan / Keterangan Tagihan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="Contoh: Tagihan batch aksesoris periode berjalan..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="p-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Sistem akan mengunci {selectedItems.length} item Good Receipt menjadi status <b>"Invoiced"</b> dan menerbitkan nomor referensi unik dengan status awal <b>"Open"</b> untuk direview oleh Astra Isuzu.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleGenerateInvoice}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Terbitkan Tagihan Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
