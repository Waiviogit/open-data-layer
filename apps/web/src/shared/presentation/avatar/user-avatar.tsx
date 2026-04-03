'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import { AVATAR_PLACEHOLDER_SRC, resolveAvatarUrl } from './resolve-avatar-url';

export type UserAvatarProps = {
  username: string;
  avatarUrl?: string | null;
  size: number;
  /** Used for accessible label on the avatar image. */
  displayName?: string;
  className?: string;
  isSquare?: boolean;
};

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

  useEffect(() => {
    setImageFailed(false);
  }, [username, avatarUrl, size]);

  const onError = useCallback(() => {
    setImageFailed(true);
  }, []);

  const showFallback = imageFailed || !src;

  const shapeClass = isSquare ? 'rounded-btn' : 'rounded-circle';

  /** Locks the box in flex layouts: default `align-items: stretch` would vertically stretch the avatar row. */
  const dimensionStyle = {
    width: size,
    minWidth: size,
    height: size,
    minHeight: size,
  } as const;

  const commonClassName = [
    'self-start shrink-0 border-4 border-bg object-cover shadow-card',
    shapeClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (showFallback) {
    return (
      <Image
        src={AVATAR_PLACEHOLDER_SRC}
        alt={label}
        width={size}
        height={size}
        sizes={`${size}px`}
        className={commonClassName}
        style={dimensionStyle}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={label}
      width={size}
      height={size}
      sizes={`${size}px`}
      className={commonClassName}
      style={dimensionStyle}
      onError={onError}
    />
  );
}
