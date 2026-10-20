import { Injectable } from '@nestjs/common';
import {
  deriveAccountKeys,
  isHiveAccountName,
  suggestMasterPassword,
  type HiveAccountKeys,
} from '@opden-data-layer/hive-account';

import { normalizeHiveAccount } from '../utils/hive-account';
import { HiveChainContextService } from './hive-chain-context.service';

export type GenerateHiveAccountKeysInput = {
  account: string;
};

export type GenerateHiveAccountKeysResult = {
  account: string;
  masterPassword: string;
  keys: HiveAccountKeys;
};

const INVALID_ACCOUNT_NAME_MESSAGE =
  'Invalid Hive account name. Use 3–16 lowercase letters or digits; dot segments must be at least 3 characters; a segment starts with a-z and ends with a-z or a digit; hyphen only in the interior.';

@Injectable()
export class HiveAccountGenerateService {
  constructor(private readonly chainContext: HiveChainContextService) {}

  async generateAccountKeys(
    input: GenerateHiveAccountKeysInput,
  ): Promise<GenerateHiveAccountKeysResult> {
    const account = normalizeHiveAccount(input.account);
    if (!isHiveAccountName(account)) {
      throw new Error(INVALID_ACCOUNT_NAME_MESSAGE);
    }

    const existing = await this.chainContext.getAccount(account);
    if (existing) {
      throw new Error(`Hive account already exists: ${account}`);
    }

    const masterPassword = suggestMasterPassword();
    return {
      account,
      masterPassword,
      keys: deriveAccountKeys(account, masterPassword),
    };
  }
}
