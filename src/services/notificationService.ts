import { AppNotification, NotificationType } from '../types';

const NOTIFICATIONS_STORAGE_KEY = 'khojam_app_notifications';

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_welcome',
    type: 'notice',
    title: 'Welcome to Khojamm!',
    message: 'Explore verified rental rooms across Nepal or post your room in seconds.',
    timestamp: new Date().toISOString(),
    read: false
  },
  {
    id: 'notif_direct_contact',
    type: 'notice',
    title: 'Direct Landlord Contacts',
    message: 'No middleman fees. You can call or message property owners directly using their verified contact numbers.',
    timestamp: new Date(Date.now() - 3600 * 1000).toISOString(),
    read: false
  },
  {
    id: 'notif_freshness',
    type: 'notice',
    title: 'Verified 30-Day Freshness',
    message: 'Khojamm automatically checks room availability with owners every 24 hours after 5 days so you only see active rooms.',
    timestamp: new Date(Date.now() - 7200 * 1000).toISOString(),
    read: true
  }
];

class NotificationService {
  private listeners: ((notifications: AppNotification[]) => void)[] = [];

  private getStored(): AppNotification[] {
    try {
      const data = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(DEFAULT_NOTIFICATIONS));
      return DEFAULT_NOTIFICATIONS;
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  }

  private save(list: AppNotification[]) {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
      this.notify(list);
    } catch (err) {
      console.error('Error saving notifications:', err);
    }
  }

  private notify(list: AppNotification[]) {
    this.listeners.forEach(fn => fn(list));
  }

  subscribe(listener: (notifications: AppNotification[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStored());
    return () => {
      this.listeners = this.listeners.filter(fn => fn !== listener);
    };
  }

  getAll(): AppNotification[] {
    return this.getStored();
  }

  getUnreadCount(): number {
    return this.getStored().filter(n => !n.read).length;
  }

  add(type: NotificationType, title: string, message: string, roomId?: string, userId?: string) {
    const list = this.getStored();
    const newNotif: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      roomId
    };
    const updated = [newNotif, ...list];
    this.save(updated);
    return newNotif;
  }

  markAsRead(id: string) {
    const list = this.getStored();
    const updated = list.map(n => n.id === id ? { ...n, read: true } : n);
    this.save(updated);
  }

  markAllAsRead() {
    const list = this.getStored();
    const updated = list.map(n => ({ ...n, read: true }));
    this.save(updated);
  }

  deleteNotification(id: string) {
    const list = this.getStored();
    const updated = list.filter(n => n.id !== id);
    this.save(updated);
  }

  clearAll() {
    this.save([]);
  }
}

export const notificationService = new NotificationService();
