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
  User,
  ShieldCheck,
  Loader2,
  MessageSquare,
  X,
  AlertCircle,
  CheckCircle2,
  Users,
  Pin,
  Megaphone,
  Info,
  LogOut,
  Plus,
  Settings,
  Edit3,
  Shield,
  Lock,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { IConversation, IMessage, IGroup } from '../types';
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
import { Modal } from '../components/common/Modal';
import { CreateGroupModal } from '../components/chat/CreateGroupModal';
import { GroupInfoModal } from '../components/chat/GroupInfoModal';
import { ChatSettingsModal } from '../components/chat/ChatSettingsModal';
import { EditGroupModal } from '../components/chat/EditGroupModal';
import { ChatEmptyIllustration } from '../components/chat/ChatEmptyIllustration';

interface MessagesPageProps {
  initialConversationId?: string | null;
  initialGroupId?: string | null;
  asCollegeId?: string;
  collegeName?: string;
  collegeLogo?: string;
  onViewEvent?: (eventId: string) => void;
  onViewStudent?: (studentId: string) => void;
  onViewCollege?: (collegeId: string) => void;
  onBack?: () => void;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({
  initialConversationId,
  initialGroupId,
  asCollegeId,
  collegeName,
  collegeLogo,
  onViewEvent,
  onViewStudent,
  onViewCollege,
  onBack,
}) => {
  const { user } = useAuth();

  // Navigation tab: 'chats' (Direct) vs 'groups' (Group Chat)
  const [activeTab, setActiveTab] = useState<'chats' | 'groups'>(() => {
    if (initialGroupId) return 'groups';
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('group');
      if (p) return 'groups';
    }
    return 'chats';
  });

  // Direct conversations state
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(initialConversationId || null);
  const [activeConversation, setActiveConversation] = useState<IConversation | null>(null);

  // Groups state (Part 5B & 5C)
  const [groups, setGroups] = useState<IGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(() => {
    if (initialGroupId) return initialGroupId;
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('group');
      if (p) return p;
    }
    return null;
  });
  const [activeGroup, setActiveGroup] = useState<any | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<IMessage[]>([]);
  const [isAnnouncementMode, setIsAnnouncementMode] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showGroupHeaderMenu, setShowGroupHeaderMenu] = useState(false);
  const [showChatSettingsModal, setShowChatSettingsModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false);

  // Shared message list state
  const [messages, setMessages] = useState<IMessage[]>([]);

  // Search in conversation / group list
  const [convSearch, setConvSearch] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // Remote Search for Students & Colleges
  const [remoteSearchResults, setRemoteSearchResults] = useState<{ students: any[]; colleges: any[] }>({
    students: [],
    colleges: [],
  });
  const [searchingRemote, setSearchingRemote] = useState(false);

  // Search History
  const [msgHistory, setMsgHistory] = useState<string[]>([]);
  const [showMsgHistory, setShowMsgHistory] = useState(false);
  const msgSearchRef = useRef<HTMLDivElement>(null);

  // Message input state
  const [inputText, setInputText] = useState('');
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Action Menu & Confirmation Modal State
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    type: 'for-everyone' | 'for-me' | 'conversation' | 'leave-group';
    messageId?: string;
    convId?: string;
    groupId?: string;
  }>({
    isOpen: false,
    type: 'for-me',
  });

  // In-App Toast Feedback
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    setMsgHistory(getSearchHistory('messages'));
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (msgSearchRef.current && !msgSearchRef.current.contains(e.target as Node)) {
        setShowMsgHistory(false);
      }
      if (activeMenuMsgId && !(e.target as HTMLElement).closest('.message-action-menu-container')) {
        setActiveMenuMsgId(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [activeMenuMsgId]);

  // 1. Fetch Conversations
  const fetchConversations = async () => {
    try {
      setLoadingList(true);
      const url = asCollegeId ? `/messages/conversations?asCollegeId=${asCollegeId}` : '/messages/conversations';
      const res = await api.get<any>(url);
      if (res.success) {
        setConversations(res.conversations || []);
      }
    } catch (err: any) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoadingList(false);
    }
  };

  // 2. Fetch User Groups (Part 5B)
  const fetchGroups = async () => {
    try {
      setLoadingList(true);
      const res = await api.get<any>('/groups?myGroups=true');
      if (res.success) {
        setGroups(res.groups || []);
      }
    } catch (err: any) {
      console.error('Failed to load groups', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'chats') {
      fetchConversations();
    } else {
      fetchGroups();
    }
  }, [activeTab, asCollegeId]);

  useEffect(() => {
    if (initialGroupId) {
      setActiveTab('groups');
      setSelectedGroupId(initialGroupId);
      setSelectedConvId(null);
    } else if (initialConversationId) {
      if (initialConversationId.startsWith('group_')) {
        const gId = initialConversationId.replace('group_', '');
        setActiveTab('groups');
        setSelectedGroupId(gId);
        setSelectedConvId(null);
      } else {
        setActiveTab('chats');
        setSelectedGroupId(null);
        setSelectedConvId(initialConversationId);
      }
    } else {
      const urlGroup = new URLSearchParams(window.location.search).get('group');
      if (urlGroup) {
        setActiveTab('groups');
        setSelectedGroupId(urlGroup);
        setSelectedConvId(null);
      }
    }
  }, [initialConversationId, initialGroupId]);

  // 3. Fetch Direct Messages
  const fetchMessages = async (convId: string) => {
    try {
      setLoadingMessages(true);
      const res = await api.get<any>(`/messages/conversations/${convId}`);
      if (res.success) {
        setActiveConversation(res.conversation || null);
        setActiveGroup(null);
        setMessages(res.messages || []);
        setConversations((prev) =>
          prev.map((c) => (c._id === convId ? { ...c, unreadCount: 0 } : c))
        );
      } else {
        showToast(res.message || 'Unable to load conversation messages.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load conversation.', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  // 4. Fetch Group Messages (Part 5B)
  const fetchGroupMessages = async (groupId: string) => {
    try {
      setLoadingMessages(true);
      const [msgRes, groupRes] = await Promise.all([
        api.get<any>(`/groups/${groupId}/messages`),
        api.get<any>(`/groups/${groupId}`),
      ]);

      if (groupRes.success) {
        setActiveGroup({
          ...groupRes.group,
          myRole: groupRes.currentUserRole,
        });
        setActiveConversation(null);
      }

      if (msgRes.success) {
        setMessages(msgRes.messages || []);
        setPinnedMessages(msgRes.pinnedMessages || []);
      } else {
        showToast(msgRes.message || 'Unable to load group messages.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load group messages.', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedConvId) {
      setSelectedGroupId(null);
      fetchMessages(selectedConvId);
    }
  }, [selectedConvId]);

  useEffect(() => {
    if (selectedGroupId) {
      setSelectedConvId(null);
      fetchGroupMessages(selectedGroupId);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load Group Members for Info Modal
  const loadGroupMembers = async (groupId: string) => {
    try {
      setLoadingGroupMembers(true);
      const res = await api.get<any>(`/groups/${groupId}/members`);
      if (res.success) {
        setGroupMembers(res.members || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load group members.', 'error');
    } finally {
      setLoadingGroupMembers(false);
    }
  };

  // Remote Search
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
        console.error('Remote search error:', err);
      } finally {
        setSearchingRemote(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [convSearch]);

  // Start Chat with User / College
  const handleStartChatWithUser = async (targetId: string, itemType: 'student' | 'college') => {
    try {
      if (itemType === 'student' && (targetId === user?._id || targetId === user?.id)) {
        showToast('Cannot start a conversation with yourself.', 'error');
        return;
      }
      const payload: any = itemType === 'student' ? { targetStudentId: targetId } : { targetCollegeId: targetId };
      if (asCollegeId) {
        payload.asCollegeId = asCollegeId;
      }

      const res = await api.post<any>('/messages/conversations', payload);
      if (res.success && res.conversation) {
        setConvSearch('');
        setRemoteSearchResults({ students: [], colleges: [] });
        setActiveTab('chats');
        setConversations((prev) => {
          const exists = prev.some((c) => c._id === res.conversation._id);
          return exists ? prev : [res.conversation, ...prev];
        });
        setSelectedConvId(res.conversation._id);
      } else {
        showToast(res.message || 'Cannot start conversation due to messaging privacy settings.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to start conversation.', 'error');
    }
  };

  // Send Message (Direct or Group)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed && !attachmentPreview) return;

    try {
      setSending(true);
      let finalAttachmentUrl = attachmentPreview;

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

      if (selectedGroupId) {
        // Group Message Send (Part 5B)
        const res = await api.post<any>(`/groups/${selectedGroupId}/messages`, {
          text: trimmed,
          attachmentUrl: finalAttachmentUrl || undefined,
          attachmentType: finalAttachmentUrl ? 'image' : undefined,
          isAnnouncement: isAnnouncementMode,
        });

        if (res.success && res.message) {
          setMessages((prev) => [...prev, res.message]);
          setInputText('');
          setAttachmentPreview(null);
          setAttachmentFile(null);
          setIsAnnouncementMode(false);
        } else {
          showToast(res.message || 'Failed to deliver group message.', 'error');
        }
      } else if (selectedConvId) {
        // Direct Message Send
        const payload: any = {
          text: trimmed,
          attachmentUrl: finalAttachmentUrl || undefined,
          attachmentType: finalAttachmentUrl ? 'image' : undefined,
        };
        if (asCollegeId) {
          payload.asCollegeId = asCollegeId;
        }

        const res = await api.post<any>(`/messages/conversations/${selectedConvId}`, payload);
        if (res.success && res.message) {
          setMessages((prev) => [...prev, res.message]);
          setInputText('');
          setAttachmentPreview(null);
          setAttachmentFile(null);

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
        } else {
          showToast(res.message || 'Failed to deliver message.', 'error');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to send message.', 'error');
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
        showToast('Only image attachments are supported in messages.', 'error');
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

  // Pin / Unpin Group Message (Part 5B)
  const handleTogglePin = async (messageId: string, currentPinState?: boolean) => {
    if (!selectedGroupId) return;
    try {
      const res = await api.post<any>(`/groups/${selectedGroupId}/messages/${messageId}/pin`, {
        pinned: !currentPinState,
      });
      if (res.success) {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, isPinned: res.isPinned } : m))
        );
        if (res.isPinned) {
          const target = messages.find((m) => m._id === messageId);
          if (target) setPinnedMessages((prev) => [...prev, { ...target, isPinned: true }]);
        } else {
          setPinnedMessages((prev) => prev.filter((m) => m._id !== messageId));
        }
        showToast(res.message);
      } else {
        showToast(res.message || 'Failed to update pin state.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to pin message.', 'error');
    }
  };

  // Execute Confirmed Deletion / Leaving
  const handleConfirmDelete = async () => {
    const { type, messageId, convId, groupId } = deleteConfirmModal;
    setDeleteConfirmModal({ isOpen: false, type: 'for-me' });

    if (type === 'for-everyone' && messageId) {
      try {
        const res = await api.post<any>(`/messages/${messageId}/delete-for-everyone`, {});
        if (res.success) {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === messageId
                ? {
                    ...m,
                    deletedForEveryone: true,
                    text: 'This message was deleted',
                    attachmentUrl: undefined,
                    sharedEvent: null,
                    sharedStudent: null,
                    sharedCollege: null,
                  }
                : m
            )
          );
          showToast('Message deleted for everyone.');
        } else {
          showToast(res.message || 'Failed to delete message for everyone.', 'error');
        }
      } catch (err: any) {
        showToast(err.message || 'Error deleting message.', 'error');
      }
    } else if (type === 'for-me' && messageId) {
      try {
        const res = await api.post<any>(`/messages/${messageId}/delete-for-me`, {});
        if (res.success) {
          setMessages((prev) => prev.filter((m) => m._id !== messageId));
          showToast('Message removed from your view.');
        } else {
          showToast(res.message || 'Failed to remove message.', 'error');
        }
      } catch (err: any) {
        showToast(err.message || 'Error removing message.', 'error');
      }
    } else if (type === 'conversation' && convId) {
      try {
        const res = await api.delete<any>(`/messages/conversations/${convId}`);
        if (res.success) {
          setConversations((prev) => prev.filter((c) => c._id !== convId));
          if (selectedConvId === convId) {
            setSelectedConvId(null);
            setActiveConversation(null);
            setMessages([]);
          }
          showToast('Conversation removed from your inbox.');
        } else {
          showToast(res.message || 'Failed to remove conversation.', 'error');
        }
      } catch (err: any) {
        showToast(err.message || 'Error deleting conversation.', 'error');
      }
    } else if (type === 'leave-group' && groupId) {
      try {
        const res = await api.post<any>(`/groups/${groupId}/leave`, {});
        if (res.success) {
          setGroups((prev) => prev.filter((g) => g._id !== groupId));
          if (selectedGroupId === groupId) {
            setSelectedGroupId(null);
            setActiveGroup(null);
            setMessages([]);
            setShowGroupInfoModal(false);
          }
          showToast('You have left the group.');
        } else {
          showToast(res.message || 'Failed to leave group.', 'error');
        }
      } catch (err: any) {
        showToast(err.message || 'Error leaving group.', 'error');
      }
    }
  };

  const handleClearGroupChat = async () => {
    if (!activeGroup) return;
    try {
      setClearingChat(true);
      const res = await api.post<any>(`/groups/${activeGroup._id}/clear`, {});
      if (res.success) {
        setMessages([]);
        setShowClearChatConfirm(false);
        showToast('Chat history cleared for your account.', 'success');
      } else {
        showToast(res.message || 'Failed to clear chat.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error clearing chat.', 'error');
    } finally {
      setClearingChat(false);
    }
  };

  const isCurrentGroupAdminOrOwner = Boolean(
    activeGroup &&
      (activeGroup.myRole === 'Owner' ||
        activeGroup.myRole === 'Admin' ||
        activeGroup.ownerId === user?._id ||
        activeGroup.createdBy === user?._id)
  );

  return (
    <div className="h-[calc(100vh-120px)] min-h-[550px] max-w-7xl mx-auto rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] overflow-hidden shadow-xs flex flex-col md:flex-row relative">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
          <div
            className={`px-4 py-2 rounded-xl text-xs font-bold border shadow-lg flex items-center gap-2 ${
              toast.type === 'error'
                ? 'bg-red-500/90 text-white border-red-600'
                : toast.type === 'info'
                ? 'bg-blue-600/95 text-white border-blue-700'
                : 'bg-emerald-600/95 text-white border-emerald-700'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* LEFT COLUMN: Sidebar (Navigation & Lists) */}
      <div
        className={`w-full md:w-80 lg:w-88 border-r border-[var(--border-color)] flex flex-col shrink-0 ${
          selectedConvId || selectedGroupId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-[var(--border-color)] flex items-center justify-between gap-3 bg-[var(--surface)]">
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
              {asCollegeId ? `${collegeName || 'Collegiate'} Inbox` : 'Messages & Groups'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {asCollegeId && (
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 text-[10px] font-bold border border-blue-500/20">
                Workspace
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowCreateGroupModal(true)}
              className="px-2.5 py-1 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
              title="Create a new group"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Group</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher: Direct Chats vs Groups */}
        <div className="flex border-b border-[var(--border-color)] bg-[var(--surface)] px-3 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('chats')}
            className={`flex-1 pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'chats'
                ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Direct</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('groups')}
            className={`flex-1 pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'groups'
                ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Groups</span>
            {groups.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[var(--surface-subtle)] text-[10px]">
                {groups.length}
              </span>
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-[var(--border-color)] bg-[var(--surface-subtle)] relative" ref={msgSearchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={convSearch}
              onFocus={() => {
                if (!convSearch.trim()) setShowMsgHistory(true);
              }}
              onChange={(e) => setConvSearch(e.target.value)}
              placeholder={activeTab === 'chats' ? 'Search students or colleges...' : 'Search your groups...'}
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
        </div>

        {/* Feed List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-color)]">
          {loadingList ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-color)]" />
              <p className="text-xs text-[var(--text-muted)]">Loading...</p>
            </div>
          ) : activeTab === 'groups' ? (
            // GROUPS TAB LIST
            groups.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <Users className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-40" />
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">No groups joined yet</h4>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-0.5">
                    Start a study group, hackathon team, or campus circle.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(true)}
                  className="px-4 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer active:scale-95 mx-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Your First Group</span>
                </button>
              </div>
            ) : (
              groups
                .filter((g) => !convSearch.trim() || g.name.toLowerCase().includes(convSearch.toLowerCase()))
                .map((g) => {
                  const isSelected = selectedGroupId === g._id;
                  return (
                    <div
                      key={g._id}
                      onClick={() => {
                        setSelectedConvId(null);
                        setSelectedGroupId(g._id);
                      }}
                      className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[var(--primary-light)] border-l-4 border-[var(--primary-color)]'
                          : 'hover:bg-[var(--surface-subtle)]'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-black text-sm flex items-center justify-center shrink-0 border border-[var(--border-color)]">
                        {g.imageUrl ? (
                          <img src={g.imageUrl} alt={g.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          g.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="grow min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="text-xs font-bold truncate text-[var(--text-primary)]">
                            {g.name}
                          </p>
                          <span
                            className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-sm shrink-0 ${
                              g.type === 'Event'
                                ? 'bg-purple-500/10 text-purple-600'
                                : 'bg-[var(--surface-subtle)] text-[var(--text-muted)]'
                            }`}
                          >
                            {g.type === 'Event' ? '📅 Event Group' : 'Group'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1 text-[11px] text-[var(--text-muted)]">
                          <span className="truncate">{g.category || 'General'}</span>
                          <span className="shrink-0">{g.membersCount || 1} members</span>
                        </div>
                      </div>
                    </div>
                  );
                })
            )
          ) : (
            // DIRECT CHATS TAB LIST
            conversations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-40" />
                <h4 className="text-xs font-bold text-[var(--text-primary)]">No messages yet</h4>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Search students or colleges above to start messaging.
                </p>
              </div>
            ) : (
              conversations
                .filter((c) => {
                  if (!convSearch.trim()) return true;
                  const name = c.otherParticipant?.name?.toLowerCase() || '';
                  const username = c.otherParticipant?.username?.toLowerCase() || '';
                  return name.includes(convSearch.toLowerCase()) || username.includes(convSearch.toLowerCase());
                })
                .map((c) => {
                  const other = c.otherParticipant;
                  const isSelected = selectedConvId === c._id;
                  const unread = c.unreadCount || 0;

                  return (
                    <div
                      key={c._id}
                      onClick={() => {
                        setSelectedGroupId(null);
                        setSelectedConvId(c._id);
                      }}
                      className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[var(--primary-light)] border-l-4 border-[var(--primary-color)]'
                          : 'hover:bg-[var(--surface-subtle)]'
                      }`}
                    >
                      <img
                        src={other?.avatar || DEFAULT_STUDENT_AVATAR}
                        alt={other?.name || 'User'}
                        className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                        onError={(e) => {
                          (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                        }}
                      />
                      <div className="grow min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className={`text-xs font-bold truncate text-[var(--text-primary)]`}>
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
                          <p className={`text-[11px] truncate text-[var(--text-muted)]`}>
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
            )
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Chat Panel (Direct or Group) */}
      <div
        className={`flex-1 flex flex-col min-w-0 bg-[var(--surface)] ${
          selectedConvId || selectedGroupId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {selectedGroupId && activeGroup ? (
          // ================= GROUP CHAT VIEW (Part 5B) =================
          <>
            {/* Group Header */}
            <div className="p-3.5 border-b border-[var(--border-color)] flex items-center justify-between gap-3 bg-[var(--surface)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedGroupId(null)}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] md:hidden cursor-pointer"
                  title="Back to groups"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div
                  onClick={() => {
                    loadGroupMembers(activeGroup._id);
                    setShowGroupInfoModal(true);
                  }}
                  className="flex items-center gap-2.5 cursor-pointer group min-w-0"
                >
                  <div className="w-9 h-9 rounded-xl bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-black text-sm flex items-center justify-center shrink-0 border border-[var(--border-color)]">
                    {activeGroup.imageUrl ? (
                      <img src={activeGroup.imageUrl} alt={activeGroup.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      activeGroup.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--primary-color)] transition-colors">
                        {activeGroup.name}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                          activeGroup.type === 'Event'
                            ? 'bg-purple-500/10 text-purple-600'
                            : 'bg-blue-500/10 text-blue-600'
                        }`}
                      >
                        {activeGroup.type === 'Event' ? '📅 Event Group' : (activeGroup.type || 'Custom')}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                      <span>{activeGroup.membersCount || 1} members</span>
                      <span>·</span>
                      <span className="font-semibold text-[var(--primary-color)]">
                        {activeGroup.myRole || 'Member'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Group Info / Actions */}
              <div className="flex items-center gap-1 relative">
                <button
                  type="button"
                  onClick={() => {
                    loadGroupMembers(activeGroup._id);
                    setShowGroupInfoModal(true);
                  }}
                  className="p-2 rounded-xl hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  title="Group Info"
                >
                  <Info className="w-4 h-4" />
                </button>

                {/* 3-Dot Group Chat Menu (Requirements 1, 4) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowGroupHeaderMenu(!showGroupHeaderMenu)}
                    className="p-2 rounded-xl hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    title="More Options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {showGroupHeaderMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setShowGroupHeaderMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-1.5 w-52 bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl shadow-xl py-1.5 z-40 text-xs animate-in fade-in slide-in-from-top-1">
                        {/* Group Info */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowGroupHeaderMenu(false);
                            loadGroupMembers(activeGroup._id);
                            setShowGroupInfoModal(true);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] flex items-center gap-2.5 cursor-pointer font-medium"
                        >
                          <Info className="w-4 h-4 text-[var(--primary-color)]" />
                          <span>Group Info</span>
                        </button>

                        {/* Chat Settings */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowGroupHeaderMenu(false);
                            setShowChatSettingsModal(true);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] flex items-center gap-2.5 cursor-pointer font-medium"
                        >
                          <Settings className="w-4 h-4 text-[var(--text-muted)]" />
                          <span>Chat Settings</span>
                        </button>

                        {/* Owner / Admin Only Actions */}
                        {isCurrentGroupAdminOrOwner && (
                          <>
                            <div className="my-1 border-t border-[var(--border-color)]" />
                            <button
                              type="button"
                              onClick={() => {
                                setShowGroupHeaderMenu(false);
                                loadGroupMembers(activeGroup._id);
                                setShowGroupInfoModal(true);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] flex items-center gap-2.5 cursor-pointer font-medium"
                            >
                              <Users className="w-4 h-4 text-blue-500" />
                              <span>Manage Members</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setShowGroupHeaderMenu(false);
                                setShowEditGroupModal(true);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] flex items-center gap-2.5 cursor-pointer font-medium"
                            >
                              <Edit3 className="w-4 h-4 text-amber-500" />
                              <span>Edit Group</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setShowGroupHeaderMenu(false);
                                setShowChatSettingsModal(true);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] flex items-center gap-2.5 cursor-pointer font-medium"
                            >
                              <Shield className="w-4 h-4 text-emerald-500" />
                              <span>Group Permissions</span>
                            </button>
                          </>
                        )}

                        <div className="my-1 border-t border-[var(--border-color)]" />

                        {/* Clear Chat */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowGroupHeaderMenu(false);
                            setShowClearChatConfirm(true);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-amber-500/10 text-amber-600 flex items-center gap-2.5 cursor-pointer font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Clear Chat</span>
                        </button>

                        {/* Leave Group */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowGroupHeaderMenu(false);
                            setDeleteConfirmModal({
                              isOpen: true,
                              type: 'leave-group',
                              groupId: activeGroup._id,
                            });
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-red-500/10 text-red-600 flex items-center gap-2.5 cursor-pointer font-medium"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Leave Group</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Event Group Lifecycle Notice (Part 5C) */}
            {activeGroup.type === 'Event' &&
              (activeGroup.isReadOnly ||
                activeGroup.lifecycleStatus === 'Completed' ||
                activeGroup.lifecycleStatus === 'Cancelled') && (
                <div className="px-4 py-2 border-b border-amber-500/20 bg-amber-500/10 flex items-center gap-2 text-xs text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-semibold">
                    This event has concluded ({activeGroup.lifecycleStatus || 'Completed'}). Group chat is archived and read-only.
                  </span>
                </div>
              )}

            {/* Pinned Messages Bar (Part 5B: Requirement 10) */}
            {pinnedMessages.length > 0 && (
              <div className="px-4 py-2 border-b border-[var(--border-color)] bg-amber-500/10 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Pin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="font-bold text-amber-900 shrink-0">Pinned:</span>
                  <p className="text-amber-800 truncate">
                    {pinnedMessages[pinnedMessages.length - 1].text}
                  </p>
                </div>
                {isCurrentGroupAdminOrOwner && (
                  <button
                    type="button"
                    onClick={() =>
                      handleTogglePin(pinnedMessages[pinnedMessages.length - 1]._id, true)
                    }
                    className="text-[10px] text-amber-900 font-bold hover:underline cursor-pointer shrink-0"
                  >
                    Unpin
                  </button>
                )}
              </div>
            )}

            {/* Group Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[var(--surface-subtle)]/40">
              {loadingMessages ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-color)]" />
                  <p className="text-xs text-[var(--text-muted)]">Loading group messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <Users className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-40" />
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">
                    No messages yet in this group. Say hello!
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.senderId === user?._id;
                  const isDeleted = Boolean(m.deletedForEveryone);
                  const isAnnouncement = Boolean(m.isAnnouncement);

                  return (
                    <div
                      key={m._id}
                      className={`flex flex-col group relative ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-start gap-1.5 max-w-[90%] sm:max-w-md">
                        {/* Sender avatar for other's message */}
                        {!isMine && (
                          <img
                            src={m.senderAvatar || DEFAULT_STUDENT_AVATAR}
                            alt={m.senderName}
                            className="w-7 h-7 rounded-full object-cover shrink-0 mt-1 border border-[var(--border-color)]"
                            onError={(e) => {
                              (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                            }}
                          />
                        )}

                        {/* Action Trigger for own message */}
                        {isMine && !isDeleted && (
                          <div className="relative message-action-menu-container mt-1">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMenuMsgId(activeMenuMsgId === m._id ? null : m._id)
                              }
                              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer opacity-70 group-hover:opacity-100 transition-opacity"
                              title="Message options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {activeMenuMsgId === m._id && (
                              <div className="absolute right-0 bottom-full mb-1 z-30 w-44 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] shadow-lg p-1 text-xs">
                                {isCurrentGroupAdminOrOwner && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuMsgId(null);
                                      handleTogglePin(m._id, m.isPinned);
                                    }}
                                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] flex items-center gap-2 cursor-pointer"
                                  >
                                    <Pin className="w-3.5 h-3.5 text-amber-500" />
                                    <span>{m.isPinned ? 'Unpin message' : 'Pin message'}</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuMsgId(null);
                                    setDeleteConfirmModal({
                                      isOpen: true,
                                      type: 'for-me',
                                      messageId: m._id,
                                    });
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>Delete for me</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuMsgId(null);
                                    setDeleteConfirmModal({
                                      isOpen: true,
                                      type: 'for-everyone',
                                      messageId: m._id,
                                    });
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-red-600 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer font-medium"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  <span>Delete for everyone</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 shadow-2xs space-y-1.5 ${
                            isAnnouncement
                              ? 'bg-amber-500/15 border-2 border-amber-500 text-[var(--text-primary)] rounded-xl'
                              : isMine
                              ? 'bg-[var(--primary-color)] text-[var(--primary-text)] rounded-br-xs'
                              : 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-bl-xs'
                          }`}
                        >
                          {/* Announcement banner tag */}
                          {isAnnouncement && (
                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1">
                              <Megaphone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Official Announcement</span>
                            </div>
                          )}

                          {/* Sender name for group */}
                          {!isMine && !isDeleted && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-[var(--primary-color)]">
                                {m.senderName}
                              </span>
                              {m.senderRole && m.senderRole !== 'Member' && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-xs bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border-color)]">
                                  {m.senderRole}
                                </span>
                              )}
                            </div>
                          )}

                          {isDeleted ? (
                            <p className="text-xs italic opacity-75">This message was deleted</p>
                          ) : (
                            <>
                              {m.text && (
                                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                                  {m.text}
                                </p>
                              )}

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
                            </>
                          )}

                          {/* Timestamp & Pin status */}
                          <div
                            className={`flex items-center justify-end gap-1.5 text-[10px] mt-1 ${
                              isMine && !isAnnouncement
                                ? 'text-white/80'
                                : 'text-[var(--text-muted)]'
                            }`}
                          >
                            {m.isPinned && !isDeleted && (
                              <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                                <Pin className="w-2.5 h-2.5" /> Pinned
                              </span>
                            )}
                            <span>
                              {new Date(m.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Action trigger for received message */}
                        {!isMine && !isDeleted && (
                          <div className="relative message-action-menu-container mt-1">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMenuMsgId(activeMenuMsgId === m._id ? null : m._id)
                              }
                              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer opacity-70 group-hover:opacity-100 transition-opacity"
                              title="Message options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {activeMenuMsgId === m._id && (
                              <div className="absolute left-0 bottom-full mb-1 z-30 w-36 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] shadow-lg p-1 text-xs">
                                {isCurrentGroupAdminOrOwner && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuMsgId(null);
                                      handleTogglePin(m._id, m.isPinned);
                                    }}
                                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] flex items-center gap-2 cursor-pointer"
                                  >
                                    <Pin className="w-3.5 h-3.5 text-amber-500" />
                                    <span>{m.isPinned ? 'Unpin' : 'Pin'}</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuMsgId(null);
                                    setDeleteConfirmModal({
                                      isOpen: true,
                                      type: 'for-me',
                                      messageId: m._id,
                                    });
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>Delete for me</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Group Composer */}
            <div className="p-3 border-t border-[var(--border-color)] bg-[var(--surface)] space-y-2">
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

              {activeGroup?.type === 'Event' &&
              (activeGroup.isReadOnly ||
                activeGroup.lifecycleStatus === 'Completed' ||
                activeGroup.lifecycleStatus === 'Cancelled') &&
              !isCurrentGroupAdminOrOwner ? (
                <div className="py-2.5 px-4 rounded-xl bg-[var(--surface-subtle)] text-center text-xs font-semibold text-[var(--text-muted)] flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>This event group is read-only because the event has completed or concluded.</span>
                </div>
              ) : activeGroup?.chatPermissions === 'Admins Only' && !isCurrentGroupAdminOrOwner ? (
                <div className="py-2.5 px-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-color)] text-center text-xs font-semibold text-[var(--text-muted)] flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Only admins can send messages in this group.</span>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
                    title="Attach Image"
                  >
                    <Image className="w-4 h-4" />
                  </button>

                  {/* Announcement Mode Toggle for Owner/Admin */}
                  {isCurrentGroupAdminOrOwner && (
                    <button
                      type="button"
                      onClick={() => setIsAnnouncementMode(!isAnnouncementMode)}
                      className={`p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 flex items-center gap-1 text-xs font-bold ${
                        isAnnouncementMode
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--surface-subtle)]'
                      }`}
                      title="Announcement Mode"
                    >
                      <Megaphone className="w-4 h-4" />
                      <span className="hidden sm:inline">Announcement</span>
                    </button>
                  )}

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      isAnnouncementMode ? 'Broadcast an announcement...' : 'Message group...'
                    }
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:bg-[var(--surface)] focus:border-[var(--primary-color)] text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden transition-all"
                  />

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
              )}
            </div>
          </>
        ) : selectedConvId && activeConversation ? (
          // ================= DIRECT CHAT VIEW =================
          <>
            {/* Direct Header */}
            <div className="p-3.5 border-b border-[var(--border-color)] flex items-center justify-between gap-3 bg-[var(--surface)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedConvId(null)}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] md:hidden cursor-pointer"
                  title="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div
                  onClick={() => {
                    const other = activeConversation.otherParticipant;
                    if (other?.collegeId && onViewCollege) {
                      onViewCollege(other.collegeId);
                    } else if (other?.userId && onViewStudent) {
                      onViewStudent(other.userId);
                    }
                  }}
                  className="flex items-center gap-2.5 cursor-pointer group min-w-0"
                >
                  <img
                    src={activeConversation.otherParticipant?.avatar || DEFAULT_STUDENT_AVATAR}
                    alt="Recipient Avatar"
                    className="w-9 h-9 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                    onError={(e) => {
                      (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--primary-color)] transition-colors">
                      {activeConversation.otherParticipant?.name}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      <span>{activeConversation.otherParticipant?.role || 'Direct Message'}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteConfirmModal({
                      isOpen: true,
                      type: 'conversation',
                      convId: selectedConvId,
                    })
                  }
                  className="p-2 rounded-xl hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 cursor-pointer"
                  title="Delete Conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Direct Messages Feed */}
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
                  const isDeleted = Boolean(m.deletedForEveryone);
                  return (
                    <div
                      key={m._id}
                      className={`flex flex-col group relative ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 max-w-[90%] sm:max-w-md">
                        {isMine && !isDeleted && (
                          <div className="relative message-action-menu-container">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMenuMsgId(activeMenuMsgId === m._id ? null : m._id)
                              }
                              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer opacity-70 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {activeMenuMsgId === m._id && (
                              <div className="absolute right-0 bottom-full mb-1 z-30 w-44 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] shadow-lg p-1 text-xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuMsgId(null);
                                    setDeleteConfirmModal({
                                      isOpen: true,
                                      type: 'for-me',
                                      messageId: m._id,
                                    });
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>Delete for me</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuMsgId(null);
                                    setDeleteConfirmModal({
                                      isOpen: true,
                                      type: 'for-everyone',
                                      messageId: m._id,
                                    });
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-red-600 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer font-medium"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  <span>Delete for everyone</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        <div
                          className={`rounded-2xl px-3.5 py-2.5 shadow-2xs space-y-1.5 ${
                            isMine
                              ? 'bg-[var(--primary-color)] text-[var(--primary-text)] rounded-br-xs'
                              : 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-bl-xs'
                          }`}
                        >
                          {isDeleted ? (
                            <p className="text-xs italic opacity-75">This message was deleted</p>
                          ) : (
                            <>
                              {m.text && (
                                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                                  {m.text}
                                </p>
                              )}
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
                            </>
                          )}
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
                          </div>
                        </div>

                        {!isMine && !isDeleted && (
                          <div className="relative message-action-menu-container">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMenuMsgId(activeMenuMsgId === m._id ? null : m._id)
                              }
                              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer opacity-70 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {activeMenuMsgId === m._id && (
                              <div className="absolute left-0 bottom-full mb-1 z-30 w-36 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] shadow-lg p-1 text-xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuMsgId(null);
                                    setDeleteConfirmModal({
                                      isOpen: true,
                                      type: 'for-me',
                                      messageId: m._id,
                                    });
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>Delete for me</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Direct Composer */}
            <div className="p-3 border-t border-[var(--border-color)] bg-[var(--surface)] space-y-2">
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
                  title="Attach Image"
                >
                  <Image className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Message..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:bg-[var(--surface)] focus:border-[var(--primary-color)] text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden transition-all"
                />

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
          // ================= REDESIGNED CAMPUS CHAT EMPTY STATE =================
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center select-none animate-in fade-in duration-300">
            <div className="max-w-md mx-auto space-y-4">
              <ChatEmptyIllustration className="w-56 h-40 sm:w-64 sm:h-44" />

              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] tracking-tight">
                  Campus Chats & Collaboration
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-sm mx-auto">
                  Select a direct conversation or event group to coordinate with teammates, discuss project ideas, and receive official campus announcements.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-color)] font-medium">
                  Direct Messages
                </span>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-color)] font-medium">
                  Event Team Groups
                </span>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-color)] font-medium">
                  Announcements
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GROUP INFO MODAL (Requirements 2, 3, 8) */}
      {showGroupInfoModal && activeGroup && (
        <GroupInfoModal
          isOpen={showGroupInfoModal}
          onClose={() => setShowGroupInfoModal(false)}
          group={activeGroup}
          members={groupMembers}
          loadingMembers={loadingGroupMembers}
          currentUserId={user?._id || ''}
          myRole={activeGroup.myRole || 'Member'}
          onMemberUpdated={() => {
            loadGroupMembers(activeGroup._id);
            fetchGroups();
          }}
          onOpenChatSettings={() => {
            setShowGroupInfoModal(false);
            setShowChatSettingsModal(true);
          }}
          onOpenEditGroup={() => {
            setShowGroupInfoModal(false);
            setShowEditGroupModal(true);
          }}
          onLeaveGroup={() => {
            setShowGroupInfoModal(false);
            setDeleteConfirmModal({
              isOpen: true,
              type: 'leave-group',
              groupId: activeGroup._id,
            });
          }}
          onClearChat={() => {
            setShowGroupInfoModal(false);
            setShowClearChatConfirm(true);
          }}
          showToast={showToast}
        />
      )}

      {/* CHAT SETTINGS MODAL (Requirements 1, 5) */}
      {showChatSettingsModal && activeGroup && (
        <ChatSettingsModal
          isOpen={showChatSettingsModal}
          onClose={() => setShowChatSettingsModal(false)}
          group={activeGroup}
          myRole={activeGroup.myRole || 'Member'}
          initialMuted={Boolean(activeGroup.notificationsMuted)}
          onGroupUpdated={(updated) => {
            setActiveGroup((prev: any) => (prev ? { ...prev, ...updated } : updated));
            setGroups((prev) => prev.map((g) => (g._id === updated._id ? { ...g, ...updated } : g)));
          }}
          onOpenClearChat={() => {
            setShowChatSettingsModal(false);
            setShowClearChatConfirm(true);
          }}
          showToast={showToast}
        />
      )}

      {/* EDIT GROUP MODAL (Requirements 1, 3, 4) */}
      {showEditGroupModal && activeGroup && (
        <EditGroupModal
          isOpen={showEditGroupModal}
          onClose={() => setShowEditGroupModal(false)}
          group={activeGroup}
          onGroupUpdated={(updated) => {
            setActiveGroup((prev: any) => (prev ? { ...prev, ...updated } : updated));
            setGroups((prev) => prev.map((g) => (g._id === updated._id ? { ...g, ...updated } : g)));
          }}
          showToast={showToast}
        />
      )}

      {/* CLEAR CHAT CONFIRMATION MODAL (Requirement 6) */}
      {showClearChatConfirm && activeGroup && (
        <Modal
          isOpen={showClearChatConfirm}
          onClose={() => setShowClearChatConfirm(false)}
          title="Clear Chat History"
          maxWidth="sm"
        >
          <div className="space-y-3 py-1">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to clear your chat history for{' '}
              <span className="font-bold text-[var(--text-primary)]">{activeGroup.name}</span>?
            </p>
            <p className="text-[11px] text-[var(--text-muted)] bg-[var(--surface-subtle)] p-2.5 rounded-xl border border-[var(--border-color)]">
              This will only clear messages for your account. Messages will remain visible to other group members.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setShowClearChatConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={clearingChat}
                onClick={handleClearGroupChat}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {clearingChat && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Clear Chat</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* In-App Confirmation Modal */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {deleteConfirmModal.type === 'for-everyone'
                  ? 'Delete message for everyone?'
                  : deleteConfirmModal.type === 'conversation'
                  ? 'Delete this conversation?'
                  : deleteConfirmModal.type === 'leave-group'
                  ? 'Leave this group?'
                  : 'Delete message for you?'}
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {deleteConfirmModal.type === 'for-everyone'
                  ? 'This message will be removed for everyone. A neutral notice indicating the message was deleted will be displayed.'
                  : deleteConfirmModal.type === 'conversation'
                  ? 'This conversation will be hidden from your inbox.'
                  : deleteConfirmModal.type === 'leave-group'
                  ? 'You will lose access to group messages and announcements until re-added.'
                  : 'This message will be removed from your view only.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ isOpen: false, type: 'for-me' })}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95"
              >
                {deleteConfirmModal.type === 'for-everyone'
                  ? 'Delete for Everyone'
                  : deleteConfirmModal.type === 'conversation'
                  ? 'Delete Conversation'
                  : deleteConfirmModal.type === 'leave-group'
                  ? 'Leave Group'
                  : 'Delete for Me'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE GROUP MODAL (Requirements 1, 2, 3) */}
      {showCreateGroupModal && (
        <CreateGroupModal
          isOpen={showCreateGroupModal}
          onClose={() => setShowCreateGroupModal(false)}
          onGroupCreated={(newGroup) => {
            setShowCreateGroupModal(false);
            setGroups((prev) => [newGroup, ...prev.filter((g) => g._id !== newGroup._id)]);
            setActiveTab('groups');
            setSelectedGroupId(newGroup._id);
            setSelectedConvId(null);
            showToast(`Group "${newGroup.name}" created!`, 'success');
          }}
        />
      )}
    </div>
  );
};
