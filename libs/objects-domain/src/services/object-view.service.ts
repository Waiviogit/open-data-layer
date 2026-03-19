import { Injectable } from '@nestjs/common';
import type { AggregatedObject, VoterReputationMap } from '../types/aggregated-object';
import type { ResolveOptions } from '../types/resolve-options';
import type { ResolvedObjectView } from '../types/resolved-view';
import { DEFAULT_GOVERNANCE_SNAPSHOT } from '../types/governance-snapshot';
import { resolveObjectViews } from '../resolver/resolve-object-view';

/**
 * NestJS-injectable thin wrapper around the pure resolveObjectViews function.
 * Accepts raw aggregated DB data and resolution options, returns resolved views.
 */
@Injectable()
export class ObjectViewService {
  resolve(
    objects: AggregatedObject[],
    voterReputations: VoterReputationMap,
    options: Partial<ResolveOptions> & { update_types: string[] },
  ): ResolvedObjectView[] {
    const opts: ResolveOptions = {
      locale: 'en-US',
      governance: DEFAULT_GOVERNANCE_SNAPSHOT,
      include_rejected: false,
      ...options,
    };
    return resolveObjectViews(objects, voterReputations, opts);
  }
}
