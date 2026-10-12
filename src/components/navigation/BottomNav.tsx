import React from 'react';
import { Home, Search, Heart, Layers, Bell, User } from 'lucide-react';

export type NavTab = 'home' | 'search' | 'saved' | 'my-listings' | 'notifications' | 'profile' | 'about';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  savedCount?: number;
  myListingsCount?: number;
  unreadNoticesCount?: number;
  isOwner?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  savedCount = 0,
  myListingsCount = 0,
  unreadNoticesCount = 0,
  isOwner = false
}) => {
  const tabs = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'search' as NavTab, label: 'Search', icon: Search },
    { id: 'saved' as NavTab, label: 'Saved', icon: Heart, badge: savedCount },
    ...(isOwner || myListingsCount > 0 ? [{ id: 'my-listings' as NavTab, label: 'My Listing', icon: Layers, badge: myListingsCount }] : []),
    { id: 'notifications' as NavTab, label: 'Notices', icon: Bell, badge: unreadNoticesCount },
    { id: 'profile' as NavTab, label: 'Profile', icon: User }
  ];

  return (
    <nav 
    style={{ paddingBottom: 'calc(0.25rem + var(--safe-bottom))' }}
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#FFFFFF]/95 backdrop-blur-md border-t border-[#ECC5C6] shadow-[0_-4px_16px_rgba(74,40,42,0.08)] py-1 px-2 select-none w-full max-w-full overflow-hidden"
      aria-label="Mobile Navigation"
    >
      <div className="max-w-md mx-auto flex items-center justify-around gap-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
                isActive
                  ? 'text-[#4A282A] font-extrabold'
                  : 'text-[#7A595B] hover:text-[#4A282A] font-medium'
              }`}
              title={tab.label}
            >
              <div className="relative">
                <div className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-[#ECC5C6] text-[#4A282A] shadow-xs' : ''
                }`}>
                  <Icon className={`w-4.5 h-4.5 transition-transform ${isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
                </div>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 min-w-[15px] h-3.5 rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center shadow-xs">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight truncate max-w-[56px] text-center ${
                isActive ? 'font-bold text-[#382022]' : 'text-stone-500'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
