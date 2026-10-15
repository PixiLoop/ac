export function isMobileOrTablet(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent.toLowerCase();

  return (
    /android|iphone|ipad|ipod|mobile|tablet/.test(ua) ||
    (navigator.maxTouchPoints > 1 && window.innerWidth <= 1024)
  );
}
