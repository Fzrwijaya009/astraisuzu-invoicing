import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Invoice, InvoiceItem } from '../types';
import { formatIDR } from '../utils/billing';
import { printInvoiceDocument } from '../utils/printInvoice';
import { doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  Eye,
  FileCheck2,
  CheckCheck,
  AlertCircle,
  FileText,
  Loader2,
  Lock,
  Pencil,
  Trash2,
  DollarSign,
  AlertTriangle,
  X,
  Printer,
  CalendarDays,
} from 'lucide-react';

interface RegisterTagihanViewProps {
  invoices: Invoice[];
  onSelectInvoice: (inv: Invoice) => void;
  onInvoiceApproved?: (invoiceId: string, scheduledDate: string, approvedBy: string, notes?: string) => void;
  onInvoicePaid?: (invoiceId: string, paymentReference: string, paidBy: string) => void;
  onEditInvoice?: (invoiceId: string, notes: string, updatedItems?: InvoiceItem[]) => void;
  onDeleteInvoice?: (invoiceId: string) => void;
  onRevertGoodReceiptItem?: (grId: string) => void;
}

export const RegisterTagihanView: React.FC<RegisterTagihanViewProps> = ({
  invoices,
  onSelectInvoice,
  onInvoiceApproved,
  onInvoicePaid,
  onEditInvoice,
  onDeleteInvoice,
  onRevertGoodReceiptItem,
}) => {
  const { userProfile } = useAuth();
  const isOwner = userProfile?.role === 'owner';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [createdDateFilter, setCreatedDateFilter] = useState<string>('');
  // Requirement 4: Filter Bulan pada tabel transaksi
  const [monthFilter, setMonthFilter] = useState<string>('');

  // Approval Owners modal state
  const [approvingInvoice, setApprovingInvoice] = useState<Invoice | null>(null);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [approvalNotes, setApprovalNotes] = useState('');

  // Sudah Dibayarkan modal state
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [paymentRef, setPaymentRef] = useState('');

  // Edit Tagihan (Admin Vendor) modal state with line-item editing (Requirement 2)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editingItems, setEditingItems] = useState<InvoiceItem[]>([]);
  const [removedItemIds, setRemovedItemIds] = useState<string[]>([]);

  // Delete Tagihan modal state
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  // Vendor segregation for Admin
  const vendorScopedInvoices = useMemo(() => {
    if (!isOwner && userProfile?.vendor) {
      return invoices.filter((inv) => inv.vendor === userProfile.vendor);
    }
    return invoices;
  }, [invoices, isOwner, userProfile]);

  // Status counts
  const countAll = vendorScopedInvoices.length;
  const countOpen = vendorScopedInvoices.filter((i) => i.status === 'Open').length;
  const countApproved = vendorScopedInvoices.filter(
    (i) => i.status === 'Approval Owners' || i.status === 'Pembayaran Dijadwalkan'
  ).length;
  const countPaid = vendorScopedInvoices.filter((i) => i.status === 'Sudah Dibayarkan').length;

  // Filtered invoices for display (combining search, vendor, status, date, and month filter)
  const visibleInvoices = useMemo(() => {
    return vendorScopedInvoices.filter((inv) => {
      if (isOwner && vendorFilter !== 'ALL' && inv.vendor !== vendorFilter) {
        return false;
      }
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Approval Owners') {
          if (inv.status !== 'Approval Owners' && inv.status !== 'Pembayaran Dijadwalkan') {
            return false;
          }
        } else if (inv.status !== statusFilter) {
          return false;
        }
      }
      // Requirement 4: Filter Bulan pada tabel transaksi
      if (monthFilter && !inv.createdAt.startsWith(monthFilter)) {
        return false;
      }
      // Filter Tanggal Terbit Spesifik
      if (createdDateFilter && !inv.createdAt.startsWith(createdDateFilter)) {
        return false;
      }
      if (
        searchTerm &&
        !inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !inv.vendor.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [vendorScopedInvoices, isOwner, vendorFilter, statusFilter, monthFilter, createdDateFilter, searchTerm]);

  // Execute Owner Approval -> status: 'Approval Owners'
  const handleConfirmApproval = async () => {
    if (!approvingInvoice) return;
    setIsProcessing(true);
    const approvedByName = userProfile?.name || 'Astra Isuzu Master Owner';

    try {
      const invRef = doc(db, 'invoices', approvingInvoice.id);
      await updateDoc(invRef, {
        status: 'Approval Owners',
        scheduledPaymentDate: scheduledDate,
        approvedBy: approvedByName,
        approvedAt: new Date().toISOString(),
        notes: approvalNotes ? `${approvingInvoice.notes || ''} | Review Astra: ${approvalNotes}` : approvingInvoice.notes,
      });
    } catch (err) {
      console.warn('Firestore update warning:', err);
    } finally {
      if (onInvoiceApproved) {
        onInvoiceApproved(approvingInvoice.id, scheduledDate, approvedByName, approvalNotes);
      }
      setApprovingInvoice(null);
      setApprovalNotes('');
      setIsProcessing(false);
    }
  };

  // Execute Owner "Sudah Dibayarkan" -> status: 'Sudah Dibayarkan'
  const handleConfirmPayment = async () => {
    if (!payingInvoice) return;
    setIsProcessing(true);
    const paidByName = userProfile?.name || 'Astra Isuzu Master Owner';
    const refCode = paymentRef.trim() || `TRF-ASTRA-${Date.now().toString().slice(-6)}`;

    try {
      const invRef = doc(db, 'invoices', payingInvoice.id);
      await updateDoc(invRef, {
        status: 'Sudah Dibayarkan',
        paidAt: new Date().toISOString(),
        paidBy: paidByName,
        paymentReference: refCode,
      });
    } catch (err) {
      console.warn('Firestore update warning:', err);
    } finally {
      if (onInvoicePaid) {
        onInvoicePaid(payingInvoice.id, refCode, paidByName);
      }
      setPayingInvoice(null);
      setPaymentRef('');
      setIsProcessing(false);
    }
  };

  // Start Editing Invoice (Requirement 2: Admin can edit row fields while Open)
  const handleStartEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setEditNotes(inv.notes || '');
    setEditingItems(inv.items ? JSON.parse(JSON.stringify(inv.items)) : []);
    setRemovedItemIds([]);
  };

  // Edit single field in an item row (amount recalculates automatically when qty changes)
  const handleUpdateItemField = (index: number, field: keyof InvoiceItem, value: any) => {
    setEditingItems((prev) => {
      const updated = [...prev];
      const currentItem = updated[index];
      if (!currentItem) return prev;

      if (field === 'qty') {
        const newQty = Math.max(1, Number(value) || 1);
        const oldQty = Math.max(1, currentItem.qty || 1);
        const unitPrice = currentItem.amount / oldQty;
        const newAmount = Math.round(unitPrice * newQty);
        updated[index] = {
          ...currentItem,
          qty: newQty,
          amount: newAmount,
        };
      } else {
        updated[index] = { ...currentItem, [field]: value };
      }
      return updated;
    });
  };

  // Remove a line item from editing invoice
  const handleRemoveLineItem = (grId: string) => {
    setEditingItems((prev) => prev.filter((item) => item.goodReceiptId !== grId));
    setRemovedItemIds((prev) => [...prev, grId]);
  };

  // Calculate live amounts for editing invoice
  const editDppAmount = useMemo(() => {
    return editingItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [editingItems]);

  const editPpnAmount = useMemo(() => {
    if (!editingInvoice) return 0;
    return editingInvoice.includePpn ? Math.round(editDppAmount * 0.12) : 0;
  }, [editingInvoice, editDppAmount]);

  const editGrandTotal = useMemo(() => {
    return editDppAmount + editPpnAmount;
  }, [editDppAmount, editPpnAmount]);

  // Confirm Edit (Save updated line items and notes)
  const handleConfirmEdit = async () => {
    if (!editingInvoice) return;
    setIsProcessing(true);

    try {
      if (editingItems.length === 0) {
        await handleConfirmDelete();
        setEditingInvoice(null);
        setIsProcessing(false);
        return;
      }

      // Revert any removed line items in Firestore back to status: "Outstanding"
      if (removedItemIds.length > 0) {
        const batch = writeBatch(db);
        removedItemIds.forEach((grId) => {
          const grRef = doc(db, 'goodReceipts', grId);
          batch.update(grRef, {
            status: 'Outstanding',
            invoiceId: null,
            invoiceNumber: null,
            invoicedAt: null,
          });
          if (onRevertGoodReceiptItem) onRevertGoodReceiptItem(grId);
        });
        await batch.commit();
      }

      // Update the invoice document with edited row values
      const invRef = doc(db, 'invoices', editingInvoice.id);
      await updateDoc(invRef, {
        notes: editNotes.trim(),
        items: editingItems,
        itemCount: editingItems.length,
        subtotalAmount: editDppAmount,
        ppnAmount: editPpnAmount,
        totalAmount: editGrandTotal,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Firestore edit warning:', err);
    } finally {
      if (onEditInvoice) {
        onEditInvoice(editingInvoice.id, editNotes.trim(), editingItems);
      }
      setEditingInvoice(null);
      setIsProcessing(false);
    }
  };

  // Execute Delete Invoice (allowed only if Open)
  const handleConfirmDelete = async () => {
    const target = deletingInvoice || editingInvoice;
    if (!target) return;
    setIsProcessing(true);

    try {
      if (target.items && target.items.length > 0) {
        const batch = writeBatch(db);
        target.items.forEach((item) => {
          const grRef = doc(db, 'goodReceipts', item.goodReceiptId);
          batch.update(grRef, {
            status: 'Outstanding',
            invoiceId: null,
            invoiceNumber: null,
            invoicedAt: null,
          });
          if (onRevertGoodReceiptItem) onRevertGoodReceiptItem(item.goodReceiptId);
        });
        await batch.commit();
      }

      const invRef = doc(db, 'invoices', target.id);
      await deleteDoc(invRef);
    } catch (err) {
      console.warn('Firestore delete warning:', err);
    } finally {
      if (onDeleteInvoice) {
        onDeleteInvoice(target.id);
      }
      setDeletingInvoice(null);
      setEditingInvoice(null);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Register Tagihan Vendor Aksesoris
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isOwner
              ? 'Monitoring seluruh tagihan vendor. Otorisasi Owner untuk persetujuan (Approval Owners) dan validasi Sudah Dibayarkan.'
              : `Daftar tagihan resmi untuk ${userProfile?.vendor}. Admin dapat mengedit rincian baris jika status masih Open.`}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari Nomor Tagihan / Vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Filter Tabs & Selectors (Includes Requirement 4: Filter Bulan) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Semua ({countAll})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Open')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'Open'
                ? 'bg-amber-600 text-white'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Open ({countOpen})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Approval Owners')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'Approval Owners'
                ? 'bg-indigo-600 text-white'
                : 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approval Owners ({countApproved})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Sudah Dibayarkan')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'Sudah Dibayarkan'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Sudah Dibayarkan ({countPaid})
          </button>
        </div>

        {/* Filters Group: Month Filter, Date Filter & Vendor Filter */}
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

          {/* Tanggal Buat Tagihan (Date) Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 text-[11px] font-medium">Tgl Spesifik:</span>
            <input
              type="date"
              value={createdDateFilter}
              onChange={(e) => setCreatedDateFilter(e.target.value)}
              className="text-xs bg-transparent text-slate-800 focus:outline-hidden cursor-pointer"
            />
            {createdDateFilter && (
              <button
                type="button"
                onClick={() => setCreatedDateFilter('')}
                className="text-slate-400 hover:text-slate-700 font-bold ml-1 cursor-pointer"
                title="Reset filter tanggal"
              >
                ✕
              </button>
            )}
          </div>

          {/* Vendor Selector (Owner Only) */}
          {isOwner && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Vendor:</span>
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Semua Vendor</option>
                {Array.from(new Set(invoices.map((i) => i.vendor))).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {visibleInvoices.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">
              Tidak ada tagihan yang sesuai filter.
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {isOwner
                ? 'Belum ada data tagihan terdaftar, atau sesuaikan filter bulan/tanggal/pencarian Anda.'
                : 'Belum ada tagihan yang diterbitkan oleh vendor Anda.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">No. Unik Tagihan</th>
                  <th className="py-3 px-3">Vendor Penerbit</th>
                  <th className="py-3 px-3">Tanggal Terbit</th>
                  <th className="py-3 px-3 text-center">Jumlah Item</th>
                  <th className="py-3 px-3 text-right">Harga Jual (DPP)</th>
                  <th className="py-3 px-3 text-right">PPN 12%</th>
                  <th className="py-3 px-3 text-right">Total Tagihan</th>
                  <th className="py-3 px-3">Status Tagihan</th>
                  <th className="py-3 px-3">Jadwal / Info Bayar</th>
                  <th className="py-3 px-4 text-right">Aksi & Otorisasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleInvoices.map((inv) => {
                  const isApproved =
                    inv.status === 'Approval Owners' ||
                    inv.status === 'Pembayaran Dijadwalkan' ||
                    inv.status === 'Sudah Dibayarkan';
                  const isOpen = inv.status === 'Open';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">
                          {inv.vendor}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Oleh: {inv.createdByName}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-medium">
                        {new Date(inv.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
                          {inv.itemCount} Item
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-700">
                        {formatIDR(inv.subtotalAmount || inv.totalAmount)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-amber-700">
                        {inv.includePpn || inv.ppnAmount ? formatIDR(inv.ppnAmount) : 'Rp 0'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatIDR(inv.totalAmount)}
                      </td>
                      <td className="py-3.5 px-3">
                        {isOpen ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3 mr-1 text-amber-600 animate-spin" />
                            Open
                          </span>
                        ) : inv.status === 'Approval Owners' || inv.status === 'Pembayaran Dijadwalkan' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-indigo-600" />
                            Approval Owners
                          </span>
                        ) : inv.status === 'Sudah Dibayarkan' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCheck className="w-3 h-3 mr-1 text-emerald-600" />
                            Sudah Dibayarkan
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                            Ditolak
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        {inv.status === 'Sudah Dibayarkan' ? (
                          <div className="text-emerald-800 font-medium text-[11px]">
                            Lunas: {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('id-ID') : 'Tervalidasi'}
                            {inv.paymentReference && (
                              <div className="font-mono text-[10px] text-emerald-600">
                                Ref: {inv.paymentReference}
                              </div>
                            )}
                          </div>
                        ) : inv.scheduledPaymentDate ? (
                          <div className="flex items-center gap-1.5 font-medium text-indigo-800 text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{inv.scheduledPaymentDate}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">
                            Menunggu Review
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Direct Cetak/Print Button (Requirement 1) */}
                          <button
                            type="button"
                            onClick={() => printInvoiceDocument(inv)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer border border-blue-200"
                            title="Cetak langsung menggunakan Google Print Preview / Simpan PDF"
                          >
                            <Printer className="w-3.5 h-3.5 text-blue-600" />
                            <span>Cetak</span>
                          </button>

                          {/* Rincian Button */}
                          <button
                            type="button"
                            onClick={() => onSelectInvoice(inv)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1 transition cursor-pointer"
                            title="Buka rincian lengkap invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Rincian</span>
                          </button>

                          {/* MASTER SYSTEM OWNER ACTIONS */}
                          {isOwner && isOpen && (
                            <button
                              type="button"
                              onClick={() => setApprovingInvoice(inv)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                              title="Beri persetujuan Approval Owners"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approval Owners</span>
                            </button>
                          )}

                          {isOwner && (inv.status === 'Approval Owners' || inv.status === 'Pembayaran Dijadwalkan') && (
                            <button
                              type="button"
                              onClick={() => setPayingInvoice(inv)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                              title="Tandai pembayaran telah selesai ditransfer"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>Sudah Dibayarkan</span>
                            </button>
                          )}

                          {/* VENDOR ADMIN ACTIONS: Edit & Delete (ONLY IF STATUS IS OPEN - Requirement 2 & 5) */}
                          {!isOwner && isOpen && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(inv)}
                                className="px-2 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs flex items-center gap-1 transition cursor-pointer"
                                title="Edit seluruh isi baris table No PO, Serial, Material, Desc, Qty (Kecuali Amount)"
                              >
                                <Pencil className="w-3.5 h-3.5 text-blue-600" />
                                <span>Edit Isi</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeletingInvoice(inv)}
                                className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-xs flex items-center gap-1 transition cursor-pointer"
                                title="Hapus seluruh tagihan dan kembalikan item GR ke status Outstanding"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>Hapus</span>
                              </button>
                            </>
                          )}

                          {/* LOCKED BADGE WHEN ALREADY APPROVED (VENDOR CANNOT EDIT / DELETE - Requirement 2) */}
                          {!isOwner && isApproved && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-medium border border-slate-200"
                              title="Tagihan sudah di-approve oleh Owner sehingga data terkunci permanen dan tidak bisa diedit/dihapus"
                            >
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>Terkunci</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Owner Approval Modal ("Approval Owners") */}
      {approvingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Otorisasi "Approval Owners"
                </h3>
                <p className="text-xs text-slate-500">
                  Persetujuan Resmi Master System Owner
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Tagihan:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {approvingInvoice.invoiceNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vendor:</span>
                  <span className="font-semibold text-slate-800">
                    {approvingInvoice.vendor}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Harga Jual (DPP):</span>
                  <span className="font-mono text-slate-800">
                    {formatIDR(approvingInvoice.subtotalAmount || approvingInvoice.totalAmount)}
                  </span>
                </div>
                {approvingInvoice.includePpn && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">PPN 12%:</span>
                    <span className="font-mono text-amber-700">
                      {formatIDR(approvingInvoice.ppnAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-200 text-sm">
                  <span className="font-bold text-slate-900">Total Tagihan:</span>
                  <span className="font-mono font-black text-blue-700">
                    {formatIDR(approvingInvoice.totalAmount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Target Tanggal Pembayaran (Payment Schedule)
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Catatan Persetujuan Finance (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Contoh: Dokumen fisik telah diverifikasi, pembayaran dijadwalkan via transfer bank..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="p-3 rounded-lg bg-indigo-50 text-indigo-900 text-[11px] flex items-start gap-2 border border-indigo-200">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p>
                  Status tagihan akan berubah menjadi <b>"Approval Owners"</b>. Tagihan akan terkunci sehingga admin vendor tidak dapat lagi mengedit atau menghapus data.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApprovingInvoice(null)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan "Approval Owners"</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Owner "Sudah Dibayarkan" Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Konfirmasi "Sudah Dibayarkan"
                </h3>
                <p className="text-xs text-slate-500">
                  Otorisasi Master System Owner
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Tagihan:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {payingInvoice.invoiceNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vendor:</span>
                  <span className="font-semibold text-slate-800">
                    {payingInvoice.vendor}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 text-sm">
                  <span className="font-bold text-slate-900">Total Nominal Dibayar:</span>
                  <span className="font-mono font-black text-emerald-700">
                    {formatIDR(payingInvoice.totalAmount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nomor Referensi Transfer / Bukti Pembayaran (Opsional)
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Contoh: TRF-BNI-20261022-88912"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-900 text-[11px] flex items-start gap-2 border border-emerald-200">
                <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  Dengan otorisasi ini, tagihan vendor ini resmi dinyatakan <b>"Sudah Dibayarkan"</b> dan tercatat lunas di seluruh dashboard & laporan.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPayingInvoice(null)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Konfirmasi Sudah Dibayarkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Admin Edit Modal (Requirement 2: Admin can edit No PO, Serial, Material, Description, Qty (kecuali Amount), and delete row) */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Rincian Baris Tagihan Vendor
                  </h3>
                  <p className="text-xs text-slate-500">
                    Otorisasi Admin Vendor: Edit No PO, Serial, Material, Description, Qty (Kecuali Amount terkunci). Hapus Baris tetap tersedia.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {/* Summary Banner */}
              <div className="p-3 bg-slate-50 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3 border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">No. Tagihan</span>
                  <span className="font-mono font-bold text-slate-900">{editingInvoice.invoiceNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Jumlah Item</span>
                  <span className="font-bold text-slate-800">{editingItems.length} Item</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Harga Jual (DPP)</span>
                  <span className="font-mono font-bold text-slate-800">{formatIDR(editDppAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Total (+PPN 12%)</span>
                  <span className="font-mono font-black text-blue-700">{formatIDR(editGrandTotal)}</span>
                </div>
              </div>

              {/* Requirement 2: Editable Table of Line Items */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Tabel Rincian Item (Silakan edit field No PO, Serial, Material, Description, Qty):
                </label>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                  {editingItems.length === 0 ? (
                    <div className="py-8 text-center text-rose-500 font-semibold">
                      Seluruh item telah dihapus. Tagihan ini akan otomatis dibatalkan jika disimpan.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px] sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-2 w-32">No PO</th>
                          <th className="py-2.5 px-2 w-36">Serial #</th>
                          <th className="py-2.5 px-2 w-32">Material</th>
                          <th className="py-2.5 px-2">Description</th>
                          <th className="py-2.5 px-2 w-20 text-center">Qty</th>
                          <th className="py-2.5 px-2 w-36 text-right">Amount (Terkunci)</th>
                          <th className="py-2.5 px-2 w-28 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {editingItems.map((item, idx) => (
                          <tr key={item.goodReceiptId || idx} className="hover:bg-slate-50/70">
                            {/* 1. Editable No PO */}
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={item.noPo}
                                onChange={(e) => handleUpdateItemField(idx, 'noPo', e.target.value)}
                                className="w-full text-xs font-mono font-bold p-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-blue-500"
                              />
                            </td>

                            {/* 2. Editable Serial Number */}
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={item.serialNumber}
                                onChange={(e) => handleUpdateItemField(idx, 'serialNumber', e.target.value)}
                                className="w-full text-xs font-mono p-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-blue-500"
                              />
                            </td>

                            {/* 3. Editable Material */}
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={item.material}
                                onChange={(e) => handleUpdateItemField(idx, 'material', e.target.value)}
                                className="w-full text-xs font-mono font-semibold text-blue-700 p-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-blue-500"
                              />
                            </td>

                            {/* 4. Editable Description */}
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleUpdateItemField(idx, 'description', e.target.value)}
                                className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-blue-500"
                              />
                            </td>

                            {/* 5. Editable Qty */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => handleUpdateItemField(idx, 'qty', Math.max(1, Number(e.target.value) || 1))}
                                className="w-16 text-xs text-center font-bold p-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-blue-500 mx-auto"
                              />
                            </td>

                            {/* 6. Locked Amount (kecuali Amount) */}
                            <td className="py-2 px-2 text-right">
                              <div
                                className="px-2 py-1.5 bg-slate-100 rounded text-right font-mono font-bold text-slate-800 text-xs border border-slate-200 flex items-center justify-end gap-1 select-none"
                                title="Amount terkunci sesuai ketentuan (kecuali Amount)"
                              >
                                <Lock className="w-3 h-3 text-slate-400" />
                                <span>{formatIDR(item.amount)}</span>
                              </div>
                            </td>

                            {/* 7. Hapus Baris Button */}
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(item.goodReceiptId)}
                                className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] transition cursor-pointer flex items-center gap-1 mx-auto border border-rose-200"
                                title="Hapus baris item ini dari tagihan dan kembalikan ke status Outstanding"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                <span>Hapus Baris</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Edit Notes */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Catatan / Keterangan Tagihan
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  placeholder="Tambahkan catatan revisi transaksi..."
                />
              </div>

              <div className="p-3 rounded-lg bg-blue-50 text-blue-900 text-[11px] flex items-start gap-2 border border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  Perubahan pada baris tabel akan diperbarui pada dokumen tagihan resmi. Baris item yang dihapus akan otomatis dikembalikan ke status <b>"Outstanding"</b>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmEdit}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Perubahan Tagihan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Admin Delete Entire Invoice Confirmation Modal */}
      {deletingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200">
            <div className="flex items-center gap-3 pb-3 border-b border-rose-100">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Hapus Tagihan?
                </h3>
                <p className="text-xs text-rose-600 font-semibold">
                  Tindakan ini akan membatalkan tagihan
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <p className="text-slate-700 leading-relaxed">
                Apakah Anda yakin ingin menghapus tagihan{' '}
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                  {deletingInvoice.invoiceNumber}
                </span>{' '}
                sebesar <b>{formatIDR(deletingInvoice.totalAmount)}</b>?
              </p>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Seluruh <b>{deletingInvoice.itemCount} item Good Receipt</b> yang terkait akan otomatis dikembalikan ke status <b>"Outstanding"</b> dan dapat dipilih kembali di menu Buat Tagihan.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingInvoice(null)}
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
                <span>Ya, Hapus Tagihan Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
