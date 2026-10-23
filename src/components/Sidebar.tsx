import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProfileEditModal } from './ProfileEditModal';
import {
  LayoutDashboard,
  UploadCloud,
  FilePlus2,
  FileCheck2,
  Database,
  Users,
  Shield,
  Building,
  CheckCircle2,
  X,
  Settings,
  LogOut,
  Pencil,
  User,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'upload-gr'
  | 'create-invoice'
  | 'register-invoice'
  | 'good-receipts'
  | 'user-approvals'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingCount?: number;
  openInvoiceCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount = 0,
  openInvoiceCount = 0,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { userProfile, logout } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const isOwner = userProfile?.role === 'owner';
  const isApproved = userProfile?.status === 'Approved';

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 md:z-auto w-64 shrink-0 bg-white border-r border-slate-200 md:min-h-[calc(100vh-4.5rem)] flex flex-col justify-between p-4 transition-transform duration-300 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-4">
          {/* Mobile Header Close */}
          <div className="flex md:hidden items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900">Menu Navigasi</span>
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Role & Vendor Context Card with Profile Edit */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/80 shadow-xs relative">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                {isOwner ? (
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                ) : (
                  <Building className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  {isOwner ? 'Master System' : 'Vendor Portal'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-white text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                title="Edit Profil & Logo Perusahaan"
              >
                <Pencil className="w-3 h-3" />
                <span className="text-[10px]">Edit</span>
              </button>
            </div>

            {/* Profile Avatar & Company Logo Section */}
            <div className="flex items-center gap-2.5">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                {userProfile?.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-sm">
                    {userProfile?.name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {userProfile?.name || 'User Terdaftar'}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {userProfile?.jobTitle || (isOwner ? 'Master Administrator' : 'Staff Billing')}
                </div>
              </div>

              {/* Company Logo Thumbnail */}
              {userProfile?.companyLogoUrl && (
                <div className="w-8 h-8 rounded bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0">
                  <img
                    src={userProfile.companyLogoUrl}
                    alt="Logo Perusahaan"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 truncate text-[10px] font-medium">
                {userProfile?.vendor}
              </span>
              {isApproved ? (
                <span className="font-semibold text-emerald-600 text-[10px] flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> Aktif
                </span>
              ) : (
                <span className="font-semibold text-amber-600 text-[10px] shrink-0">Pending</span>
              )}
            </div>
          </div>

          {/* Navigation Section */}
          <nav className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Menu Utama
            </p>

            <button
              type="button"
              onClick={() => handleSelectTab('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>Performance Dashboard</span>
              </div>
            </button>

            {/* Owner Only: Upload Database Master */}
            {isOwner && (
              <button
                type="button"
                onClick={() => handleSelectTab('upload-gr')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                  activeTab === 'upload-gr'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Master GR</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">
                  Owner
                </span>
              </button>
            )}

            {/* Admin Vendor Only: Buat Tagihan */}
            {!isOwner && (
              <button
                type="button"
                onClick={() => handleSelectTab('create-invoice')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                  activeTab === 'create-invoice'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FilePlus2 className="w-4 h-4" />
                  <span>Buat Tagihan (Create)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">
                  Vendor
                </span>
              </button>
            )}

            {/* Register Tagihan (Both) */}
            <button
              type="button"
              onClick={() => handleSelectTab('register-invoice')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'register-invoice'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileCheck2 className="w-4 h-4" />
                <span>Register Tagihan</span>
              </div>
              {openInvoiceCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === 'register-invoice'
                      ? 'bg-white text-blue-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {openInvoiceCount}
                </span>
              )}
            </button>

            {/* Database Good Receipt */}
            <button
              type="button"
              onClick={() => handleSelectTab('good-receipts')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'good-receipts'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4" />
                <span>Database Good Receipt</span>
              </div>
            </button>

            {/* User Management (Owner Only) */}
            {isOwner && (
              <button
                type="button"
                onClick={() => handleSelectTab('user-approvals')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                  activeTab === 'user-approvals'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4" />
                  <span>Persetujuan User</span>
                </div>
                {pendingCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}

            {/* Owner Only: Pengaturan & Data */}
            {isOwner && (
              <button
                type="button"
                onClick={() => handleSelectTab('settings')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4" />
                  <span>Pengaturan & Data</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                  Owner
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* Dedicated Logout & System Info Footer */}
        <div className="pt-3 border-t border-slate-200 space-y-2">
          {/* Explicit Visible Logout Button (Requirement 3) */}
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold shadow-xs transition cursor-pointer"
            title="Keluar dari akun saat ini"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Keluar / Log Out</span>
          </button>

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span>Astra Isuzu Aksesoris</span>
            <span className="font-mono">v2.7.0</span>
          </div>
        </div>
      </aside>

      {/* Edit Profile & Logo Modal */}
      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
