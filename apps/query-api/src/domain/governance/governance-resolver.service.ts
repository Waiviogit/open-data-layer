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
import { AggregatedObjectRepository } from '../../repositories';
import { assembleSnapshot } from './assemble-snapshot';
import { GOVERNANCE_UPDATE_TYPES } from './governance.constants';
import { mergeGovernanceSnapshots } from './merge-governance-snapshots';

@Injectable()
export class GovernanceResolverService {
  private readonly logger = new Logger(GovernanceResolverService.name);

  constructor(
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly config: ConfigService,
  ) {}

  async resolve(objectId: string): Promise<GovernanceSnapshot> {
    const { objects, voterReputations } = await this.aggregatedObjectRepo.loadByObjectIds([objectId]);
    const root = objects[0];
    if (!root || root.core.object_type !== OBJECT_TYPES.GOVERNANCE) {
      return DEFAULT_GOVERNANCE_SNAPSHOT;
    }

    const rootView = this.resolveFilteredView(root, voterReputations);
    const snapshot = assembleSnapshot(rootView);

    const inheritedIds = uniqueIds(snapshot.inherits_from.map((e) => e.object_id));
    if (inheritedIds.length > 0) {
      const { objects: inheritedRows } = await this.aggregatedObjectRepo.loadByObjectIds(inheritedIds);
      const byId = new Map(inheritedRows.map((o) => [o.core.object_id, o]));

      for (const entry of snapshot.inherits_from) {
        const childAgg = byId.get(entry.object_id);
        if (!childAgg || childAgg.core.object_type !== OBJECT_TYPES.GOVERNANCE) {
          this.logger.warn(
            `governance resolve: inherits_from target '${entry.object_id}' missing or not governance; skipping`,
          );
          continue;
        }
        const childView = this.resolveFilteredView(childAgg, voterReputations);
        const childSnap = assembleSnapshot(childView);
        await this.applyModeratorMuteStub(childSnap);
        mergeInheritedScopes(snapshot, childSnap, entry.scope);
      }
    }

    await this.applyModeratorMuteStub(snapshot);
    applyWhitelistToMuted(snapshot);
    return snapshot;
  }

  /**
   * Resolves platform governance from config, optionally merges with a header-specified governance object.
   */
  async resolveMergedForObjectView(optionalHeaderObjectId?: string): Promise<GovernanceSnapshot> {
    const governanceObjectId = (this.config.get<string>('governance.objectId') ?? '').trim();
    const base =
      governanceObjectId.length > 0
        ? await this.resolve(governanceObjectId)
        : DEFAULT_GOVERNANCE_SNAPSHOT;

    const headerId = optionalHeaderObjectId?.trim() ?? '';
    if (headerId.length === 0) {
      return base;
    }

    const overlay = await this.resolve(headerId);
    return mergeGovernanceSnapshots(overlay, base);
  }

  private resolveFilteredView(agg: AggregatedObject, voterReputations: Map<string, number>) {
    const creator = agg.core.creator;
    const filtered: AggregatedObject = {
      ...agg,
      updates: agg.updates.filter((u) => u.creator === creator),
      validity_votes: agg.validity_votes.filter((v) => v.voter === creator),
    };
    const [view] = this.objectViewService.resolve([filtered], voterReputations, {
      update_types: GOVERNANCE_UPDATE_TYPES,
      governance: DEFAULT_GOVERNANCE_SNAPSHOT,
    });
    return view;
  }

  /** Placeholder until social_mutes_current exists. */
  private async loadMutesForModerators(moderators: string[]): Promise<string[]> {
    void moderators;
    return [];
  }

  private async applyModeratorMuteStub(snapshot: GovernanceSnapshot): Promise<void> {
    const fromStub = await this.loadMutesForModerators(snapshot.moderators);
    snapshot.muted = dedupeStrings([...snapshot.muted, ...fromStub]);
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
      case 'validity_cutoff':
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
