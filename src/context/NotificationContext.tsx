import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { INotification } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notificationService';

interface NotificationContextType {
  notifications: INotification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  clearSelected: (ids: string[]) => Promise<void>;
  markSelectedAsRead: (ids: string[]) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, status } = useAuth();
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialFetchDone = useRef<boolean>(false);

  const isFetchingRef = useRef<boolean>(false);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('eventhub_token');
    if (!user || !isAuthenticated || status !== 'authenticated' || !token) {
      setNotifications([]);
      setUnreadCount(0);
      seenIdsRef.current.clear();
      initialFetchDone.current = false;
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setLoading(true);
      const res = await api.get<any>('/notifications');
      if (res.success) {
        const fetchedList: INotification[] = res.notifications || [];
        setNotifications(fetchedList);
        setUnreadCount(res.unreadCount || 0);

        if (!initialFetchDone.current) {
          // Record existing notification IDs on initial mount
          fetchedList.forEach((n) => seenIdsRef.current.add(n._id));
          initialFetchDone.current = true;
        } else {
          // Detect brand new notifications that arrive while active
          fetchedList.forEach((n) => {
            if (!seenIdsRef.current.has(n._id)) {
              seenIdsRef.current.add(n._id);
              if (!n.read) {
                notificationService.notify(n.title, {
                  body: n.message,
                  playSound: true,
                });
              }
            }
          });
        }
      }
    } catch (err: any) {
      if (err?.status !== 401) {
        console.warn('Failed to fetch notifications', err);
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && user?._id && localStorage.getItem('eventhub_token')) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 20000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      seenIdsRef.current.clear();
      initialFetchDone.current = false;
    }
  }, [user?._id, isAuthenticated, status]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      if (id === 'all') {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      } else {
        setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error('Failed to mark notification read', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/all/read');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all notifications read', e);
    }
  };

  const clearAll = async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to clear notifications', e);
    }
  };

  const clearSelected = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    try {
      const res = await api.delete<any>('/notifications/batch', {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      setNotifications((prev) => prev.filter((n) => !ids.includes(n._id)));
      if (typeof res?.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      } else {
        setNotifications((prev) => {
          setUnreadCount(prev.filter((n) => !n.read).length);
          return prev;
        });
      }
    } catch (e) {
      console.error('Failed to clear selected notifications', e);
    }
  };

  const markSelectedAsRead = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    try {
      const res = await api.patch<any>('/notifications/batch/read', { ids });
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n._id) ? { ...n, read: true } : n))
      );
      if (typeof res?.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      } else {
        setNotifications((prev) => {
          setUnreadCount(prev.filter((n) => !n.read).length);
          return prev;
        });
      }
    } catch (e) {
      console.error('Failed to mark selected notifications read', e);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        clearAll,
        clearSelected,
        markSelectedAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
}
