'use client';

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

  const dimensionStyle = {
    width: size,
    minWidth: size,
    height: size,
  } as const;

  const shapeClass = isSquare ? 'rounded-btn' : 'rounded-circle';

  if (showFallback) {
    return (
      <img
        src={AVATAR_PLACEHOLDER_SRC}
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
      />
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
