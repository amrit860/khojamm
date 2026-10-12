import React from 'react';
import { Room, RoomFilters } from '../../types';
import { RoomCard } from '../rooms/RoomCard';
import { APP_CONFIG } from '../../constants/appConfig';
import { 
  Search, 
  SlidersHorizontal, 
  RotateCcw, 
  Building,
  X 
} from 'lucide-react';

interface SearchViewProps {
  filters: RoomFilters;
  onFilterChange: (newFilters: RoomFilters) => void;
  rooms: Room[];
  userFavorites: string[];
  onToggleFavorite: (roomId: string, e: React.MouseEvent) => void;
  onSelectRoom: (room: Room) => void;
  onOpenAdvancedFilter: () => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  filters,
  onFilterChange,
  rooms,
  userFavorites,
  onToggleFavorite,
  onSelectRoom,
  onOpenAdvancedFilter
}) => {
  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div 
        style={{ backgroundColor: '#F5E9E7' }}
        className="p-5 sm:p-7 rounded-3xl border border-[#ECC5C6] shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#382022] tracking-tight">
              {APP_CONFIG.search.title}
            </h2>
            <p className="text-xs text-[#7A595B] mt-0.5">
              {APP_CONFIG.search.subtitle}
            </p>
          </div>

          <button
            onClick={onOpenAdvancedFilter}
            style={{ backgroundColor: '#ECC5C6' }}
            className="px-3.5 py-2 rounded-xl text-[#4A282A] font-bold text-xs flex items-center gap-1.5 border border-[#DEACAE] hover:bg-[#DEACAE] transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Direct Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#8A4A4D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            placeholder={APP_CONFIG.search.placeholder}
            className="w-full pl-10 pr-10 py-3 bg-white border border-[#ECC5C6] rounded-2xl text-xs sm:text-sm text-[#382022] placeholder:text-[#7A595B]/70 focus:outline-none focus:ring-2 focus:ring-[#DEACAE] shadow-xs"
            
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <p className="text-[11px] text-[#7A595B]">
          Direct search: Type any city name (e.g. Nepalgunj, Pokhara, Kathmandu) or local tole name (e.g. Banke Gaun, Baluwatar) to instantly view matching posts.
        </p>
      </div>

      {/* Results Count & Reset */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-bold text-[#4A282A]">
          Found {rooms.length} matching room{rooms.length === 1 ? '' : 's'} with visible owner details
        </p>
        {(filters.searchQuery || filters.city !== 'All Cities' || filters.roomType !== 'All') && (
          <button
            onClick={() => onFilterChange({
              ...filters,
              searchQuery: '',
              city: 'All Cities',
              roomType: 'All'
            })}
            className="text-xs text-[#7A595B] hover:text-[#4A282A] flex items-center gap-1 font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Search</span>
          </button>
        )}
      </div>

      {/* Rooms Results Grid */}
      {rooms.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-[#ECC5C6] p-8 shadow-xs">
          <Building className="w-12 h-12 text-[#ECC5C6] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#382022]">No rooms matched your query</h3>
          <p className="text-xs text-[#7A595B] max-w-xs mx-auto mt-1">
            Try searching for cities like "Nepalgunj", "Kathmandu", "Pokhara", or tole names like "Banke Gaun", or clear filters to see all available rooms.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              isFavorite={userFavorites.includes(room.id)}
              onToggleFavorite={onToggleFavorite}
              onSelect={onSelectRoom}
            />
          ))}
        </div>
      )}
    </div>
  );
};
