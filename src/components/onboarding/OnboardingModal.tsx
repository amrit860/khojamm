import React, { useState } from 'react';
import { Home, Search, PlusCircle, PhoneCall, ArrowRight, Check } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ONBOARDING_SLIDES = [
  {
    title: "Find a place that feels like home",
    description: "Discover curated rooms and flats matching your exact location, budget, and lifestyle in Nepal.",
    icon: Home,
    tag: "Welcome to Khojamm",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
    accent: "bg-teal-50 text-teal-800 border-teal-200"
  },
  {
    title: "Explore real room listings",
    description: "Browse high-resolution interior photos, verified monthly rents, water & Wi-Fi facilities, and landmark locations.",
    icon: Search,
    tag: "Transparent & Verified",
    image: "https://images.unsplash.com/photo-1502005229762-ee1b2b814660?auto=format&fit=crop&w=800&q=80",
    accent: "bg-amber-50 text-amber-800 border-amber-200"
  },
  {
    title: "Post your available room",
    description: "Room owners can publish vacancies with zero hassle, upload multiple photos, and set custom terms.",
    icon: PlusCircle,
    tag: "For Property Owners",
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
    accent: "bg-indigo-50 text-indigo-800 border-indigo-200"
  },
  {
    title: "Find it. View it. Contact the owner.",
    description: "Direct communication with property owners without hidden middleman fees. Simple, fast, and reliable.",
    icon: PhoneCall,
    tag: "Direct Connect",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    accent: "bg-emerald-50 text-emerald-800 border-emerald-200"
  }
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const isLast = currentSlide === ONBOARDING_SLIDES.length - 1;
  const slide = ONBOARDING_SLIDES[currentSlide];
  const Icon = slide.icon;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[90vh]">
        {/* Top bar with tag & skip */}
        <div className="p-4 flex items-center justify-between border-b border-stone-100 bg-[#FBFBFA]">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${slide.accent}`}>
            {slide.tag}
          </span>
          <button
            onClick={onClose}
            className="text-xs font-medium text-stone-500 hover:text-stone-800 px-2 py-1 rounded-md transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Visual Hero Container */}
        <div className="relative h-60 w-full overflow-hidden bg-stone-100">
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/95 backdrop-blur-md flex items-center justify-center text-teal-800 shadow-lg">
              <Icon className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="text-white text-xs font-medium">
              Step {currentSlide + 1} of {ONBOARDING_SLIDES.length}
            </div>
          </div>
        </div>

        {/* Text Body */}
        <div className="p-6 flex-1 flex flex-col justify-between bg-[#FFFFFF]">
          <div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight leading-snug">
              {slide.title}
            </h2>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              {slide.description}
            </p>
          </div>

          {/* Indicators and Action Buttons */}
          <div className="mt-8 pt-4 border-t border-stone-100">
            <div className="flex items-center justify-between gap-4">
              {/* Pagination Dots */}
              <div className="flex items-center gap-1.5">
                {ONBOARDING_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === currentSlide
                        ? 'w-6 bg-teal-700'
                        : 'w-2 bg-stone-300 hover:bg-stone-400'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Action Button */}
              <button
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-medium text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              >
                {isLast ? (
                  <>
                    <span>Get Started</span>
                    <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
