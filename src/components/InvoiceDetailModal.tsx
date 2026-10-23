import React, { useState } from 'react';
import { Invoice } from '../types';
import { formatIDR } from '../utils/billing';
import { printInvoiceDocument } from '../utils/printInvoice';
import {
  X,
  Printer,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Receipt,
  Download,
  Building,
  CheckCheck,
} from 'lucide-react';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  onClose,
}) => {
  const [printNotice, setPrintNotice] = useState<string | null>(null);

  if (!invoice) return null;

  const dppAmount = invoice.subtotalAmount || invoice.totalAmount;
  const ppnAmount = invoice.includePpn ? (invoice.ppnAmount || Math.round(dppAmount * 0.12)) : 0;
  const grandTotal = invoice.totalAmount;

  // Requirement 1: Reliable Google Chrome / browser print preview
  const handlePrint = () => {
    try {
      printInvoiceDocument(invoice);
    } catch (err) {
      console.warn('Print command error:', err);
      window.focus();
      window.print();
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto"
    >
      <div className="bg-white rounded-2xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
        {/* Modal Top Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 print:hidden sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Receipt className="w-4 h-4 text-blue-600" />
            <span>Lembar Resmi Faktur / Tagihan Vendor Aksesoris</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Prominent Google Print / Cetak PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
              title="Cetak langsung menggunakan dialog cetak Google / browser atau Simpan PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Print (Google Print View)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {printNotice && (
          <div className="p-3 my-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center justify-between">
            <span>{printNotice}</span>
            <button
              type="button"
              onClick={() => setPrintNotice(null)}
              className="text-amber-700 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Printable Invoice Sheet */}
        <div id="printable-invoice-sheet" className="pt-6 space-y-6 bg-white">
          {/* Header with Astra Isuzu and Vendor info */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <img
                src="/assets/aistudio/Astra_Isuzu_Logo_Vector.svg__220102f2.png"
                alt="Astra Isuzu"
                className="h-10 w-auto object-contain mb-2"
              />
              <div className="text-xs font-semibold text-slate-700">
                PT. Astra International Tbk - Isuzu Sales Operation
              </div>
              <div className="text-xs text-slate-500">
                Departemen Aksesoris & SCM Logistik
              </div>
            </div>

            <div className="sm:text-right">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Nomor Unik Tagihan (Reference Code)
              </div>
              <div className="text-lg font-mono font-black text-blue-700 mt-0.5">
                {invoice.invoiceNumber}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Tanggal Terbit:{' '}
                {new Date(invoice.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>

          {/* Status Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500">Vendor Penerbit:</span>
              <div className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-600" />
                <span>{invoice.vendor}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Diajukan oleh: {invoice.createdByName}
              </div>
            </div>

            <div className="sm:text-right">
              <span className="text-slate-500">Status Otorisasi:</span>
              <div className="mt-1">
                {invoice.status === 'Open' ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                    <Clock className="w-3.5 h-3.5 mr-1 text-amber-600 animate-spin" />
                    Open (Menunggu Approval Owners)
                  </span>
                ) : invoice.status === 'Approval Owners' || invoice.status === 'Pembayaran Dijadwalkan' ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                    Approval Owners (Dijadwalkan: {invoice.scheduledPaymentDate || '-'})
                  </span>
                ) : invoice.status === 'Sudah Dibayarkan' ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900">
                    <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Sudah Dibayarkan {invoice.paidAt ? `(${new Date(invoice.paidAt).toLocaleDateString('id-ID')})` : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900">
                    Tagihan Ditolak
                  </span>
                )}
              </div>
              {invoice.approvedBy && (
                <div className="text-[10px] text-emerald-700 font-medium mt-1">
                  Disetujui oleh: {invoice.approvedBy}
                </div>
              )}
            </div>
          </div>

          {/* Items Table Matching SAP Good Receipt Columns */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">No PO</th>
                    <th className="py-2.5 px-3">Serial number</th>
                    <th className="py-2.5 px-3">Tipe</th>
                    <th className="py-2.5 px-3">Material</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-2 text-center">SLoc</th>
                    <th className="py-2.5 px-2 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Harga Jual</th>
                    <th className="py-2.5 px-2 text-center">Plan</th>
                    <th className="py-2.5 px-3">No GR/GL</th>
                    <th className="py-2.5 px-2 text-center">Item</th>
                    <th className="py-2.5 px-2 text-center">A</th>
                    <th className="py-2.5 px-2.5">GR/GL Date</th>
                    <th className="py-2.5 px-2.5">PO Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {(invoice.items || []).length > 0 ? (
                    invoice.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">{item.noPo}</td>
                        <td className="py-2 px-3 text-slate-600">{item.serialNumber}</td>
                        <td className="py-2 px-3 text-slate-700">{item.tipe}</td>
                        <td className="py-2 px-3 font-semibold text-blue-700">{item.material}</td>
                        <td className="py-2 px-3 font-sans text-xs text-slate-800">{item.description}</td>
                        <td className="py-2 px-2 text-center text-slate-500">{item.sLoc}</td>
                        <td className="py-2 px-2 text-center font-bold text-slate-800">{item.qty}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{formatIDR(item.amount)}</td>
                        <td className="py-2 px-2 text-center text-slate-500">{item.plan}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{item.noGr}</td>
                        <td className="py-2 px-2 text-center text-slate-500">{item.item}</td>
                        <td className="py-2 px-2 text-center text-slate-500">{item.assignment}</td>
                        <td className="py-2 px-2.5 text-slate-600">{item.grDate}</td>
                        <td className="py-2 px-2.5 text-slate-600">{item.poDate}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={14} className="py-4 text-center text-slate-400">
                        Item rincian: {invoice.itemCount} Good Receipt dokumen tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown (Harga Jual, PPN 12%, Total Tagihan) */}
            <div className="bg-slate-50/90 border-t border-slate-200 p-4">
              <div className="max-w-md ml-auto space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span className="font-semibold">Harga Jual (DPP) ({invoice.itemCount} Item):</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatIDR(dppAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-semibold">
                    Penambahan PPN 12% (UU HPP):
                  </span>
                  <span className="font-mono font-bold text-amber-700">
                    {invoice.includePpn || invoice.ppnAmount ? formatIDR(ppnAmount) : 'Rp 0 (Non-PPN)'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-300 text-sm">
                  <span className="font-black text-slate-900">
                    Grand Total Tagihan:
                  </span>
                  <span className="font-mono font-black text-blue-700 text-base">
                    {formatIDR(grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Verification Stamp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs">
              <span className="font-bold text-slate-700 block mb-1">
                Catatan Transaksi:
              </span>
              <p className="text-slate-600 leading-relaxed">
                {invoice.notes || 'Tidak ada catatan khusus yang dilampirkan.'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 text-xs flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-950 block">
                  Verifikasi Sistem Terintegrasi
                </span>
                <p className="text-emerald-800 text-[11px] mt-0.5 leading-relaxed">
                  Dokumen ini diterbitkan secara elektronik melalui sistem Monitoring Tagihan Vendor Aksesoris Astra Isuzu dan terdata sah di Cloud Firestore.
                </p>
              </div>
            </div>
          </div>

          {/* Modal Bottom Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Faktur Sekarang</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
