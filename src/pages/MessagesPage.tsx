import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Image,
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

  // Search in conversation list (Requirements 7, 9, 10)
  const [convSearch, setConvSearch] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // Remote Search for Students & Colleges (Messages Search: Requirements 7 & 10)
  const [remoteSearchResults, setRemoteSearchResults] = useState<{ students: any[]; colleges: any[] }>({
    students: [],
    colleges: [],
  });
  const [searchingRemote, setSearchingRemote] = useState(false);

  // Instagram-like Messages Search History (Requirement 9)
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

  // Message input state (clean composer, no dedicated emoji button per Requirement 11)
  const [inputText, setInputText] = useState('');
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

  // 3. Remote Search Students and Colleges when convSearch has text (Requirements 7 & 10)
  useEffect(() => {
    const trimmed = convSearch.trim();
    if (!trimmed) {
      setRemoteSearchResults({ students: [], colleges: [] });
      setSearchingRemote(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingRemote(true);
        const res = await api.get<any>('/search/global', { q: trimmed, type: 'messages' });
        if (res.success) {
          setRemoteSearchResults({
            students: res.students || [],
            colleges: res.colleges || [],
          });
        }
      } catch (err) {
        console.error('Remote search in messages error:', err);
      } finally {
        setSearchingRemote(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [convSearch]);

  // Start or open conversation with a target user/college (Requirement 10: messages works through search)
  const handleStartChatWithUser = async (targetId: string, itemType: 'student' | 'college') => {
    try {
      const payload = itemType === 'student' ? { targetStudentId: targetId } : { targetCollegeId: targetId };
      const res = await api.post<any>('/messages/conversations', payload);
      if (res.success && res.conversation) {
        setConvSearch('');
        setRemoteSearchResults({ students: [], colleges: [] });
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

  // 4. Send Message
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

        // Update last message in list
        setConversations((prev) =>
          prev.map((c) =>
            c._id === selectedConvId
              ? {
                  ...c,
                  lastMessage: {
                    text: trimmed || 'Shared an attachment',
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
      setUploadingAttachment(false);
    }
  };

  // Handle local image file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Only image attachments are supported in direct messages.');
        return;
      }
      setAttachmentFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setAttachmentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 5. Delete Message (Own message = for everyone or for me; other = for me)
  const handleDeleteMessage = async (messageId: string, isMine: boolean) => {
    const forEveryone = isMine && window.confirm('Delete for everyone? Click Cancel to delete only for you.');
    try {
      const res = await api.delete<any>(
        `/messages/${messageId}?forEveryone=${forEveryone ? 'true' : 'false'}`
      );
      if (res.success) {
        if (forEveryone) {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === messageId
                ? { ...m, deletedForEveryone: true, text: 'This message was deleted' }
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

  // 6. Delete/Hide Conversation
  const handleDeleteConversation = async (convId: string) => {
    if (!window.confirm('Delete conversation for you?')) return;
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
      alert(err.message || 'Failed to delete conversation');
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

  const filteredConversations = conversations.filter((c) => {
    if (!convSearch.trim()) return true;
    const name = c.otherParticipant?.name?.toLowerCase() || '';
    const username = c.otherParticipant?.username?.toLowerCase() || '';
    const q = convSearch.toLowerCase();
    return name.includes(q) || username.includes(q);
  });

  const hasRemoteMatches =
    remoteSearchResults.students.length > 0 || remoteSearchResults.colleges.length > 0;

  return (
    <div className="h-[calc(100vh-120px)] min-h-[550px] max-w-7xl mx-auto rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] overflow-hidden shadow-xs flex flex-col md:flex-row">
      {/* LEFT COLUMN: Conversation List & Search */}
      <div
        className={`w-full md:w-80 lg:w-88 border-r border-[var(--border-color)] flex flex-col shrink-0 ${
          selectedConvId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Inbox Header - NO "+ New Chat" button per Requirement 10 */}
        <div className="p-3.5 border-b border-[var(--border-color)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] cursor-pointer md:hidden"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-base font-black tracking-tight text-[var(--text-primary)]">
              Messages
            </h2>
          </div>
        </div>

        {/* Search Students & Colleges Input (Requirements 7, 9, 10) */}
        <div className="p-3 border-b border-[var(--border-color)] bg-[var(--surface-subtle)] relative" ref={msgSearchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={convSearch}
              onFocus={() => {
                if (!convSearch.trim()) setShowMsgHistory(true);
              }}
              onChange={(e) => {
                const val = e.target.value;
                setConvSearch(val);
                if (!val.trim()) {
                  setShowMsgHistory(true);
                } else {
                  setShowMsgHistory(false);
                }
              }}
              placeholder="Search students or colleges..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--primary-color)] transition-colors"
            />
            {convSearch && (
              <button
                type="button"
                onClick={() => {
                  setConvSearch('');
                  setShowMsgHistory(false);
                  setRemoteSearchResults({ students: [], colleges: [] });
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Instagram-like Search History Dropdown when input is focused with no query */}
          {showMsgHistory && !convSearch.trim() && msgHistory.length > 0 && (
            <SearchHistoryDropdown
              context="messages"
              history={msgHistory}
              onSelectTerm={(term) => {
                setConvSearch(term);
                setShowMsgHistory(false);
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
              onClose={() => setShowMsgHistory(false)}
            />
          )}
        </div>

        {/* Conversation & Search Results Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-color)]">
          {loadingList ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-color)]" />
              <p className="text-xs text-[var(--text-muted)]">Loading messages...</p>
            </div>
          ) : convSearch.trim().length > 0 ? (
            /* Live Search Results (Requirement 7: Student + College only, no events) */
            <div className="divide-y divide-[var(--border-color)]">
              {searchingRemote && (
                <div className="p-3 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--primary-color)]" />
                  <span>Searching students & colleges...</span>
                </div>
              )}

              {/* Matching Students */}
              {remoteSearchResults.students.length > 0 && (
                <div className="p-2 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                    <User className="w-3 h-3 text-[var(--primary-color)]" />
                    <span>Students ({remoteSearchResults.students.length})</span>
                  </div>
                  {remoteSearchResults.students.map((student) => (
                    <div
                      key={student._id || student.userId}
                      onClick={() => {
                        saveSearchTerm('messages', student.fullName);
                        setMsgHistory(getSearchHistory('messages'));
                        handleStartChatWithUser(student.userId || student._id, 'student');
                      }}
                      className="p-2 rounded-xl hover:bg-[var(--surface-hover)] cursor-pointer transition-colors flex items-center justify-between gap-2.5 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={student.profilePhoto || DEFAULT_STUDENT_AVATAR}
                          alt={student.fullName}
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-[var(--border-color)]"
                          onError={(e) => {
                            (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-color)] truncate">
                            {student.fullName}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">
                            {student.username || student.collegeName}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[var(--primary-color)] shrink-0 px-2 py-0.5 rounded-md bg-[var(--primary-light)]">
                        Chat
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Matching Colleges */}
              {remoteSearchResults.colleges.length > 0 && (
                <div className="p-2 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-blue-500" />
                    <span>Colleges ({remoteSearchResults.colleges.length})</span>
                  </div>
                  {remoteSearchResults.colleges.map((col) => (
                    <div
                      key={col._id}
                      onClick={() => {
                        saveSearchTerm('messages', col.name);
                        setMsgHistory(getSearchHistory('messages'));
                        handleStartChatWithUser(col._id, 'college');
                      }}
                      className="p-2 rounded-xl hover:bg-[var(--surface-hover)] cursor-pointer transition-colors flex items-center justify-between gap-2.5 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={col.logo || DEFAULT_COLLEGE_LOGO}
                          alt={col.name}
                          className="w-9 h-9 rounded-xl object-cover shrink-0 border border-[var(--border-color)]"
                          onError={(e) => {
                            (e.target as any).src = DEFAULT_COLLEGE_LOGO;
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-color)] truncate">
                              {col.name}
                            </p>
                            {col.isVerified && (
                              <span title="Verified College">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">
                            {col.username || col.location || 'College'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[var(--primary-color)] shrink-0 px-2 py-0.5 rounded-md bg-[var(--primary-light)]">
                        Chat
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Matching Existing Conversations */}
              {filteredConversations.length > 0 && (
                <div className="p-2 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3 text-[var(--text-muted)]" />
                    <span>Existing Chats ({filteredConversations.length})</span>
                  </div>
                  {filteredConversations.map((c) => {
                    const other = c.otherParticipant;
                    const isSelected = selectedConvId === c._id;
                    const unread = c.unreadCount || 0;

                    return (
                      <div
                        key={c._id}
                        onClick={() => setSelectedConvId(c._id)}
                        className={`p-2.5 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[var(--primary-light)] border-l-4 border-[var(--primary-color)]'
                            : 'hover:bg-[var(--surface-hover)]'
                        }`}
                      >
                        <img
                          src={other?.avatar || DEFAULT_STUDENT_AVATAR}
                          alt={other?.name || 'Chat User'}
                          className="w-9 h-9 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                          onError={(e) => {
                            (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                          }}
                        />
                        <div className="min-w-0 grow">
                          <p className="text-xs font-bold truncate text-[var(--text-primary)]">
                            {other?.name || 'User'}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">
                            {c.lastMessage?.text || 'Conversation started'}
                          </p>
                        </div>
                        {unread > 0 && (
                          <span className="shrink-0 w-4 h-4 rounded-full bg-[var(--primary-color)] text-[var(--primary-text)] text-[10px] font-bold flex items-center justify-center">
                            {unread}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!searchingRemote && !hasRemoteMatches && filteredConversations.length === 0 && (
                <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                  No students, colleges, or conversations found for "{convSearch}".
                </div>
              )}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-40" />
              <h4 className="text-xs font-bold text-[var(--text-primary)]">No messages yet</h4>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Connect with collegiate organizers and student innovators. Search students or colleges above to start messaging.
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
                      src={other?.avatar || DEFAULT_STUDENT_AVATAR}
                      alt={other?.name || 'Chat User'}
                      className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)]"
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

      {/* RIGHT COLUMN: Active Chat Panel (Instagram-Like compact DM layout per Requirement 12) */}
      <div
        className={`flex-1 flex flex-col min-w-0 bg-[var(--surface)] ${
          selectedConvId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {activeConversation && selectedConvId ? (
          <>
            {/* Conversation Header */}
            <div className="p-3.5 border-b border-[var(--border-color)] flex items-center justify-between gap-3 bg-[var(--surface)]">
              <div className="flex items-center gap-2.5 min-w-0">
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

              {/* Action Menu (No voice or video call per Requirement 12) */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleToggleMute(selectedConvId)}
                  className="p-2 rounded-xl hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  title={activeConversation.isMuted ? 'Unmute' : 'Mute'}
                >
                  {activeConversation.isMuted ? (
                    <BellOff className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </button>

                <ActionMenu
                  items={[
                    {
                      id: 'mute',
                      label: activeConversation.isMuted ? 'Unmute notifications' : 'Mute notifications',
                      icon: activeConversation.isMuted ? Bell : BellOff,
                      onClick: () => handleToggleMute(selectedConvId),
                    },
                    {
                      id: 'delete',
                      label: 'Delete conversation',
                      icon: Trash2,
                      danger: true,
                      onClick: () => handleDeleteConversation(selectedConvId),
                    },
                  ]}
                />
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[var(--surface-subtle)]/40">
              {loadingMessages ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-color)]" />
                  <p className="text-xs text-[var(--text-muted)]">Loading conversation...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-40" />
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">
                    No messages yet. Say hello!
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.senderId === user?._id;
                  const isDeleted = m.deletedForEveryone;
                  const isSeen = !isDeleted && (
                    (m.readBy && m.readBy.some((id) => id !== user?._id)) ||
                    Boolean(m.seenAt)
                  );

                  return (
                    <div
                      key={m._id}
                      className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-md rounded-2xl px-3.5 py-2.5 shadow-2xs space-y-2 ${
                          isMine
                            ? 'bg-[var(--primary-color)] text-[var(--primary-text)] rounded-br-xs'
                            : 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-bl-xs'
                        }`}
                      >
                        {isDeleted ? (
                          <p className="text-xs italic opacity-75">This message was deleted</p>
                        ) : (
                          <>
                            {/* Message text */}
                            {m.text && (
                              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {m.text}
                              </p>
                            )}

                            {/* Image attachment */}
                            {m.attachmentUrl && (
                              <div className="rounded-xl overflow-hidden border border-black/10 mt-1 max-h-60 bg-black/5">
                                <img
                                  src={m.attachmentUrl}
                                  alt="attachment"
                                  className="w-full h-full object-cover cursor-pointer hover:scale-102 transition-transform"
                                  onClick={() => window.open(m.attachmentUrl, '_blank')}
                                />
                              </div>
                            )}

                            {/* SHARED EVENT CARD (Requirement 15: Share Event Through Message) */}
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
                                    src={m.sharedEvent.poster || DEFAULT_EVENT_POSTER}
                                    alt={m.sharedEvent.title}
                                    className="w-12 h-12 rounded-lg object-cover shrink-0 border border-black/10"
                                    onError={(e) => {
                                      (e.target as any).src = DEFAULT_EVENT_POSTER;
                                    }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                      <span className="text-[10px] font-black uppercase tracking-wider block opacity-75 truncate">
                                        {m.sharedEvent.category} · Event
                                      </span>
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-black/20 shrink-0">
                                        {m.sharedEvent.isFree ? 'Free' : `$${m.sharedEvent.registrationFee || 0}`}
                                      </span>
                                    </div>
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
                                    src={m.sharedStudent.profilePhoto || DEFAULT_STUDENT_AVATAR}
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
                                    src={m.sharedCollege.logo || DEFAULT_COLLEGE_LOGO}
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

                        {/* Timestamp & Real Sent / Seen Receipts (Requirement 13) */}
                        <div
                          className={`flex items-center justify-end gap-1.5 text-[10px] mt-1 ${
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
                            isSeen ? (
                              <span
                                title={m.seenAt ? `Seen at ${new Date(m.seenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Seen'}
                                className="flex items-center gap-0.5 text-sky-300 font-bold"
                              >
                                <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                                <span className="text-[9px]">Seen</span>
                              </span>
                            ) : (
                              <span title="Sent" className="flex items-center gap-0.5 text-white/70">
                                <Check className="w-3.5 h-3.5 text-white/70" />
                                <span className="text-[9px]">Sent</span>
                              </span>
                            )
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

            {/* Clean Input & Action Composer (Requirement 11: Remove dedicated emoji button) */}
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
                  className="p-2.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
                  title="Attach Image"
                >
                  <Image className="w-4 h-4" />
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
                  title="Send"
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
              Send private direct messages, share event passes, and collaborate. Search students or colleges in the sidebar to start a conversation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
