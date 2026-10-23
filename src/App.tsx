import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CreateTagihanView } from './components/CreateTagihanView';
import { RegisterTagihanView } from './components/RegisterTagihanView';
import { UploadDatabaseView } from './components/UploadDatabaseView';
import { GoodReceiptsView } from './components/GoodReceiptsView';
import { UserManagementView } from './components/UserManagementView';
import { SettingsDataView } from './components/SettingsDataView';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { ProfileEditModal } from './components/ProfileEditModal';
import { AuthModal } from './components/AuthModal';
import { GoodReceipt, Invoice, InvoiceItem, UserProfile, FIXED_VENDORS } from './types';
import {
  collection,
  onSnapshot,
  writeBatch,
  doc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db, testFirestoreConnection } from './firebase';
import {
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  LogIn,
  UserPlus,
  FileSpreadsheet,
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const { userProfile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  
  // Clean start: Starts empty for production use
  const [goodReceipts, setGoodReceipts] = useState<GoodReceipt[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isOwner = userProfile?.role === 'owner';
  const isApproved = userProfile?.status === 'Approved';

  // Test Firestore connection on load
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Real-time snapshot listener on Good Receipts
  useEffect(() => {
    const grCol = collection(db, 'goodReceipts');
    const unsub = onSnapshot(
      grCol,
      (snapshot) => {
        const items: GoodReceipt[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...(docSnap.data() as GoodReceipt), id: docSnap.id });
        });
        setGoodReceipts(items);
      },
      (error) => {
        console.warn('Real-time GoodReceipts listener error:', error.message);
      }
    );

    return () => unsub();
  }, []);

  // Real-time snapshot listener on Invoices
  useEffect(() => {
    const invCol = collection(db, 'invoices');
    const unsub = onSnapshot(
      invCol,
      (snapshot) => {
        const items: Invoice[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...(docSnap.data() as Invoice), id: docSnap.id });
        });
        // Sort newest first
        items.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setInvoices(items);
      },
      (error) => {
        console.warn('Real-time Invoices listener error:', error.message);
      }
    );

    return () => unsub();
  }, []);

  // Real-time snapshot listener on Users (for Owner)
  useEffect(() => {
    const usersCol = collection(db, 'users');
    const unsub = onSnapshot(
      usersCol,
      (snapshot) => {
        const items: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...(docSnap.data() as UserProfile), id: docSnap.id });
        });
        setUsersList(items);
      },
      (error) => {
        console.warn('Real-time Users listener error:', error.message);
      }
    );

    return () => unsub();
  }, []);

  const handleInvoiceCreated = (newInv: Invoice) => {
    setInvoices((prev) => [newInv, ...prev.filter((i) => i.id !== newInv.id)]);
    if (newInv.items) {
      const invoicedGrIds = new Set(newInv.items.map((item) => item.goodReceiptId));
      setGoodReceipts((prev) =>
        prev.map((gr) => {
          if (invoicedGrIds.has(gr.id)) {
            return {
              ...gr,
              status: 'Invoiced',
              invoiceId: newInv.id,
              invoiceNumber: newInv.invoiceNumber,
              invoicedAt: newInv.createdAt,
            };
          }
          return gr;
        })
      );
    }
    setSelectedInvoice(newInv);
  };

  const handleInvoiceApproved = (
    invoiceId: string,
    scheduledDate: string,
    approvedBy: string,
    notes?: string
  ) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          return {
            ...inv,
            status: 'Approval Owners',
            scheduledPaymentDate: scheduledDate,
            approvedBy,
            approvedAt: new Date().toISOString(),
            notes: notes ? `${inv.notes || ''} | Review Astra: ${notes}` : inv.notes,
          };
        }
        return inv;
      })
    );
  };

  const handleInvoicePaid = (
    invoiceId: string,
    paymentReference: string,
    paidBy: string
  ) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          return {
            ...inv,
            status: 'Sudah Dibayarkan',
            paidAt: new Date().toISOString(),
            paidBy,
            paymentReference,
          };
        }
        return inv;
      })
    );
  };

  const handleEditInvoice = (invoiceId: string, notes: string, updatedItems?: InvoiceItem[]) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          if (updatedItems) {
            const dpp = updatedItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
            const ppn = inv.includePpn ? Math.round(dpp * 0.12) : 0;
            return {
              ...inv,
              notes,
              items: updatedItems,
              itemCount: updatedItems.length,
              subtotalAmount: dpp,
              ppnAmount: ppn,
              totalAmount: dpp + ppn,
            };
          }
          return { ...inv, notes };
        }
        return inv;
      })
    );
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    const targetInvoice = invoices.find((i) => i.id === invoiceId);
    if (targetInvoice && targetInvoice.items) {
      const releasedIds = new Set(targetInvoice.items.map((it) => it.goodReceiptId));
      setGoodReceipts((prev) =>
        prev.map((gr) => {
          if (releasedIds.has(gr.id)) {
            return {
              ...gr,
              status: 'Outstanding',
              invoiceId: undefined,
              invoiceNumber: undefined,
              invoicedAt: undefined,
            };
          }
          return gr;
        })
      );
    }
    setInvoices((prev) => prev.filter((i) => i.id !== invoiceId));
    if (selectedInvoice?.id === invoiceId) setSelectedInvoice(null);
  };

  const handleRevertGoodReceiptItem = (grId: string) => {
    setGoodReceipts((prev) =>
      prev.map((gr) =>
        gr.id === grId
          ? {
              ...gr,
              status: 'Outstanding',
              invoiceId: undefined,
              invoiceNumber: undefined,
              invoicedAt: undefined,
            }
          : gr
      )
    );
  };

  const handleUpdateGoodReceipt = (updatedGR: GoodReceipt) => {
    setGoodReceipts((prev) =>
      prev.map((gr) => (gr.id === updatedGR.id ? updatedGR : gr))
    );
  };

  const handleDeleteGoodReceipt = (grId: string) => {
    setGoodReceipts((prev) => prev.filter((gr) => gr.id !== grId));
  };

  const handleItemsUploaded = (newItems: GoodReceipt[]) => {
    setGoodReceipts((prev) => [...newItems, ...prev]);
  };

  // Owner Delete All Good Receipts
  const handleClearGoodReceipts = async () => {
    try {
      const grSnap = await getDocs(collection(db, 'goodReceipts'));
      const batch = writeBatch(db);
      grSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (err) {
      console.warn('Clear GR warning:', err);
    }
    setGoodReceipts([]);
  };

  // Owner Delete All Invoices
  const handleClearInvoices = async () => {
    try {
      const invSnap = await getDocs(collection(db, 'invoices'));
      const batch = writeBatch(db);
      invSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (err) {
      console.warn('Clear invoices warning:', err);
    }
    setInvoices([]);
    setGoodReceipts((prev) =>
      prev.map((gr) => ({
        ...gr,
        status: 'Outstanding',
        invoiceId: undefined,
        invoiceNumber: undefined,
        invoicedAt: undefined,
      }))
    );
  };

  // Clear All Data (Clean production start)
  const handleClearAllData = async () => {
    await handleClearInvoices();
    await handleClearGoodReceipts();
  };

  // Status counts for badge
  const openInvoiceCount = isOwner
    ? invoices.filter((i) => i.status === 'Open').length
    : invoices.filter((i) => i.status === 'Open' && i.vendor === userProfile?.vendor).length;

  const pendingUsersCount = usersList.filter((u) => u.status === 'Pending').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navigation Bar */}
      <Navbar
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Main Container */}
      {!userProfile ? (
        /* Welcome / Portal Login & Registration Gate (No Fake Demo Accounts) */
        <div className="flex-1 flex items-center justify-center p-4 py-12">
          <div className="max-w-2xl w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl text-center space-y-6">
            <div className="flex items-center justify-center gap-3">
              <img
                src="/assets/aistudio/Astra_Isuzu_Logo_Vector.svg__220102f2.png"
                alt="Astra Isuzu"
                className="h-12 w-auto object-contain"
              />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Official Accessories Billing Portal
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
                Sistem Monitoring Tagihan Vendor Aksesoris Astra Isuzu
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
                Platform terintegrasi untuk pengelolaan Good Receipt, pembuatan tagihan resmi, verifikasi pajak PPN 12%, dan monitoring status pembayaran.
              </p>
            </div>

            {/* 3 Official Vendors badges */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                3 Vendor Aksesoris Resmi Bermitra:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {FIXED_VENDORS.map((v, i) => (
                  <div
                    key={v}
                    className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 leading-tight">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Daftar Akun Baru (Vendor / Owner)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-slate-500" />
                <span>Masuk (Login Akun)</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex max-w-7xl w-full mx-auto">
          {/* Left Sidebar */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            pendingCount={pendingUsersCount}
            openInvoiceCount={openInvoiceCount}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />

          {/* Main Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
            {/* Pending Approval Gate Screen */}
            {!isApproved ? (
              <div className="max-w-xl mx-auto my-12 bg-white rounded-2xl p-8 border border-amber-200 shadow-xl text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 animate-spin" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    Status: Pendaftaran Pending
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-2">
                    Akun Anda Menunggu Persetujuan Owner
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                    Sesuai aturan keamanan & otorisasi Astra Isuzu, pendaftaran akun baru untuk vendor <b>{userProfile?.vendor}</b> harus disetujui oleh Owner (Master System) sebelum diizinkan mengakses transaksi.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nama Pendaftar:</span>
                    <span className="font-semibold text-slate-800">{userProfile?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="font-mono text-slate-800">{userProfile?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Jabatan:</span>
                    <span className="font-semibold text-slate-800">{userProfile?.jobTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vendor Terdaftar:</span>
                    <span className="font-semibold text-blue-700">{userProfile?.vendor}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
                  >
                    <span>Masuk dengan Akun Lain</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardView
                    goodReceipts={goodReceipts}
                    invoices={invoices}
                    onNavigateTab={setActiveTab}
                    onSelectInvoice={(inv) => setSelectedInvoice(inv)}
                  />
                )}

                {activeTab === 'upload-gr' && isOwner && (
                  <UploadDatabaseView
                    onUploadSuccess={(uploadedItems) => {
                      if (uploadedItems) handleItemsUploaded(uploadedItems);
                      setActiveTab('good-receipts');
                    }}
                  />
                )}

                {activeTab === 'create-invoice' && !isOwner && (
                  <CreateTagihanView
                    goodReceipts={goodReceipts}
                    onInvoiceCreated={handleInvoiceCreated}
                  />
                )}

                {activeTab === 'register-invoice' && (
                  <RegisterTagihanView
                    invoices={invoices}
                    onSelectInvoice={(inv) => setSelectedInvoice(inv)}
                    onInvoiceApproved={handleInvoiceApproved}
                    onInvoicePaid={handleInvoicePaid}
                    onEditInvoice={handleEditInvoice}
                    onDeleteInvoice={handleDeleteInvoice}
                    onRevertGoodReceiptItem={handleRevertGoodReceiptItem}
                  />
                )}

                {activeTab === 'good-receipts' && (
                  <GoodReceiptsView
                    goodReceipts={goodReceipts}
                    onNavigateToBilling={() => setActiveTab('create-invoice')}
                    onUpdateGoodReceipt={handleUpdateGoodReceipt}
                    onDeleteGoodReceipt={handleDeleteGoodReceipt}
                  />
                )}

                {activeTab === 'user-approvals' && isOwner && (
                  <UserManagementView
                    usersList={usersList}
                    onRefreshUsers={() => {}}
                  />
                )}

                {/* Owner Pengaturan & Master Data */}
                {activeTab === 'settings' && isOwner && (
                  <SettingsDataView
                    goodReceipts={goodReceipts}
                    invoices={invoices}
                    onClearGoodReceipts={handleClearGoodReceipts}
                    onClearInvoices={handleClearInvoices}
                    onClearAllData={handleClearAllData}
                  />
                )}
              </>
            )}
          </main>
        </div>
      )}

      {/* Invoice Detail & Official Receipt Modal */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Auth & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
