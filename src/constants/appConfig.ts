/**
 * Khojamm Master Application Configuration & Editable Copy
 */

export const APP_CONFIG = {
  // Brand Identity
  appName: 'Khojamm',
  countryBadge: 'Nepal',
  tagline: 'Your next room, just a tap away',
  metaDescription: "Khojamm: Nepal's premier rental room finder. Your next room, just a tap away.",
  defaultLogoUrl: '', // Dynamic custom logo uploaded via Admin or fallback to vector logo

  // Initial Master Super Admin Account
  defaultRealAdminEmail: 'amritacharya25@gmail.com',

  // Expiry & Checking intervals
  roomExpiryDays: 30,
  availabilityCheckDays: 5,
  availabilityCheckIntervalHours: 24,

  // UI Copy
  home: {
    heroTitle: 'Khojamm',
    heroTag: 'Khojamm • Nepal Rental Network',
    heroSubtitle: 'Discover verified rental rooms, private flats, and shared apartments across Nepal. Direct owner contacts, transparent monthly rents, and zero broker commissions.',
    searchPlaceholder: 'Search by city, tole, or local name (e.g. Nepalgunj, Banke Gaun, Baluwatar)...',
    availableRoomsTitle: 'Available Rooms in Nepal',
    calloutBadge: 'For Room & Flat Owners',
    calloutTitle: 'Have a vacant room or flat in Nepal?',
    calloutDescription: 'Publish your listing directly to seekers with photos, rent terms, and amenities on Khojamm. Direct tenant calls, zero commission.',
    calloutButton: 'Post Your Room Now'
  },

  search: {
    title: 'Search Khojamm Rooms',
    subtitle: 'Find rooms, flats & shared spaces with direct contact details',
    placeholder: 'Type city, tole, or local name (e.g. Nepalgunj, Banke Gaun, Lakeside)...',
  },

  rooms: {
    directContactLabel: 'Direct Contact',
    callNow: 'Call Now',
    verifiedListing: 'Verified Listing',
    thirtyDayFreshness: ' 30-day lifecycle',
  },

  // Brand Color Palette
  colors: {
    primary: '#4A282A',
    primaryHover: '#381E20',
    primaryLight: '#F5E9E7',
    accent: '#ECC5C6',
    accentBorder: '#DEACAE',
    accentDark: '#8A4A4D',
    textMain: '#382022',
    textMuted: '#7A595B'
  }
};
