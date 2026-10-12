import React, { useState,useEffect } from 'react';
import { RoomFilters } from '../../types';
import { X, SlidersHorizontal, RotateCcw, Check } from 'lucide-react';
import { NEPAL_CITIES } from '../../constants/nepalCities';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: RoomFilters;
  onApplyFilters: (newFilters: RoomFilters) => void;
  onResetFilters: () => void;
}

const POPULAR_CITIES = ['All Cities', 'Kathmandu', 'Lalitpur', 'Pokhara', 'Nepalgunj', 'Dhangadhi', 'Bhaktapur'];
const ROOM_TYPES = ['All', 'Single Room', 'Master Bedroom', '1BHK', '2BHK', '3BHK', 'Flat'];
const FURNISHED_OPTIONS = ['All', 'Furnished', 'Semi-Furnished', 'Unfurnished'];

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters
}) => {
  const [localFilters, setLocalFilters] = useState<RoomFilters>(filters);
 // Every time the popup opens, show the filters that are currently applied
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);
  if (!isOpen) return null;

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  {/*const handleReset = () => {
    onResetFilters();
    onClose();
  };*/}
    const handleReset = () => {
    // Clear only the choices made inside this popup; keep the popup open
    setLocalFilters({
      ...localFilters,
      city: 'All Cities',
      area: '',
      maxRent: 0,
      roomType: 'All',
      furnishedStatus: 'All',
      wifi: false,
      water: false,
      parking: false
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-[#ECC5C6] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#ECC5C6] flex items-center justify-between bg-[#F5E9E7]/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#ECC5C6] text-[#4A282A] flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#382022] text-base">Filter Rooms</h3>
              <p className="text-xs text-[#7A595B]">Refine by city, rent, and amenities</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
           {/*} <button
              onClick={handleReset}
              className="text-xs font-semibold text-[#7A595B] hover:text-[#382022] px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>*/}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* City Selection */}
          <div>
            <label className="block text-xs font-bold text-[#382022] uppercase tracking-wider mb-2">
              City
            </label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_CITIES.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => setLocalFilters({ ...localFilters, city })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    localFilters.city === city
                      ? 'bg-[#4A282A] text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* Area / Neighborhood Search */}
          <div>
            <label className="block text-xs font-bold text-[#382022] uppercase tracking-wider mb-2">
              Specific Area / Neighborhood
            </label>
            <input
              type="text"
              placeholder="e.g. Banke Gaun, Baluwatar, Lakeside..."
              value={localFilters.area}
              onChange={(e) => setLocalFilters({ ...localFilters, area: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8A4A4D]/20 focus:border-[#8A4A4D]"
            />
          </div>

          {/* Monthly Budget Range (NPR) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#382022] uppercase tracking-wider">
                Max Monthly Rent
              </label>
              <span className="text-xs font-extrabold text-[#4A282A]">
                {localFilters.maxRent === 0 || localFilters.maxRent >= 50000
                  ? 'No Limit'
                  : `Up to NPR ${new Intl.NumberFormat('en-NP').format(localFilters.maxRent)}`}
              </span>
            </div>
            <input
              type="range"
              min={3000}
              max={50000}
              step={1000}
              value={localFilters.maxRent || 50000}
              onChange={(e) => setLocalFilters({ ...localFilters, maxRent: Number(e.target.value) })}
              className="w-full accent-[#4A282A] h-2 bg-stone-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[#7A595B] mt-1">
              <span>NPR 3,000</span>
              <span>NPR 25,000</span>
              <span>NPR 50,000+</span>
            </div>
          </div>

          {/* Room Type */}
          <div>
            <label className="block text-xs font-bold text-[#382022] uppercase tracking-wider mb-2">
              Room Type
            </label>
            <div className="flex flex-wrap gap-2">
              {ROOM_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLocalFilters({ ...localFilters, roomType: type })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    localFilters.roomType === type
                      ? 'bg-[#4A282A] text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Facilities */}
          <div>
            <label className="block text-xs font-bold text-[#382022] uppercase tracking-wider mb-2.5">
              Essential Facilities Required
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setLocalFilters({ ...localFilters, wifi: !localFilters.wifi })}
                className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
                  localFilters.wifi
                    ? 'bg-[#F5E9E7] border-[#8A4A4D] text-[#4A282A]'
                    : 'bg-stone-50 border-stone-200 text-stone-600'
                }`}
              >
                <span>Wi-Fi Available</span>
                {localFilters.wifi && <Check className="w-4 h-4 text-[#8A4A4D]" />}
              </button>

              <button
                type="button"
                onClick={() => setLocalFilters({ ...localFilters, water: !localFilters.water })}
                className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
                  localFilters.water
                    ? 'bg-[#F5E9E7] border-[#8A4A4D] text-[#4A282A]'
                    : 'bg-stone-50 border-stone-200 text-stone-600'
                }`}
              >
                <span>24/7 Water Facility</span>
                {localFilters.water && <Check className="w-4 h-4 text-[#8A4A4D]" />}
              </button>

              <button
                type="button"
                onClick={() => setLocalFilters({ ...localFilters, parking: !localFilters.parking })}
                className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
                  localFilters.parking
                    ? 'bg-[#F5E9E7] border-[#8A4A4D] text-[#4A282A]'
                    : 'bg-stone-50 border-stone-200 text-stone-600'
                }`}
              >
                <span>Parking Space</span>
                {localFilters.parking && <Check className="w-4 h-4 text-[#8A4A4D]" />}
              </button>
            </div>
          </div>

          {/* Furnishing */}
          <div>
            <label className="block text-xs font-bold text-[#382022] uppercase tracking-wider mb-2">
              Furnishing
            </label>
            <div className="flex flex-wrap gap-2">
              {FURNISHED_OPTIONS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setLocalFilters({ ...localFilters, furnishedStatus: f })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    localFilters.furnishedStatus === f
                      ? 'bg-[#4A282A] text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 bg-[#F5E9E7] border-t border-[#ECC5C6] flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl border border-[#ECC5C6] bg-white text-[#4A282A] font-bold text-xs hover:bg-[#ECC5C6]/30 cursor-pointer"
          >
            Reset All
          </button>
          <button
            onClick={handleApply}
            style={{ backgroundColor: '#ECC5C6' }}
            className="flex-1 py-2.5 rounded-xl text-[#4A282A] font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm border border-[#DEACAE] hover:bg-[#DEACAE] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Show Filtered Results</span>
          </button>
        </div>
      </div>
    </div>
  );
};
