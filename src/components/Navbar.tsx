import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Building2,
  User,
  LogOut,
  LogIn,
  ChevronDown,
  Camera,
  Menu,
  X,
} from 'lucide-react';

interface NavbarProps {
  onOpenAuthModal: () => void;
  onOpenProfileModal?: () => void;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuthModal,
  onOpenProfileModal,
  onToggleMobileMenu,
  isMobileMenuOpen,
}) => {
  const { userProfile, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Mobile Menu Toggle & Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              aria-label="Buka navigasi menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <img
                src="/assets/aistudio/Astra_Isuzu_Logo_Vector.svg__220102f2.png"
                alt="Astra Isuzu"
                className="h-7 sm:h-9 w-auto object-contain"
              />
              <div className="hidden sm:block h-6 w-px bg-slate-300" />
              <div className="hidden sm:flex flex-col">
                <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 leading-none">
                  Astra Isuzu Aksesoris
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500 font-medium mt-1">
                  Vendor Billing & Good Receipt System
                </span>
              </div>
            </div>
          </div>

          {/* User Account Details & Actions (No Fake Demo Accounts) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {userProfile ? (
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition text-left text-xs cursor-pointer max-w-[210px] sm:max-w-xs"
                    title="Menu akun profil"
                  >
                    <div className="relative w-7 h-7 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                      {userProfile.avatarUrl ? (
                        <img src={userProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold text-xs">
                          {userProfile.name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800 truncate text-[11px] sm:text-xs">
                          {userProfile.name}
                        </span>
                        {userProfile.role === 'owner' ? (
                          <span className="shrink-0 inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            OWNER
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            VENDOR
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 truncate">
                        {userProfile.vendor}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>

                  {dropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                      onClick={() => setDropdownOpen(false)}
                    >
                      {/* Authenticated user summary */}
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                        <div className="font-bold text-slate-900 text-xs truncate">
                          {userProfile.name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {userProfile.email}
                        </div>
                        <div className="text-[10px] font-semibold text-blue-700 mt-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-blue-600" />
                          <span className="truncate">{userProfile.vendor}</span>
                        </div>
                      </div>

                      <div className="py-1">
                        {onOpenProfileModal && (
                          <button
                            type="button"
                            onClick={onOpenProfileModal}
                            className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                          >
                            <Camera className="w-4 h-4 text-slate-500" />
                            <span>Edit Profil & Logo Perusahaan</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={onOpenAuthModal}
                          className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                        >
                          <User className="w-4 h-4 text-slate-500" />
                          <span>Daftar / Ganti Akun Lain</span>
                        </button>
                      </div>

                      <div className="border-t border-slate-100 pt-1 mt-1 px-2">
                        <button
                          type="button"
                          onClick={logout}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-600" />
                          <span>Keluar (Log Out)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Log Out Button */}
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold shadow-xs transition cursor-pointer"
                  title="Keluar dari akun (Log Out)"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Log Out</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk / Registrasi Akun</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
