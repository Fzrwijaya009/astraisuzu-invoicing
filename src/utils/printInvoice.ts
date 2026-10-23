import { Invoice } from '../types';
import { formatIDR } from './billing';

/**
 * Builds a clean, official Astra Isuzu Billing Slip / Faktur Tagihan HTML document
 * fully styled and ready for Google Chrome Print Preview ("Google Print View") and Save to PDF.
 */
export function buildInvoicePrintHtml(invoice: Invoice): string {
  const dppAmount = invoice.subtotalAmount || invoice.totalAmount;
  const ppnAmount = invoice.ppnAmount || (invoice.includePpn ? Math.round(dppAmount * 0.12) : 0);
  const grandTotal = invoice.totalAmount;
  const issueDateFormatted = new Date(invoice.createdAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const itemsHtml = (invoice.items || [])
    .map(
      (it, idx) => `
      <tr>
        <td style="text-align: center; font-size: 10px; color: #64748b; padding: 6px 4px; border: 1px solid #cbd5e1;">${idx + 1}</td>
        <td style="font-family: monospace; font-weight: bold; padding: 6px 6px; border: 1px solid #cbd5e1;">${it.noPo || '-'}</td>
        <td style="font-family: monospace; font-size: 10px; padding: 6px 6px; border: 1px solid #cbd5e1;">${it.serialNumber || '-'}</td>
        <td style="font-size: 10px; padding: 6px 6px; border: 1px solid #cbd5e1;">${it.tipe || '-'}</td>
        <td style="font-family: monospace; font-weight: 600; color: #1e40af; padding: 6px 6px; border: 1px solid #cbd5e1;">${it.material || '-'}</td>
        <td style="padding: 6px 6px; border: 1px solid #cbd5e1;">${it.description || '-'}</td>
        <td style="text-align: center; font-size: 10px; padding: 6px 4px; border: 1px solid #cbd5e1;">${it.sLoc || '2000'}</td>
        <td style="text-align: center; font-weight: bold; font-size: 11px; padding: 6px 4px; border: 1px solid #cbd5e1;">${it.qty || 1}</td>
        <td style="text-align: right; font-family: monospace; font-weight: bold; padding: 6px 6px; border: 1px solid #cbd5e1;">${formatIDR(it.amount)}</td>
        <td style="text-align: center; font-size: 10px; padding: 6px 4px; border: 1px solid #cbd5e1;">${it.plan || 'I000'}</td>
        <td style="font-family: monospace; font-size: 10px; padding: 6px 6px; border: 1px solid #cbd5e1;">${it.noGr || '-'}</td>
        <td style="text-align: center; font-size: 10px; padding: 6px 4px; border: 1px solid #cbd5e1;">${it.item || '1'}</td>
        <td style="text-align: center; font-size: 10px; padding: 6px 4px; border: 1px solid #cbd5e1;">${it.assignment || 'H'}</td>
        <td style="font-size: 10px; padding: 6px 4px; border: 1px solid #cbd5e1;">${it.grDate || '-'}</td>
        <td style="font-size: 10px; padding: 6px 4px; border: 1px solid #cbd5e1;">${it.poDate || '-'}</td>
      </tr>
    `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Faktur Tagihan - ${invoice.invoiceNumber}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 16px;
      font-size: 11px;
      line-height: 1.35;
    }
    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .brand-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: -0.3px;
    }
    .brand-sub {
      font-size: 11px;
      color: #475569;
      font-weight: 500;
      margin-top: 2px;
    }
    .doc-badge {
      display: inline-block;
      background: #1e3a8a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    .meta-box {
      text-align: right;
    }
    .meta-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .meta-ref {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 15px;
      font-weight: 800;
      color: #1e40af;
      margin: 2px 0;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }
    .info-label {
      font-size: 9px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
    }
    .info-value {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 1px;
    }
    .status-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      background: #e0f2fe;
      color: #0369a1;
      margin-top: 2px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 14px;
    }
    table.data-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9px;
      padding: 6px 4px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    .summary-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 20px;
    }
    .notes-box {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 10px;
    }
    .calc-box {
      width: 360px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }
    .calc-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11px;
    }
    .calc-row.grand-total {
      background: #eff6ff;
      border-bottom: none;
      font-size: 13px;
      font-weight: 800;
      color: #1e3a8a;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      text-align: center;
      margin-top: 24px;
      padding-top: 12px;
      page-break-inside: avoid;
    }
    .sig-box {
      border-top: 1px solid #94a3b8;
      padding-top: 6px;
      font-size: 10px;
    }
    .sig-space {
      height: 52px;
    }
    .sig-role {
      font-weight: 700;
      color: #0f172a;
    }
    .sig-name {
      color: #64748b;
      margin-top: 2px;
    }
    .watermark {
      text-align: right;
      font-size: 8px;
      color: #94a3b8;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="print-header">
    <div>
      <div class="brand-title">PT. Astra International Tbk - Isuzu Sales Operation</div>
      <div class="brand-sub">Departemen Aksesoris & Supply Chain Management (SCM) HO</div>
      <div class="doc-badge">Official Billing & Good Receipt Settlement Document</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Nomor Unik Tagihan</div>
      <div class="meta-ref">${invoice.invoiceNumber}</div>
      <div style="font-size: 10px; color: #475569; margin-top: 2px;">Tanggal Terbit: <b>${issueDateFormatted}</b></div>
    </div>
  </div>

  <div class="info-grid">
    <div>
      <div class="info-label">Vendor Aksesoris Resmi</div>
      <div class="info-value">${invoice.vendor}</div>
      <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Diajukan oleh: ${invoice.createdByName || 'Admin Vendor'}</div>
    </div>
    <div>
      <div class="info-label">Status Otorisasi Dokumen</div>
      <div class="status-tag">${invoice.status}</div>
      ${invoice.approvedBy ? `<div style="font-size: 9px; color: #047857; margin-top: 3px;">Approved: ${invoice.approvedBy}</div>` : ''}
    </div>
    <div>
      <div class="info-label">Informasi Pembayaran</div>
      <div style="font-weight: 700; color: #1e3a8a; font-size: 11px;">
        ${invoice.status === 'Sudah Dibayarkan' ? 'LUNAS DITRANSFER' : invoice.scheduledPaymentDate ? `Jadwal: ${invoice.scheduledPaymentDate}` : 'Menunggu Approval Owner'}
      </div>
      ${invoice.paymentReference ? `<div style="font-size: 9px; font-family: monospace; color: #047857;">Ref: ${invoice.paymentReference}</div>` : ''}
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="text-align: center; width: 24px;">No</th>
        <th>No PO</th>
        <th>Serial Number</th>
        <th>Tipe Kendaraan</th>
        <th>Kode Part / Material</th>
        <th>Deskripsi Aksesoris</th>
        <th style="text-align: center;">SLoc</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Amount (IDR)</th>
        <th style="text-align: center;">Plan</th>
        <th>No GR/GL</th>
        <th style="text-align: center;">Item</th>
        <th style="text-align: center;">A</th>
        <th>GR Date</th>
        <th>PO Date</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="summary-section">
    <div class="notes-box">
      <div style="font-weight: 700; color: #334155; margin-bottom: 4px; text-transform: uppercase; font-size: 9px;">Catatan & Keterangan Tagihan:</div>
      <div>${invoice.notes ? invoice.notes : 'Tagihan aksesoris resmi diterbitkan sesuai Good Receipt SAP Astra Isuzu.'}</div>
      <div style="margin-top: 6px; font-size: 9px; color: #64748b;">
        * Dokumen dicetak dan diverifikasi melalui Sistem Otomasi Tagihan Vendor Aksesoris Astra Isuzu.
      </div>
    </div>

    <div class="calc-box">
      <div class="calc-row">
        <span style="color: #64748b;">Harga Jual (DPP) (${invoice.itemCount} Item):</span>
        <span style="font-family: monospace; font-weight: 700;">${formatIDR(dppAmount)}</span>
      </div>
      <div class="calc-row">
        <span style="color: #64748b;">PPN 12% (UU Harmonisasi Perpajakan):</span>
        <span style="font-family: monospace; font-weight: 700; color: #b45309;">${invoice.includePpn ? formatIDR(ppnAmount) : 'Rp 0 (Non-PPN)'}</span>
      </div>
      <div class="calc-row grand-total">
        <span>Grand Total Tagihan:</span>
        <span style="font-family: monospace;">${formatIDR(grandTotal)}</span>
      </div>
    </div>
  </div>

  <div class="signature-grid">
    <div>
      <div class="sig-space"></div>
      <div class="sig-box">
        <div class="sig-role">Vendor Penerbit Tagihan</div>
        <div class="sig-name">${invoice.createdByName || invoice.vendor}</div>
      </div>
    </div>
    <div>
      <div class="sig-space"></div>
      <div class="sig-box">
        <div class="sig-role">Master System (Owner) Astra Isuzu</div>
        <div class="sig-name">${invoice.approvedBy || 'General Manager SCM & Finance'}</div>
      </div>
    </div>
    <div>
      <div class="sig-space"></div>
      <div class="sig-box">
        <div class="sig-role">Finance & Cashier Astra Isuzu HO</div>
        <div class="sig-name">${invoice.paidBy || 'Account Payable Section Head'}</div>
      </div>
    </div>
  </div>

  <div class="watermark">
    Dicetak pada: ${new Date().toLocaleString('id-ID')} | Astra Isuzu Vendor Portal Digital System
  </div>
</body>
</html>`;
}

export const printInvoiceDocument = triggerGooglePrintView;

/**
 * Triggers Google Chrome Print Preview ("Google Print View") using a hidden iframe.
 * This reliably opens Google Chrome's native print preview dialog without altering or distorting
 * the current web page layout, and works inside embedded environments.
 */
export function triggerGooglePrintView(invoice: Invoice): void {
  const htmlDoc = buildInvoicePrintHtml(invoice);

  // 1. Try iframe method (smooth, stays on current page, opens native Google print dialog)
  try {
    const existingFrame = document.getElementById('astra-isuzu-print-iframe');
    if (existingFrame && existingFrame.parentNode) {
      existingFrame.parentNode.removeChild(existingFrame);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'astra-isuzu-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '1000px';
    iframe.style.height = '800px';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlDoc);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (iframeErr) {
          console.warn('Iframe print failed, falling back to window.open:', iframeErr);
          openGooglePrintInNewTab(invoice);
        }
      }, 350);
      return;
    }
  } catch (err) {
    console.warn('Iframe creation error, falling back:', err);
  }

  // 2. Fallback to opening printable tab
  openGooglePrintInNewTab(invoice);
}

/**
 * Opens Google Print View in a clean new browser tab that automatically prompts print preview.
 */
export function openGooglePrintInNewTab(invoice: Invoice): void {
  const htmlDoc = buildInvoicePrintHtml(invoice);
  const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, '_blank');

  if (printWindow) {
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  } else {
    // If popup blocker blocked window.open, trigger direct window.print()
    window.focus();
    window.print();
  }
}

/**
 * Downloads a standalone offline HTML print file that can be opened in any browser to print to PDF.
 */
export function downloadInvoiceHtmlFile(invoice: Invoice): void {
  const htmlDoc = buildInvoicePrintHtml(invoice);
  const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Faktur_Tagihan_${invoice.invoiceNumber.replace(/[^\w-]/g, '_')}.html`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
