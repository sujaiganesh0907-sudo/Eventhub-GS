import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Check,
  Users,
  Camera,
  ArrowRight,
  ArrowLeft,
  Shield,
  Lock,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_STUDENT_AVATAR } from '../../services/imageDefaults';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (newGroup: any) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated,
}) => {
  const { user } = useAuth();

  // Steps: 1 = Select Members, 2 = Group Details, 3 = Review & Create
  const [step, setStep] = useState<1 | 2>(1);

  // Search & Members selection
  const [userQuery, setUserQuery] = useState('');
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userResults, setUserResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);

  // Group Details Form
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupPhoto, setGroupPhoto] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [groupPrivacy, setGroupPrivacy] = useState<'Everyone' | 'Connections' | 'Same College' | 'Invite Only'>('Everyone');
  const [chatPermissions, setChatPermissions] = useState<'Everyone' | 'Admins Only'>('Everyone');
  const [editPermissions, setEditPermissions] = useState<'All Members' | 'Admins Only'>('All Members');

  // Submit & Error state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial potential members or search on query change
  useEffect(() => {
    if (!isOpen) return;
    const fetchUsers = async () => {
      setSearchingUsers(true);
      try {
        const res = await api.get<any>('/students/search', { query: userQuery });
        if (res.success && Array.isArray(res.profiles)) {
          // Exclude logged in user
          const filtered = res.profiles.filter(
            (p: any) => p.userId !== user?._id && p._id !== user?._id
          );
          setUserResults(filtered);
        }
      } catch (err) {
        console.error('Failed to search members', err);
      } finally {
        setSearchingUsers(false);
      }
    };

    const timer = setTimeout(fetchUsers, 250);
    return () => clearTimeout(timer);
  }, [userQuery, isOpen, user?._id]);

  // Reset modal state when opened/closed
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      setUserQuery('');
      setSelectedUsers([]);
      setGroupName('');
      setGroupDescription('');
      setGroupPhoto('');
      setGroupPrivacy('Everyone');
      setChatPermissions('Everyone');
      setEditPermissions('All Members');
    }
  }, [isOpen]);

  const toggleSelectUser = (candidate: any) => {
    const candidateId = candidate.userId || candidate._id;
    if (selectedUsers.some((u) => (u.userId || u._id) === candidateId)) {
      setSelectedUsers(selectedUsers.filter((u) => (u.userId || u._id) !== candidateId));
    } else {
      setSelectedUsers([...selectedUsers, candidate]);
    }
  };

  const isUserSelected = (candidate: any) => {
    const candidateId = candidate.userId || candidate._id;
    return selectedUsers.some((u) => (u.userId || u._id) === candidateId);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB.');
      return;
    }

    try {
      setUploadingPhoto(true);
      setError(null);
      const res = await api.uploadFile(file);
      if (res.success && res.fileUrl) {
        setGroupPhoto(res.fileUrl);
      } else {
        setError((res as any)?.message || 'Failed to upload photo.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload group photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      // Step 1 allows proceeding (users can also create 1-person/owner groups or with selected members)
      setStep(2);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Group Name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const memberIds = selectedUsers.map((u) => u.userId || u._id);
      const payload = {
        name: groupName.trim(),
        description: groupDescription.trim(),
        imageUrl: groupPhoto || undefined,
        type: 'Custom',
        visibility: groupPrivacy === 'Invite Only' ? 'Invite Only' : 'Public',
        groupPrivacy,
        chatPermissions,
        editPermissions,
        memberIds,
      };

      const res = await api.post<any>('/groups', payload);
      if (res.success && res.group) {
        onGroupCreated(res.group);
        onClose();
      } else {
        setError(res.message || 'Could not create group.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create group. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 1 ? 'New Group — Add Members' : 'New Group — Details'}
      subtitle={
        step === 1
          ? 'Step 1 of 2: Select classmates and peers to add or invite'
          : 'Step 2 of 2: Provide a group name, icon, and privacy permissions'
      }
      maxWidth="lg"
    >
      <div className="space-y-4 py-1">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: SELECT MEMBERS */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Selected Users Chips */}
            {selectedUsers.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Selected Members ({selectedUsers.length})
                </span>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-color)]">
                  {selectedUsers.map((u) => {
                    const uId = u.userId || u._id;
                    return (
                      <span
                        key={uId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium border border-[var(--border-color)] shadow-2xs animate-in zoom-in-95"
                      >
                        <img
                          src={u.profilePhoto || DEFAULT_STUDENT_AVATAR}
                          alt={u.fullName}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        <span className="truncate max-w-[120px]">{u.fullName}</span>
                        <button
                          type="button"
                          onClick={() => toggleSelectUser(u)}
                          className="p-0.5 rounded-full hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-red-500 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* User Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search students by name, @username, college or department..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--primary-color)] transition-colors shadow-2xs"
              />
            </div>

            {/* User List */}
            <div className="border border-[var(--border-color)] rounded-xl overflow-hidden divide-y divide-[var(--border-color)] max-h-64 overflow-y-auto bg-[var(--surface)]">
              {searchingUsers ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--primary-color)]" />
                  <span>Searching students...</span>
                </div>
              ) : userResults.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)] space-y-1">
                  <Users className="w-6 h-6 mx-auto opacity-40 mb-1" />
                  <p className="font-semibold text-[var(--text-primary)]">No matching students found</p>
                  <p className="text-[11px]">Try searching by name or collegiate department.</p>
                </div>
              ) : (
                userResults.map((candidate) => {
                  const candidateId = candidate.userId || candidate._id;
                  const selected = isUserSelected(candidate);

                  return (
                    <div
                      key={candidateId}
                      onClick={() => toggleSelectUser(candidate)}
                      className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        selected
                          ? 'bg-[var(--primary-light)]'
                          : 'hover:bg-[var(--surface-subtle)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={candidate.profilePhoto || DEFAULT_STUDENT_AVATAR}
                          alt={candidate.fullName}
                          className="w-9 h-9 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {candidate.fullName}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">
                            {candidate.username ? `@${candidate.username} · ` : ''}
                            {candidate.collegeName || 'Student'}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                          selected
                            ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-[var(--primary-text)]'
                            : 'border-[var(--border-color)] bg-[var(--surface)]'
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <p className="text-[11px] text-[var(--text-muted)]">
              ℹ️ Members whose privacy settings require an invitation will receive an invite request instead of being directly added.
            </p>

            {/* Step 1 Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
              <span className="text-xs text-[var(--text-muted)]">
                {selectedUsers.length} member{selectedUsers.length === 1 ? '' : 's'} selected
              </span>
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Continue to Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: GROUP DETAILS */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Group Photo & Name Row */}
            <div className="flex items-start gap-4">
              <div className="relative group shrink-0">
                <div className="w-18 h-18 rounded-2xl border-2 border-dashed border-[var(--border-color)] bg-[var(--surface-subtle)] flex items-center justify-center overflow-hidden">
                  {uploadingPhoto ? (
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-color)]" />
                  ) : groupPhoto ? (
                    <img
                      src={groupPhoto}
                      alt="Group Icon"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-6 h-6 text-[var(--text-muted)]" />
                  )}
                </div>
                <label
                  className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold text-center px-1"
                >
                  Change
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="grow space-y-1">
                <label className="block text-xs font-bold text-[var(--text-primary)]">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  maxLength={60}
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--primary-color)]"
                />
                <span className="text-[10px] text-[var(--text-muted)] block text-right">
                  {groupName.length}/60
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Description (Optional)
              </label>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                rows={2}
                placeholder="What is this group about? Guidelines, goals, meetups..."
                className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--primary-color)] resize-none"
              />
            </div>

            {/* Permissions & Privacy Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-1.5">
                <label className="block text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Who Can Add Members
                </label>
                <select
                  value={groupPrivacy}
                  onChange={(e) => setGroupPrivacy(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)] focus:outline-hidden"
                >
                  <option value="Everyone">Everyone (Public Directory)</option>
                  <option value="Connections">Connections Only</option>
                  <option value="Same College">Same College Only</option>
                  <option value="Invite Only">Invite / Approval Only</option>
                </select>
              </div>

              <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-1.5">
                <label className="block text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Who Can Send Messages
                </label>
                <select
                  value={chatPermissions}
                  onChange={(e) => setChatPermissions(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)] focus:outline-hidden"
                >
                  <option value="Everyone">All Group Members</option>
                  <option value="Admins Only">Admins & Owner Only (Broadcast)</option>
                </select>
              </div>
            </div>

            {/* Selected Members Summary */}
            <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--primary-color)]" />
                <span className="font-semibold text-[var(--text-primary)]">
                  {selectedUsers.length} member{selectedUsers.length === 1 ? '' : 's'} queued to join/invite
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[11px] font-bold text-[var(--primary-color)] hover:underline cursor-pointer"
              >
                Edit Selection
              </button>
            </div>

            {/* Step 2 Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <button
                type="button"
                disabled={submitting || !groupName.trim()}
                onClick={handleCreateGroup}
                className="px-6 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Group...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Create Group</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
