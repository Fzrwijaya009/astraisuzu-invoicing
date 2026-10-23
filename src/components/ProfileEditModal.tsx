import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Camera,
  Building2,
  User,
  Briefcase,
  Check,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
];

const PRESET_LOGOS = [
  {
    name: 'Astra Isuzu Official',
    url: '/assets/aistudio/Astra_Isuzu_Logo_Vector.svg__220102f2.png',
  },
  {
    name: 'PT. Terang Parts Indonesia',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
  },
  {
    name: 'PT. Jaya Kreasi Indonesia',
    url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=120&auto=format&fit=crop&q=80',
  },
  {
    name: 'PT. Dharmesta Swasti Mandiri',
    url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=120&auto=format&fit=crop&q=80',
  },
];

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose }) => {
  const { userProfile, updateUserProfile } = useAuth();

  const [name, setName] = useState(userProfile?.name || '');
  const [jobTitle, setJobTitle] = useState(userProfile?.jobTitle || '');
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatarUrl || '');
  const [companyLogoUrl, setCompanyLogoUrl] = useState(userProfile?.companyLogoUrl || '');
  const [isSaved, setIsSaved] = useState(false);

  React.useEffect(() => {
    if (userProfile && isOpen) {
      setName(userProfile.name || '');
      setJobTitle(userProfile.jobTitle || '');
      setAvatarUrl(userProfile.avatarUrl || '');
      setCompanyLogoUrl(userProfile.companyLogoUrl || '');
    }
  }, [userProfile, isOpen]);

  if (!isOpen) return null;

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCompanyLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserProfile({
      name: name.trim() || userProfile?.name,
      jobTitle: jobTitle.trim() || userProfile?.jobTitle,
      avatarUrl: avatarUrl.trim(),
      companyLogoUrl: companyLogoUrl.trim(),
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Edit Profil & Logo Perusahaan
              </h3>
              <p className="text-xs text-slate-500">
                Atur identitas akun terdaftar dan branding resmi vendor Anda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Identity summary banner */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-base">
                  {name.charAt(0) || 'U'}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 truncate">{name || 'Nama Akun'}</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                  {userProfile?.role === 'owner' ? 'Owner Master' : 'Vendor'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                Perusahaan: <b>{userProfile?.vendor}</b>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Email: {userProfile?.email}
              </div>
            </div>

            {/* Current company logo thumbnail */}
            <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
              {companyLogoUrl ? (
                <img src={companyLogoUrl} alt="Company Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <Building2 className="w-5 h-5 text-slate-400" />
              )}
            </div>
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Nama Akun Terdaftar
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap akun"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Job Title */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Jabatan / Posisi
            </label>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Contoh: Billing & Invoicing Lead"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Foto Profil Akun */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Foto Profil Akun
              </label>
              <label className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer flex items-center gap-1">
                <Upload className="w-3 h-3" />
                <span>Upload Foto</span>
                <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
              </label>
            </div>

            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="Atau masukkan URL gambar foto profil (https://...)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-[11px]"
            />

            {/* Presets */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-slate-400">Pilihan Cepat:</span>
              <div className="flex items-center gap-1.5">
                {PRESET_AVATARS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAvatarUrl(url)}
                    className={`w-7 h-7 rounded-full overflow-hidden border-2 transition cursor-pointer ${
                      avatarUrl === url ? 'border-blue-600 ring-2 ring-blue-400' : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Logo Perusahaan */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Logo Resmi Perusahaan (PT)
              </label>
              <label className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer flex items-center gap-1">
                <Upload className="w-3 h-3" />
                <span>Upload Logo</span>
                <input type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
              </label>
            </div>

            <input
              type="url"
              value={companyLogoUrl}
              onChange={(e) => setCompanyLogoUrl(e.target.value)}
              placeholder="Atau masukkan URL logo perusahaan (https://...)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-[11px]"
            />

            {/* Presets */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {PRESET_LOGOS.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCompanyLogoUrl(item.url)}
                  className={`p-2 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                    companyLogoUrl === item.url
                      ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-500'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <img src={item.url} alt={item.name} className="w-6 h-6 object-contain shrink-0" />
                  <span className="text-[10px] font-semibold text-slate-700 truncate">{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <span>Simpan Perubahan Profil</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
