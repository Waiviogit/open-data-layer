'use client';

import { useCallback, useEffect, useState } from 'react';

import { resolveAvatarUrl } from './resolve-avatar-url';

export type UserAvatarProps = {
  username: string;
  avatarUrl?: string | null;
  size: number;
  /** Used for initials fallback and accessible label when image is missing. */
  displayName?: string;
  className?: string;
  isSquare?: boolean;
};

function initialsFrom(label: string): string {
  const t = label.trim();
  if (!t) {
    return '?';
  }
  return t.slice(0, 2).toUpperCase();
}

export function UserAvatar({
  username,
  avatarUrl,
  size,
  displayName,
  className = '',
  isSquare = false,
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const src = resolveAvatarUrl({ username, avatarUrl, size });
  const label = displayName?.trim() || username;
  const initials = initialsFrom(displayName ?? username);

  useEffect(() => {
    setImageFailed(false);
  }, [username, avatarUrl, size]);

  const onError = useCallback(() => {
    setImageFailed(true);
  }, []);

  const showFallback = imageFailed || !src;

  const dimensionStyle = {
    width: size,
    minWidth: size,
    height: size,
  } as const;

  const shapeClass = isSquare ? 'rounded-btn' : 'rounded-circle';

  const textSizeClass = size > 64 ? 'text-lg' : 'text-body-sm';

  if (showFallback) {
    return (
      <div
        className={[
          'flex shrink-0 items-center justify-center border-4 border-bg bg-bg font-semibold text-fg shadow-card',
          shapeClass,
          textSizeClass,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={dimensionStyle}
        aria-label={label}
        role="img"
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={label}
      width={size}
      height={size}
      className={[
        'shrink-0 border-4 border-bg object-cover shadow-card',
        shapeClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={dimensionStyle}
      onError={onError}
    />
  );
}
