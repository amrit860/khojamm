import React from 'react';
import { Plus } from 'lucide-react';

interface StickyPostButtonProps {
  onClick: () => void;
  title?: string;
}

export const StickyPostButton: React.FC<StickyPostButtonProps> = ({ 
  onClick, 
  title = "Post a Room" 
}) => {
  return (
    <div className="fixed bottom-[calc(5rem+var(--safe-bottom))] md:bottom-8 right-4 sm:right-6 z-40 pointer-events-auto">
      <button
        type="button"
        onClick={onClick}
        aria-label="Post a Room"
        title="Post a Room"
        className="px-4 py-3 rounded-full bg-[#4A282A] hover:bg-[#381E20] text-white shadow-xl hover:shadow-2xl flex items-center gap-2 transition-all duration-300 transform hover:scale-105 active:scale-95 border-2 border-[#ECC5C6] focus:outline-none focus:ring-4 focus:ring-[#ECC5C6]/40 cursor-pointer"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
        <span className="text-xs font-extrabold tracking-wide pr-1">Post a Room</span>
      </button>
    </div>
  );
};
