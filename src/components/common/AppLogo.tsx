import React from 'react';
import { APP_CONFIG } from '../../constants/appConfig';
import { adminRoleService } from '../../services/adminRoleService';

interface AppLogoProps {
  /** Optional custom image URL to replace the icon */
  iconUrl?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the app name text */
  showName?: boolean;
  /** Whether to show the tagline / quote */
  showQuote?: boolean;
  /** Optional click handler (e.g., for secret 7-tap admin access) */
  onClick?: () => void;
  className?: string;
}

/**
 * Beautiful, Modern, Professional Room-Finder Logo for Khojamm
 * Harmoniously combines a contemporary architectural room/house silhouette with
 * the stylized Khojamm 'K' monogram and location beacon.
 */
export const AppLogo: React.FC<AppLogoProps> = ({
  iconUrl,
  size = 'md',
  showName = true,
  showQuote = true,
  onClick,
  className = ''
}) => {
  const sizeClasses = {
    sm: {
      box: 'w-8 h-8 rounded-xl',
      svg: 'w-5 h-5',
      title: 'text-base',
      quote: 'text-[9.5px]'
    },
    md: {
      box: 'w-9 h-9 sm:w-10 sm:h-10 rounded-xl',
      svg: 'w-6 h-6',
      title: 'text-base sm:text-lg',
      quote: 'text-[10px] sm:text-[11px]'
    },
    lg: {
      box: 'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl',
      svg: 'w-8 h-8',
      title: 'text-xl sm:text-2xl',
      quote: 'text-xs'
    }
  };

  const current = sizeClasses[size];

  const [dynamicLogo, setDynamicLogo] = React.useState<string | undefined>(() => {
    return adminRoleService.getCustomLogo() || undefined;
  });

  React.useEffect(() => {
    const handleLogoUpdate = () => {
      setDynamicLogo(adminRoleService.getCustomLogo() || undefined);
    };
    window.addEventListener('khojam_logo_changed', handleLogoUpdate);
    return () => window.removeEventListener('khojam_logo_changed', handleLogoUpdate);
  }, []);

  const effectiveIconUrl = iconUrl || dynamicLogo || (APP_CONFIG.defaultLogoUrl || undefined);

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 sm:gap-2.5 select-none cursor-pointer transition-transform active:scale-95 ${className}`}
      role="button"
      tabIndex={0}
      title={`${APP_CONFIG.appName} - ${APP_CONFIG.countryBadge}`}
    >
      {/* Modern Room Finder Icon Badge */}
      <div 
        className={`${current.box} bg-[#4A282A] text-white flex items-center justify-center font-bold shadow-sm border-2 border-[#ECC5C6] overflow-hidden shrink-0 transition-transform hover:scale-105`}
      >
        {effectiveIconUrl ? (
          <img src={effectiveIconUrl} alt={`${APP_CONFIG.appName} Logo`} className="w-full h-full object-cover" />
        ) : (
          <svg
            className={`${current.svg} text-white`}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Elegant architectural roof silhouette */}
            <path
              d="M16 2.5L26.5 11.2L24.8 13.2L16 6L7.2 13.2L5.5 11.2L16 2.5Z"
              fill="#ECC5C6"
            />
            {/* Stylized Modern Khojamm 'K' Room Finder lettermark */}
            <path
              d="M8.5 7.5C8.5 6.67 9.17 6 10 6H12C12.83 6 13.5 6.67 13.5 7.5V26.5C13.5 27.33 12.83 28 12 28H10C9.17 28 8.5 27.33 8.5 26.5V7.5Z"
              fill="#FFFFFF"
            />
            <path
              d="M14 17.5L21.5 8C22.1 7.2 23.1 7.1 23.8 7.7L24.9 8.7C25.6 9.3 25.6 10.3 25 11L17.2 19L25.3 26C25.9 26.6 25.9 27.6 25.2 28.3L24 29.3C23.3 29.9 22.3 29.8 21.7 29.1L14 19.8V17.5Z"
              fill="#FFFFFF"
            />
            {/* Keyhole / Location finding pinpoint beacon */}
            <circle cx="23.5" cy="5" r="2" fill="#ECC5C6" />
          </svg>
        )}
      </div>

      {/* Brand Text & Tagline */}
      {showName && (
        <div className="flex flex-col justify-center py-0.5">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`${current.title} font-extrabold text-[#382022] tracking-tight leading-none`}>
              {APP_CONFIG.appName}
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#ECC5C6] text-[#4A282A] border border-[#DEACAE] leading-none">
              {APP_CONFIG.countryBadge}
            </span>
          </div>
          {showQuote && (
            <span 
              className={`${current.quote} text-[#7A595B] not-italic tracking-normal truncate max-w-[170px] sm:max-w-none mt-1 leading-none font-medium`}
            >
              {APP_CONFIG.tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
