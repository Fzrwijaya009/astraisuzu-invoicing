import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Building,
  Clock,
  CheckCircle2,
  AlertCircle,
  Mail,
  Briefcase,
  Loader2,
} from 'lucide-react';

interface UserManagementViewProps {
  usersList: UserProfile[];
  onRefreshUsers: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  usersList,
  onRefreshUsers,
}) => {
  const { updateUserStatus, userProfile } = useAuth();
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredUsers = usersList.filter((u) => {
    if (filterStatus !== 'ALL' && u.status !== filterStatus) return false;
    return true;
  });

  const handleAction = async (userId: string, newStatus: 'Approved' | 'Rejected') => {
    setLoadingUserId(userId);
    try {
      await updateUserStatus(userId, newStatus);
      onRefreshUsers();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setLoadingUserId(null);
    }
  };

  const pendingCount = usersList.filter((u) => u.status === 'Pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Otorisasi Master: Manajemen Pengguna & Persetujuan Akun</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Persetujuan Pengguna (User Approval Workflow)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pengguna baru yang mendaftar memiliki status <b>"Pending"</b> dan harus disetujui oleh Owner Astra Isuzu sebelum diizinkan mengakses data operasional.
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200 animate-pulse">
            <Clock className="w-4 h-4 text-amber-700" />
            <span>{pendingCount} Pendaftar Menunggu Persetujuan</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => setFilterStatus('ALL')}
          className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
            filterStatus === 'ALL'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Semua Pengguna ({usersList.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('Pending')}
          className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
            filterStatus === 'Pending'
              ? 'bg-amber-600 text-white'
              : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
          }`}
        >
          <Clock className="w-3 h-3" />
          Pending ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('Approved')}
          className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
            filterStatus === 'Approved'
              ? 'bg-emerald-600 text-white'
              : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          <CheckCircle2 className="w-3 h-3" />
          Approved ({usersList.filter((u) => u.status === 'Approved').length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('Rejected')}
          className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
            filterStatus === 'Rejected'
              ? 'bg-rose-600 text-white'
              : 'text-rose-800 bg-rose-50 hover:bg-rose-100'
          }`}
        >
          <UserX className="w-3 h-3" />
          Rejected ({usersList.filter((u) => u.status === 'Rejected').length})
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">Tidak ada data pengguna.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Nama Lengkap & Email</th>
                  <th className="py-3 px-3">Jabatan & Vendor</th>
                  <th className="py-3 px-3">Role Sistem</th>
                  <th className="py-3 px-3">Tanggal Daftar</th>
                  <th className="py-3 px-3">Status Persetujuan</th>
                  <th className="py-3 px-4 text-right">Aksi Otorisasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isCurrentUser = u.id === userProfile?.id;
                  const isLoading = loadingUserId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{u.name}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-bold">
                              Anda
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">
                          {u.vendor}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Briefcase className="w-3 h-3 text-slate-400" />
                          <span>{u.jobTitle}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        {u.role === 'owner' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            OWNER (MASTER)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            ADMIN VENDOR
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="py-3.5 px-3">
                        {u.status === 'Pending' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 mr-1 text-amber-600 animate-spin" />
                            Pending
                          </span>
                        ) : u.status === 'Approved' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <UserX className="w-3 h-3 mr-1 text-rose-600" />
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!isCurrentUser ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {u.status !== 'Approved' && (
                              <button
                                type="button"
                                onClick={() => handleAction(u.id, 'Approved')}
                                disabled={isLoading}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition"
                              >
                                {isLoading ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <UserCheck className="w-3 h-3" />
                                )}
                                <span>Setujui</span>
                              </button>
                            )}

                            {u.status !== 'Rejected' && (
                              <button
                                type="button"
                                onClick={() => handleAction(u.id, 'Rejected')}
                                disabled={isLoading}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-semibold text-[11px] flex items-center gap-1 transition"
                              >
                                <UserX className="w-3 h-3" />
                                <span>Tolak</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Akun Utama
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
