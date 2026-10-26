import * as XLSX from 'xlsx';
import { Invoice } from '../types';

/**
 * Exports detailed invoice and all line items to an Excel (.xlsx) file.
 */
export function exportInvoiceToExcel(invoice: Invoice) {
  if (!invoice) return;

  const dpp = invoice.subtotalAmount || invoice.totalAmount;
  const ppn = invoice.includePpn ? (invoice.ppnAmount || Math.round(dpp * 0.12)) : 0;
  const grandTotal = invoice.totalAmount;

  const cleanDate = (isoStr?: string) => {
    if (!isoStr) return '-';
    try {
      return new Date(isoStr).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  // Build rows array for the sheet
  const sheetData: any[][] = [];

  // Title Block
  sheetData.push(['RINCIAN DETAIL TAGIHAN VENDOR AKSESORIS - ASTRA ISUZU']);
  sheetData.push(['PT. Astra International Tbk - Isuzu Sales Operation']);
  sheetData.push(['Departemen Aksesoris & SCM Logistik']);
  sheetData.push([]); // blank line

  // Metadata Block
  sheetData.push(['INFORMASI TAGIHAN']);
  sheetData.push(['Nomor Unik Tagihan', invoice.invoiceNumber]);
  sheetData.push(['Nama Vendor Penerbit', invoice.vendor]);
  sheetData.push(['Tanggal Terbit Tagihan', cleanDate(invoice.createdAt)]);
  sheetData.push(['Status Tagihan', invoice.status]);
  sheetData.push(['Diajukan Oleh', invoice.createdByName || '-']);
  sheetData.push(['Tanggal Jadwal Pembayaran', invoice.scheduledPaymentDate || '-']);
  sheetData.push(['Disetujui Oleh (Owner)', invoice.approvedBy || '-']);
  sheetData.push(['Tanggal Persetujuan', cleanDate(invoice.approvedAt)]);
  sheetData.push(['Tanggal Pelunasan', cleanDate(invoice.paidAt)]);
  sheetData.push(['Referensi / No Bukti Bayar', invoice.paymentReference || '-']);
  sheetData.push(['Catatan Tagihan', invoice.notes || '-']);
  sheetData.push([]); // blank line

  // Financial Summary Block
  sheetData.push(['RINGKASAN FINANSIAL']);
  sheetData.push(['Harga Jual (DPP)', dpp]);
  sheetData.push(['PPN 12% (UU HPP)', ppn]);
  sheetData.push(['Grand Total Tagihan (DPP + PPN)', grandTotal]);
  sheetData.push(['Jumlah Item Good Receipt', (invoice.items?.length || invoice.itemCount || 0)]);
  sheetData.push([]); // blank line

  // Table Header for Line Items
  sheetData.push(['RINCIAN ITEM GOOD RECEIPT (SAP ASTRA ISUZU)']);
  const tableHeaders = [
    'No',
    'No PO',
    'Serial Number (No. Rangka)',
    'Tipe Kendaraan',
    'Material (Part Number)',
    'Description (Aksesoris)',
    'SLoc',
    'Qty',
    'Harga Jual / Amount (IDR)',
    'Plan',
    'No GR/GL',
    'Item',
    'Assignment (A)',
    'GR/GL Date',
    'PO Date',
  ];
  sheetData.push(tableHeaders);

  // Table Body Rows
  let totalQty = 0;
  let totalAmount = 0;

  if (invoice.items && invoice.items.length > 0) {
    invoice.items.forEach((item, index) => {
      const itemQty = Number(item.qty) || 0;
      const itemAmount = Number(item.amount) || 0;
      totalQty += itemQty;
      totalAmount += itemAmount;

      sheetData.push([
        index + 1,
        item.noPo || '-',
        item.serialNumber || '-',
        item.tipe || '-',
        item.material || '-',
        item.description || '-',
        item.sLoc || '-',
        itemQty,
        itemAmount,
        item.plan || '-',
        item.noGr || '-',
        item.item || '-',
        item.assignment || '-',
        item.grDate || '-',
        item.poDate || '-',
      ]);
    });

    // Total Row
    sheetData.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      '',
      totalQty,
      totalAmount,
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
  } else {
    sheetData.push(['Tidak ada rincian item atau data Good Receipt kosong.']);
  }

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths for comfortable viewing in Excel
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 16 }, // No PO
    { wch: 22 }, // Serial Number
    { wch: 20 }, // Tipe
    { wch: 22 }, // Material
    { wch: 34 }, // Description
    { wch: 8 },  // SLoc
    { wch: 8 },  // Qty
    { wch: 22 }, // Amount (IDR)
    { wch: 8 },  // Plan
    { wch: 16 }, // No GR/GL
    { wch: 8 },  // Item
    { wch: 14 }, // Assignment
    { wch: 14 }, // GR/GL Date
    { wch: 14 }, // PO Date
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Rincian Tagihan');

  // Generate safe filename
  const safeInvoiceNo = (invoice.invoiceNumber || 'Tagihan').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeVendor = (invoice.vendor || 'Vendor').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Rincian_${safeInvoiceNo}_${safeVendor}.xlsx`;

  // Download the Excel file in browser
  XLSX.writeFile(wb, filename);
}
