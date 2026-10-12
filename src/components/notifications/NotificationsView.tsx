import React, { useState } from 'react';
import { AppNotification, NotificationType } from '../../types';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  LogIn, 
  Home, 
  CheckCircle2, 
  HelpCircle, 
  Heart,
  Sparkles
} from 'lucide-react';

interface NotificationsViewProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onNavigateHome: () => void;
  onSelectRoom?: (roomId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onNavigateHome
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'listings' | 'system'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'listings') return n.type === 'room_listed' || n.type === 'room_booked' || n.type === 'availability_check';
    if (filter === 'system') return n.type === 'login' || n.type === 'notice';
    return true;
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'login':
        return <LogIn className="w-4 h-4 text-teal-800" />;
      case 'room_listed':
        return <Home className="w-4 h-4 text-emerald-700" />;
      case 'room_booked':
        return <CheckCircle2 className="w-4 h-4 text-amber-700" />;
      case 'availability_check':
        return <HelpCircle className="w-4 h-4 text-rose-700" />;
      case 'favorite':
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case 'notice':
      default:
        return <Sparkles className="w-4 h-4 text-[#8A4A4D]" />;
    }
  };

  const formatRelativeTime = (timestampStr: string): string => {
    try {
      const then = new Date(timestampStr).getTime();
      const now = Date.now();
      const diffSec = Math.floor((now - then) / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      const diffDays = Math.floor(diffHour / 24);
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div 
        style={{ backgroundColor: '#FFFFFF' }}
        className="p-5 sm:p-6 rounded-3xl border border-[#ECC5C6] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#ECC5C6] text-[#4A282A] flex items-center justify-center relative shadow-xs">
            <Bell className="w-6 h-6 stroke-[2.2]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-xs">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#382022] tracking-tight">
              Activity &amp; Notices
            </h2>
            <p className="text-xs text-[#7A595B] mt-0.5">
              Stay updated on room postings, availability checks, account logins &amp; platform notices
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="px-3 py-1.5 rounded-xl border border-[#ECC5C6] hover:bg-[#F5E9E7] text-[#4A282A] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-500 hover:text-stone-800 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['all', 'unread', 'listings', 'system'] as const).map(tabKey => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setFilter(tabKey)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
              filter === tabKey
                ? 'bg-[#4A282A] text-white shadow-xs'
                : 'bg-white text-stone-600 border border-[#ECC5C6] hover:bg-[#F5E9E7]'
            }`}
          >
            {tabKey === 'all' && `All (${notifications.length})`}
            {tabKey === 'unread' && `Unread (${unreadCount})`}
            {tabKey === 'listings' && 'Room Listings'}
            {tabKey === 'system' && 'Logins & Notices'}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#ECC5C6] shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#F5E9E7] text-[#7A595B] flex items-center justify-center mx-auto mb-3">
            <Bell className="w-7 h-7 stroke-[1.8]" />
          </div>
          <h3 className="font-bold text-[#382022] text-sm">No notifications found</h3>
          <p className="text-xs text-[#7A595B] max-w-xs mx-auto mt-1">
            {filter === 'unread' 
              ? "You've read all your notifications. New notices and updates will show up here."
              : "You're all caught up! New updates, logins, and room notifications will appear here."}
          </p>
          <button
            onClick={onNavigateHome}
            className="mt-4 px-4 py-2 bg-[#4A282A] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#381E20] transition-colors cursor-pointer"
          >
            Explore Available Rooms
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(notif => (
            <div
              key={notif.id}
              onClick={() => onMarkAsRead(notif.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 relative ${
                notif.read
                  ? 'bg-white/80 border-[#ECC5C6]/60 hover:bg-white'
                  : 'bg-white border-[#ECC5C6] shadow-xs ring-1 ring-[#ECC5C6]/40'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                notif.read ? 'bg-[#F5E9E7]' : 'bg-[#ECC5C6]'
              }`}>
                {getNotificationIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-sm tracking-tight truncate ${
                    notif.read ? 'font-semibold text-stone-800' : 'font-bold text-[#382022]'
                  }`}>
                    {notif.title}
                  </h4>
                  <span className="text-[10px] text-stone-400 font-medium shrink-0">
                    {formatRelativeTime(notif.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                  {notif.message}
                </p>
              </div>

              {!notif.read && (
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 self-center" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
