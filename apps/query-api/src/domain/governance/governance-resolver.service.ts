import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OBJECT_TYPES } from '@opden-data-layer/core';
import type { AggregatedObject } from '@opden-data-layer/objects-domain';
import {
  DEFAULT_GOVERNANCE_SNAPSHOT,
  ObjectViewService,
  type GovernanceScope,
  type GovernanceSnapshot,
} from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository, UserAccountMutesRepository } from '../../repositories';
import { assembleSnapshot } from './assemble-snapshot';
import { GOVERNANCE_SNAPSHOT_CACHE_TTL_SEC } from '../../constants/cache.constants';
import { GOVERNANCE_UPDATE_TYPES } from './governance.constants';
import { mergeGovernanceSnapshots } from './merge-governance-snapshots';

type CachedSnapshot = {
  snapshot: GovernanceSnapshot;
  expiresAt: number;
};

@Injectable()
export class GovernanceResolverService {
  private readonly logger = new Logger(GovernanceResolverService.name);
  private readonly snapshotCache = new Map<string, CachedSnapshot>();

  constructor(
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly config: ConfigService,
    private readonly userAccountMutesRepo: UserAccountMutesRepository,
  ) {}

  async resolve(objectId: string): Promise<GovernanceSnapshot> {
    const { objects, voterWaivPowers } = await this.aggregatedObjectRepo.loadByObjectIds([objectId], {
      includeRankVoteProjection: false,
    });
    const root = objects[0];
    if (!root || root.core.object_type !== OBJECT_TYPES.GOVERNANCE) {
      return DEFAULT_GOVERNANCE_SNAPSHOT;
    }

    const rootView = this.resolveFilteredView(root, voterWaivPowers);
    const snapshot = assembleSnapshot(rootView);

    const inheritedIds = uniqueIds(snapshot.inherits_from.map((e) => e.object_id));
    if (inheritedIds.length > 0) {
      const { objects: inheritedRows } = await this.aggregatedObjectRepo.loadByObjectIds(inheritedIds, {
        includeRankVoteProjection: false,
      });
      const byId = new Map(inheritedRows.map((o) => [o.core.object_id, o]));

      for (const entry of snapshot.inherits_from) {
        const childAgg = byId.get(entry.object_id);
        if (!childAgg || childAgg.core.object_type !== OBJECT_TYPES.GOVERNANCE) {
          this.logger.warn(
            `governance resolve: inherits_from target '${entry.object_id}' missing or not governance; skipping`,
          );
          continue;
        }
        const childView = this.resolveFilteredView(childAgg, voterWaivPowers);
        const childSnap = assembleSnapshot(childView);
        await this.applyModeratorMutes(childSnap);
        mergeInheritedScopes(snapshot, childSnap, entry.scope);
      }
    }

    await this.applyModeratorMutes(snapshot);
    applyWhitelistToMuted(snapshot);
    return snapshot;
  }

  /**
   * Resolves platform governance from config, optionally merges with a header-specified governance object.
   */
  async resolveMergedForObjectView(optionalHeaderObjectId?: string): Promise<GovernanceSnapshot> {
    const governanceObjectId = (this.config.get<string>('governance.objectId') ?? '').trim();
    const headerId = optionalHeaderObjectId?.trim() ?? '';
    const cacheKey = `${governanceObjectId}\0${headerId}`;
    const now = Date.now();
    const cached = this.snapshotCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.snapshot;
    }

    const base =
      governanceObjectId.length > 0
        ? await this.resolve(governanceObjectId)
        : DEFAULT_GOVERNANCE_SNAPSHOT;

    const merged =
      headerId.length === 0 ? base : mergeGovernanceSnapshots(await this.resolve(headerId), base);

    this.snapshotCache.set(cacheKey, {
      snapshot: merged,
      expiresAt: now + GOVERNANCE_SNAPSHOT_CACHE_TTL_SEC * 1000,
    });
    return merged;
  }

  private resolveFilteredView(agg: AggregatedObject, voterWaivPowers: Map<string, number>) {
    const creator = agg.core.creator;
    const filtered: AggregatedObject = {
      ...agg,
      updates: agg.updates.filter((u) => u.creator === creator),
      validity_votes: agg.validity_votes.filter((v) => v.voter === creator),
    };
    const [view] = this.objectViewService.resolve([filtered], voterWaivPowers, {
      update_types: GOVERNANCE_UPDATE_TYPES,
      governance: DEFAULT_GOVERNANCE_SNAPSHOT,
    });
    return view;
  }

  private async loadMutesForModerators(moderators: string[]): Promise<string[]> {
    return this.userAccountMutesRepo.listMutedForMuters(moderators);
  }

  private async applyModeratorMutes(snapshot: GovernanceSnapshot): Promise<void> {
    const fromModerators = await this.loadMutesForModerators(snapshot.moderators);
    snapshot.muted = dedupeStrings([...snapshot.muted, ...fromModerators]);
  }
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function mergeInheritedScopes(
  root: GovernanceSnapshot,
  child: GovernanceSnapshot,
  scopes: GovernanceScope[],
): void {
  for (const scope of scopes) {
    switch (scope) {
      case 'admins':
        root.admins = dedupeStrings([...root.admins, ...child.admins]);
        break;
      case 'trusted':
        root.trusted = dedupeStrings([...root.trusted, ...child.trusted]);
        break;
      case 'moderators':
        root.moderators = dedupeStrings([...root.moderators, ...child.moderators]);
        break;
      case 'authorities':
        root.authorities = dedupeStrings([...root.authorities, ...child.authorities]);
        break;
      case 'restricted':
        root.restricted = dedupeStrings([...root.restricted, ...child.restricted]);
        break;
      case 'banned':
        root.banned = dedupeStrings([...root.banned, ...child.banned]);
        break;
      case 'whitelist':
        root.whitelist = dedupeStrings([...root.whitelist, ...child.whitelist]);
        break;
      case 'muted':
        root.muted = dedupeStrings([...root.muted, ...child.muted]);
        break;
      case 'validityCutoff':
        root.validity_cutoff = mergeValidityCutoff(root.validity_cutoff, child.validity_cutoff);
        break;
      default:
        break;
    }
  }
}

function mergeValidityCutoff(
  a: GovernanceSnapshot['validity_cutoff'],
  b: GovernanceSnapshot['validity_cutoff'],
): GovernanceSnapshot['validity_cutoff'] {
  const byAccount = new Map<string, (typeof a)[0]>();
  for (const row of a) {
    byAccount.set(row.account, row);
  }
  for (const row of b) {
    byAccount.set(row.account, row);
  }
  return [...byAccount.values()];
}

function applyWhitelistToMuted(snapshot: GovernanceSnapshot): void {
  if (snapshot.whitelist.length === 0) {
    return;
  }
  const allow = new Set(snapshot.whitelist);
  snapshot.muted = snapshot.muted.filter((m) => !allow.has(m));
}
