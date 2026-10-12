import React, { useEffect, useState } from 'react';
import { subscribeToSimulatedEmailInbox } from '../../services/otpService';
import { Mail, CheckCircle2, Copy, X } from 'lucide-react';

export const EmailNotificationSim: React.FC = () => {
  const [notification, setNotification] = useState<{ email: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSimulatedEmailInbox((payload) => {
      setNotification(payload);
      setCopied(false);
    });
    return () => unsubscribe();
  }, []);

  if (!notification) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(notification.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-[#ECC5C6] p-4 animate-in slide-in-from-top duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#F5E9E7] flex items-center justify-center text-[#4A282A] shrink-0 border border-[#ECC5C6]">
          <Mail className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#4A282A] uppercase tracking-wider">
            <span>Incoming Email</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xs text-[#7A595B] truncate mt-0.5">To: {notification.email}</p>
          <div className="mt-2 p-2.5 bg-[#F5E9E7]/60 rounded-xl border border-[#ECC5C6]/80">
            <p className="text-xs text-[#382022]">Your Khojamm verification OTP is:</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-mono font-bold tracking-widest text-[#4A282A]">
                {notification.code}
              </span>
              <button
                onClick={copyCode}
                className="px-2.5 py-1 text-xs font-bold bg-[#4A282A] hover:bg-[#381E20] text-white rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-[10px] text-stone-500 mt-1">Valid for 10 minutes</p>
          </div>
        </div>
        <button
          onClick={() => setNotification(null)}
          className="text-stone-400 hover:text-stone-600 p-1 rounded-lg cursor-pointer"
          aria-label="Dismiss email"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
