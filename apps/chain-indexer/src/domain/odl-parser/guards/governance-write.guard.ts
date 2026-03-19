import { Injectable } from '@nestjs/common';
import { OBJECT_TYPES } from '@opden-data-layer/core';
import type { WriteGuard, WriteGuardContext } from './write-guard';

@Injectable()
export class GovernanceWriteGuard implements WriteGuard {
  supports(ctx: WriteGuardContext): boolean {
    return ctx.object_type === OBJECT_TYPES.GOVERNANCE;
  }

  check(ctx: WriteGuardContext): string | null {
    if (ctx.event_creator !== ctx.object_creator) {
      return 'UNAUTHORIZED_GOVERNANCE_OP';
    }
    return null;
  }
}
