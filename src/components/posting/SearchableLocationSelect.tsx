import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, MapPin, X, Sparkles } from 'lucide-react';
import { NEPAL_CITIES } from '../../constants/nepalCities';

interface SearchableLocationSelectProps {
  value: string;
  onChange: (city: string) => void;
  required?: boolean;
}

const POPULAR_QUICK_CITIES = [
  'Kathmandu',
  'Pokhara',
  'Lalitpur',
  'Bhaktapur',
  'Bharatpur',
  'Butwal',
  'Biratnagar',
  'Dharan',
  'Nepalgunj',
  'Dhangadhi'
];

export const SearchableLocationSelect: React.FC<SearchableLocationSelectProps> = ({
  value,
  onChange,
  required = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click or Esc
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('touchstart', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
      // Auto-focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Real-time filtering based on user input
  const filteredCities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return NEPAL_CITIES;

    // Prioritize startsWith, then includes
    const startsWithMatches: string[] = [];
    const containsMatches: string[] = [];

    NEPAL_CITIES.forEach((cityName) => {
      const lower = cityName.toLowerCase();
      if (lower.startsWith(query)) {
        startsWithMatches.push(cityName);
      } else if (lower.includes(query)) {
        containsMatches.push(cityName);
      }
    });

    return [...startsWithMatches, ...containsMatches];
  }, [searchQuery]);

  const handleSelectCity = (cityName: string) => {
    onChange(cityName);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClearSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full px-3.5 py-2.5 bg-stone-50 border rounded-xl text-sm font-semibold flex items-center justify-between transition-all text-left cursor-pointer ${
          isOpen
            ? 'border-[#8A4A4D] ring-2 ring-[#8A4A4D]/20 bg-white shadow-xs'
            : 'border-stone-200 hover:border-stone-300 hover:bg-stone-100/60'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <MapPin className="w-4 h-4 text-[#8A4A4D] shrink-0" />
          <span className={`truncate ${value ? 'text-stone-900 font-bold' : 'text-stone-400 font-normal'}`}>
            {value || 'Select Nepal City'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-stone-400">
          <span className="hidden xs:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">
            Nepal
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#8A4A4D]' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Menu with Search and Instant Filtered List */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white border border-[#ECC5C6] rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
          {/* Top Search Input Field */}
          <div className="p-2.5 bg-[#F5E9E7]/50 border-b border-[#ECC5C6]/60 space-y-2">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#8A4A4D] absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredCities.length > 0) {
                      handleSelectCity(filteredCities[0]);
                    } else if (searchQuery.trim()) {
                      handleSelectCity(searchQuery.trim());
                    }
                  }
                }}
                placeholder="Search Nepal city (e.g. Kathmandu, Pokhara)..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-[#ECC5C6] rounded-xl text-xs sm:text-sm font-medium text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8A4A4D]/25 focus:border-[#8A4A4D]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 p-0.5 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-700 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Select Popular Cities when not searching */}
            {!searchQuery && (
              <div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-[#7A595B] uppercase tracking-wider mb-1 px-1">
                  <Sparkles className="w-3 h-3 text-[#8A4A4D]" />
                  <span>Popular Hubs</span>
                </div>
                <div className="flex flex-wrap gap-1 px-0.5">
                  {POPULAR_QUICK_CITIES.map((popularCity) => (
                    <button
                      key={popularCity}
                      type="button"
                      onClick={() => handleSelectCity(popularCity)}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                        value === popularCity
                          ? 'bg-[#4A282A] text-white border-[#4A282A]'
                          : 'bg-white text-stone-700 border-[#ECC5C6] hover:bg-[#F5E9E7] hover:border-[#8A4A4D]'
                      }`}
                    >
                      {popularCity}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Result Count Status */}
          <div className="px-3.5 py-1.5 bg-stone-50/90 border-b border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span>
              {searchQuery ? (
                <>
                  Found <strong className="text-stone-800">{filteredCities.length}</strong> matching{' '}
                  {filteredCities.length === 1 ? 'city' : 'cities'}
                </>
              ) : (
                <>All Nepal Locations ({NEPAL_CITIES.length} cities)</>
              )}
            </span>
            {searchQuery && filteredCities.length > 0 && (
              <span className="text-[10px] text-stone-400">Press Enter for 1st match</span>
            )}
          </div>

          {/* Filtered Dropdown List */}
          <div
            role="listbox"
            className="max-h-56 sm:max-h-64 overflow-y-auto divide-y divide-stone-50 overscroll-contain"
          >
            {filteredCities.length > 0 ? (
              filteredCities.map((cityName) => {
                const isSelected = value.toLowerCase() === cityName.toLowerCase();
                return (
                  <button
                    key={cityName}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectCity(cityName)}
                    className={`w-full px-3.5 py-2.5 text-left text-xs sm:text-sm font-medium flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#F5E9E7] text-[#4A282A] font-bold'
                        : 'hover:bg-[#F5E9E7]/60 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{cityName}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#8A4A4D] shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-stone-500">
                  No predefined city matches &ldquo;<strong className="text-stone-800">{searchQuery}</strong>&rdquo;
                </p>
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSelectCity(searchQuery.trim())}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4A282A] text-white rounded-xl text-xs font-bold hover:bg-[#381E20] transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Use &ldquo;{searchQuery.trim()}&rdquo; as City</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden input to maintain native HTML form validation if needed */}
      {required && (
        <input
          type="text"
          value={value}
          required={required}
          readOnly
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
    </div>
  );
};
