import { type NextRequest, NextResponse } from 'next/server';

import { postHiveChangellyWithdrawCreateQuery } from '@/modules/user-wallet/application/queries/hive-changelly-withdraw.queries';
import { normalizeHiveChangellyOutputCoin } from '@/modules/user-wallet/domain/hive-changelly-withdraw.constants';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  const accountName = decodeURIComponent(name).trim().toLowerCase();
  const user = await createCookieAuthContextProvider().getUser();
  if (!user || user.username.trim().toLowerCase() !== accountName) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const outputCoinType = normalizeHiveChangellyOutputCoin(
    String(body.outputCoinType ?? ''),
  );
  const amount = Number(body.amount);
  const address = String(body.address ?? '').trim();
  if (!outputCoinType || !Number.isFinite(amount) || amount <= 0 || !address) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const result = await postHiveChangellyWithdrawCreateQuery(accountName, {
    amount,
    outputCoinType,
    address,
  });
  if (result.error === 'bad_request') {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (result.error === 'unavailable') {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
  if (!result.data) {
    return NextResponse.json({ error: 'invalid_response' }, { status: 502 });
  }
  return NextResponse.json(result.data);
}
