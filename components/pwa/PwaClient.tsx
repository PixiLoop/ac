'use client';

import { useEffect } from 'react';
import { isMobileOrTablet } from '../../lib/isMobile';

export default function PwaClient() {
  useEffect(() => {
    if (!isMobileOrTablet()) {
      console.log('[PWA] Desktop – skipping manifest + SW');
      return;
    }

    // Dynamically inject manifest ONLY on mobile
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.json';
    document.head.appendChild(link);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('[PWA] Service worker registered (mobile)'))
        .catch(err => console.error('[PWA] SW failed', err));
    }

    return () => {
      // Safe removal check
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  return null;
}
