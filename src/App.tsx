import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { testFirestoreConnection } from './lib/firebase';
import { roomService } from './services/roomService';
import { notificationService } from './services/notificationService';
import { adminRoleService } from './services/adminRoleService';
import { updateAppFavicon } from './utils/favicon';
import { APP_CONFIG } from './constants/appConfig';
import { Room, RoomFilters, AppNotification } from './types';

// Components
import { Header } from './components/navigation/Header';
import { BottomNav, NavTab } from './components/navigation/BottomNav';
import { StickyPostButton } from './components/navigation/StickyPostButton';
import { HeroSlideshow } from './components/home/HeroSlideshow';
import { SearchView } from './components/home/SearchView';
import { RoomCard } from './components/rooms/RoomCard';
import { RoomDetailsModal } from './components/rooms/RoomDetailsModal';
import { FilterModal } from './components/rooms/FilterModal';
import { PostRoomModal } from './components/posting/PostRoomModal';
import { AvailabilityConfirmationModal } from './components/posting/AvailabilityConfirmationModal';
import { NotificationsView } from './components/notifications/NotificationsView';
import { ThankYouToast } from './components/common/ThankYouToast';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { AuthModal } from './components/auth/AuthModal';
import { UserProfileView } from './components/profile/UserProfileView';
import { MyListingsView } from './components/profile/MyListingsView';
import { Footer } from './components/common/Footer';
import { AdminPanel } from './components/admin/AdminPanel';
import { AboutUsView } from './components/about/AboutUsView';

import { 
  Building,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react';

const DEFAULT_FILTERS: RoomFilters = {
  searchQuery: '',
  city: 'All Cities',
  area: '',
  minRent: 0,
  maxRent: 0,
  roomType: 'All',
  furnishedStatus: 'All',
  wifi: false,
  water: false,
  parking: false,
  kitchen: false,
  bathroomType: 'All',
  genderPreference: 'All'
};

function MainAppContent() {
  const { currentUser, isAdmin,firebaseUser } = useAuth();

  // Navigation: default tab is 'home'
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [isAdminView, setIsAdminView] = useState(false);
    // Always start from the top when switching tabs
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentTab, isAdminView]);

  // Modals & Panels
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    return !localStorage.getItem('roomfinder_onboarding_seen');
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isPostRoomOpen, setIsPostRoomOpen] = useState(false);
  const [editingRoomForPost, setEditingRoomForPost] = useState<Room | null>(null);
  const [selectedRoomForDetails, setSelectedRoomForDetails] = useState<Room | null>(null);
  const [focusAboutContact, setFocusAboutContact] = useState(false);

  // Custom Logo State (syncs dynamically when updated via Admin)
  const [customLogoUrl, setCustomLogoUrl] = useState<string | undefined>(() => {
    return adminRoleService.getCustomLogo() || undefined;
  });

  // Initialize adminRoleService real-time Firestore sync and dynamic favicon
  useEffect(() => {
    const unsubAdminSync = adminRoleService.initSync();
    
    // Initial favicon sync
    const initialLogo = adminRoleService.getCustomLogo();
    if (initialLogo) {
      updateAppFavicon(initialLogo);
    }

    const handleLogoUpdate = () => {
      const updatedLogo = adminRoleService.getCustomLogo() || undefined;
      setCustomLogoUrl((prev) => (prev === updatedLogo ? prev : updatedLogo));
      updateAppFavicon(updatedLogo || null);
    };

    window.addEventListener('khojam_logo_changed', handleLogoUpdate);
    return () => {
      unsubAdminSync();
      window.removeEventListener('khojam_logo_changed', handleLogoUpdate);
    };
  }, []);

  // Availability Confirmation
  const [pendingAvailabilityRoom, setPendingAvailabilityRoom] = useState<Room | null>(null);
  const [showThankYouToast, setShowThankYouToast] = useState(false);

  // Rooms Data State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [ownerRooms, setOwnerRooms] = useState<Room[]>([]);
  const [filters, setFilters] = useState<RoomFilters>(DEFAULT_FILTERS);
  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  const [ownerListingsCount, setOwnerListingsCount] = useState<number>(0);

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Subscribe to persistent app notifications
  useEffect(() => {
    const unsubNotifs = notificationService.subscribe(setNotifications);
    return () => {
      unsubNotifs();
    };
  }, []);

  // Initialize rooms and subscribe to real-time updates
  useEffect(() => {
    // 1. Immediately provide local/curated rooms so Home screen is populated with zero delay
    const initialList = roomService.getLocalRoomsFallback();
    if (initialList.length > 0) {
      setRooms(initialList);
      setLoadingRooms(false);
    }

    testFirestoreConnection();
    roomService.seedCuratedRoomsIfEmpty().catch(() => {});

    // 2. Subscribe to real-time updates
    const unsub = roomService.subscribeToActiveRooms((updatedList) => {
      setRooms(updatedList);
      setLoadingRooms(false);
    }, (err) => {
      console.warn("Room subscription notice (using reliable fallback):", err);
      const fallback = roomService.getLocalRoomsFallback();
      setRooms(fallback);
      setLoadingRooms(false);
    });

    // 3. React immediately when a user creates or modifies a room locally
    const handleRoomsUpdated = () => {
      const currentList = roomService.getLocalRoomsFallback();
      setRooms(currentList);
      setLoadingRooms(false);
      loadOwnerRooms();
    };

    window.addEventListener('khojam_rooms_updated', handleRoomsUpdated);

    return () => {
      if (unsub) unsub();
      window.removeEventListener('khojam_rooms_updated', handleRoomsUpdated);
    };
  }, []);

  const loadOwnerRooms = async () => {
    if (!currentUser) {
      setOwnerRooms([]);
      setOwnerListingsCount(0);
      return;
    }
    try {
      const list = await roomService.getOwnerListings(currentUser.uid);
      setOwnerRooms(list);
      setOwnerListingsCount(list.length);
    } catch {
      const filtered = rooms.filter(
        r => r.ownerId === currentUser.uid || r.ownerEmail?.toLowerCase() === currentUser.email?.toLowerCase()
      );
      setOwnerRooms(filtered);
      setOwnerListingsCount(filtered.length);
    }
  };

  // Listen to user favorites and owner listings
  useEffect(() => {
    if (!currentUser) {
      setUserFavorites([]);
      setOwnerListingsCount(0);
      setOwnerRooms([]);
      return;
    }

    roomService.getUserFavorites(currentUser.uid).then(setUserFavorites);
    loadOwnerRooms();

    // Check for availability confirmation prompts for owner (5 days + 24hr reoccur)
    roomService.getListingsAwaitingAvailability(currentUser.uid).then((needingCheck) => {
      if (needingCheck.length > 0) {
        setPendingAvailabilityRoom((prev) => {
          if (prev?.id === needingCheck[0].id) return prev;
          return needingCheck[0];
        });
      }
    });
  }, [currentUser?.uid,firebaseUser?.uid]);

  // Handle URL route for admin (/admin or #admin)
  useEffect(() => {
    if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
      setIsAdminView(true);
    }
  }, []);

  // Promptly exit admin view if admin privileges are revoked in real time
  useEffect(() => {
    if (!isAdmin && isAdminView) {
      setIsAdminView(false);
    }
  }, [isAdmin, isAdminView]);

  const handleCloseOnboarding = () => {
    localStorage.setItem('roomfinder_onboarding_seen', 'true');
    setIsOnboardingOpen(false);
  };

  // Favorites toggle
  const handleToggleFavorite = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const isFav = userFavorites.includes(roomId);
    const newFavorites = isFav
      ? userFavorites.filter(id => id !== roomId)
      : [...userFavorites, roomId];

    setUserFavorites(newFavorites);

    try {
      await roomService.toggleFavorite(currentUser.uid, roomId, !isFav);
    } catch (err) {
      setUserFavorites(userFavorites);
    }
  };

  // Availability Confirmation Response (5-day check / 24-hr reoccur)
  const handleConfirmAvailability = async (isAvailable: boolean) => {
    if (!pendingAvailabilityRoom) return;
    const roomId = pendingAvailabilityRoom.id;
    const roomTitle = pendingAvailabilityRoom.title;
    setPendingAvailabilityRoom(null);

    try {
      await roomService.confirmRoomAvailability(roomId, isAvailable);
      if (isAvailable) {
        setShowThankYouToast(true);
        notificationService.add(
          'availability_check',
          'Room Availability Confirmed',
          `Your room "${roomTitle}" remains active for rent. Verified for 30 more days.`
        );
        setTimeout(() => {
          setShowThankYouToast(false);
        }, 2500);
      } else {
        notificationService.add(
          'room_booked',
          'Room Listing Removed',
          `Your room "${roomTitle}" was declared unavailable and removed immediately.`
        );
      }
    } catch (err) {
      console.error("Availability confirmation error:", err);
    }
  };

  // Filtered rooms for Home view
  const filteredRooms = useMemo(() => {
    return roomService.filterRooms(rooms, filters);
  }, [rooms, filters]);

  // Saved rooms for Wishlist tab
  const savedRoomsList = useMemo(() => {
    return rooms.filter(r => userFavorites.includes(r.id));
  }, [rooms, userFavorites]);

  // Switch to Post Room (create new or edit existing)
  const handleOpenPostRoom = (roomToEdit?: Room | null) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    setEditingRoomForPost(roomToEdit || null);
    setIsPostRoomOpen(true);
  };

  // If currently in separate ADMIN CONTROL PANEL (Accessible via secret 7-tap trigger or /admin)
  if (isAdminView) {
    return (
      <AdminPanel
        onBackToApp={() => setIsAdminView(false)}
        onViewRoomInApp={(room) => {
          setIsAdminView(false);
          setSelectedRoomForDetails(room);
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
      />
    );
  }

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <div 
      style={{ backgroundColor: '#F5E9E7' }}
      className="min-h-screen flex flex-col antialiased text-[#382022] pb-24 md:pb-8 w-full max-w-full overflow-x-clip"
    >
      {/* Top Header & Navigation Bar: Home to Profile serially, Profile left of Sign In */}
      <Header
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenAdmin={() => setIsAdminView(true)}
        savedCount={savedRoomsList.length}
        myListingsCount={ownerListingsCount}
        unreadNoticesCount={unreadNotificationsCount}
        customLogoUrl={customLogoUrl}
      />

      {/* Main View Port based on Tab */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 py-5 sm:py-6 overflow-x-hidden">
        {/* ========================================================
            TAB 1: HOME (Discover rooms, slideshow, direct search, grid)
        ======================================================== */}
        {currentTab === 'home' && (
          <div className="space-y-6 sm:space-y-8">
            {/* 1. Admin-Managed Hero Room Showcase Slideshow (Sliding photos uploaded from Admin dashboard) */}
            <HeroSlideshow />

            {/* Active Filters Bar if any filter is set */}
            {(filters.city !== 'All Cities' || filters.roomType !== 'All' || filters.maxRent > 0 || filters.wifi || filters.water || filters.parking || filters.searchQuery) && (
              <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#ECC5C6] shadow-xs">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-stone-500">Active Filters:</span>
                  {filters.searchQuery && (
                    <span className="px-2.5 py-1 bg-[#F5E9E7] text-[#4A282A] font-bold rounded-lg border border-[#ECC5C6]">
                      Query: &ldquo;{filters.searchQuery}&rdquo;
                    </span>
                  )}
                  {filters.city !== 'All Cities' && (
                    <span className="px-2.5 py-1 bg-[#F5E9E7] text-[#4A282A] font-bold rounded-lg border border-[#ECC5C6]">
                      City: {filters.city}
                    </span>
                  )}
                  {filters.roomType !== 'All' && (
                    <span className="px-2.5 py-1 bg-stone-100 text-stone-800 font-medium rounded-lg">
                      {filters.roomType}
                    </span>
                  )}
                  {filters.maxRent > 0 && (
                    <span className="px-2.5 py-1 bg-stone-100 text-stone-800 font-medium rounded-lg">
                      Max NPR {new Intl.NumberFormat('en-NP').format(filters.maxRent)}
                    </span>
                  )}
                  {filters.wifi && (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-medium rounded-lg border border-emerald-200">
                      Wi-Fi ✓
                    </span>
                  )}
                  {filters.water && (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-medium rounded-lg border border-emerald-200">
                      24/7 Water ✓
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="text-xs font-semibold text-stone-500 hover:text-stone-900 flex items-center gap-1 shrink-0 ml-3"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            )}

            {/* 4. Available Rooms in Nepal Section (Map removed per requirement) */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[#382022] tracking-tight">
                    {filters.city === 'All Cities' ? APP_CONFIG.home.availableRoomsTitle : `Available Rooms in ${filters.city}`}
                  </h2>
                  <p className="text-xs text-[#7A595B] mt-0.5">
                    Showing {filteredRooms.length} room{filteredRooms.length === 1 ? '' : 's'} with verified owner contact numbers
                  </p>
                </div>

                <button
                  onClick={() => setIsFilterOpen(true)}
                  style={{ backgroundColor: '#ECC5C6' }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#4A282A] flex items-center gap-1 border border-[#DEACAE]"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filter</span>
                </button>
              </div>

              {/* Clean Room Cards Grid */}
              {loadingRooms ? (
                <div className="py-20 text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-[#4A282A] border-t-transparent animate-spin mx-auto mb-3" />
                  <p className="text-xs text-[#7A595B]">Loading available rooms in Nepal...</p>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-3xl border border-[#ECC5C6] p-8 shadow-xs">
                  <Building className="w-12 h-12 text-[#ECC5C6] mx-auto mb-3" />
                  <h3 className="text-base font-bold text-[#382022]">No rooms found in this area</h3>
                  <p className="text-xs text-[#7A595B] max-w-sm mx-auto mt-1 leading-relaxed">
                    Try typing another city name like Nepalgunj or Kathmandu, or clearing your rent filter.
                  </p>
                  <button
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    style={{ backgroundColor: '#ECC5C6' }}
                    className="mt-5 px-5 py-2.5 rounded-xl text-[#4A282A] font-bold text-xs shadow-sm border border-[#DEACAE]"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      isFavorite={userFavorites.includes(room.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onSelect={(r) => setSelectedRoomForDetails(r)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 5. Owner Callout Section */}
            <div className="pt-6 border-t border-[#ECC5C6]">
              <div className="bg-white rounded-3xl border border-[#ECC5C6] p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="max-w-xl">
                  <span className="text-xs font-bold text-[#8A4A4D] uppercase tracking-wider">
                    {APP_CONFIG.home.calloutBadge}
                  </span>
                  <h3 className="text-xl font-extrabold text-[#382022] tracking-tight mt-1">
                    {APP_CONFIG.home.calloutTitle}
                  </h3>
                  <p className="text-xs text-[#7A595B] mt-2 leading-relaxed">
                    {APP_CONFIG.home.calloutDescription}
                  </p>
                </div>

                <button
                  onClick={() => handleOpenPostRoom(null)}
                  className="px-6 py-3 rounded-2xl bg-[#4A282A] hover:bg-[#381E20] text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
                >
                  {APP_CONFIG.home.calloutButton}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: SEARCH (Dedicated Search View in Navigation)
        ======================================================== */}
        {currentTab === 'search' && (
          <SearchView
            filters={filters}
            onFilterChange={(newF) => setFilters(newF)}
            rooms={filteredRooms}
            userFavorites={userFavorites}
            onToggleFavorite={handleToggleFavorite}
            onSelectRoom={(r) => setSelectedRoomForDetails(r)}
            onOpenAdvancedFilter={() => setIsFilterOpen(true)}
          />
        )}

        {/* ========================================================
            TAB 3: SAVED / WISHLIST
        ======================================================== */}
        {currentTab === 'saved' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-[#382022] tracking-tight">Saved Rooms</h2>
              <p className="text-xs text-[#7A595B] mt-0.5">Rooms and apartments you've bookmarked for quick access</p>
            </div>

            {savedRoomsList.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-3xl border border-[#ECC5C6] p-8 shadow-xs">
                <Building className="w-12 h-12 text-[#ECC5C6] mx-auto mb-3" />
                <h3 className="text-base font-bold text-[#382022]">You haven't saved any rooms yet</h3>
                <p className="text-xs text-[#7A595B] max-w-xs mx-auto mt-1 leading-relaxed">
                  Tap the heart icon on any room listing to save it here for comparison.
                </p>
                <button
                  onClick={() => setCurrentTab('home')}
                  style={{ backgroundColor: '#ECC5C6' }}
                  className="mt-5 px-5 py-2.5 rounded-xl text-[#4A282A] font-bold text-xs shadow-sm border border-[#DEACAE]"
                >
                  Explore Rooms
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {savedRoomsList.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    isFavorite={true}
                    onToggleFavorite={handleToggleFavorite}
                    onSelect={(r) => setSelectedRoomForDetails(r)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 4: MY LISTINGS (Owner's Listings)
        ======================================================== */}
        {currentTab === 'my-listings' && (
          <MyListingsView
            currentUser={currentUser}
            listings={ownerRooms}
            loading={loadingRooms}
            onRefresh={loadOwnerRooms}
            onOpenPostRoom={(roomToEdit) => handleOpenPostRoom(roomToEdit)}
            onViewRoomDetails={(room) => setSelectedRoomForDetails(room)}
            onMarkAsBooked={async (room) => {
              await roomService.markRoomAsBooked(room.id);
              await loadOwnerRooms();
            }}
            onDeleteListing={async (roomId) => {
              await roomService.deleteRoomListing(roomId);
              await loadOwnerRooms();
            }}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {/* ========================================================
            TAB 5: NOTIFICATIONS (Placed between My Listings and Profile)
        ======================================================== */}
        {currentTab === 'notifications' && (
          <NotificationsView
            notifications={notifications}
            onMarkAsRead={(id) => notificationService.markAsRead(id)}
            onMarkAllAsRead={() => notificationService.markAllAsRead()}
            onClearAll={() => notificationService.clearAll()}
            onNavigateHome={() => setCurrentTab('home')}
            onSelectRoom={(roomId) => {
              const found = rooms.find(r => r.id === roomId);
              if (found) setSelectedRoomForDetails(found);
            }}
          />
        )}

        {/* ========================================================
            TAB 6: PROFILE
        ======================================================== */}
        {currentTab === 'profile' && (
          <UserProfileView
            onOpenMyListings={() => setCurrentTab('my-listings')}
            onOpenSavedRooms={() => setCurrentTab('saved')}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenAdmin={() => setIsAdminView(true)}
            savedCount={savedRoomsList.length}
            myListingsCount={ownerListingsCount}
          />
        )}

        {/* ========================================================
            TAB 7: ABOUT US & CONTACT US (Dedicated Page)
        ======================================================== */}
        {currentTab === 'about' && (
          <AboutUsView
            onNavigateHome={() => {
              setCurrentTab('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenPostRoom={() => handleOpenPostRoom(null)}
            onOpenAuth={() => setIsAuthOpen(true)}
            customLogoUrl={customLogoUrl}
            focusContact={focusAboutContact}
          />
        )}
      </main>

      {/* Application Footer with Social Sharing (Facebook, Instagram, TikTok) */}
      <Footer
        customLogoUrl={customLogoUrl}
        onOpenAuth={() => setIsAuthOpen(true)}
        onNavigateAbout={() => {
          setFocusAboutContact(false);
          setCurrentTab('about');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateContact={() => {
          setFocusAboutContact(true);
          setCurrentTab('about');
        }}
      />

      {/* Floating Sticky "+" Button */}
      <StickyPostButton
        onClick={() => handleOpenPostRoom(null)}
        title="Post a Room"
      />

      {/* TOP-RIGHT THANK YOU TOAST */}
      <ThankYouToast
        show={showThankYouToast}
        message="Thank you"
        subMessage="Listing renewed for 30 more days"
      />

      {/* MOBILE RESPONSIVE STICKY BOTTOM NAVIGATION BAR */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        savedCount={savedRoomsList.length}
        myListingsCount={ownerListingsCount}
        unreadNoticesCount={unreadNotificationsCount}
        isOwner={Boolean(currentUser && ownerListingsCount > 0)}
      />

      {/* OWNER AVAILABILITY CONFIRMATION MODAL */}
      <AvailabilityConfirmationModal
        room={pendingAvailabilityRoom}
        isOpen={Boolean(pendingAvailabilityRoom)}
        onConfirm={handleConfirmAvailability}
      />

      {/* ROOM DETAILS MODAL */}
      <RoomDetailsModal
        room={selectedRoomForDetails}
        isOpen={Boolean(selectedRoomForDetails)}
        onClose={() => setSelectedRoomForDetails(null)}
        isFavorite={selectedRoomForDetails ? userFavorites.includes(selectedRoomForDetails.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* FILTER MODAL */}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onApplyFilters={(newFilters) => setFilters(newFilters)}
        onResetFilters={() => setFilters(DEFAULT_FILTERS)}
      />

      {/* POST A ROOM MODAL */}
      <PostRoomModal
        isOpen={isPostRoomOpen}
        onClose={() => {
          setIsPostRoomOpen(false);
          setEditingRoomForPost(null);
        }}
        editingRoom={editingRoomForPost}
        onRoomSaved={loadOwnerRooms}
        onNavigateToMyListings={() => setCurrentTab('my-listings')}
      />

      {/* ONBOARDING MODAL */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={handleCloseOnboarding}
      />

      {/* AUTH MODAL */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
