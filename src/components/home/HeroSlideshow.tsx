import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { showcaseService, ShowcasePhoto } from '../../services/showcaseService';

interface HeroSlideshowProps {
  className?: string;
  onPhotoClick?: (index: number) => void;
}

export const HeroSlideshow: React.FC<HeroSlideshowProps> = ({
  className = '',
  onPhotoClick
}) => {
  const [photos, setPhotos] = useState<ShowcasePhoto[]>(() => showcaseService.getPhotos());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      const updated = showcaseService.getPhotos();
      setPhotos(updated);
      setCurrentIndex(0);
    };
    window.addEventListener('khojam_showcase_updated', handleUpdate);
    return () => window.removeEventListener('khojam_showcase_updated', handleUpdate);
  }, []);

  useEffect(() => {
    if (isPaused || photos.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [isPaused, photos.length]);

  if (photos.length === 0) return null;

  const activeIndex = Math.min(currentIndex, photos.length - 1);
  const currentPhoto = photos[activeIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  return (
    <div 
      className={`relative w-full rounded-3xl overflow-hidden border border-[#ECC5C6] shadow-md bg-stone-900 group ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div 
        onClick={() => onPhotoClick?.(activeIndex)}
        className="relative h-56 sm:h-72 md:h-80 w-full overflow-hidden cursor-pointer"
      >
        {photos.map((item, idx) => (
          <div
            key={item.id || idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === activeIndex ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <img
              src={item.url}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-7000 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/20 to-transparent" />
          </div>
        ))}

        {/* Slide Caption */}
        {currentPhoto && (Boolean(currentPhoto.title) || Boolean(currentPhoto.caption)) && (
          <div className="absolute bottom-4 left-4 right-16 z-20 text-white">
            {currentPhoto.title && (
              <h3 className="text-base sm:text-xl font-extrabold tracking-tight drop-shadow-md text-white">
                {currentPhoto.title}
              </h3>
            )}
            {currentPhoto.caption && (
              <p className="text-xs text-[#ECC5C6] font-medium drop-shadow-xs flex items-center gap-1 mt-0.5">
                <span>📍 {currentPhoto.caption}</span>
              </p>
            )}
          </div>
        )}

        {/* Manual Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
              aria-label="Next slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Slide Indicators / Dots */}
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5">
              {photos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === activeIndex ? 'w-5 bg-[#ECC5C6]' : 'w-1.5 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
