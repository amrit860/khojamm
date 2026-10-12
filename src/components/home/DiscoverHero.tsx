import React from 'react';
import { SlidersHorizontal, Sparkles } from 'lucide-react';
import { APP_CONFIG } from '../../constants/appConfig';

interface DiscoverHeroProps {
  selectedCity: string;
  onSelectCity: (city: string) => void;
  onOpenFilter: () => void;
  totalRoomsCount: number;
}

const POPULAR_CITIES = ['All Cities', 'Kathmandu', 'Lalitpur', 'Pokhara', 'Nepalgunj', 'Dhangadhi', 'Bhaktapur'];

export const DiscoverHero: React.FC<DiscoverHeroProps> = ({
  selectedCity,
  onSelectCity,
  onOpenFilter,
  totalRoomsCount
}) => {
  return (
    <div 
      style={{ backgroundColor: '#F5E9E7' }}
      className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-[#ECC5C6] shadow-sm text-[#382022]"
    >
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-52 h-52 rounded-full bg-[#ECC5C6]/50 blur-2xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECC5C6] text-[#4A282A] text-xs font-bold mb-3 border border-[#DEACAE]">
          <Sparkles className="w-3.5 h-3.5 text-[#6E3639]" />
          <span>{APP_CONFIG.home.heroTag}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#382022]">
          {APP_CONFIG.home.heroTitle}
        </h1>

        <p className="mt-1 text-sm sm:text-base font-semibold text-[#6E3639] italic tracking-tight">
          &ldquo;{APP_CONFIG.tagline}&rdquo;
        </p>

        <p className="mt-2 text-xs sm:text-sm text-[#7A595B] leading-relaxed">
          Discover {totalRoomsCount} verified rooms, private flats, and shared apartments across Nepal. Direct owner contacts, transparent monthly rents, and zero broker commissions.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2 pt-2 border-t border-[#ECC5C6]/70">
          <span className="text-[11px] font-bold text-[#6E3639] uppercase tracking-wider shrink-0">
            Cities:
          </span>
          {POPULAR_CITIES.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => onSelectCity(city)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                selectedCity === city
                  ? 'bg-[#4A282A] text-white shadow-xs font-bold'
                  : 'bg-white/80 hover:bg-white text-[#4A282A] border border-[#ECC5C6]'
              }`}
            >
              {city}
            </button>
          ))}
          <button
            type="button"
            onClick={onOpenFilter}
            style={{ backgroundColor: '#ECC5C6' }}
            className="px-3.5 py-1.5 rounded-xl text-[#4A282A] font-bold text-xs flex items-center justify-center gap-1.5 border border-[#DEACAE] hover:bg-[#DEACAE] transition-all sm:ml-auto cursor-pointer shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
};
