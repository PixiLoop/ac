'use client';

import React, { useEffect, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import {
  fetchAuthenticatedObjectUrl,
  resolveMediaUrl,
} from '../../../../lib/authenticated-media';

export function resolvePhotoUrl(path?: string | null) {
  return resolveMediaUrl(path);
}

/** Private Azure blobs cannot be loaded in <img src> anonymously — fetch with JWT. */
export function AuthenticatedPhoto({
  src,
  alt,
  className,
  openOnClick = true,
}: {
  src: string;
  alt: string;
  className?: string;
  openOnClick?: boolean;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    setObjectUrl(null);
    setFailed(false);

    if (!src) return;

    (async () => {
      try {
        const url = await fetchAuthenticatedObjectUrl(src);
        if (!url) throw new Error('empty');
        if (url.startsWith('blob:')) created = url;
        if (!cancelled) setObjectUrl(url);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [src]);

  if (failed) {
    return (
      <div
        className={`${className || ''} flex items-center justify-center bg-slate-100 text-slate-400`}
      >
        <ImagePlus className="w-4 h-4" />
      </div>
    );
  }

  if (!objectUrl) {
    return (
      <div className={`${className || ''} flex items-center justify-center bg-slate-100`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={objectUrl}
      alt={alt}
      className={className}
      onClick={
        openOnClick
          ? (e) => {
              e.stopPropagation();
              window.open(objectUrl, '_blank', 'noopener,noreferrer');
            }
          : undefined
      }
    />
  );
}
