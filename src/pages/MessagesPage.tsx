import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Image,
  Smile,
  MoreVertical,
  Bell,
  BellOff,
  Trash2,
  ArrowLeft,
  Search,
  Check,
  CheckCheck,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  Plus,
  Loader2,
  MessageSquare,
  ExternalLink,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { IConversation, IMessage, IEvent } from '../types';
import { ActionMenu } from '../components/common/ActionMenu';
import {
  DEFAULT_STUDENT_AVATAR,
  DEFAULT_COLLEGE_LOGO,
  DEFAULT_EVENT_POSTER,
} from '../services/imageDefaults';
import {
  getSearchHistory,
  saveSearchTerm,
  removeSearchTerm,
  clearSearchHistory,
} from '../services/searchHistory';
import { SearchHistoryDropdown } from '../components/common/SearchHistoryDropdown';

interface MessagesPageProps {
  initialConversationId?: string | null;
  onViewEvent?: (eventId: string) => void;
  onViewStudent?: (studentId: string) => void;
  onViewCollege?: (collegeId: string) => void;
  onBack?: () => void;
}

const COMMON_EMOJIS = ['👍', '🎉', '🔥', '👏', '❤️', '🚀', '🙌', '💯', '✨', '🤝', '🎓', '📅'];

export const MessagesPage: React.FC<MessagesPageProps> = ({
  initialConversationId,
  onViewEvent,
  onViewStudent,
  onViewCollege,
  onBack,
}) => {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(initialConversationId || null);
  const [activeConversation, setActiveConversation] = useState<IConversation | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);

  // Search & filter conversations
  const [convSearch, setConvSearch] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // New Chat Modal / Search
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Instagram-like Messages Search History (Requirement 7)
  const [msgHistory, setMsgHistory] = useState<string[]>([]);
  const [showMsgHistory, setShowMsgHistory] = useState(false);
  const msgSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMsgHistory(getSearchHistory('messages'));
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (msgSearchRef.current && !msgSearchRef.current.contains(e.target as Node)) {
        setShowMsgHistory(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Message input state
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch Conversations
  const fetchConversations = async () => {
    try {
      setLoadingList(true);
      const res = await api.get<any>('/messages/conversations');
      if (res.success) {
        setConversations(res.conversations || []);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Sync initial conversation ID if provided
  useEffect(() => {
    if (initialConversationId) {
      setSelectedConvId(initialConversationId);
    }
  }, [initialConversationId]);

  // 2. Fetch Messages for selected conversation
  const fetchMessages = async (convId: string) => {
    try {
      setLoadingMessages(true);
      const res = await api.get<any>(`/messages/conversations/${convId}`);
      if (res.success) {
        setActiveConversation(res.conversation || null);
        setMessages(res.messages || []);
        // Update unread count locally in conversations list
        setConversations((prev) =>
          prev.map((c) => (c._id === convId ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedConvId) {
      fetchMessages(selectedConvId);
    } else {
      setActiveConversation(null);
      setMessages([]);
    }
  }, [selectedConvId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3. Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConvId) return;

    const trimmed = inputText.trim();
    if (!trimmed && !attachmentPreview) return;

    try {
      setSending(true);
      let finalAttachmentUrl = attachmentPreview;

      // If there's an image file waiting to upload
      if (attachmentFile) {
        setUploadingAttachment(true);
        const formData = new FormData();
        formData.append('file', attachmentFile);
        const uploadRes = await api.post<any>('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (uploadRes.success && uploadRes.fileUrl) {
          finalAttachmentUrl = uploadRes.fileUrl;
        }
        setUploadingAttachment(false);
      }

      const res = await api.post<any>(`/messages/conversations/${selectedConvId}`, {
        text: trimmed,
        attachmentUrl: finalAttachmentUrl || undefined,
        attachmentType: finalAttachmentUrl ? 'image' : undefined,
      });

      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message]);
        setInputText('');
        setAttachmentPreview(null);
        setAttachmentFile(null);
        setShowEmojiPicker(false);

        // Update last message in conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c._id === selectedConvId
              ? {
                  ...c,
                  lastMessage: {
                    text: trimmed || 'Sent an attachment',
                    senderId: user?._id || '',
                    timestamp: new Date().toISOString(),
                  },
                }
              : c
          )
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // 4. File Attachment Handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Only image attachments are currently supported.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image size exceeds 10MB limit.');
      return;
    }

    setAttachmentFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 5. Delete Message
  const handleDeleteMessage = async (messageId: string, forEveryone: boolean) => {
    try {
      const res = await api.delete<any>(`/messages/${messageId}?forEveryone=${forEveryone}`);
      if (res.success) {
        if (forEveryone) {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === messageId
                ? {
                    ...m,
                    text: 'This message was deleted.',
                    deletedForEveryone: true,
                    attachmentUrl: undefined,
                    sharedEvent: null,
                    sharedStudent: null,
                    sharedCollege: null,
                  }
                : m
            )
          );
        } else {
          setMessages((prev) => prev.filter((m) => m._id !== messageId));
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete message');
    }
  };

  // 6. Delete / Hide Conversation
  const handleDeleteConversation = async (convId: string) => {
    if (!confirm('Are you sure you want to remove this conversation from your inbox?')) return;
    try {
      const res = await api.delete<any>(`/messages/conversations/${convId}`);
      if (res.success) {
        setConversations((prev) => prev.filter((c) => c._id !== convId));
        if (selectedConvId === convId) {
          setSelectedConvId(null);
          setActiveConversation(null);
          setMessages([]);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove conversation');
    }
  };

  // 7. Toggle Mute Conversation
  const handleToggleMute = async (convId: string) => {
    try {
      const res = await api.post<any>(`/messages/conversations/${convId}/mute`, {});
      if (res.success) {
        setActiveConversation((prev) => (prev ? { ...prev, isMuted: res.isMuted } : prev));
        setConversations((prev) =>
          prev.map((c) => (c._id === convId ? { ...c, isMuted: res.isMuted } : c))
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update mute setting');
    }
  };

  // 8. Search Users to Start New Chat
  useEffect(() => {
    if (!userSearchQuery.trim()) {
      setUserSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingUsers(true);
        const res = await api.get<any>('/search/global', { q: userSearchQuery.trim() });
        if (res.success) {
          const combined = [
            ...(res.students || []).map((s: any) => ({ ...s, itemType: 'student' })),
            ...(res.colleges || []).map((c: any) => ({ ...c, itemType: 'college' })),
          ];
          setUserSearchResults(combined);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingUsers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  const handleStartChatWithUser = async (targetId: string, itemType: 'student' | 'college') => {
    try {
      const payload = itemType === 'student' ? { targetStudentId: targetId } : { targetCollegeId: targetId };
      const res = await api.post<any>('/messages/conversations', payload);
      if (res.success && res.conversation) {
        setShowNewChatModal(false);
        setUserSearchQuery('');
        setUserSearchResults([]);
        // Add to list if new
        setConversations((prev) => {
          const exists = prev.some((c) => c._id === res.conversation._id);
          return exists ? prev : [res.conversation, ...prev];
        });
        setSelectedConvId(res.conversation._id);
      } else {
        alert(res.message || 'Cannot start conversation due to messaging privacy settings.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start conversation');
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!convSearch.trim()) return true;
    const name = c.otherParticipant?.name?.toLowerCase() || '';
    const username = c.otherParticipant?.username?.toLowerCase() || '';
    const q = convSearch.toLowerCase();
    return name.includes(q) || username.includes(q);
  });

  return (
    <div className="h-[calc(100vh-120px)] min-h-[550px] max-w-6xl mx-auto rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] overflow-hidden shadow-xs flex flex-col md:flex-row">
      {/* LEFT COLUMN: Conversation List */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-[var(--border-color)] flex flex-col shrink-0 ${
          selectedConvId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Inbox Header */}
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] cursor-pointer"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-base font-black tracking-tight text-[var(--text-primary)]">
              Messages
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowNewChatModal(true)}
            className="p-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Start New Chat"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>

        {/* Search Conversations Input */}
        <div className="p-3 border-b border-[var(--border-color)] bg-[var(--surface-subtle)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--primary-color)]"
            />
          </div>
        </div>

        {/* Conversation Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-color)]">
          {loadingList ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-color)]" />
              <p className="text-xs text-[var(--text-muted)]">Loading messages...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-40" />
              <h4 className="text-xs font-bold text-[var(--text-primary)]">No messages yet</h4>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Connect with collegiate organizers and student innovators. Click "New Chat" to start messaging.
              </p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const other = c.otherParticipant;
              const isSelected = selectedConvId === c._id;
              const unread = c.unreadCount || 0;

              return (
                <div
                  key={c._id}
                  onClick={() => setSelectedConvId(c._id)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[var(--primary-light)] border-l-4 border-[var(--primary-color)]'
                      : 'hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={
                        other?.avatar ||
                        DEFAULT_STUDENT_AVATAR
                      }
                      alt={other?.name || 'Chat User'}
                      className="w-11 h-11 rounded-xl object-cover border border-[var(--border-color)]"
                      onError={(e) => {
                        (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                      }}
                    />
                    {c.isMuted && (
                      <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-700 text-white">
                        <BellOff className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  <div className="grow min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p
                        className={`text-xs font-bold truncate ${
                          unread > 0 ? 'text-[var(--text-primary)] font-black' : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {other?.name || 'User'}
                      </p>
                      {c.lastMessage && (
                        <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                          {new Date(c.lastMessage.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-[11px] truncate ${
                          unread > 0
                            ? 'text-[var(--primary-color)] font-bold'
                            : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {c.lastMessage?.text || 'Started a conversation'}
                      </p>
                      {unread > 0 && (
                        <span className="shrink-0 w-4 h-4 rounded-full bg-[var(--primary-color)] text-[var(--primary-text)] text-[10px] font-bold flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Chat Panel */}
      <div className={`flex-1 flex flex-col bg-[var(--surface)] ${!selectedConvId ? 'hidden md:flex' : 'flex'}`}>
        {selectedConvId && activeConversation ? (
          <>
            {/* Chat Top Header */}
            <div className="p-3.5 px-4 border-b border-[var(--border-color)] flex items-center justify-between gap-3 bg-[var(--surface)]">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back to List Button */}
                <button
                  type="button"
                  onClick={() => setSelectedConvId(null)}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] md:hidden cursor-pointer"
                  title="Back to conversation list"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div
                  onClick={() => {
                    const other = activeConversation.otherParticipant;
                    if (other?.role === 'Student' && onViewStudent) {
                      onViewStudent(other.userId);
                    } else if (other?.collegeId && onViewCollege) {
                      onViewCollege(other.collegeId);
                    }
                  }}
                  className="flex items-center gap-2.5 cursor-pointer group min-w-0"
                >
                  <img
                    src={
                      activeConversation.otherParticipant?.avatar ||
                      DEFAULT_STUDENT_AVATAR
                    }
                    alt="Recipient Avatar"
                    className="w-9 h-9 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                    onError={(e) => {
                      (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                    }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--primary-color)] transition-colors">
                        {activeConversation.otherParticipant?.name}
                      </p>
                      {activeConversation.otherParticipant?.username && (
                        <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                          @{activeConversation.otherParticipant.username.replace(/^@/, '')}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      <span>{activeConversation.otherParticipant?.role || 'Direct Message'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Menu & Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleToggleMute(activeConversation._id)}
                  className={`p-2 rounded-xl border border-transparent hover:border-[var(--border-color)] transition-colors cursor-pointer ${
                    activeConversation.isMuted
                      ? 'text-amber-500 bg-amber-500/10'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'
                  }`}
                  title={activeConversation.isMuted ? 'Unmute conversation' : 'Mute conversation'}
                >
                  {activeConversation.isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </button>

                <ActionMenu
                  items={[
                    {
                      id: 'view_profile',
                      label: activeConversation.otherParticipant?.role === 'Student' ? 'View Student ID' : 'View College ID',
                      icon: activeConversation.otherParticipant?.role === 'Student' ? User : Building2,
                      onClick: () => {
                        const other = activeConversation.otherParticipant;
                        if (other?.role === 'Student' && onViewStudent) {
                          onViewStudent(other.userId);
                        } else if (other?.collegeId && onViewCollege) {
                          onViewCollege(other.collegeId);
                        }
                      },
                    },
                    {
                      id: 'mute_toggle',
                      label: activeConversation.isMuted ? 'Unmute Notifications' : 'Mute Notifications',
                      icon: activeConversation.isMuted ? Bell : BellOff,
                      onClick: () => handleToggleMute(activeConversation._id),
                    },
                    {
                      id: 'delete_conv',
                      label: 'Delete Conversation',
                      icon: Trash2,
                      danger: true,
                      onClick: () => handleDeleteConversation(activeConversation._id),
                    },
                  ]}
                />
              </div>
            </div>

            {/* Chat Message History */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[var(--surface-subtle)]/40">
              {loadingMessages ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-color)]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-[var(--text-muted)] opacity-50" />
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    No messages yet with {activeConversation.otherParticipant?.name}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Say hello or share an upcoming collegiate event!
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.senderId === user?._id;
                  const isDeleted = m.deletedForEveryone;

                  return (
                    <div
                      key={m._id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group`}
                    >
                      <div
                        className={`relative max-w-[85%] sm:max-w-md rounded-2xl p-3 shadow-xs space-y-2 ${
                          isMine
                            ? 'bg-[var(--primary-color)] text-[var(--primary-text)] rounded-br-xs'
                            : 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-bl-xs'
                        }`}
                      >
                        {/* Deleted Message Notice */}
                        {isDeleted ? (
                          <p className="text-xs italic opacity-75">{m.text}</p>
                        ) : (
                          <>
                            {/* Text Message */}
                            {m.text && (
                              <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                                {m.text}
                              </p>
                            )}

                            {/* Image Attachment */}
                            {m.attachmentUrl && (
                              <div className="rounded-xl overflow-hidden border border-black/10 max-h-60 bg-black/10">
                                <img
                                  src={m.attachmentUrl}
                                  alt="Attachment"
                                  className="w-full h-full object-cover cursor-pointer hover:scale-102 transition-transform"
                                  onClick={() => window.open(m.attachmentUrl, '_blank')}
                                />
                              </div>
                            )}

                            {/* SHARED EVENT CARD */}
                            {m.sharedEvent && (
                              <div
                                onClick={() => onViewEvent && onViewEvent(m.sharedEvent!._id)}
                                className={`rounded-xl border p-2.5 transition-all cursor-pointer ${
                                  isMine
                                    ? 'bg-black/15 border-white/20 hover:bg-black/25 text-white'
                                    : 'bg-[var(--surface-subtle)] border-[var(--border-color)] hover:border-[var(--primary-color)] text-[var(--text-primary)]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={
                                      m.sharedEvent.poster ||
                                      DEFAULT_EVENT_POSTER
                                    }
                                    alt={m.sharedEvent.title}
                                    className="w-12 h-12 rounded-lg object-cover shrink-0 border border-black/10"
                                    onError={(e) => {
                                      (e.target as any).src = DEFAULT_EVENT_POSTER;
                                    }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider block opacity-75">
                                      {m.sharedEvent.category} · Event Card
                                    </span>
                                    <p className="text-xs font-bold truncate">{m.sharedEvent.title}</p>
                                    <p className="text-[10px] opacity-75 truncate">
                                      {m.sharedEvent.hostCollegeName} · {m.sharedEvent.eventDate}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* SHARED STUDENT PROFILE CARD */}
                            {m.sharedStudent && (
                              <div
                                onClick={() => onViewStudent && onViewStudent(m.sharedStudent!.userId)}
                                className={`rounded-xl border p-2.5 transition-all cursor-pointer ${
                                  isMine
                                    ? 'bg-black/15 border-white/20 hover:bg-black/25 text-white'
                                    : 'bg-[var(--surface-subtle)] border-[var(--border-color)] hover:border-[var(--primary-color)] text-[var(--text-primary)]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={
                                      m.sharedStudent.profilePhoto ||
                                      DEFAULT_STUDENT_AVATAR
                                    }
                                    alt={m.sharedStudent.fullName}
                                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-black/10"
                                    onError={(e) => {
                                      (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                                    }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider block opacity-75">
                                      Student Profile
                                    </span>
                                    <p className="text-xs font-bold truncate">{m.sharedStudent.fullName}</p>
                                    <p className="text-[10px] opacity-75 truncate">
                                      {m.sharedStudent.username ? `@${m.sharedStudent.username.replace(/^@/, '')}` : m.sharedStudent.collegeName}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* SHARED COLLEGE PROFILE CARD */}
                            {m.sharedCollege && (
                              <div
                                onClick={() => onViewCollege && onViewCollege(m.sharedCollege!._id)}
                                className={`rounded-xl border p-2.5 transition-all cursor-pointer ${
                                  isMine
                                    ? 'bg-black/15 border-white/20 hover:bg-black/25 text-white'
                                    : 'bg-[var(--surface-subtle)] border-[var(--border-color)] hover:border-[var(--primary-color)] text-[var(--text-primary)]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={
                                      m.sharedCollege.logo ||
                                      DEFAULT_COLLEGE_LOGO
                                    }
                                    alt={m.sharedCollege.name}
                                    className="w-10 h-10 rounded-xl object-cover shrink-0 border border-black/10"
                                    onError={(e) => {
                                      (e.target as any).src = DEFAULT_COLLEGE_LOGO;
                                    }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider block opacity-75">
                                      College Profile
                                    </span>
                                    <p className="text-xs font-bold truncate">{m.sharedCollege.name}</p>
                                    <p className="text-[10px] opacity-75 truncate">
                                      {m.sharedCollege.location || 'University Campus'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Timestamp & Read Receipts */}
                        <div
                          className={`flex items-center justify-end gap-1 text-[10px] ${
                            isMine ? 'text-white/80' : 'text-[var(--text-muted)]'
                          }`}
                        >
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isMine && !isDeleted && (
                            <CheckCheck className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                      </div>

                      {/* Delete Options Button on Hover */}
                      {!isDeleted && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 px-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(m._id, isMine)}
                            className="text-[10px] text-red-500 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>{isMine ? 'Delete for everyone' : 'Delete for me'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input & Action Footer */}
            <div className="p-3 border-t border-[var(--border-color)] bg-[var(--surface)] space-y-2">
              {/* Attachment Preview Box */}
              {attachmentPreview && (
                <div className="relative inline-block border border-[var(--border-color)] rounded-xl overflow-hidden p-1 bg-[var(--surface-subtle)]">
                  <img
                    src={attachmentPreview}
                    alt="preview"
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentPreview(null);
                      setAttachmentFile(null);
                    }}
                    className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 cursor-pointer shadow-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Emoji bar popup */}
              {showEmojiPicker && (
                <div className="flex items-center gap-2 p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] overflow-x-auto">
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setInputText((prev) => prev + emoji)}
                      className="text-lg p-1 hover:scale-125 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Attach Image Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  title="Attach Image"
                >
                  <Image className="w-4 h-4" />
                </button>

                {/* Emoji Picker Toggle */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    showEmojiPicker
                      ? 'border-[var(--primary-color)] text-[var(--primary-color)] bg-[var(--primary-light)]'
                      : 'border-[var(--border-color)] hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {/* Main Text Input */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Message..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:bg-[var(--surface)] focus:border-[var(--primary-color)] text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden transition-all"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={sending || (!inputText.trim() && !attachmentPreview)}
                  className="p-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                >
                  {sending || uploadingAttachment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)]">
              <MessageSquare className="w-8 h-8 opacity-60" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Your Messages</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm">
              Send private direct messages, share event passes, and collaborate with student clubs and universities.
            </p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="px-4 py-2 rounded-xl bg-[var(--primary-color)] text-[var(--primary-text)] text-xs font-bold cursor-pointer"
            >
              Start a Conversation
            </button>
          </div>
        )}
      </div>

      {/* NEW CHAT MODAL */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-primary)]">New Message</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-subtle)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative" ref={msgSearchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={userSearchQuery}
                onFocus={() => {
                  if (!userSearchQuery.trim()) setShowMsgHistory(true);
                }}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value);
                  if (e.target.value.trim().length === 0) {
                    setShowMsgHistory(true);
                  } else {
                    setShowMsgHistory(false);
                  }
                }}
                placeholder="Search students (@username) or colleges..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--primary-color)]"
                autoFocus
              />

              {/* Instagram-like Search History for Messages (Requirement 7) */}
              {showMsgHistory && !userSearchQuery.trim() && msgHistory.length > 0 && (
                <SearchHistoryDropdown
                  context="messages"
                  history={msgHistory}
                  onSelectTerm={(term) => {
                    setUserSearchQuery(term);
                    setShowMsgHistory(false);
                    const updated = saveSearchTerm('messages', term);
                    setMsgHistory(updated);
                  }}
                  onRemoveTerm={(term, e) => {
                    e.stopPropagation();
                    const updated = removeSearchTerm('messages', term);
                    setMsgHistory(updated);
                  }}
                  onClearAll={(e) => {
                    e.stopPropagation();
                    clearSearchHistory('messages');
                    setMsgHistory([]);
                  }}
                />
              )}
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 divide-y divide-[var(--border-color)]">
              {searchingUsers ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--primary-color)]" />
                </div>
              ) : userSearchResults.length === 0 ? (
                <p className="text-center py-6 text-xs text-[var(--text-muted)]">
                  {userSearchQuery.trim() ? 'No users or colleges found' : 'Type a name or username above to find someone to message'}
                </p>
              ) : (
                userSearchResults.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => handleStartChatWithUser(item._id, item.itemType)}
                    className="p-2.5 flex items-center justify-between gap-3 hover:bg-[var(--surface-subtle)] rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={item.profilePhoto || item.logo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                        alt="avatar"
                        className="w-9 h-9 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {item.fullName || item.name}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">
                          {item.username ? `@${item.username.replace(/^@/, '')}` : item.collegeName || item.location}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[var(--primary-color)] uppercase">
                      Chat
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
