import { ObjectPageLoadingSkeleton } from '@/modules/object/presentation/components/object-page-loading-skeleton';

/** Prefetch of `/object/:id` stops here — `[object-id]/layout` is not rendered. */
export default function ObjectRouteLoading() {
  return <ObjectPageLoadingSkeleton />;
}
