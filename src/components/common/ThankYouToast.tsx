import React from 'react';
import { Check } from 'lucide-react';

interface ThankYouToastProps {
  show: boolean;
  message?: string;
  subMessage?: string;
}

export const ThankYouToast: React.FC<ThankYouToastProps> = ({ 
  show, 
  message = "Thank you", 
  subMessage = "Listing renewed for 30 more days" 
}) => {
  if (!show) return null;

  return (
    <div 
      className="fixed top-5 right-5 z-[9999] pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-4"
      role="status"
      aria-live="polite"
    >
      <div className="bg-emerald-900/90 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500/30">
        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-sm">
          <Check className="w-4 h-4 stroke-[3]" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide">{message}</p>
          {subMessage && (
            <p className="text-[11px] text-emerald-200">{subMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};
