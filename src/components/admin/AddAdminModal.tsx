import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { DEFAULT_STUDENT_AVATAR } from '../../services/imageDefaults';
import {
  Search,
  ShieldCheck,
  Check,
  UserPlus,
  Loader2,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  MessageSquare,
  FileCheck,
  Calendar,
  Users,
  Scan,
  Award,
  BarChart3,
  Briefcase,
  Building2,
  FileText,
} from 'lucide-react';

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (membership: any) => void;
  currentAdminCount: number;
}

export const ADMIN_PERMISSIONS = [
  {
    id: 'manageMessages',
    label: 'College Messages',
    description: 'View incoming messages, reply as institution, and manage chats',
    icon: MessageSquare,
  },
  {
    id: 'manageEventRequests',
    label: 'Event Proposals',
    description: 'Review student event proposals, request changes, verify & approve',
    icon: FileCheck,
  },
  {
    id: 'manageEvents',
    label: 'College Events',
    description: 'Create and edit college events, symposiums, and hackathons',
    icon: Calendar,
  },
  {
    id: 'manageRegistrations',
    label: 'Registrations',
    description: 'View registered attendees and participant rosters',
    icon: Users,
  },
  {
    id: 'manageAttendance',
    label: 'Attendance & Check-In Desk',
    description: 'Operate QR scanner desk, enter pass codes, mark attendance',
    icon: Scan,
  },
  {
    id: 'manageCertificates',
    label: 'Certificates',
    description: 'Design templates, issue certificates, and retry delivery',
    icon: Award,
  },
  {
    id: 'viewAnalytics',
    label: 'Analytics & Insights',
    description: 'View registration numbers, attendance metrics, and event stats',
    icon: BarChart3,
  },
  {
    id: 'managePlacements',
    label: 'Placement Posts',
    description: 'Create and edit campus recruitment drives & job records',
    icon: Briefcase,
  },
  {
    id: 'manageInfrastructure',
    label: 'Infrastructure Posts',
    description: 'Showcase campus facilities, labs, libraries, and hostels',
    icon: Building2,
  },
  {
    id: 'manageCollegeProfileContent',
    label: 'Profile Content',
    description: 'Edit public profile bio, announcement notices, and information',
    icon: FileText,
  },
];

export const AddAdminModal: React.FC<AddAdminModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentAdminCount,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Selected Permissions
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    'manageEvents',
    'manageAttendance',
    'manageCertificates',
    'viewAnalytics',
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationSent, setInvitationSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setError(null);
      setInvitationSent(false);
      setSelectedPermissions([
        'manageEvents',
        'manageAttendance',
        'manageCertificates',
        'viewAnalytics',
      ]);
    }
  }, [isOpen]);

  // Debounced search for existing EVENTHUB students
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.get<any>('/admins/search-users', { query: q });
        if (res.success) {
          setSearchResults(res.users || []);
        }
      } catch (err: any) {
        console.error('Search users error', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleTogglePermission = (id: string) => {
    if (selectedPermissions.includes(id)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== id));
    } else {
      setSelectedPermissions([...selectedPermissions, id]);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('Please search and select an EVENTHUB user first.');
      return;
    }
    if (selectedPermissions.length === 0) {
      setError('Please grant at least one administrative permission.');
      return;
    }
    if (currentAdminCount >= 10) {
      setError('Maximum limit of 10 authorized college administrators reached.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await api.post<any>('/admins/invite', {
        targetUserId: selectedUser.userId,
        permissions: selectedPermissions,
      });

      if (res.success) {
        setInvitationSent(true);
        onSuccess(res.membership);
      } else {
        setError(res.message || 'Failed to send admin invitation.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while sending the invite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add College Administrator"
      subtitle="Link an existing EVENTHUB student account & grant role permissions"
      maxWidth="xl"
    >
      {invitationSent ? (
        <div className="py-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <Check className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Admin Invitation Sent!
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto mt-1">
              We notified{' '}
              <span className="font-bold text-[var(--text-primary)]">
                @{selectedUser?.username || selectedUser?.fullName}
              </span>
              . Once they accept the invitation in their EVENTHUB account, their College Admin
              Workspace will activate.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[var(--primary-color)] text-[var(--primary-text)] text-xs font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSendInvite} className="space-y-5 py-2">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Search Existing EVENTHUB User */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--text-primary)]">
              Step 1: Search EVENTHUB Student by @Username or Name
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student username or full name..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--primary-color)]"
              />
              {searching && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[var(--primary-color)]" />
              )}
            </div>

            {/* User Search Results */}
            {searchQuery.trim().length > 0 && !selectedUser && (
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] max-h-48 overflow-y-auto divide-y divide-[var(--border-color)] shadow-lg">
                {searching ? (
                  <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                    Searching registered students...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                    No EVENTHUB student found matching "{searchQuery}".
                  </div>
                ) : (
                  searchResults.map((st) => (
                    <div
                      key={st.userId}
                      onClick={() => {
                        setSelectedUser(st);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="p-2.5 flex items-center justify-between gap-3 hover:bg-[var(--surface-hover)] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={st.profilePhoto || DEFAULT_STUDENT_AVATAR}
                          alt={st.fullName}
                          className="w-9 h-9 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                          onError={(e) => {
                            (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                              {st.fullName}
                            </span>
                            {st.username && (
                              <span className="text-[11px] font-semibold text-[var(--primary-color)]">
                                @{st.username}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">
                            {st.collegeName} {st.department ? `· ${st.department}` : ''}
                          </p>
                        </div>
                      </div>

                      {st.currentStatus === 'Active' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600">
                          Already Admin
                        </span>
                      ) : st.currentStatus === 'Invited' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600">
                          Invite Pending
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg bg-[var(--primary-color)] text-[var(--primary-text)] text-[11px] font-bold"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Selected User Display Card */}
            {selectedUser && (
              <div className="p-3 rounded-xl border border-[var(--primary-color)] bg-[var(--primary-color)]/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={selectedUser.profilePhoto || DEFAULT_STUDENT_AVATAR}
                    alt={selectedUser.fullName}
                    className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                    onError={(e) => {
                      (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                    }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {selectedUser.fullName}
                      </p>
                      {selectedUser.username && (
                        <span className="text-xs font-bold text-[var(--primary-color)]">
                          @{selectedUser.username}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
                      {selectedUser.collegeName} · {selectedUser.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-xs font-semibold text-red-500 hover:underline shrink-0"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: Choose Permissions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[var(--text-primary)]">
                Step 2: Assign Permissions
              </label>
              <span className="text-[11px] text-[var(--text-muted)]">
                {selectedPermissions.length} of {ADMIN_PERMISSIONS.length} selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
              {ADMIN_PERMISSIONS.map((perm) => {
                const isSelected = selectedPermissions.includes(perm.id);
                const Icon = perm.icon;
                return (
                  <div
                    key={perm.id}
                    onClick={() => handleTogglePermission(perm.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/5'
                        : 'border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white'
                          : 'border-[var(--border-color)] bg-[var(--surface)]'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        {perm.label}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">
                        {perm.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
            <p className="text-[11px] text-[var(--text-muted)]">
              Admins: {currentAdminCount}/10 max
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedUser || selectedPermissions.length === 0}
                className="px-5 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Send Admin Invite
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};
