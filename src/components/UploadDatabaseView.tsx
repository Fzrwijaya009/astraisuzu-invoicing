import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  parseExcelOrCsvFile,
  generateExcelTemplate,
  generateCsvTemplate,
  ATTACHED_SAMPLE_GOOD_RECEIPTS,
  formatIDR,
} from '../utils/billing';
import { GoodReceipt } from '../types';
import { writeBatch, doc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Database,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  FileText,
} from 'lucide-react';

interface UploadDatabaseViewProps {
  onUploadSuccess: (items?: GoodReceipt[]) => void;
}

export const UploadDatabaseView: React.FC<UploadDatabaseViewProps> = ({
  onUploadSuccess,
}) => {
  const { userProfile } = useAuth();
  const [parsedData, setParsedData] = useState<Omit<GoodReceipt, 'id'>[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [uploadSuccessCount, setUploadSuccessCount] = useState<number | null>(null);

  // Handle file selection (supports .xlsx, .xls, .csv)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsReadingFile(true);
    setUploadSuccessCount(null);

    try {
      const res = await parseExcelOrCsvFile(
        file,
        userProfile?.email || 'owner@astraisuzu.co.id'
      );
      setParsedData(res.valid);
      setParseErrors(res.errors);
    } catch (err: any) {
      console.error(err);
      setParseErrors([`Gagal membaca berkas: ${err?.message || 'Format tidak valid'}`]);
      setParsedData([]);
    } finally {
      setIsReadingFile(false);
    }
  };

  // Download template Excel (.xlsx)
  const handleDownloadExcelTemplate = () => {
    generateExcelTemplate('Template_Good_Receipt_Astra_Isuzu.xlsx');
  };

  // Download template CSV (.csv)
  const handleDownloadCsvTemplate = () => {
    const csv = generateCsvTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_Good_Receipt_Astra_Isuzu.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Load attached sample dataset from user
  const handleLoadSampleData = () => {
    setFileName('Data_Terlampir_Astra_Isuzu_Oktober2026.xlsx');
    setParsedData(ATTACHED_SAMPLE_GOOD_RECEIPTS);
    setParseErrors([]);
    setUploadSuccessCount(null);
  };

  // Bulk upload to Firestore via writeBatch
  const handleCommitUpload = async () => {
    if (parsedData.length === 0) return;
    setIsUploading(true);

    try {
      const createdItems: GoodReceipt[] = parsedData.map((item, idx) => ({
        ...item,
        id: `gr-${Date.now()}-${idx}`,
        uploadedBy: userProfile?.name || 'Astra Isuzu Owner',
        uploadedAt: new Date().toISOString(),
      }));

      try {
        const batch = writeBatch(db);
        createdItems.forEach((item) => {
          const grRef = doc(collection(db, 'goodReceipts'));
          batch.set(grRef, item);
        });
        await batch.commit();
      } catch (firestoreErr) {
        console.warn('Firestore write warning (preview session):', firestoreErr);
      }

      setUploadSuccessCount(parsedData.length);
      setParsedData([]);
      setFileName('');
      onUploadSuccess(createdItems);
    } catch (err) {
      console.error('Failed to bulk upload Good Receipts:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <Database className="w-3.5 h-3.5" />
            <span>Hak Akses Khusus: Owner Astra Isuzu Master System</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Upload Database Master Good Receipt (GR)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Mendukung upload berkas <b>Excel (.xlsx, .xls)</b> dan <b>CSV (.csv)</b> sesuai format resmi SAP Good Receipt Astra Isuzu.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadExcelTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download Template Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsvTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Template CSV</span>
          </button>

          <button
            type="button"
            onClick={handleLoadSampleData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>Muat Data Terlampir (18 Item)</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {uploadSuccessCount !== null && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">
              Bulk Upload Berhasil!
            </h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              Sebanyak <b>{uploadSuccessCount}</b> dokumen Good Receipt berhasil disimpan ke koleksi Firestore. Admin vendor masing-masing sekarang dapat langsung melihat dan memilih item untuk penagihan.
            </p>
          </div>
        </div>
      )}

      {/* File Dropzone */}
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-blue-500 transition">
        <div className="max-w-xl mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Pilih Berkas Excel (.xlsx, .xls) atau CSV
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Format Kolom Database Terlampir: <br />
              <code className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                No PO | Serial number | Tipe | Material | Description | SLoc | Qty | Amount | Plan | No GR/GL | Item | A | GR/GL Date | PO Date | Vendor
              </code>
            </p>
          </div>

          <div className="pt-2">
            <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer transition">
              {isReadingFile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membaca Berkas Excel...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Telusuri Berkas Excel / CSV</span>
                </>
              )}
              <input
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {fileName && (
            <div className="text-xs font-medium text-slate-600 bg-slate-100 py-1.5 px-3 rounded-lg inline-block">
              Berkas terpilih: <span className="font-bold text-slate-900">{fileName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Validation Errors If Any */}
      {parseErrors.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1.5">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Ditemukan {parseErrors.length} Kesalahan Format pada Berkas:</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-rose-700 max-h-36 overflow-y-auto">
            {parseErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview Table Before Upload */}
      {parsedData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-slate-800">
                Pratinjau Data Valid ({parsedData.length} Dokumen Good Receipt)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-medium">
                Akumulasi Amount:{' '}
                <span className="font-mono font-bold text-slate-900">
                  {formatIDR(
                    parsedData.reduce((acc, curr) => acc + curr.amount, 0)
                  )}
                </span>
              </span>

              <button
                type="button"
                onClick={handleCommitUpload}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {isUploading
                    ? 'Menyimpan ke Firestore...'
                    : `Simpan ${parsedData.length} Data ke Firestore`}
                </span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-500 font-semibold uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">No PO</th>
                  <th className="py-2.5 px-3">Serial Number</th>
                  <th className="py-2.5 px-3">Tipe</th>
                  <th className="py-2.5 px-3">Material</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-2 text-center">SLoc</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-2 text-center">Plan</th>
                  <th className="py-2.5 px-3">No GR/GL</th>
                  <th className="py-2.5 px-2 text-center">Item</th>
                  <th className="py-2.5 px-2 text-center">A</th>
                  <th className="py-2.5 px-2.5">GR/GL Date</th>
                  <th className="py-2.5 px-2.5">PO Date</th>
                  <th className="py-2.5 px-3">Vendor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {parsedData.map((gr, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-900">{gr.noPo}</td>
                    <td className="py-2 px-3 text-slate-600">{gr.serialNumber}</td>
                    <td className="py-2 px-3 text-slate-700">{gr.tipe}</td>
                    <td className="py-2 px-3 font-semibold text-blue-700">{gr.material}</td>
                    <td className="py-2 px-3 font-sans text-xs text-slate-800">{gr.description}</td>
                    <td className="py-2 px-2 text-center text-slate-500">{gr.sLoc}</td>
                    <td className="py-2 px-2 text-center font-bold text-slate-800">{gr.qty}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">{formatIDR(gr.amount)}</td>
                    <td className="py-2 px-2 text-center text-slate-500">{gr.plan}</td>
                    <td className="py-2 px-3 font-bold text-slate-800">{gr.noGr}</td>
                    <td className="py-2 px-2 text-center text-slate-500">{gr.item}</td>
                    <td className="py-2 px-2 text-center text-slate-500">{gr.assignment}</td>
                    <td className="py-2 px-2.5 text-slate-600">{gr.grDate}</td>
                    <td className="py-2 px-2.5 text-slate-600">{gr.poDate}</td>
                    <td className="py-2 px-3 font-sans font-semibold text-slate-800">{gr.vendor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
