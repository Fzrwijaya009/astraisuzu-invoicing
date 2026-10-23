import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FIXED_VENDORS, JOB_TITLES, UserRole } from '../types';
import {
  X,
  Mail,
  Lock,
  User,
  Briefcase,
  Building,
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogIn,
  UserPlus,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [role, setRole] = useState<'admin' | 'owner'>('admin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [jobTitle, setJobTitle] = useState<string>(JOB_TITLES[0]);
  // Strictly dropdown list (Requirement 3: PT. Terang Parts Indonesia, PT. Jaya Kreasi Indonesia, PT. Dharmesta Swasti Mandiri)
  const [vendor, setVendor] = useState<string>(FIXED_VENDORS[0]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const finalVendor = role === 'owner' ? 'Astra Isuzu (Master)' : vendor;
        const profile = await registerWithEmail(
          name.trim(),
          email.trim(),
          password,
          jobTitle,
          finalVendor,
          role
        );
        if (profile.status === 'Pending') {
          setSuccessMsg(
            'Pendaftaran berhasil! Akun Admin Vendor telah terdaftar dengan status "Pending" dan menunggu persetujuan Owner Astra Isuzu.'
          );
        } else {
          setSuccessMsg('Pendaftaran akun Owner Astra Isuzu berhasil dan telah aktif!');
        }
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        await loginWithEmail(email.trim(), password);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err?.message?.includes('auth/email-already-in-use')
          ? 'Email ini sudah terdaftar. Silakan pindah ke tab Login.'
          : err?.message?.includes('auth/weak-password')
          ? 'Password minimal 6 karakter.'
          : err?.message?.includes('auth/invalid-credential') || err?.message?.includes('auth/user-not-found')
          ? 'Email atau password salah.'
          : 'Terjadi kendala saat memproses otentikasi. Silakan periksa koneksi dan coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal login via Google. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <img
              src="/assets/aistudio/Astra_Isuzu_Logo_Vector.svg__220102f2.png"
              alt="Astra Isuzu"
              className="h-7 w-auto object-contain"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="pt-3">
          <h3 className="text-base font-bold text-slate-900">
            {mode === 'register'
              ? 'Pendaftaran Akun Vendor Aksesoris'
              : 'Masuk ke Sistem Monitoring Tagihan'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {mode === 'register'
              ? 'Pilih salah satu dari 3 vendor resmi Astra Isuzu. Akun admin baru memerlukan persetujuan Owner.'
              : 'Gunakan akun yang telah didaftarkan untuk mengakses portal.'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex p-1 bg-slate-100 rounded-xl mt-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Form Registrasi
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Login
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Email Akun
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="nama@perusahaan.co.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {mode === 'register' && (
            <>
              {/* Pilihan Role Akun (Admin vs Owner) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Pilihan Role Akun (Hak Akses)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('admin');
                      setVendor(FIXED_VENDORS[0]);
                    }}
                    className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col gap-0.5 ${
                      role === 'admin'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-500'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-bold text-xs">Admin Vendor</span>
                    <span className="text-[10px] text-slate-500 leading-tight">
                      Penerbit tagihan aksesoris (Butuh approval Owner)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRole('owner');
                      setVendor('Astra Isuzu (Master)');
                    }}
                    className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col gap-0.5 ${
                      role === 'owner'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-500'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-bold text-xs">Master System Owner</span>
                    <span className="text-[10px] text-slate-500 leading-tight">
                      Astra Isuzu HO (Otorisasi & Approval penuh)
                    </span>
                  </button>
                </div>
              </div>

              {/* Requirement 3: Strictly Dropdown List (Non-editable, NOT free text) */}
              {role === 'admin' ? (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Nama Vendor Perusahaan (Dropdown List Resmi)
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <select
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white font-medium text-slate-800 cursor-pointer"
                    >
                      {FIXED_VENDORS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Pilih salah satu dari 3 vendor aksesoris resmi yang bermitra dengan Astra Isuzu.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Instansi Master System
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-blue-600 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      disabled
                      value="Astra Isuzu (Master System Owner)"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-100 font-semibold text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Job Title Dropdown */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Jabatan (Job Title)
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <select
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white text-slate-700 cursor-pointer"
                  >
                    {JOB_TITLES.map((jt) => (
                      <option key={jt} value={jt}>
                        {jt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'register' ? (
              <UserPlus className="w-4 h-4" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>
              {mode === 'register'
                ? 'Daftar Akun'
                : 'Masuk ke Portal'}
            </span>
          </button>
        </form>

        {/* Alternative Google Sign In */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Masuk / Sinkron dengan Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};
