import React, { useState } from 'react';
import { Room } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Heart, 
  Wifi, 
  Droplet, 
  Car, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle,
  Phone,
  Lock
} from 'lucide-react';

interface RoomCardProps {
  room: Room;
  isFavorite: boolean;
  onToggleFavorite: (roomId: string, e: React.MouseEvent) => void;
  onSelect: (room: Room) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  isFavorite,
  onToggleFavorite,
  onSelect,
}) => {
  const { currentUser } = useAuth();
  const [imgError, setImgError] = useState(false);

  const formattedRent = new Intl.NumberFormat('en-NP').format(room.rent);
  const isExpiringSoon = room.status === 'expiring_soon';
  const isUnavailable = room.status === 'unavailable';

  return (
    <div
      onClick={() => onSelect(room)}
      className="group bg-white rounded-2xl border border-[#ECC5C6] shadow-xs hover:shadow-xl hover:border-[#8A4A4D]/50 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col h-full transform hover:-translate-y-1"
    >
      {/* Top Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
        <img
          src={imgError ? 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80' : (room.coverImageUrl || room.imageUrls[0])}
          alt={room.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-stone-950/20 pointer-events-none" />

        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(room.id, e);
          }}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 cursor-pointer ${
            isFavorite
              ? 'bg-rose-500 text-white shadow-md'
              : 'bg-white/80 hover:bg-white text-stone-700 hover:text-rose-500'
          }`}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : 'stroke-[2.2]'}`} />
        </button>

        {/* Room Type Tag */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#ECC5C6] text-[#4A282A] shadow-xs border border-[#DEACAE]">
            {room.roomType}
          </span>
          {room.furnishedStatus && (
            <span className="hidden sm:inline-block px-2 py-1 rounded-lg text-[11px] font-medium bg-stone-900/70 backdrop-blur-md text-white">
              {room.furnishedStatus}
            </span>
          )}
        </div>

        {/* Status Alert Badge */}
        {isExpiringSoon && (
          <div className="absolute bottom-2.5 left-3 flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/90 text-white text-[11px] font-medium backdrop-blur-xs">
            <AlertTriangle className="w-3 h-3" />
            <span>Expiring Soon</span>
          </div>
        )}
        {isUnavailable && (
          <div className="absolute bottom-2.5 left-3 flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-600/90 text-white text-[11px] font-medium backdrop-blur-xs">
            <span>Unavailable</span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Price & Currency */}
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-[#8A4A4D] uppercase tracking-wider">NPR</span>
              <span className="text-xl font-extrabold text-[#382022] tracking-tight">
                {formattedRent}
              </span>
              <span className="text-xs text-[#7A595B] font-medium">/ month</span>
            </div>
            <span className="text-[11px] text-stone-500 font-medium capitalize">
              {room.city}
            </span>
          </div>

          {/* Title */}
          <h3 className="mt-1.5 font-bold text-stone-900 text-sm line-clamp-1 group-hover:text-[#6E3639] transition-colors">
            {room.title}
          </h3>

          {/* Location with Pin */}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
            <MapPin className="w-3.5 h-3.5 text-[#8A4A4D] shrink-0" />
            <span className="truncate">{room.location}</span>
          </div>

          {/* Contact Number & Description */}
          {currentUser ? (
            <>
              <div className="mt-2.5 px-3 py-2 bg-[#F5E9E7]/80 rounded-xl border border-[#ECC5C6] flex items-center justify-between text-xs">
                <div className="min-w-0 pr-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#8A4A4D] shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-[#7A595B]">Direct Contact</p>
                    <p className="font-bold text-[#382022] tracking-tight text-xs">{room.contactNumber}</p>
                  </div>
                </div>
                <a
                  href={`tel:${room.contactNumber?.replace(/[^0-9+]/g, '')}`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-2.5 py-1 bg-[#ECC5C6] hover:bg-[#DEACAE] text-[#4A282A] rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs transition-colors shrink-0"
                  title="Call Owner Directly"
                >
                  <span>Call Now</span>
                </a>
              </div>
              <p className="mt-2 text-xs text-stone-600 line-clamp-2 leading-relaxed">
                {room.description}
              </p>
            </>
          ) : (
            <div className="mt-2.5 px-3 py-2 bg-[#F5E9E7]/50 rounded-xl border border-[#ECC5C6]/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-stone-500">
                <Lock className="w-3.5 h-3.5 text-[#8A4A4D]" />
                <span className="text-[11px] font-medium text-[#7A595B]">Login to view contact &amp; details</span>
              </div>
              <span className="px-2 py-0.5 rounded-lg bg-[#ECC5C6] text-[#4A282A] text-[10px] font-bold">
                Sign In
              </span>
            </div>
          )}
        </div>

        {/* Facilities Indicators */}
        <div className="mt-4 pt-3 border-t border-[#ECC5C6]/60 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {room.wifiAvailable && (
              <div className="flex items-center gap-1 text-[#4A282A] font-medium">
                <Wifi className="w-3.5 h-3.5 text-[#8A4A4D]" />
                <span className="text-[11px]">Wi-Fi</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              </div>
            )}
            {room.waterAvailable && (
              <div className="flex items-center gap-1 text-[#4A282A] font-medium">
                <Droplet className="w-3.5 h-3.5 text-[#8A4A4D]" />
                <span className="text-[11px]">Water</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              </div>
            )}
            {room.parkingAvailable && (
              <div className="flex items-center gap-1 text-[#4A282A] font-medium">
                <Car className="w-3.5 h-3.5 text-[#8A4A4D]" />
                <span className="text-[11px]">Parking</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              </div>
            )}
          </div>
          <div className="text-[11px] font-semibold text-[#4A282A] bg-[#F5E9E7] border border-[#ECC5C6] px-2 py-0.5 rounded-md">
            {room.bathroomType === 'Attached' ? 'Attached Bath' : 'Common Bath'}
          </div>
        </div>
      </div>
    </div>
  );
};
