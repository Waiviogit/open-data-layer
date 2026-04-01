import { NextResponse } from 'next/server';
import { z } from 'zod';

import { themePreferenceSchema } from '../../../theme/theme-cookie.constants';
import { setCookieTheme } from '../../../theme/theme-cookie';
import { syncThemePreferenceToBackend } from '../../../theme/theme-user-sync';

const bodySchema = z.object({
  preference: themePreferenceSchema,
});

export async function PATCH(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  await setCookieTheme(parsed.data.preference);
  await syncThemePreferenceToBackend(parsed.data.preference);

  return NextResponse.json({ ok: true });
}
