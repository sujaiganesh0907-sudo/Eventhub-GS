import React, { useState, useEffect } from 'react';
import {
  Send,
  X,
  Search,
  Check,
  Building2,
  User,
  Calendar,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { Modal } from './Modal';
import { api } from '../../services/api';
import { IConversation, IEvent, IStudentProfile, ICollege } from '../../types';

interface ShareToChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: IEvent | null;
  student?: IStudentProfile | null;
  college?: ICollege | null;
  onShareSuccess?: (conversationId: string) => void;
}

export const ShareToChatModal: React.FC<ShareToChatModalProps> = ({
  isOpen,
  onClose,
  event,
  student,
  college,
  onShareSuccess,
}) => {
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [sharedConvs, setSharedConvs] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSharedConvs(new Set());
      setError(null);
      return;
    }

    const loadConversations = async () => {
      try {
        setLoading(true);
        const res = await api.get<any>('/messages/conversations');
        if (res.success) {
          setConversations(res.conversations || []);
        }
      } catch (err) {
        console.error('Failed to load conversations', err);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [isOpen]);

  // Search people/colleges if user types in search box
  useEffect(() => {
    if (!searchUserQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get<any>('/search/global', { q: searchUserQuery.trim() });
        if (res.success) {
          const combined = [
            ...(res.students || []).map((s: any) => ({ ...s, itemType: 'student' })),
            ...(res.colleges || []).map((c: any) => ({ ...c, itemType: 'college' })),
          ];
          setSearchResults(combined);
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchUserQuery]);

  const handleShareToConversation = async (conversationId: string) => {
    try {
      setSharingId(conversationId);
      setError(null);

      const payload: any = {
        text: '',
        sharedEventId: event?._id,
        sharedStudentId: student?._id,
        sharedCollegeId: college?._id,
      };

      const res = await api.post<any>(`/messages/conversations/${conversationId}`, payload);
      if (res.success) {
        setSharedConvs((prev) => new Set([...prev, conversationId]));
        if (onShareSuccess) onShareSuccess(conversationId);
      } else {
        setError(res.message || 'Failed to share');
      }
    } catch (err: any) {
      setError(err.message || 'Error sharing message');
    } finally {
      setSharingId(null);
    }
  };

  const handleStartAndShare = async (targetId: string, itemType: 'student' | 'college') => {
    try {
      setSharingId(targetId);
      setError(null);

      const convRes = await api.post<any>('/messages/conversations', {
        ...(itemType === 'student' ? { targetStudentId: targetId } : { targetCollegeId: targetId }),
      });

      if (convRes.success && convRes.conversation) {
        const convId = convRes.conversation._id;
        await handleShareToConversation(convId);
      } else {
        setError(convRes.message || 'Cannot message this user due to their privacy settings.');
      }
    } catch (err: any) {
      setError(err.message || 'Could not start conversation.');
    } finally {
      setSharingId(null);
    }
  };

  const shareTitle = event
    ? `Share "${event.title}"`
    : student
    ? `Share ${student.fullName}'s Profile`
    : college
    ? `Share ${college.name}`
    : 'Share via Chat';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={shareTitle}
      subtitle="Send this card directly into your EVENTHUB chats"
      maxWidth="md"
    >
      <div className="space-y-4 py-2">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Preview Card */}
        {event && (
          <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] flex items-center gap-3">
            <img
              src={event.poster || event.hostCollegeLogo || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=120&auto=format&fit=crop&q=80'}
              alt={event.title}
              className="w-12 h-12 rounded-lg object-cover border border-[var(--border-color)] shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">{event.title}</p>
              <p className="text-[11px] text-[var(--text-muted)] truncate">{event.hostCollegeName} · {event.eventDate}</p>
            </div>
          </div>
        )}

        {student && (
          <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] flex items-center gap-3">
            <img
              src={student.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
              alt={student.fullName}
              className="w-12 h-12 rounded-full object-cover border border-[var(--border-color)] shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">{student.fullName}</p>
              <p className="text-[11px] text-[var(--text-muted)] truncate">{student.username ? `@${student.username.replace(/^@/, '')}` : student.collegeName}</p>
            </div>
          </div>
        )}

        {college && (
          <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] flex items-center gap-3">
            <img
              src={college.logo || 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=120&auto=format&fit=crop&q=80'}
              alt={college.name}
              className="w-12 h-12 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">{college.name}</p>
              <p className="text-[11px] text-[var(--text-muted)] truncate">{college.location || 'Campus'}</p>
            </div>
          </div>
        )}

        {/* Search recipients */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchUserQuery}
            onChange={(e) => setSearchUserQuery(e.target.value)}
            placeholder="Search student or college to message..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--primary-color)]"
          />
        </div>

        {/* Search results or active conversations */}
        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
          {searchUserQuery.trim() ? (
            searchResults.length === 0 ? (
              <p className="text-center py-6 text-xs text-[var(--text-muted)]">No users or colleges found</p>
            ) : (
              searchResults.map((item) => (
                <div
                  key={item._id}
                  className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={item.profilePhoto || item.logo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                      alt="avatar"
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {item.fullName || item.name}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">
                        {item.username || item.collegeName || item.location}
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={sharingId === item._id}
                    onClick={() => handleStartAndShare(item._id, item.itemType)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    {sharingId === item._id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3 h-3" /> Send
                      </>
                    )}
                  </button>
                </div>
              ))
            )
          ) : loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-color)]" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 space-y-1.5">
              <MessageSquare className="w-8 h-8 mx-auto text-[var(--text-muted)] opacity-50" />
              <p className="text-xs font-bold text-[var(--text-primary)]">No recent conversations</p>
              <p className="text-[11px] text-[var(--text-muted)]">Type a name above to start a chat and share.</p>
            </div>
          ) : (
            conversations.map((c) => {
              const other = c.otherParticipant;
              const hasShared = sharedConvs.has(c._id);
              const isSending = sharingId === c._id;

              return (
                <div
                  key={c._id}
                  className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={other?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                      alt="avatar"
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {other?.name || 'Chat Participant'}
                      </p>
                      {other?.username && (
                        <p className="text-[10px] text-[var(--text-muted)] truncate">
                          @{other.username.replace(/^@/, '')}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    disabled={hasShared || isSending}
                    onClick={() => handleShareToConversation(c._id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                      hasShared
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)]'
                    }`}
                  >
                    {isSending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : hasShared ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Sent
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" /> Send
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
