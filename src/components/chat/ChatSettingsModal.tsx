import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import {
  Settings,
  Bell,
  BellOff,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Loader2,
  Check,
  Lock,
} from 'lucide-react';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: any;
  myRole: 'Owner' | 'Admin' | 'Member' | string;
  initialMuted?: boolean;
  onGroupUpdated: (updatedGroup: any) => void;
  onOpenClearChat: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
  isOpen,
  onClose,
  group,
  myRole,
  initialMuted = false,
  onGroupUpdated,
  onOpenClearChat,
  showToast,
}) => {
  const [chatPermissions, setChatPermissions] = useState<'Everyone' | 'Admins Only'>(
    (group.chatPermissions as any) || 'Everyone'
  );
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [updatingPerms, setUpdatingPerms] = useState(false);
  const [togglingMute, setTogglingMute] = useState(false);

  const canEditPerms = myRole === 'Owner' || myRole === 'Admin';

  // Toggle Messaging Permission (Owner/Admin)
  const handleUpdatePermissions = async (newPerm: 'Everyone' | 'Admins Only') => {
    if (!canEditPerms) return;
    try {
      setUpdatingPerms(true);
      const res = await api.put<any>(`/groups/${group._id}`, {
        chatPermissions: newPerm,
      });

      if (res.success && res.group) {
        setChatPermissions(newPerm);
        onGroupUpdated(res.group);
        showToast(
          newPerm === 'Admins Only'
            ? 'Messaging set to Admins Only.'
            : 'Messaging opened to Everyone.',
          'success'
        );
      } else {
        showToast(res.message || 'Failed to update chat permissions.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating chat permissions.', 'error');
    } finally {
      setUpdatingPerms(false);
    }
  };

  // Toggle Notification Mute State (per user/group)
  const handleToggleMute = async () => {
    try {
      setTogglingMute(true);
      const nextMuted = !isMuted;
      const res = await api.post<any>(`/groups/${group._id}/mute`, {
        muted: nextMuted,
      });

      if (res.success) {
        setIsMuted(nextMuted);
        showToast(
          nextMuted ? 'Notifications muted for this group.' : 'Notifications unmuted.',
          'success'
        );
      } else {
        showToast(res.message || 'Failed to update notification settings.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating notification settings.', 'error');
    } finally {
      setTogglingMute(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chat Settings"
      subtitle={`Configure settings for ${group.name}`}
      maxWidth="md"
    >
      <div className="space-y-4 py-2">
        {/* 1. Messaging Permission Section (Requirement 5) */}
        <div className="space-y-2 p-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-subtle)]/50">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 uppercase tracking-wider">
              <MessageSquare className="w-4 h-4 text-[var(--primary-color)]" />
              <span>Who Can Send Messages</span>
            </h4>
            {!canEditPerms && (
              <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 font-semibold">
                <Lock className="w-3 h-3" /> Admins Only
              </span>
            )}
          </div>

          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            {canEditPerms
              ? 'Choose whether all active members can send messages or restrict broadcasting to group admins.'
              : 'Only group owners or admins can modify this messaging permission.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={!canEditPerms || updatingPerms}
              onClick={() => handleUpdatePermissions('Everyone')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                chatPermissions === 'Everyone'
                  ? 'border-[var(--primary-color)] bg-[var(--surface)] ring-2 ring-[var(--primary-color)]/20 shadow-xs'
                  : 'border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface)]'
              } disabled:cursor-not-allowed disabled:opacity-80`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)]">Everyone</span>
                {chatPermissions === 'Everyone' && (
                  <Check className="w-4 h-4 text-[var(--primary-color)]" />
                )}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                All active members can chat and collaborate.
              </p>
            </button>

            <button
              type="button"
              disabled={!canEditPerms || updatingPerms}
              onClick={() => handleUpdatePermissions('Admins Only')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                chatPermissions === 'Admins Only'
                  ? 'border-amber-500 bg-[var(--surface)] ring-2 ring-amber-500/20 shadow-xs'
                  : 'border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface)]'
              } disabled:cursor-not-allowed disabled:opacity-80`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  <span>Admins Only</span>
                </span>
                {chatPermissions === 'Admins Only' && (
                  <Check className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Only Owner & Admins send; Members can read.
              </p>
            </button>
          </div>
        </div>

        {/* 2. Notification Preferences (Requirement 5) */}
        <div className="space-y-2 p-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-subtle)]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                isMuted ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'
              }`}>
                {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)]">
                  {isMuted ? 'Notifications Muted' : 'Notifications Active'}
                </h4>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {isMuted
                    ? 'You will not receive sound or banner alerts for new messages.'
                    : 'Receive alerts when members send messages.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={togglingMute}
              onClick={handleToggleMute}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                isMuted
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)]'
              }`}
            >
              {togglingMute ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isMuted ? (
                <span>Unmute</span>
              ) : (
                <span>Mute</span>
              )}
            </button>
          </div>
        </div>

        {/* 3. Chat History & Clear Chat (Requirement 6) */}
        <div className="space-y-2 p-3.5 rounded-2xl border border-red-500/20 bg-red-500/5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" />
                <span>Clear Chat History</span>
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Clear all past messages for your view only. Other members will keep their messages.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenClearChat();
              }}
              className="px-3 py-1.5 rounded-xl border border-red-500/30 text-red-600 hover:bg-red-500/10 text-xs font-bold cursor-pointer transition-all shrink-0"
            >
              Clear Chat
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[var(--border-color)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
