export type UserRole = 'owner' | 'admin';

export type UserStatus = 'Pending' | 'Approved' | 'Rejected';

export type VendorName = string;

export const FIXED_VENDORS = [
  'PT. Terang Parts Indonesia',
  'PT. Jaya Kreasi Indonesia',
  'PT. Dharmesta Swasti Mandiri',
] as const;

export const JOB_TITLES = [
  'Finance & Accounting Staff',
  'Account Receivable Specialist',
  'Billing & Invoicing Lead',
  'Procurement & SCM Specialist',
  'Vendor Relationship Manager',
  'General Manager Finance',
] as const;

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  jobTitle: string;
  vendor: string;
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;
  avatarUrl?: string;
  companyLogoUrl?: string;
}

export type GoodReceiptStatus = 'Outstanding' | 'Invoiced';

// Exact structure matching Astra Isuzu SAP Good Receipt data
export interface GoodReceipt {
  id: string;
  noPo: string; // No PO (e.g. 6400905798)
  serialNumber: string; // Serial number / No. Rangka (e.g. MHCNMR81HTJ141557)
  tipe: string; // Tipe Kendaraan (e.g. NMRTHD65E402R1S)
  material: string; // Material / Part Number (e.g. 2EIC4-19P18-NS)
  description: string; // Description (e.g. Rust Protection (Cabin+Door) N)
  sLoc: string; // SLoc (e.g. 2000)
  qty: number; // Qty (e.g. 1)
  amount: number; // Amount in IDR (e.g. 1870000)
  plan: string; // Plan (e.g. I000)
  noGr: string; // No GR/GL (e.g. 5146108892)
  item: string; // Item (e.g. 1)
  assignment: string; // A (e.g. H)
  grDate: string; // GR/GL Date (e.g. 20.10.2026)
  poDate: string; // PO Date (e.g. 27.08.2026)
  vendor: string;
  status: GoodReceiptStatus;
  invoiceId?: string;
  invoiceNumber?: string;
  invoicedAt?: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

export type InvoiceStatus =
  | 'Open'
  | 'Approval Owners'
  | 'Sudah Dibayarkan'
  | 'Pembayaran Dijadwalkan'
  | 'Ditolak';

export interface InvoiceItem {
  goodReceiptId: string;
  noPo: string;
  serialNumber: string;
  tipe: string;
  material: string;
  description: string;
  sLoc: string;
  qty: number;
  amount: number;
  plan: string;
  noGr: string;
  item: string;
  assignment: string;
  grDate: string;
  poDate: string;
  vendor: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  vendor: string;
  subtotalAmount: number; // Harga Jual (DPP)
  includePpn: boolean; // Opsi Penambahan PPN 12%
  ppnRate: number; // 0.12 atau 0
  ppnAmount: number; // Nilai PPN 12%
  totalAmount: number; // Total Tagihan (Harga Jual + PPN)
  itemCount: number;
  status: InvoiceStatus;
  createdByUid: string;
  createdByName: string;
  createdAt: string;
  scheduledPaymentDate?: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  paidBy?: string;
  paymentReference?: string;
  notes?: string;
  items?: InvoiceItem[];
}
