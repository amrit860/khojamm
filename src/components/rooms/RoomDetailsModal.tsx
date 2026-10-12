import React, { useState, useEffect } from 'react';
import { Room } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { 
  X, 
  MapPin, 
  Heart, 
  Phone, 
  Wifi, 
  Droplet, 
  Car, 
  ShieldCheck, 
  Calendar, 
  Building, 
  Share2,
  ChevronLeft,
  ChevronRight,
  Check,
  Lock,
  User,
  Maximize2
} from 'lucide-react';

interface RoomDetailsModalProps {
  room: Room | null;
  isOpen?: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (roomId: string, e: React.MouseEvent) => void;
  onOpenAuth?: () => void;
}

export const RoomDetailsModal: React.FC<RoomDetailsModalProps> = ({
  room,
  isOpen = true,
  onClose,
  isFavorite,
  onToggleFavorite,
  onOpenAuth
}) => {
  const { currentUser } = useAuth();
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Lock background page / home-screen scrolling while room detail or full-screen viewer is open
  useEffect(() => {
    if (!isOpen || !room) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverscroll = document.body.style.overscrollBehaviorY;

    // Lock page background from scrolling
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overscrollBehaviorY = 'none';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullScreen) {
          setIsFullScreen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        if (images.length > 1) {
          setActiveImgIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
        }
      } else if (e.key === 'ArrowRight') {
        if (images.length > 1) {
          setActiveImgIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overscrollBehaviorY = originalBodyOverscroll;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, room, isFullScreen, onClose]);

  if (!isOpen || !room) return null;

  const images = room.imageUrls && room.imageUrls.length > 0 ? room.imageUrls : [room.coverImageUrl];
  const formattedRent = new Intl.NumberFormat('en-NP').format(room.rent);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const cleanPhone = room.contactNumber?.replace(/[^0-9+]/g, '') || '';

  // Prevent wheel scroll bleed to background Home screen at top/bottom scroll edges
  const handleScrollContainerWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const isAtTop = el.scrollTop <= 0 && e.deltaY < 0;
    const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1 && e.deltaY > 0;
    if (isAtTop || isAtBottom) {
      e.stopPropagation();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/70 backdrop-blur-sm animate-in fade-in duration-200"
      style={{ overscrollBehavior: 'contain', overscrollBehaviorY: 'contain' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-[#ECC5C6] flex flex-col max-h-[92vh]"
        style={{ overscrollBehavior: 'contain', overscrollBehaviorY: 'contain' }}
      >
        {/* Top Floating Controls & Fitted Image Display */}
        <div className="relative shrink-0">
          {/* Gallery Carousel Container - Restored to original dimensions */}
          <div className="relative h-44 sm:h-56 w-full bg-stone-900 flex items-center justify-center overflow-hidden select-none">
            {/* Ambient blurred backdrop to softly fill letterbox areas */}
            <div 
              className="absolute inset-0 bg-cover bg-center blur-xl opacity-35 scale-110 pointer-events-none transition-all duration-300"
              style={{ backgroundImage: `url(${images[activeImgIndex]})` }}
            />
            {/* Dark contrast overlay */}
            <div className="absolute inset-0 bg-stone-950/40 pointer-events-none" />

            {/* Uncropped, full original aspect ratio image fitted inside container - Click to open full-screen */}
            <button
              type="button"
              onClick={() => setIsFullScreen(true)}
              className="relative z-10 max-h-full max-w-full w-full h-full flex items-center justify-center p-1 sm:p-2 cursor-pointer group focus:outline-none"
              title="Click to view image in full-screen mode"
              aria-label="View room image full-screen"
            >
              <img
                src={images[activeImgIndex]}
                alt={room.title}
                className="max-h-full max-w-full w-auto h-auto object-contain transition-all duration-300 mx-auto select-none drop-shadow-md group-hover:scale-[1.02]"
              />

              {/* Full-screen expand badge affordance */}
              <div className="absolute bottom-2.5 right-2.5 z-20 bg-stone-900/80 hover:bg-stone-900 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white/95 border border-white/20 shadow-md flex items-center gap-1.5 transition-all group-hover:bg-stone-950">
                <Maximize2 className="w-3.5 h-3.5 text-[#ECC5C6]" />
                <span className="hidden sm:inline">Full Screen</span>
              </div>
            </button>

            {/* Photo Counter */}
            {images.length > 1 && (
              <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-20 bg-stone-900/80 backdrop-blur-md px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[11px] font-semibold text-white/90 border border-white/10 shadow-sm">
                {activeImgIndex + 1} / {images.length}
              </div>
            )}

            {/* Navigation arrows for images */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImgIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-stone-900/70 hover:bg-stone-900 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer border border-white/10 shadow-md"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveImgIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-stone-900/70 hover:bg-stone-900 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer border border-white/10 shadow-md"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Dots indicator */}
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-stone-900/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImgIndex(idx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === activeImgIndex ? 'w-4 bg-[#ECC5C6]' : 'w-1.5 bg-white/50 hover:bg-white/80'
                      }`}
                      aria-label={`Go to image ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Close & Share & Wishlist */}
            <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20 flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={handleShare}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-stone-900/75 hover:bg-stone-900 text-white flex items-center justify-center backdrop-blur-md shadow-md transition-all active:scale-95 cursor-pointer border border-white/10"
                title="Share room"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={(e) => onToggleFavorite(room.id, e)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center backdrop-blur-md shadow-md transition-all active:scale-95 cursor-pointer border border-white/10 ${
                  isFavorite ? 'bg-rose-500 text-white' : 'bg-stone-900/75 hover:bg-stone-900 text-white'
                }`}
                title="Wishlist"
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-stone-900/75 hover:bg-stone-900 text-white flex items-center justify-center backdrop-blur-md shadow-md transition-all cursor-pointer border border-white/10"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Price Badge Overlay */}
            <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-20 flex items-baseline gap-1 bg-stone-900/85 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-white shadow-lg border border-white/10">
              <span className="text-[11px] font-bold text-[#ECC5C6]">NPR</span>
              <span className="text-sm sm:text-base font-extrabold tracking-tight">{formattedRent}</span>
              <span className="text-[10px] sm:text-[11px] text-stone-300">/ mo</span>
            </div>
          </div>
        </div>

        {/* Scrollable Details - Independent containment, prevents scroll bleed to Home screen */}
        <div 
          className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-5"
          style={{ overscrollBehavior: 'contain', overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch' }}
          onWheel={handleScrollContainerWheel}
        >
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                Room Available
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#F5E9E7] text-[#4A282A] border border-[#ECC5C6] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#8A4A4D]" />
                Verified Listing
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#ECC5C6] text-[#4A282A]">
                {room.roomType}
              </span>
            </div>

            <h1 className="text-lg sm:text-xl font-extrabold text-[#382022] tracking-tight">
              {room.title}
            </h1>

            <div className="mt-1 flex items-center gap-2 text-stone-600 text-xs sm:text-sm">
              <MapPin className="w-4 h-4 text-[#8A4A4D] shrink-0" />
              <span className="font-semibold text-stone-800">{room.location}, Nepal</span>
            </div>
          </div>

          {!currentUser ? (
            <div className="py-8 px-4 text-center bg-[#F5E9E7]/60 rounded-3xl border border-[#ECC5C6] my-2">
              <div className="w-14 h-14 rounded-2xl bg-[#ECC5C6] text-[#4A282A] flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Lock className="w-7 h-7 text-[#6E3639]" />
              </div>
              <h3 className="text-lg font-extrabold text-[#382022] tracking-tight">
                Sign In to View Room Details &amp; Contact
              </h3>
              <p className="text-xs text-[#7A595B] max-w-sm mx-auto mt-2 leading-relaxed">
                To see the full room details, local address directions, verified facilities, and direct owner contact number, please sign in to your account.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth?.();
                }}
                className="mt-5 px-6 py-3 rounded-2xl bg-[#4A282A] hover:bg-[#381E20] text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2"
              >
                <User className="w-4 h-4 text-[#ECC5C6]" />
                <span>Sign In / Register</span>
              </button>
            </div>
          ) : (
            <>
              {/* Key Facilities Grid */}
              <div className="bg-[#F5E9E7]/40 rounded-2xl p-4 border border-[#ECC5C6]">
                <h3 className="text-xs font-bold text-[#382022] uppercase tracking-wider mb-2.5">
                  Available Facilities &amp; Amenities
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {room.wifiAvailable && (
                    <div className="p-3 rounded-xl border border-emerald-200 bg-white text-emerald-950 shadow-xs flex items-center gap-2.5">
                      <Wifi className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div>
                        <p className="text-xs font-bold">Wi-Fi</p>
                        <p className="text-[10px] text-stone-500">Available</p>
                      </div>
                    </div>
                  )}
                  {room.waterAvailable && (
                    <div className="p-3 rounded-xl border border-emerald-200 bg-white text-emerald-950 shadow-xs flex items-center gap-2.5">
                      <Droplet className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div>
                        <p className="text-xs font-bold">Water Facility</p>
                        <p className="text-[10px] text-stone-500">24/7 Supply</p>
                      </div>
                    </div>
                  )}
                  {room.parkingAvailable && (
                    <div className="p-3 rounded-xl border border-emerald-200 bg-white text-emerald-950 shadow-xs flex items-center gap-2.5">
                      <Car className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div>
                        <p className="text-xs font-bold">Parking Space</p>
                        <p className="text-[10px] text-stone-500">Available</p>
                      </div>
                    </div>
                  )}
                  {room.bathroomType && (
                    <div className="p-3 rounded-xl border border-[#ECC5C6] bg-white text-[#382022] shadow-xs flex items-center gap-2.5">
                      <Building className="w-4 h-4 text-[#8A4A4D] shrink-0" />
                      <div>
                        <p className="text-xs font-bold">Bathroom</p>
                        <p className="text-[10px] text-stone-500">{room.bathroomType === 'Attached' ? 'Attached Bath' : 'Common Bath'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  About This Room
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line bg-white p-4 rounded-xl border border-stone-200">
                  {room.description}
                </p>
              </div>

              {/* Location & Overview Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-stone-400 block text-[11px]">Location</span>
                  <span className="font-semibold text-stone-800">{room.location}</span>
                </div>
                {room.landmark && (
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-400 block text-[11px]">Landmark</span>
                    <span className="font-semibold text-stone-800">{room.landmark}</span>
                  </div>
                )}
                {room.furnishedStatus && (
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-400 block text-[11px]">Furnishing</span>
                    <span className="font-semibold text-stone-800">{room.furnishedStatus}</span>
                  </div>
                )}
               {/*} {room.genderPreference && (
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-400 block text-[11px]">Gender Preference</span>
                    <span className="font-semibold text-stone-800">{room.genderPreference}</span>
                  </div>
                )}*/}
              </div>

              {/* Direct Landlord Contact Box */}
              <div className="p-4 bg-[#F5E9E7] rounded-2xl border border-[#ECC5C6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#4A282A] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Phone className="w-6 h-6 text-[#ECC5C6]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#8A4A4D] font-bold uppercase tracking-wider">Direct Landlord Contact</p>
                    <h4 className="text-sm font-extrabold text-[#382022]">{room.contactNumber}</h4>
                    <p className="text-xs text-[#7A595B]">Owner: {room.ownerName} • Verified Listing</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${cleanPhone}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4A282A] hover:bg-[#381E20] text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
                  >
                    <Phone className="w-4 h-4 text-[#ECC5C6]" />
                    <span>Call Now</span>
                  </a>
                </div>
              </div>

              {/* Lifecycle & Expiration Notice */}
              <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-200">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  <span>Posted: {new Date(room.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="text-[11px] text-[#8A4A4D] font-medium">
                   30-day verified lifecycle
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer sticky CTA */}
        <div className="p-3.5 sm:p-4 bg-[#F5E9E7] border-t border-[#ECC5C6] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 shrink-0">
          <div className="flex items-center justify-between sm:block">
            <p className="text-[11px] text-[#7A595B] uppercase tracking-wider font-semibold">Total Rent</p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-extrabold text-[#382022]">NPR {formattedRent}</span>
              <span className="text-xs text-[#7A595B]">/ month</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentUser ? (
              <a
                href={`tel:${cleanPhone}`}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#4A282A] hover:bg-[#381E20] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
              >
                <Phone className="w-4 h-4 text-[#ECC5C6]" />
                <span>Call: {room.contactNumber}</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth?.();
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4A282A] hover:bg-[#381E20] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <Lock className="w-4 h-4 text-[#ECC5C6]" />
                <span>Sign In to View Contact</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FULL-SCREEN IMAGE VIEWER OVERLAY (z-[70] stacking order) */}
      {isFullScreen && (
        <div 
          className="fixed inset-0 z-[70] bg-black/95 flex flex-col items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200 select-none backdrop-blur-md"
          style={{ overscrollBehavior: 'contain', overscrollBehaviorY: 'contain', touchAction: 'pan-y' }}
          onClick={(e) => {
            // Clicking background outside image closes viewer
            if (e.target === e.currentTarget) setIsFullScreen(false);
          }}
        >
          {/* Top Control Bar with Info and Prominent Close Button */}
          <div className="absolute top-0 left-0 right-0 z-30 p-3 sm:p-5 flex items-center justify-between pointer-events-none">
            {/* Top Left: Photo Counter & Title */}
            <div className="pointer-events-auto flex items-center gap-2 bg-stone-900/85 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/15 text-white shadow-xl">
              <span className="text-xs sm:text-sm font-bold text-[#ECC5C6]">
                {activeImgIndex + 1} / {images.length}
              </span>
              <span className="text-white/40 text-xs">•</span>
              <span className="text-xs sm:text-sm font-medium text-stone-200 truncate max-w-[180px] sm:max-w-md">
                {room.title}
              </span>
            </div>

            {/* Top Right: Clearly Visible Close (×) Button (Easy mobile tap target >= 44px) */}
            <button
              type="button"
              onClick={() => setIsFullScreen(false)}
              className="pointer-events-auto min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-stone-900/90 hover:bg-stone-800 active:bg-stone-700 text-white flex items-center justify-center border border-white/20 shadow-2xl transition-all active:scale-95 cursor-pointer hover:border-white/40"
              aria-label="Close full-screen image viewer"
              title="Close full-screen viewer"
            >
              <X className="w-6 h-6 text-white stroke-[2.5]" />
            </button>
          </div>

          {/* Main Large Uncropped Image */}
          <div 
            className="relative w-full h-full flex items-center justify-center overflow-hidden max-h-[84vh] sm:max-h-[88vh] max-w-[96vw]"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsFullScreen(false);
            }}
          >
            <img
              src={images[activeImgIndex]}
              alt={`${room.title} - Full Screen Image ${activeImgIndex + 1}`}
              className="max-h-full max-w-full w-auto h-auto object-contain drop-shadow-2xl transition-all duration-300 pointer-events-auto select-none"
            />
          </div>

          {/* Navigation Controls for Multiple Images */}
          {images.length > 1 && (
            <>
              {/* Previous Image Chevron */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImgIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                }}
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-30 min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-stone-900/80 hover:bg-stone-800 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl transition-all active:scale-95 cursor-pointer hover:border-white/40"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Next Image Chevron */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImgIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-30 min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-stone-900/80 hover:bg-stone-800 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl transition-all active:scale-95 cursor-pointer hover:border-white/40"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Bottom Dots Indicator */}
              <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-stone-900/80 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/15 shadow-xl">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImgIndex(idx);
                    }}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === activeImgIndex ? 'w-6 bg-[#ECC5C6]' : 'w-2 bg-white/40 hover:bg-white/80'
                    }`}
                    aria-label={`View photo ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
