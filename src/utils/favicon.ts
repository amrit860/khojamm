/**
 * Dynamic Favicon Manager for Khojamm
 * Synchronizes the browser tab's favicon with the custom app logo
 * or falls back to the Khojamm Room Finder Emblem (#4A282A and #ECC5C6).
 */

const DEFAULT_SVG_FAVICON = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect x="1" y="1" width="30" height="30" rx="7.5" fill="#4A282A" stroke="#ECC5C6" stroke-width="1.8"/>
  <path d="M16 3L26 11.5L24.5 13.5L16 6.5L7.5 13.5L6 11.5L16 3Z" fill="#ECC5C6"/>
  <path d="M8 8.5C8 7.67 8.67 7 9.5 7H11.5C12.33 7 13 7.67 13 8.5V26C13 26.83 12.33 27.5 11.5 27.5H9.5C8.67 27.5 8 26.83 8 26V8.5Z" fill="#FFFFFF"/>
  <path d="M13.5 18L21.4 8C22 7.2 23 7.1 23.7 7.7L24.8 8.7C25.5 9.3 25.5 10.3 24.9 11L16.8 19.4L25.2 26.2C25.8 26.8 25.8 27.8 25.1 28.5L23.9 29.5C23.2 30.1 22.2 30 21.6 29.3L13.5 20.3V18Z" fill="#FFFFFF"/>
  <circle cx="23.5" cy="5.5" r="2" fill="#ECC5C6"/>
</svg>
`.trim())}`;

export function updateAppFavicon(iconUrl?: string | null): void {
  if (typeof document === 'undefined') return;

  const targetUrl = iconUrl && iconUrl.trim() ? iconUrl.trim() : DEFAULT_SVG_FAVICON;

  // Remove any existing icon links so browser immediately refreshes the tab icon
  const existingLinks = document.querySelectorAll("link[rel*='icon']");
  existingLinks.forEach(el => el.parentNode?.removeChild(el));

  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = targetUrl.startsWith('data:image/svg') 
    ? 'image/svg+xml' 
    : (targetUrl.startsWith('data:image/') ? targetUrl.substring(5, targetUrl.indexOf(';')) : 'image/png');
  link.href = targetUrl;
  document.head.appendChild(link);

  // Also update apple-touch-icon
  let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
  if (!appleLink) {
    appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    document.head.appendChild(appleLink);
  }
  appleLink.href = targetUrl;
}
