'use client';

import React from 'react';
import Image from 'next/image';

type LogoProps = {
  /** when true -> use the short/collapsed logo */
  collapsed?: boolean;
  /** scale multiplier applied to base widths/heights (e.g. 0.75 to reduce 25%) */
  scale?: number;
  alt?: string;
  className?: string;
};

export default function Logo({
  collapsed = false,
  scale = 1,
  alt = 'AIRCO AIMS',
  className = 'object-contain',
}: LogoProps) {
  // base sizes used previously (after your 25% reduction suggestion)
  // collapsed base: 30x24 ; expanded base: 105x24
  const baseCollapsed = { width: 30, height: 24 };
  const baseExpanded = { width: 105, height: 24 };

  const { width, height } = collapsed ? baseCollapsed : baseExpanded;
  const finalWidth = Math.round(width * scale);
  const finalHeight = Math.round(height * scale);

  const src = collapsed ? '/shortLogo.png' : '/Logo2.png';

  return (
    <div className={`logo-root ${className}`}>
      <Image src={src} alt={alt} width={finalWidth} height={finalHeight} className={className} />
    </div>
  );
}
