import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { DEFAULT_STUDENT_AVATAR } from '../../services/imageDefaults';
import {
  Users,
  Shield,
  ShieldCheck,
  UserPlus,
  Trash2,
  LogOut,
  Calendar,
  MessageSquare,
  Lock,
  Globe,
  Loader2,
  Search,
  Check,
  Crown,
  ChevronDown,
  X,
  AlertTriangle,
} from 'lucide-react';

interface GroupMember {
  _id: string;
  userId: string;
  role: 'Owner' | 'Admin' | 'Member' | string;
  status: string;
  joinedAt: string;
  fullName: string;
  email?: string;
  username?: string;
  avatar?: string;
  collegeName?: string;
}

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: any;
  members: GroupMember[];
  loadingMembers?: boolean;
  currentUserId: string;
  myRole: 'Owner' | 'Admin' | 'Member' | string;
  onMemberUpdated?: () => void;
  onOpenChatSettings?: () => void;
  onOpenEditGroup?: () => void;
  onLeaveGroup?: () => void;
  onClearChat?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  isOpen,
  onClose,
  group,
  members,
  loadingMembers = false,
  currentUserId,
  myRole,
  onMemberUpdated,
  onOpenChatSettings,
  onOpenEditGroup,
  onLeaveGroup,
  onClearChat,
  showToast,
}) => {
  const [memberFilter, setMemberFilter] = useState('');
  const [activeMenuMemberId, setActiveMenuMemberId] = useState<string | null>(null);

  // Add Member Drawer / Panel state
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  // Transfer Ownership Confirmation
  const [transferTarget, setTransferTarget] = useState<GroupMember | null>(null);
  const [transferring, setTransferring] = useState(false);

  // Remove Member Confirmation
  const [removeTarget, setRemoveTarget] = useState<GroupMember | null>(null);
  const [removing, setRemoving] = useState(false);

  const isOwner = myRole === 'Owner' || group.ownerId === currentUserId;
  const isAdmin = myRole === 'Admin';
  const canManageMembers = isOwner || isAdmin;

  // Filter members by search input
  const filteredMembers = members.filter((m) => {
    if (!memberFilter.trim()) return true;
    const q = memberFilter.toLowerCase();
    return (
      m.fullName?.toLowerCase().includes(q) ||
      m.username?.toLowerCase().includes(q) ||
      m.collegeName?.toLowerCase().includes(q)
    );
  });

  // Search users to add
  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const res = await api.get<any>(`/students/search?query=${encodeURIComponent(query)}`);
      if (res.success) {
        // Exclude users already members
        const memberUserIds = new Set(members.map((m) => m.userId));
        const filtered = (res.students || res.profiles || []).filter(
          (u: any) => !memberUserIds.has(u.userId || u._id)
        );
        setSearchResults(filtered);
      }
    } catch {
      // Ignore search error
    } finally {
      setSearching(false);
    }
  };

  // Add Member
  const handleAddMember = async (targetUser: any) => {
    const targetUserId = targetUser.userId || targetUser._id;
    try {
      setAddingUserId(targetUserId);
      const res = await api.post<any>(`/groups/${group._id}/members`, {
        memberUserId: targetUserId,
      });

      if (res.success) {
        showToast(res.message || `Added ${targetUser.fullName} to group.`, 'success');
        setSearchResults((prev) => prev.filter((u) => (u.userId || u._id) !== targetUserId));
        if (onMemberUpdated) onMemberUpdated();
      } else {
        showToast(res.message || 'Failed to add member.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to add member.', 'error');
    } finally {
      setAddingUserId(null);
    }
  };

  // Promote / Demote Member Role
  const handleRoleChange = async (targetMember: GroupMember, newRole: 'Admin' | 'Member') => {
    try {
      setActiveMenuMemberId(null);
      const res = await api.put<any>(`/groups/${group._id}/members/${targetMember.userId}/role`, {
        role: newRole,
      });

      if (res.success) {
        showToast(res.message || `Role updated to ${newRole}.`, 'success');
        if (onMemberUpdated) onMemberUpdated();
      } else {
        showToast(res.message || 'Failed to update member role.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating member role.', 'error');
    }
  };

  // Remove Member
  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    try {
      setRemoving(true);
      const res = await api.delete<any>(`/groups/${group._id}/members/${removeTarget.userId}`);
      if (res.success) {
        showToast(`Removed ${removeTarget.fullName} from group.`, 'success');
        setRemoveTarget(null);
        if (onMemberUpdated) onMemberUpdated();
      } else {
        showToast(res.message || 'Failed to remove member.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error removing member.', 'error');
    } finally {
      setRemoving(false);
    }
  };

  // Transfer Ownership
  const handleConfirmTransfer = async () => {
    if (!transferTarget) return;
    try {
      setTransferring(true);
      const res = await api.post<any>(`/groups/${group._id}/transfer-ownership`, {
        newOwnerUserId: transferTarget.userId,
      });

      if (res.success) {
        showToast(`Ownership transferred to ${transferTarget.fullName}. You are now an Admin.`, 'success');
        setTransferTarget(null);
        if (onMemberUpdated) onMemberUpdated();
      } else {
        showToast(res.message || 'Failed to transfer ownership.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error transferring ownership.', 'error');
    } finally {
      setTransferring(false);
    }
  };

  const createdDateStr = group.createdAt
    ? new Date(group.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recently';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Group Information"
      maxWidth="md"
    >
      <div className="space-y-4 py-1">
        {/* 1. Header with Group Avatar & Name */}
        <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-color)]">
          <div className="w-20 h-20 rounded-2xl bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-black text-2xl flex items-center justify-center shrink-0 border-2 border-[var(--border-color)] shadow-sm mb-3">
            {group.imageUrl ? (
              <img
                src={group.imageUrl}
                alt={group.name}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              group.name?.slice(0, 2).toUpperCase()
            )}
          </div>

          <h3 className="text-base font-bold text-[var(--text-primary)]">{group.name}</h3>

          {group.description && (
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-sm leading-relaxed">
              {group.description}
            </p>
          )}

          {/* Quick Action Buttons for Owner / Admin */}
          <div className="flex items-center gap-2 mt-3.5 flex-wrap justify-center">
            {canManageMembers && onOpenEditGroup && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditGroup();
                }}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer transition-all"
              >
                Edit Group
              </button>
            )}

            {onOpenChatSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChatSettings();
                }}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer transition-all"
              >
                Chat Settings
              </button>
            )}

            {onClearChat && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onClearChat();
                }}
                className="px-3 py-1.5 rounded-xl border border-red-500/20 text-red-600 hover:bg-red-500/10 text-xs font-semibold cursor-pointer transition-all"
              >
                Clear Chat
              </button>
            )}
          </div>
        </div>

        {/* 2. Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]/50">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] flex items-center gap-1 mb-0.5">
              <Calendar className="w-3 h-3 text-[var(--primary-color)]" /> Created
            </span>
            <span className="font-semibold text-[var(--text-primary)]">{createdDateStr}</span>
          </div>

          <div className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]/50">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] flex items-center gap-1 mb-0.5">
              <MessageSquare className="w-3 h-3 text-blue-500" /> Messaging
            </span>
            <span
              className={`font-bold ${
                group.chatPermissions === 'Admins Only' ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {group.chatPermissions || 'Everyone'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]/50">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] flex items-center gap-1 mb-0.5">
              <Shield className="w-3 h-3 text-purple-500" /> Type
            </span>
            <span className="font-semibold text-[var(--text-primary)]">
              {group.type === 'Event' ? 'Event Group' : 'Custom'}
            </span>
          </div>
        </div>

        {/* 3. Add Member Search Panel (Expandable) */}
        {showAddMember && canManageMembers && (
          <div className="p-3.5 rounded-2xl border-2 border-[var(--primary-color)]/30 bg-[var(--primary-color)]/5 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-[var(--primary-color)]" />
                <span>Add Members to Group</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowAddMember(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                placeholder="Search students by name, @username, or college..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--primary-color)]"
              />
            </div>

            {searching ? (
              <div className="py-3 text-center">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--primary-color)] mx-auto" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {searchResults.map((u) => {
                  const uid = u.userId || u._id;
                  const isAdding = addingUserId === uid;
                  return (
                    <div
                      key={uid}
                      className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={u.profilePhoto || DEFAULT_STUDENT_AVATAR}
                          alt={u.fullName}
                          className="w-7 h-7 rounded-full object-cover shrink-0 border border-[var(--border-color)]"
                          onError={(e) => {
                            (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                          }}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-[var(--text-primary)] truncate">{u.fullName}</p>
                          <p className="text-[10px] text-[var(--text-muted)] truncate">
                            {u.username ? `@${u.username}` : u.collegeName || 'Student'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isAdding}
                        onClick={() => handleAddMember(u)}
                        className="px-2.5 py-1 rounded-lg bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] font-bold text-[11px] shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        {isAdding ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <UserPlus className="w-3 h-3" />
                        )}
                        <span>Add</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : searchQuery.trim().length >= 2 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-2 italic">
                No new users found matching &quot;{searchQuery}&quot;
              </p>
            ) : null}
          </div>
        )}

        {/* 4. Members Section */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[var(--primary-color)]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Members ({members.length})
              </h4>
            </div>

            {canManageMembers && !showAddMember && (
              <button
                type="button"
                onClick={() => setShowAddMember(true)}
                className="px-2.5 py-1 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            )}
          </div>

          {/* Member Search Filter */}
          {members.length > 4 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                placeholder="Filter members..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--primary-color)]"
              />
            </div>
          )}

          {/* Member Rows */}
          {loadingMembers ? (
            <div className="py-6 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--primary-color)] mx-auto" />
              <p className="text-xs text-[var(--text-muted)] mt-1.5">Loading member roster...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-4 italic">
              No members found matching filter.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {filteredMembers.map((m) => {
                const isTargetOwner = m.role === 'Owner';
                const isTargetAdmin = m.role === 'Admin';
                const isSelf = m.userId === currentUserId;
                const menuOpen = activeMenuMemberId === m.userId;

                return (
                  <div
                    key={m._id}
                    className="p-2.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-color)] flex items-center justify-between gap-3 text-xs transition-colors relative"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={m.avatar || DEFAULT_STUDENT_AVATAR}
                        alt={m.fullName}
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-[var(--border-color)]"
                        onError={(e) => {
                          (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-[var(--text-primary)] truncate">{m.fullName}</p>
                          {isSelf && (
                            <span className="text-[10px] text-[var(--text-muted)] font-semibold">(You)</span>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">
                          {m.username ? `@${m.username}` : m.collegeName || 'Student'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Role Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 ${
                          isTargetOwner
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            : isTargetAdmin
                            ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                            : 'bg-zinc-500/10 text-zinc-600 border border-zinc-500/20'
                        }`}
                      >
                        {isTargetOwner && <Crown className="w-2.5 h-2.5 text-amber-600" />}
                        <span>{m.role || 'Member'}</span>
                      </span>

                      {/* Member Actions Menu (Owner/Admin) */}
                      {!isSelf && (
                        <>
                          {isOwner && !isTargetOwner && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveMenuMemberId(menuOpen ? null : m.userId)}
                                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] cursor-pointer"
                                title="Member actions"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>

                              {menuOpen && (
                                <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xl p-1 text-xs space-y-0.5 animate-in fade-in">
                                  {isTargetAdmin ? (
                                    <button
                                      type="button"
                                      onClick={() => handleRoleChange(m, 'Member')}
                                      className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-primary)] font-medium flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Shield className="w-3.5 h-3.5 text-zinc-500" />
                                      <span>Demote to Member</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleRoleChange(m, 'Admin')}
                                      className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-primary)] font-medium flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                                      <span>Promote to Admin</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuMemberId(null);
                                      setTransferTarget(m);
                                    }}
                                    className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-[var(--surface-hover)] text-amber-600 font-medium flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Crown className="w-3.5 h-3.5" />
                                    <span>Transfer Ownership</span>
                                  </button>

                                  <div className="h-px bg-[var(--border-color)] my-1" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuMemberId(null);
                                      setRemoveTarget(m);
                                    }}
                                    className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-red-500/10 text-red-600 font-medium flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Remove Member</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {isAdmin && !isOwner && !isTargetOwner && !isTargetAdmin && (
                            <button
                              type="button"
                              onClick={() => setRemoveTarget(m)}
                              className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
                              title="Remove member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. Footer Actions */}
        <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between gap-2 flex-wrap">
          {isOwner ? (
            <p className="text-[11px] text-[var(--text-muted)] italic">
              Owner cannot leave without transferring ownership.
            </p>
          ) : (
            onLeaveGroup && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLeaveGroup();
                }}
                className="px-3.5 py-1.5 rounded-xl border border-red-500/30 text-red-600 hover:bg-red-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave Group</span>
              </button>
            )
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer transition-all ml-auto"
          >
            Close
          </button>
        </div>
      </div>

      {/* Transfer Ownership Confirmation Sub-Modal */}
      {transferTarget && (
        <Modal
          isOpen={Boolean(transferTarget)}
          onClose={() => setTransferTarget(null)}
          title="Transfer Ownership"
          maxWidth="sm"
        >
          <div className="space-y-3 py-1">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to transfer ownership of{' '}
              <span className="font-bold text-[var(--text-primary)]">{group.name}</span> to{' '}
              <span className="font-bold text-[var(--text-primary)]">{transferTarget.fullName}</span>?
            </p>
            <p className="text-[11px] text-amber-600 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
              You will automatically become an Admin after the transfer.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setTransferTarget(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={transferring}
                onClick={handleConfirmTransfer}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer flex items-center gap-1.5"
              >
                {transferring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Transfer</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Remove Member Confirmation Sub-Modal */}
      {removeTarget && (
        <Modal
          isOpen={Boolean(removeTarget)}
          onClose={() => setRemoveTarget(null)}
          title="Remove Member"
          maxWidth="sm"
        >
          <div className="space-y-3 py-1">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to remove{' '}
              <span className="font-bold text-[var(--text-primary)]">{removeTarget.fullName}</span> from{' '}
              <span className="font-bold text-[var(--text-primary)]">{group.name}</span>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={handleConfirmRemove}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer flex items-center gap-1.5"
              >
                {removing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Remove Member</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
