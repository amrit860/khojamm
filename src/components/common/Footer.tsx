import React, { useState } from 'react';
import { AppLogo } from './AppLogo';
import { APP_CONFIG } from '../../constants/appConfig';
import { 
  Share2, 
  Check, 
  Copy, 
  ShieldCheck
} from 'lucide-react';

interface FooterProps {
  customLogoUrl?: string;
  onOpenAuth?: () => void;
  onNavigateAbout?: () => void;
  onNavigateContact?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ 
  customLogoUrl, 
  onNavigateAbout, 
  onNavigateContact 
}) => {
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const getShareUrl = () => {
    return typeof window !== 'undefined' ? window.location.href : 'https://khojam.np';
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setShareFeedback('Link copied to clipboard!');
      setTimeout(() => {
        setCopied(false);
        setShareFeedback(null);
      }, 2500);
    } catch {
      setShareFeedback('Could not copy link.');
      setTimeout(() => setShareFeedback(null), 2000);
    }
  };

  const handleFacebookShare = () => {
    handleCopyLink();
    setShareFeedback('Link copied! Paste into your Facebook post, groups, or messages.');
    setTimeout(() => setShareFeedback(null), 3500);
  };

  const handleInstagramShare = async () => {
    await handleCopyLink();
    setShareFeedback('Link copied! Open Instagram and paste into your story, bio, or direct messages.');
    setTimeout(() => setShareFeedback(null), 4000);
  };

  const handleTikTokShare = async () => {
    await handleCopyLink();
    setShareFeedback('Link copied! Paste in your TikTok bio or DM to friends.');
    setTimeout(() => setShareFeedback(null), 4000);
  };

  return (
    <footer className="mt-8 sm:mt-10 bg-white border-t border-[#ECC5C6] text-[#382022] w-full max-w-full overflow-hidden">
      {/* Main Footer Container - Compact spacing */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-7">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-8">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-2.5">
            <AppLogo
              iconUrl={customLogoUrl}
              size="lg"
              showName={true}
              showQuote={true}
            />
            <p className="text-xs sm:text-sm text-[#7A595B] leading-relaxed max-w-sm">
              Nepal&apos;s trusted rental room and flat finder network. Direct owner contact numbers, transparent monthly rent terms, and zero middleman broker fees.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#8A4A4D]">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Verified Listings • 30-Day Freshness Assurance</span>
            </div>

            {/* Quick Links: About Us & Contact Us */}
            <div className="flex items-center gap-3 pt-1 text-xs font-bold text-[#4A282A]">
              <button
                type="button"
                onClick={onNavigateAbout}
                className="hover:text-[#8A4A4D] transition-colors underline-offset-4 hover:underline cursor-pointer"
              >
                About Us
              </button>
              <span className="text-[#DEACAE]">•</span>
              <button
                type="button"
                onClick={onNavigateContact}
                className="hover:text-[#8A4A4D] transition-colors underline-offset-4 hover:underline cursor-pointer"
              >
                Contact Us
              </button>
            </div>
          </div>

          {/* Social Share & Spread the Word Feature */}
          <div className="md:col-span-7 bg-[#F5E9E7]/60 border border-[#ECC5C6] rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-[#8A4A4D] uppercase tracking-wider flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Share Khojamm with Friends &amp; Family</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#ECC5C6] text-[#4A282A] text-[10px] font-bold">
                  Spread the Word
                </span>
              </div>
              <p className="text-xs text-[#7A595B] leading-relaxed">
                Know someone looking for a room or flat in Nepal? Share Khojamm directly via Facebook, Instagram, or TikTok.
              </p>
            </div>

            {/* Social Share Buttons Grid */}
            <div className="mt-3.5 space-y-2.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Facebook Share Button */}
                <button
                  onClick={handleFacebookShare}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Share to Facebook"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </button>

                {/* Instagram Share Button */}
                <button
                  onClick={handleInstagramShare}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white font-bold text-xs shadow-xs hover:opacity-95 transition-all active:scale-95 cursor-pointer"
                  title="Share to Instagram"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  <span>Instagram</span>
                </button>

                {/* TikTok Share Button */}
                <button
                  onClick={handleTikTokShare}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-black hover:bg-stone-900 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Share to TikTok"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  </svg>
                  <span>TikTok</span>
                </button>

                {/* Direct Link Copy Button */}
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl bg-white hover:bg-stone-50 text-[#382022] border border-[#DEACAE] font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Copy Direct Link"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#8A4A4D]" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Toast Feedback */}
              {shareFeedback && (
                <div className="p-2 bg-white/90 border border-[#DEACAE] rounded-xl text-xs font-semibold text-[#4A282A] animate-in fade-in flex items-center justify-between gap-2 shadow-xs">
                  <span>{shareFeedback}</span>
                  <button 
                    onClick={() => setShareFeedback(null)} 
                    className="text-stone-400 hover:text-stone-700 text-[11px] cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Credits & Copyright */}
        <div className="mt-5 pt-3 border-t border-[#ECC5C6]/60 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-[#7A595B]">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
            <span>© 2026 {APP_CONFIG.appName} Nepal.</span>
            <span>•</span>
            <span 
              className="text-stone-800 font-medium"
            >
              &ldquo;{APP_CONFIG.tagline}&rdquo;
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium text-stone-500">
            <span>Kathmandu</span>
            <span>•</span>
            <span>Pokhara</span>
            <span>•</span>
            <span>Lalitpur</span>
            <span>•</span>
            <span>Nepalgunj</span>
            <span>•</span>
            <span>All Nepal</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
