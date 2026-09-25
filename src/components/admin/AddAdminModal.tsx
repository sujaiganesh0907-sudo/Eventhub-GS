import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { AlertCircle, Check, UserPlus, Shield, Edit3 } from 'lucide-react';

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (admin: any) => void;
  currentAdminCount: number;
  adminToEdit?: any | null;
}

export const AddAdminModal: React.FC<AddAdminModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentAdminCount,
  adminToEdit,
}) => {
  const [name, setName] = useState(adminToEdit?.name || '');
  const [email, setEmail] = useState(adminToEdit?.email || '');
  const [password, setPassword] = useState('AdminSecurePass123!');
  const [permissions, setPermissions] = useState<string[]>(
    adminToEdit?.permissions || [
      'EVENTS_MANAGE',
      'ATTENDANCE_MANAGE',
      'CERTIFICATES_MANAGE',
      'ANALYTICS_VIEW',
    ]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (adminToEdit) {
      setName(adminToEdit.name || '');
      setEmail(adminToEdit.email || '');
      setPermissions(adminToEdit.permissions || []);
    } else {
      setName('');
      setEmail('');
      setPassword('AdminSecurePass123!');
      setPermissions([
        'EVENTS_MANAGE',
        'ATTENDANCE_MANAGE',
        'CERTIFICATES_MANAGE',
        'ANALYTICS_VIEW',
      ]);
    }
  }, [adminToEdit, isOpen]);

  const availablePermissions = [
    { id: 'EVENTS_MANAGE', label: 'Create & Manage Events' },
    { id: 'ATTENDANCE_MANAGE', label: 'Check-In Desk, Scan QR & Mark Attendance' },
    { id: 'CERTIFICATES_MANAGE', label: 'Issue & Manage Verified Certificates' },
    { id: 'ANALYTICS_VIEW', label: 'View Analytics & Registered Students Roster' },
    { id: 'REGISTRATIONS_MANAGE', label: 'Manage Participant Registrations & Passes' },
    { id: 'PROPOSALS_REVIEW', label: 'Review & Approve Student Event Proposals' },
    { id: 'PLACEMENTS_MANAGE', label: 'Manage Placement Drives & Statistics' },
    { id: 'INFRASTRUCTURE_MANAGE', label: 'Manage Campus Facilities & Infrastructure' },
  ];

  const handleTogglePermission = (id: string) => {
    if (permissions.includes(id)) {
      setPermissions(permissions.filter((p) => p !== id));
    } else {
      setPermissions([...permissions, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Administrator name is required.');
      return;
    }
    if (!adminToEdit && !email.trim()) {
      setError('Official email address is required.');
      return;
    }

    if (!adminToEdit && currentAdminCount >= 10) {
      setError('Maximum limit of 10 authorized college administrators reached.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let res: any;
      if (adminToEdit?._id) {
        res = await api.put<any>(`/admins/${adminToEdit._id}`, {
          name,
          permissions,
        });
      } else {
        res = await api.post<any>('/admins', {
          name,
          email,
          password,
          permissions,
        });
      }

      if (res.success && res.membership) {
        onSuccess(res.membership);
        onClose();
      } else {
        setError(res.message || 'Failed to save administrator.');
      }
    } catch (err: any) {
      setError(err.message || 'Error processing administrator update.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={adminToEdit ? 'Edit Administrator Permissions' : 'Add Authorized College Administrator'}
      subtitle={
        adminToEdit
          ? `${adminToEdit.name} (${adminToEdit.email})`
          : `Staff & Event Coordinator Delegation (${currentAdminCount}/10 slots used)`
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Staff / Coordinator Full Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Prof. David Miller"
            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Official Institution Email *
          </label>
          <input
            type="email"
            required
            disabled={Boolean(adminToEdit)}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. dmiller@apextech.edu"
            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden disabled:opacity-60"
          />
          {!adminToEdit && (
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              The administrator will use this email to log in and manage your institution's events.
            </p>
          )}
        </div>

        {!adminToEdit && (
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Initial Login Password
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs font-mono text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-2">
            Assigned Permissions & Modules
          </label>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {availablePermissions.map((perm) => (
              <label
                key={perm.id}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs text-[var(--text-primary)] cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={permissions.includes(perm.id)}
                  onChange={() => handleTogglePermission(perm.id)}
                  className="w-4 h-4 rounded-sm accent-[var(--primary-color)]"
                />
                <span className="font-medium">{perm.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || (!adminToEdit && currentAdminCount >= 10)}
            className="px-5 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {adminToEdit ? <Edit3 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {loading ? 'Saving...' : adminToEdit ? 'Save Changes' : 'Add Administrator'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
