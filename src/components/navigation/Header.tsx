import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AppLogo } from '../common/AppLogo';
import { 
  Home, 
  Search, 
  Heart, 
  Layers, 
  Bell, 
  User, 
  LogOut,
  Shield
} from 'lucide-react';

export type NavTab = 'home' | 'search' | 'saved' | 'my-listings' | 'notifications' | 'profile' | 'about';

interface HeaderProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAuth: () => void;
  onOpenAdmin: () => void;
  savedCount?: number;
  myListingsCount?: number;
  unreadNoticesCount?: number;
  customLogoUrl?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onOpenAuth,
  onOpenAdmin,
  savedCount = 0,
  myListingsCount = 0,
  unreadNoticesCount = 0,
  customLogoUrl
}) => {
  const { currentUser, logout, isAdmin } = useAuth();

  // Secret 7-tap counter to unlock / open Admin Panel
  const [tapCount, setTapCount] = useState(0);
  const [unlockFeedback, setUnlockFeedback] = useState(false);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoTap = () => {
    const next = tapCount + 1;
    if (next >= 7) {
      setTapCount(0);
      setUnlockFeedback(true);
      setTimeout(() => setUnlockFeedback(false), 2500);
      onOpenAdmin();
    } else {
      setTapCount(next);
    }

    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }
    tapTimerRef.current = setTimeout(() => {
      setTapCount(0);
    }, 2500);
  };

  const navTabs = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'search' as NavTab, label: 'Search', icon: Search },
    { id: 'saved' as NavTab, label: 'Saved', icon: Heart, badge: savedCount },
    ...(currentUser && myListingsCount > 0 ? [{ id: 'my-listings' as NavTab, label: 'My Listing', icon: Layers, badge: myListingsCount }] : []),
    { id: 'notifications' as NavTab, label: 'Notices', icon: Bell, badge: unreadNoticesCount },
    { id: 'profile' as NavTab, label: 'Profile', icon: User }
  ];

  const handleSelectTab = (tab: NavTab) => {
    onTabChange(tab);
  };

  return (
    <header  style={{ paddingTop: 'var(--safe-top)' }} className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#ECC5C6] shadow-xs select-none w-full max-w-full overflow-x-hidden ">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 min-h-[64px] sm:min-h-[70px] py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 w-full">
        {/* Logo with Quote and Secret 7-tap trigger */}
        <div className="relative min-w-0 flex items-center shrink-0">
          <AppLogo
            iconUrl={customLogoUrl}
            size="md"
            showName={true}
            showQuote={true}
            onClick={handleLogoTap}
          />
          {tapCount > 2 && (
            <span className="absolute -bottom-5 left-0 text-[10px] font-bold text-[#8A4A4D] bg-[#ECC5C6] px-1.5 py-0.5 rounded-full animate-pulse shadow-xs z-20">
              {7 - tapCount} more taps to Admin
            </span>
          )}
          {unlockFeedback && (
            <span className="absolute -bottom-6 left-0 text-[10px] font-bold text-white bg-[#4A282A] px-2 py-0.5 rounded-md shadow-md animate-bounce z-20">
              Admin Panel Unlocked!
            </span>
          )}
        </div>

        {/* Desktop Navigation Bar (>= md) */}
        <div className="hidden md:flex items-center gap-1 sm:gap-1.5 py-1">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`relative flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#ECC5C6] text-[#4A282A] border border-[#DEACAE] shadow-xs'
                    : 'text-[#7A595B] hover:text-[#4A282A] hover:bg-[#F5E9E7] border border-transparent'
                }`}
                title={tab.label}
              >
                <div className="relative flex items-center justify-center">
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                  {typeof tab.badge === 'number' && tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-3.5 rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center shadow-xs">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="tracking-tight text-[11px] sm:text-xs">
                  {tab.label}
                </span>
              </button>
            );
          })}

          <div className="h-5 w-px bg-[#ECC5C6] mx-1 shrink-0" />

          {/* User Sign In / Profile action (Desktop) */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {isAdmin && (
                <button
                  onClick={onOpenAdmin}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                  title="Open Admin Control Panel"
                >
                  <Shield className="w-3.5 h-3.5 text-stone-900" />
                  <span>Admin</span>
                </button>
              )}
              <div 
                onClick={() => handleSelectTab('profile')}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border border-[#ECC5C6] shadow-xs cursor-pointer hover:border-[#8A4A4D] transition-colors"
                title={`${currentUser.name} (${currentUser.role})`}
              >
                <img
                  src={currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.email)}`}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={logout}
                className="flex items-center text-xs text-stone-400 hover:text-stone-700 p-1.5 hover:bg-[#F5E9E7] rounded-lg transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#4A282A] hover:bg-[#381E20] text-white font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Sign In or Register"
            >
              <User className="w-3.5 h-3.5 text-[#ECC5C6]" />
              <span className="whitespace-nowrap">Sign In / Sign Up</span>
            </button>
          )}
        </div>

        {/* Mobile Header Actions (< md) */}
        <div className="flex md:hidden items-center gap-1.5 sm:gap-2 shrink-0">
          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="px-2 py-1.5 rounded-xl bg-amber-500 text-stone-900 font-extrabold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
              title="Open Admin Control Panel"
            >
              <Shield className="w-3.5 h-3.5 text-stone-900" />
              <span>Admin</span>
            </button>
          )}

          <button
            onClick={() => handleSelectTab('notifications')}
            className={`relative p-2 rounded-xl text-stone-700 hover:bg-[#F5E9E7] transition-colors cursor-pointer ${
              currentTab === 'notifications' ? 'bg-[#ECC5C6] text-[#4A282A]' : ''
            }`}
            title="Notices"
          >
            <Bell className="w-4 h-4" />
            {unreadNoticesCount > 0 && (
              <span className="absolute top-1 right-1 px-1 min-w-[14px] h-3.5 rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                {unreadNoticesCount}
              </span>
            )}
          </button>

          {currentUser ? (
            <div 
              onClick={() => handleSelectTab('profile')}
              className="w-8 h-8 rounded-xl overflow-hidden border border-[#ECC5C6] shadow-xs cursor-pointer active:scale-95"
              title={currentUser.name}
            >
              <img
                src={currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.email)}`}
                alt={currentUser.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-2.5 py-1.5 rounded-xl bg-[#4A282A] text-white font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <User className="w-3 h-3 text-[#ECC5C6]" />
              <span className="text-[11px]">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
