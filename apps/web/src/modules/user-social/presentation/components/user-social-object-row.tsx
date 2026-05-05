'use client';

import Image from 'next/image';

import { objectFields, type ProjectedObjectView } from '@/modules/feed/application/dto/object-fields';
import type { SocialProjectedObjectView } from '@/modules/user-social/application/dto/user-social.dto';
import { AVATAR_PLACEHOLDER_SRC, shouldUnoptimizeRemoteImage } from '@/shared/presentation';

const THUMB = 44;

export type UserSocialObjectRowProps = {
  object: SocialProjectedObjectView;
};

export function UserSocialObjectRow({ object: o }: UserSocialObjectRowProps) {
  const view = o as unknown as ProjectedObjectView;
  const name = objectFields.name(view) ?? o.object_id;
  const img = objectFields.image(view);
  const weight = o.weight ?? null;
  const weightLabel = weight == null ? '—' : weight.toFixed(2);

  return (
    <li className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
      <div className="shrink-0">
        <span className="flex size-11 items-center justify-center overflow-hidden rounded-md border border-border bg-surface ring-1 ring-border/60">
          {img ? (
            <Image
              src={img}
              alt=""
              width={THUMB}
              height={THUMB}
              className="size-full object-cover"
              unoptimized={shouldUnoptimizeRemoteImage(img)}
            />
          ) : (
            <Image
              src={AVATAR_PLACEHOLDER_SRC}
              alt=""
              width={THUMB}
              height={THUMB}
              className="size-full object-cover"
            />
          )}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-fg">{name}</p>
      </div>
      <span className="shrink-0 rounded-md border border-border bg-surface-control px-2 py-0.5 font-mono text-body-sm text-fg-secondary">
        {weightLabel}
      </span>
    </li>
  );
}
