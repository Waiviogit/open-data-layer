import { NextResponse } from 'next/server';
import { z } from 'zod';

import { shellModePreferenceSchema } from '../../../shell-mode/shell-mode-cookie.constants';
import { setCookieShellMode } from '../../../shell-mode/shell-mode-cookie';

const bodySchema = z.object({
  preference: shellModePreferenceSchema,
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

  await setCookieShellMode(parsed.data.preference);

  return NextResponse.json({ ok: true });
}
