import React from 'react';
import { Room } from '../../types';
import { HelpCircle, Check, X } from 'lucide-react';

interface AvailabilityConfirmationModalProps {
  room: Room | null;
  isOpen: boolean;
  onConfirm: (isAvailable: boolean) => void;
}

export const AvailabilityConfirmationModal: React.FC<AvailabilityConfirmationModalProps> = ({
  room,
  isOpen,
  onConfirm
}) => {
  if (!isOpen || !room) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[#ECC5C6] flex flex-col p-6 animate-in zoom-in-95 duration-200">
        {/* Header Icon */}
        <div className="w-12 h-12 rounded-2xl bg-[#ECC5C6] text-[#4A282A] flex items-center justify-center mb-4 shadow-xs">
          <HelpCircle className="w-6 h-6 stroke-[2.2]" />
        </div>

        {/* Question Title */}
        <h3 className="text-xl font-extrabold text-[#382022] tracking-tight">
          Is this room still available?
        </h3>
        
        <p className="text-xs text-[#7A595B] mt-1.5 leading-relaxed">
          Khojamm checks availability with room owners every 24 hours after 5 days to ensure seekers only see vacant rooms.
        </p>

        {/* Room Mini Card */}
        <div className="mt-4 p-3.5 bg-[#F5E9E7]/80 rounded-2xl border border-[#ECC5C6] flex items-center gap-3">
          <img
            src={room.coverImageUrl || (room.imageUrls && room.imageUrls[0]) || ''}
            alt={room.title}
            className="w-14 h-14 rounded-xl object-cover shrink-0 bg-stone-100"
          />
          <div className="min-w-0">
            <h4 className="font-bold text-[#382022] text-xs sm:text-sm truncate">
              {room.title}
            </h4>
            <p className="text-xs text-[#7A595B] truncate mt-0.5">
              {room.location}, {room.city}
            </p>
            <p className="text-xs font-extrabold text-[#4A282A] mt-1">
              NPR {new Intl.NumberFormat('en-NP').format(room.rent)}/mo
            </p>
          </div>
        </div>

        {/* Confirmation Options */}
        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={() => onConfirm(true)}
            className="w-full py-3 px-4 rounded-xl bg-[#4A282A] hover:bg-[#381E20] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Yes, Still Available</span>
          </button>
          <button
            type="button"
            onClick={() => onConfirm(false)}
            className="w-full py-2.5 px-4 rounded-xl border border-rose-300 bg-rose-50/70 hover:bg-rose-100 text-rose-800 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
            <span>No, Mark as Booked / Remove</span>
          </button>
        </div>

        <p className="text-[11px] text-stone-400 text-center mt-4">
          Selecting &ldquo;Yes&rdquo; renews your listing for 30 days. Selecting &ldquo;No&rdquo; removes the listing immediately.
        </p>
      </div>
    </div>
  );
};
