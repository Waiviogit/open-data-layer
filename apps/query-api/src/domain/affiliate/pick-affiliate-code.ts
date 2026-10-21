import { AFFILIATE_CODE_CHANCE_SEPARATOR } from './affiliate.constants';

/**
 * Picks one code from the remaining affiliateCode elements (scope already stripped).
 * Legacy: invalid or negative chance, or a zero total, yields an empty string.
 */
export function pickAffiliateCode(codes: string[]): string {
  if (!Array.isArray(codes) || codes.length === 0) {
    return '';
  }

  const items: { value: string; chance: number }[] = [];
  for (const el of codes) {
    const separatorAt = el.indexOf(AFFILIATE_CODE_CHANCE_SEPARATOR);
    if (separatorAt < 0) {
      items.push({ value: el, chance: 1 });
      continue;
    }
    const value = el.slice(0, separatorAt);
    const chanceRaw = el.slice(separatorAt + AFFILIATE_CODE_CHANCE_SEPARATOR.length);
    const parsedChance = Number(chanceRaw);
    if (Number.isNaN(parsedChance) || parsedChance < 0) {
      return '';
    }
    items.push({ value, chance: parsedChance });
  }

  const totalChance = items.reduce((acc, item) => acc + item.chance, 0);
  if (totalChance === 0) {
    return '';
  }

  if (totalChance !== 100) {
    for (const item of items) {
      item.chance = (item.chance / totalChance) * 100;
    }
  }

  const randomNumber = Math.random() * 100;
  let sum = 0;
  for (const item of items) {
    sum += item.chance;
    if (randomNumber < sum) {
      return item.value;
    }
  }
  return items[items.length - 1]?.value ?? '';
}
