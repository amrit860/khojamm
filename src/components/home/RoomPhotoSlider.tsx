import React, { useState, useEffect } from 'react';
import { Room } from '../../types';
import { ChevronLeft, ChevronRight, MapPin, Eye } from 'lucide-react';

interface RoomPhotoSliderProps {
  rooms: Room[];
  onSelectRoom: (room: Room) => void;
}

export const RoomPhotoSlider: React.FC<RoomPhotoSliderProps> = ({
  rooms,
  onSelectRoom
}) => {
  const featuredRooms = rooms.length > 0 ? rooms : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (featuredRooms.length <= 2 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 2 >= featuredRooms.length ? 0 : prev + 2));
    }, 2500);
    return () => clearInterval(timer);
  }, [featuredRooms.length, isPaused]);

  if (featuredRooms.length === 0) return null;

  const currentPair = [
    featuredRooms[currentIndex % featuredRooms.length],
    featuredRooms[(currentIndex + 1) % featuredRooms.length]
  ];

  const handlePrev = () => {
    setCurrentIndex((prev) => 
      prev - 2 < 0 ? Math.max(0, featuredRooms.length - 2) : prev - 2
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) => 
      prev + 2 >= featuredRooms.length ? 0 : prev + 2
    );
  };

  return (
    <div 
      className="relative mb-6 group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ECC5C6] animate-pulse" />
          <h3 className="text-xs font-bold text-[#4A282A] uppercase tracking-wider">
            Featured Room Highlights
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#7A595B]">
          <div className="flex gap-1 ml-2">
            <button
              onClick={handlePrev}
              className="w-6 h-6 rounded-full bg-[#ECC5C6] hover:bg-[#DEACAE] text-[#4A282A] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Previous photos"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNext}
              className="w-6 h-6 rounded-full bg-[#ECC5C6] hover:bg-[#DEACAE] text-[#4A282A] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Next photos"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {currentPair.map((room, idx) => {
          if (!room) return null;
          const imgUrl = room.coverImageUrl || (room.imageUrls && room.imageUrls[0]) || '';
          const formattedRent = new Intl.NumberFormat('en-NP').format(room.rent);

          return (
            <div
              key={`${room.id}-${idx}-${currentIndex}`}
              onClick={() => onSelectRoom(room)}
              className="relative aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md border border-[#ECC5C6]/60 bg-[#FFFFFF] group/card transition-all duration-500 transform hover:-translate-y-0.5"
            >
              <img
                src={imgUrl}
                alt={room.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold bg-[#ECC5C6] text-[#4A282A] shadow-xs">
                  {room.roomType}
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white/90 text-stone-800">
                  {room.city}
                </span>
              </div>

              <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-xs sm:text-sm font-extrabold text-[#ECC5C6] drop-shadow-xs">
                    NPR {formattedRent}/mo
                  </span>
                  <span className="text-[10px] text-white/80 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> View
                  </span>
                </div>
                <p className="text-xs font-bold truncate mt-0.5 drop-shadow-xs">
                  {room.title}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-white/80 mt-0.5 truncate">
                  <MapPin className="w-3 h-3 shrink-0 text-[#ECC5C6]" />
                  <span className="truncate">{room.location}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
