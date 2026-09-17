import { parsePHashHex } from '@opden-data-layer/core';
import type { MessageCreatePayload } from './osl-envelope.schema';

export type ParsedMessageSource = {
  platform: string;
  sourceId: string;
  fingerprintV: number | null;
  textSimhash: bigint | null;
  imagePhashes: bigint[];
};

export function parseMessageSourceForObjectChannel(
  source: MessageCreatePayload['source'],
): ParsedMessageSource | null {
  if (source == null) {
    return null;
  }

  const hasFingerprint =
    source.text_simhash != null || (source.image_phashes?.length ?? 0) > 0;
  const fingerprintV = source.fp_v ?? null;

  let textSimhash: bigint | null = null;
  if (source.text_simhash != null) {
    textSimhash = parsePHashHex(source.text_simhash);
  }

  const imagePhashes: bigint[] = [];
  for (const hex of source.image_phashes ?? []) {
    const parsed = parsePHashHex(hex);
    if (parsed != null) {
      imagePhashes.push(parsed);
    }
  }

  return {
    platform: source.platform,
    sourceId: source.id,
    fingerprintV: hasFingerprint ? fingerprintV : null,
    textSimhash: hasFingerprint ? textSimhash : null,
    imagePhashes: hasFingerprint ? imagePhashes : [],
  };
}
