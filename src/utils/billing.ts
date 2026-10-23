import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { GoodReceipt, InvoiceItem } from '../types';

export function formatIDR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rp 0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateInvoiceReference(vendorName: string): string {
  const code = vendorName.includes('Jaya Kreasi')
    ? 'JKI'
    : vendorName.includes('Terang Part')
    ? 'TPI'
    : vendorName.includes('Dharmesta')
    ? 'DSM'
    : 'ACC';

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);

  return `TAG/${code}/${year}${month}${day}/${randomSuffix}`;
}

export function calculateCumulativeTotal(items: { amount: number }[]): number {
  return items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
}

export interface ParseResult {
  valid: Omit<GoodReceipt, 'id'>[];
  errors: string[];
}

/**
 * Normalizes string keys by lowercasing and replacing punctuation/spaces with underscores
 */
function cleanKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, '_');
}

/**
 * Parses raw row objects (from Excel or CSV) into typed Astra Isuzu GoodReceipt objects
 */
export function parseRawGoodReceipts(
  rows: Record<string, any>[],
  uploadedBy = 'system'
): ParseResult {
  const valid: Omit<GoodReceipt, 'id'>[] = [];
  const errors: string[] = [];
  rows.forEach((origRow, index) => {
    const rowNum = index + 2; // account for header line
    // Map with cleaned keys
    const row: Record<string, any> = {};
    for (const [k, v] of Object.entries(origRow)) {
      row[cleanKey(k)] = v;
    }

    const noPo = String(
      row.no_po || row.nopo || row.po_number || row.po || row.nomor_po || ''
    ).trim();

    const serialNumber = String(
      row.serial_number ||
        row.serialnumber ||
        row.no_rangka ||
        row.chassis ||
        row.vin ||
        ''
    ).trim();

    const tipe = String(row.tipe || row.type || row.model || '').trim();

    const material = String(
      row.material || row.kode_material || row.part_number || row.part_no || ''
    ).trim();

    const description = String(
      row.description || row.deskripsi || row.nama_barang || ''
    ).trim();

    const sLoc = String(row.sloc || row.storage_location || '2000').trim();

    const plan = String(row.plan || row.plant || 'I000').trim();

    const noGr = String(
      row.no_grgl ||
        row.no_gr ||
        row.nogr ||
        row.gr_number ||
        row.material_document ||
        row.grgl ||
        ''
    ).trim();

    const item = String(row.item || '1').trim();
    const assignment = String(row.a || row.assignment || 'H').trim();

    const grDate = String(
      row.grgl_date || row.gr_date || row.tanggal_gr || '20.10.2026'
    ).trim();

    const poDate = String(
      row.po_date || row.tanggal_po || '27.08.2026'
    ).trim();

    let vendor = String(
      row.vendor || row.nama_vendor || row.supplier || ''
    ).trim();

    // Parse numeric fields (handles Indonesian currency format e.g. "1.870.000")
    let rawQty = row.qty || row.quantity || row.jumlah || 1;
    let qty = typeof rawQty === 'number' ? rawQty : parseFloat(String(rawQty).replace(/,/g, '.'));
    if (isNaN(qty) || qty <= 0) qty = 1;

    let rawAmount = row.amount || row.total_price || row.harga || row.nilai || 0;
    let amount = 0;
    if (typeof rawAmount === 'number') {
      amount = rawAmount;
    } else {
      // Remove dots if standard Indonesian thousands separator (e.g. "1.870.000")
      const cleaned = String(rawAmount).replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.-]/g, '');
      amount = parseFloat(cleaned) || 0;
    }

    // Vendor normalization
    if (vendor.toLowerCase().includes('jaya kreasi')) {
      vendor = 'PT. Jaya Kreasi Indonesia';
    } else if (vendor.toLowerCase().includes('terang part')) {
      vendor = 'PT. Terang Parts Indonesia';
    } else if (vendor.toLowerCase().includes('dharmesta')) {
      vendor = 'PT. Dharmesta Swasti Mandiri';
    }

    // Validation checks
    if (!vendor) {
      errors.push(
        `Baris ${rowNum}: Nama Vendor wajib diisi.`
      );
      return;
    }

    if (!noPo) {
      errors.push(`Baris ${rowNum}: 'No PO' wajib diisi.`);
      return;
    }
    if (!noGr) {
      errors.push(`Baris ${rowNum}: 'No GR/GL' wajib diisi.`);
      return;
    }
    if (!material) {
      errors.push(`Baris ${rowNum}: 'Material' (Kode Part) wajib diisi.`);
      return;
    }
    if (amount <= 0) {
      errors.push(`Baris ${rowNum}: 'Amount' harus bernilai angka lebih dari 0.`);
      return;
    }

    valid.push({
      noPo,
      serialNumber: serialNumber || '-',
      tipe: tipe || '-',
      material,
      description: description || `Aksesoris Astra Isuzu (${material})`,
      sLoc,
      qty,
      amount,
      plan,
      noGr,
      item,
      assignment,
      grDate,
      poDate,
      vendor,
      status: 'Outstanding',
      uploadedBy,
      uploadedAt: new Date().toISOString(),
    });
  });

  return { valid, errors };
}

/**
 * Parses Excel (.xlsx, .xls) and CSV file buffers
 */
export async function parseExcelOrCsvFile(
  file: File,
  uploadedBy = 'system'
): Promise<ParseResult> {
  const isExcel =
    file.name.endsWith('.xlsx') ||
    file.name.endsWith('.xls') ||
    file.type.includes('spreadsheet') ||
    file.type.includes('excel');

  if (isExcel) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { valid: [], errors: ['Berkas Excel kosong atau tidak memiliki lembar kerja (sheet).'] };
    }
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    return parseRawGoodReceipts(rows, uploadedBy);
  } else {
    // CSV parsing
    const text = await file.text();
    const result = Papa.parse<Record<string, string>>(text.trim(), {
      header: true,
      skipEmptyLines: true,
    });
    return parseRawGoodReceipts(result.data, uploadedBy);
  }
}

/**
 * Exports data to Excel (.xlsx) file download
 */
export function exportGoodReceiptsToExcel(
  items: GoodReceipt[],
  filename = 'Database_Good_Receipt_Astra_Isuzu.xlsx'
) {
  const exportRows = items.map((item) => ({
    'No PO': item.noPo,
    'Serial number': item.serialNumber,
    'Tipe': item.tipe,
    'Material': item.material,
    'Description': item.description,
    'SLoc': item.sLoc,
    'Qty': item.qty,
    'Amount': item.amount,
    'Plan': item.plan,
    'No GR/GL': item.noGr,
    'Item': item.item,
    'A': item.assignment,
    'GR/GL Date': item.grDate,
    'PO Date': item.poDate,
    'Vendor': item.vendor,
    'Status Tagihan': item.status,
    'No. Tagihan': item.invoiceNumber || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Good Receipts');
  XLSX.writeFile(workbook, filename);
}

/**
 * Generates official Astra Isuzu Excel template (.xlsx) with pre-filled sample rows
 */
export function generateExcelTemplate(filename = 'Template_Good_Receipt_Astra_Isuzu.xlsx') {
  const templateHeaders = [
    [
      'No PO',
      'Serial number',
      'Tipe',
      'Material',
      'Description',
      'SLoc',
      'Qty',
      'Amount',
      'Plan',
      'No GR/GL',
      'Item',
      'A',
      'GR/GL Date',
      'PO Date',
      'Vendor',
    ],
    [
      '6400905798',
      'MHCNMR81HTJ141557',
      'NMRTHD65E402R1S',
      '2EIC4-19P18-NS',
      'Rust Protection (Cabin+Door) N',
      '2000',
      1,
      1870000,
      'I000',
      '5146108892',
      '1',
      'H',
      '20.10.2026',
      '27.08.2026',
      'PT. Jaya Kreasi Indonesia',
    ],
    [
      '6400905798',
      'MHCNMR81HTJ141557',
      'NMRTHD65E402R1S',
      '2EIC4-19P18-NI',
      'Glass Protector',
      '2000',
      1,
      560000,
      'I000',
      '5146108892',
      '1',
      'H',
      '20.10.2026',
      '27.08.2026',
      'PT. Terang Part Indonesia',
    ],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(templateHeaders);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Format GR Astra Isuzu');
  XLSX.writeFile(workbook, filename);
}

/**
 * CSV Template string
 */
export function generateCsvTemplate(): string {
  const headers = [
    'No PO',
    'Serial number',
    'Tipe',
    'Material',
    'Description',
    'SLoc',
    'Qty',
    'Amount',
    'Plan',
    'No GR/GL',
    'Item',
    'A',
    'GR/GL Date',
    'PO Date',
    'Vendor',
  ];

  const rows = [
    '6400905798,MHCNMR81HTJ141557,NMRTHD65E402R1S,2EIC4-19P18-NS,"Rust Protection (Cabin+Door) N",2000,1,1870000,I000,5146108892,1,H,20.10.2026,27.08.2026,PT. Jaya Kreasi Indonesia',
    '6400905798,MHCNMR81HTJ141557,NMRTHD65E402R1S,2EIC4-19P18-NI,"Glass Protector",2000,1,560000,I000,5146108892,1,H,20.10.2026,27.08.2026,PT. Terang Part Indonesia',
  ];

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Default Good Receipts starts empty for production use (Requirement 10)
 */
export const SEED_GOOD_RECEIPTS: Omit<GoodReceipt, 'id'>[] = [];

/**
 * 18 Sample rows from attached Astra Isuzu file for optional testing in Upload view
 */
export const ATTACHED_SAMPLE_GOOD_RECEIPTS: Omit<GoodReceipt, 'id'>[] = [
  // 1-9: PT. Jaya Kreasi Indonesia - Rust Protection (Cabin+Door) N @ Rp 1.870.000
  {
    noPo: '6400905798',
    serialNumber: 'MHCNMR81HTJ141557',
    tipe: 'NMRTHD65E402R1S',
    material: '2EIC4-19P18-NS',
    description: 'Rust Protection (Cabin+Door) N',
    sLoc: '2000',
    qty: 1,
    amount: 1870000,
    plan: 'I000',
    noGr: '5146108892',
    item: '1',
    assignment: 'H',
    grDate: '20.10.2026',
    poDate: '27.08.2026',
    vendor: 'PT. Jaya Kreasi Indonesia',
    status: 'Outstanding',
    uploadedBy: 'owner@astraisuzu.co.id',
    uploadedAt: '2026-10-20T08:00:00Z',
  },
  {
    noPo: '6400908687',
    serialNumber: 'MHCNMR81HTJ142245',
    tipe: 'NMRTHD65E402R1S',
    material: '2EIC4-19P18-NS',
    description: 'Rust Protection (Cabin+Door) N',
    sLoc: '2000',
    qty: 1,
    amount: 1870000,
    plan: 'I000',
    noGr: '5146108894',
    item: '1',
    assignment: 'H',
    grDate: '20.10.2026',
    poDate: '09.09.2026',
    vendor: 'PT. Jaya Kreasi Indonesia',
    status: 'Outstanding',
    uploadedBy: 'owner@astraisuzu.co.id',
    uploadedAt: '2026-10-20T08:00:00Z',
  },
  // PT. Terang Parts Indonesia - Glass Protector @ Rp 560.000
  {
    noPo: '6400905798',
    serialNumber: 'MHCNMR81HTJ141557',
    tipe: 'NMRTHD65E402R1S',
    material: '2EIC4-19P18-NI',
    description: 'Glass Protector',
    sLoc: '2000',
    qty: 1,
    amount: 560000,
    plan: 'I000',
    noGr: '5146108892',
    item: '1',
    assignment: 'H',
    grDate: '20.10.2026',
    poDate: '27.08.2026',
    vendor: 'PT. Terang Parts Indonesia',
    status: 'Outstanding',
    uploadedBy: 'owner@astraisuzu.co.id',
    uploadedAt: '2026-10-20T08:00:00Z',
  },
  // PT. Dharmesta Swasti Mandiri - Ceramic Coating
  {
    noPo: '6400910189',
    serialNumber: 'MHCNLR85HTJ009137',
    tipe: 'NLRTL58E400R1S',
    material: '3DSM1-20K10-CC',
    description: 'Body Coating & Underbody Protection',
    sLoc: '2000',
    qty: 1,
    amount: 2150000,
    plan: 'I000',
    noGr: '5146108891',
    item: '1',
    assignment: 'H',
    grDate: '20.10.2026',
    poDate: '17.09.2026',
    vendor: 'PT. Dharmesta Swasti Mandiri',
    status: 'Outstanding',
    uploadedBy: 'owner@astraisuzu.co.id',
    uploadedAt: '2026-10-20T08:00:00Z',
  },
];
