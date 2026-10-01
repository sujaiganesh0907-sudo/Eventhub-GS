import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { DEFAULT_STUDENT_AVATAR } from '../../services/imageDefaults';
import {
  Shield,
  ShieldCheck,
  UserPlus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit2,
  History,
  Check,
  Ban,
} from 'lucide-react';
import { ADMIN_PERMISSIONS } from './AddAdminModal';

interface ManageAdminsModalProps {
  isOpen: boolean;
  onClose: () => void;
  collegeId: string;
  onOpenAddAdmin: () => void;
}

export const ManageAdminsModal: React.FC<ManageAdminsModalProps> = ({
  isOpen,
  onClose,
  collegeId,
  onOpenAddAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'admins' | 'activity'>('admins');
  const [admins, setAdmins] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMembership, setEditingMembership] = useState<any | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAdminsData = async () => {
    try {
      setLoading(true);
      const [admRes, actRes] = await Promise.all([
        api.get<any>('/admins', { collegeId }),
        api.get<any>('/admins/activity', { collegeId }),
      ]);

      if (admRes.success) setAdmins(admRes.admins || []);
      if (actRes.success) setActivityLogs(actRes.logs || []);
    } catch (err: any) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdminsData();
      setEditingMembership(null);
      setActionError(null);
    }
  }, [isOpen, collegeId]);

  const handleToggleStatus = async (membershipId: string, currentStatus: string, name: string) => {
    const newStatus = currentStatus === 'Disabled' ? 'Active' : 'Disabled';
    const actionWord = newStatus === 'Disabled' ? 'disable access for' : 're-enable access for';
    if (!window.confirm(`Are you sure you want to ${actionWord} ${name}?`)) return;
    try {
      const res = await api.put<any>(`/admins/${membershipId}`, { status: newStatus });
      if (res.success) {
        setAdmins((prev) =>
          prev.map((a) => (a._id === membershipId ? { ...a, status: newStatus } : a))
        );
        fetchAdminsData();
      } else {
        setActionError(res.message || 'Failed to update administrator status.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error updating administrator status.');
    }
  };

  const handleRemove = async (membershipId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove administrator ${name}?`)) return;
    try {
      const res = await api.delete<any>(`/admins/${membershipId}`);
      if (res.success) {
        setAdmins((prev) => prev.filter((a) => a._id !== membershipId));
        fetchAdminsData();
      } else {
        setActionError(res.message || 'Failed to remove administrator.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error removing administrator.');
    }
  };

  const handleStartEdit = (membership: any) => {
    setEditingMembership(membership);
    setEditPermissions(membership.permissions || []);
  };

  const handleSavePermissions = async () => {
    if (!editingMembership) return;
    try {
      setSavingEdit(true);
      const res = await api.put<any>(`/admins/${editingMembership._id}`, {
        permissions: editPermissions,
      });
      if (res.success) {
        setAdmins((prev) =>
          prev.map((a) =>
            a._id === editingMembership._id ? { ...a, permissions: editPermissions } : a
          )
        );
        setEditingMembership(null);
        await fetchAdminsData();
      } else {
        setActionError(res.message || 'Failed to update permissions.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error updating permissions.');
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleEditPerm = (id: string) => {
    if (editPermissions.includes(id)) {
      setEditPermissions(editPermissions.filter((p) => p !== id));
    } else {
      setEditPermissions([...editPermissions, id]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Institution Administrators"
      subtitle="Super Admin dashboard to invite team members and audit administrative actions"
      maxWidth="2xl"
    >
      <div className="space-y-4 py-2">
        {actionError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Tab Switcher & Add Button */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setActiveTab('admins')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'admins'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Administrators ({admins.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'activity'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <History className="w-3.5 h-3.5 text-amber-500" />
              <span>Admin Activity ({activityLogs.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAddAdmin();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Admin</span>
          </button>
        </div>

        {/* TAB 1: ADMINS LIST */}
        {activeTab === 'admins' && (
          <div className="space-y-3">
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-color)]" />
              </div>
            ) : admins.length === 0 ? (
              <div className="p-8 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface-subtle)] space-y-2">
                <Shield className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                <h4 className="text-xs font-bold text-[var(--text-primary)]">
                  No Additional Administrators
                </h4>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Click "+ Add Admin" above to invite existing EVENTHUB users to help manage your collegiate portal.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {admins.map((adm) => {
                  const isSuper = adm.role === 'College Super Admin';
                  const isInvited = adm.status === 'Invited';
                  const isRejected = adm.status === 'Rejected';
                  const isDisabled = adm.status === 'Disabled';
                  const isActive = !isInvited && !isRejected && !isDisabled;

                  return (
                    <div
                      key={adm._id}
                      className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={DEFAULT_STUDENT_AVATAR}
                            alt={adm.name}
                            className="w-9 h-9 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                                {adm.name}
                              </span>
                              {adm.username && (
                                <span className="text-[11px] font-semibold text-[var(--primary-color)]">
                                  @{adm.username}
                                </span>
                              )}
                              {isSuper ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                  Super Admin (Owner)
                                </span>
                              ) : isInvited ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" /> Invite Pending
                                </span>
                              ) : isRejected ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 border border-red-500/20">
                                  Declined
                                </span>
                              ) : isDisabled ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 flex items-center gap-1">
                                  <Ban className="w-2.5 h-2.5" /> Access Disabled
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Active Admin
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)] truncate">
                              {adm.email} {adm.invitedBy ? `· Invited by ${adm.invitedBy}` : ''}
                            </p>
                          </div>
                        </div>

                        {!isSuper && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(adm)}
                              className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Edit Permissions"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Permissions</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(adm._id, adm.status, adm.name)}
                              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                                isDisabled
                                  ? 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'
                                  : 'border-amber-500/30 text-amber-600 hover:bg-amber-500/10'
                              }`}
                              title={isDisabled ? 'Re-enable Admin Access' : 'Disable Admin Access'}
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">
                                {isDisabled ? 'Enable' : 'Disable'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemove(adm._id, adm.name)}
                              className="p-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 text-red-500 transition-colors cursor-pointer"
                              title="Remove Admin"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Permissions Tags */}
                      {adm.permissions && adm.permissions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--border-color)]/60">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mr-1">
                            Access:
                          </span>
                          {adm.permissions.map((p: string) => {
                            const found = ADMIN_PERMISSIONS.find((x) => x.id === p);
                            return (
                              <span
                                key={p}
                                className="px-2 py-0.5 rounded-md bg-[var(--surface)] text-[10px] font-semibold text-[var(--text-secondary)] border border-[var(--border-color)]"
                              >
                                {found?.label || p}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ADMIN ACTIVITY LOG (Requirement 17) */}
        {activeTab === 'activity' && (
          <div className="space-y-3">
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-color)]" />
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="p-8 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface-subtle)] space-y-2">
                <History className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
                <h4 className="text-xs font-bold text-[var(--text-primary)]">
                  No Admin Actions Logged Yet
                </h4>
                <p className="text-[11px] text-[var(--text-muted)]">
                  All administrative actions (event approvals, infrastructure edits, message replies) will be logged here.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1 divide-y divide-[var(--border-color)]">
                {activityLogs.map((log) => (
                  <div key={log._id} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)]">
                        {log.details}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Action: <span className="font-semibold">{log.actionType}</span> · By {log.adminName}
                        {log.adminUsername ? ` (@${log.adminUsername})` : ''}
                      </p>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit Permissions Sub-Modal Overlay */}
        {editingMembership && (
          <div className="p-4 rounded-xl border border-[var(--primary-color)] bg-[var(--surface)] shadow-xl space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[var(--text-primary)]">
                Edit Permissions for {editingMembership.name}
              </h4>
              <button
                type="button"
                onClick={() => setEditingMembership(null)}
                className="text-xs text-[var(--text-muted)] hover:underline"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {ADMIN_PERMISSIONS.map((perm) => {
                const isSelected = editPermissions.includes(perm.id);
                return (
                  <div
                    key={perm.id}
                    onClick={() => toggleEditPerm(perm.id)}
                    className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/10 font-bold text-[var(--text-primary)]'
                        : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-muted)]'
                    }`}
                  >
                    <span>{perm.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[var(--primary-color)]" />}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingMembership(null)}
                className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-xs text-[var(--text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={handleSavePermissions}
                className="px-4 py-1.5 rounded-lg bg-[var(--primary-color)] text-[var(--primary-text)] text-xs font-bold cursor-pointer"
              >
                {savingEdit ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
