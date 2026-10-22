'use client';

import { useEffect, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { loadInstacartRecipeLink } from '@/modules/object/domain/instacart-wait';
import { AppLoader } from '@/shared/presentation/components/app-loader';

export type InstacartWaitViewProps = {
  objectId: string;
  replaceLocation?: (url: string) => void;
};

function defaultReplaceLocation(url: string): void {
  window.location.replace(url);
}

export function InstacartWaitView({
  objectId,
  replaceLocation = defaultReplaceLocation,
}: InstacartWaitViewProps) {
  const { t } = useI18n();
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadInstacartRecipeLink(objectId).then(
      (url) => {
        if (!cancelled) {
          replaceLocation(url);
        }
      },
      () => {
        if (!cancelled) {
          setError(true);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [objectId, replaceLocation]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-card-padding">
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
      <img
        src="/images/affiliate/instacart-logo-carrot.svg"
        alt=""
        className="instacart-btn__carrot"
      />
      {error ? (
        <p className="text-body text-error" role="status">
          {t('Instacart_Link_Failed')}
        </p>
      ) : (
        <AppLoader layout="center" label={t('Instacart_Recipe_Loading')} />
      )}
    </div>
  );
}
