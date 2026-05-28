import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { extractSeoKeywords } from './extract-seo-keywords';
import {
  groupFieldsByPriority,
  relationTypesForObjectType,
} from './group-fields-by-priority';
import { isEntryValid, isFieldFilled } from './object-health-score';
import type {
  FieldEntry,
  SemanticCompleteness,
  SemanticDimension,
  SemanticDimensionRating,
} from './object-create.types';

const DIMENSION_ORDER: readonly SemanticDimension['id'][] = [
  'identity',
  'media',
  'seo',
  'relations',
  'discoverability',
  'aiReadability',
];

const AI_STRUCTURED_UPDATE_TYPES: readonly string[] = [
  UPDATE_TYPES.INGREDIENTS,
  UPDATE_TYPES.NUTRITION,
  UPDATE_TYPES.GEO,
  UPDATE_TYPES.CALORIES,
  UPDATE_TYPES.COOK_TIME,
  UPDATE_TYPES.FEATURE_LIST,
  UPDATE_TYPES.BUDGET,
  UPDATE_TYPES.PROMOTION,
];

function scoreToRating(score: number): SemanticDimensionRating {
  if (score >= 85) {
    return 'excellent';
  }
  if (score >= 60) {
    return 'good';
  }
  if (score >= 35) {
    return 'medium';
  }
  if (score >= 10) {
    return 'weak';
  }
  return 'missing';
}

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

function textFromField(fields: readonly FieldEntry[], type: string): string {
  const entry = fields.find((f) => f.updateType === type);
  if (!entry || typeof entry.value !== 'string') {
    return '';
  }
  return entry.value.trim();
}

function hasValidEntry(
  fields: readonly FieldEntry[],
  updateType: string,
): boolean {
  return fields.some((f) => f.updateType === updateType && isEntryValid(f));
}

function hasFilledEntry(
  fields: readonly FieldEntry[],
  updateType: string,
): boolean {
  return fields.some((f) => f.updateType === updateType && isFieldFilled(f));
}

function scoreIdentity(
  fields: readonly FieldEntry[],
  objectType: string | null,
): SemanticDimension {
  if (!objectType) {
    return { id: 'identity', rating: 'missing', score: 0, hints: ['objectType'] };
  }

  let score = 0;
  const hints: string[] = [];

  if (hasValidEntry(fields, UPDATE_TYPES.NAME)) {
    score += 40;
  } else {
    hints.push(UPDATE_TYPES.NAME);
  }

  const description = textFromField(fields, UPDATE_TYPES.DESCRIPTION);
  if (hasValidEntry(fields, UPDATE_TYPES.DESCRIPTION)) {
    score += description.length >= 80 ? 40 : 30;
  } else {
    hints.push(UPDATE_TYPES.DESCRIPTION);
  }

  if (hasFilledEntry(fields, UPDATE_TYPES.TITLE)) {
    score += 20;
  } else {
    hints.push(UPDATE_TYPES.TITLE);
  }

  const s = clampScore(score);
  return { id: 'identity', rating: scoreToRating(s), score: s, hints };
}

function scoreMedia(fields: readonly FieldEntry[], objectType: string | null): SemanticDimension {
  if (!objectType) {
    return { id: 'media', rating: 'missing', score: 0, hints: [] };
  }

  let score = 0;
  const hints: string[] = [];

  if (hasValidEntry(fields, UPDATE_TYPES.IMAGE)) {
    score += 65;
  } else {
    hints.push(UPDATE_TYPES.IMAGE);
  }

  const extraMedia = [
    UPDATE_TYPES.IMAGE_BACKGROUND,
    UPDATE_TYPES.IMAGE_GALLERY,
    UPDATE_TYPES.IMAGE_GALLERY_ITEM,
  ];
  if (extraMedia.some((t) => hasFilledEntry(fields, t))) {
    score += 35;
  } else if (score < 65) {
    hints.push(UPDATE_TYPES.IMAGE_BACKGROUND);
  }

  const s = clampScore(score);
  return { id: 'media', rating: scoreToRating(s), score: s, hints };
}

function scoreSeo(fields: readonly FieldEntry[], objectType: string | null): SemanticDimension {
  if (!objectType) {
    return { id: 'seo', rating: 'missing', score: 0, hints: [] };
  }

  let score = 0;
  const hints: string[] = [];

  const description = textFromField(fields, UPDATE_TYPES.DESCRIPTION);
  if (description.length >= 80) {
    score += 40;
  } else if (description.length > 0) {
    score += 20;
    hints.push('description_length');
  } else {
    hints.push(UPDATE_TYPES.DESCRIPTION);
  }

  const keywords = extractSeoKeywords(fields);
  if (keywords.length > 0) {
    score += Math.min(30, keywords.length * 15);
  } else {
    hints.push(UPDATE_TYPES.TAG_CATEGORY_ITEM);
  }

  if (
    hasFilledEntry(fields, UPDATE_TYPES.CATEGORY) ||
    hasFilledEntry(fields, UPDATE_TYPES.IDENTIFIER)
  ) {
    score += 30;
  } else {
    hints.push(UPDATE_TYPES.CATEGORY);
  }

  const name = textFromField(fields, UPDATE_TYPES.NAME);
  if (name.length > 0 && !name.includes(' ')) {
    // slug-friendly name hint only
  } else if (name.length === 0) {
    hints.push('name_slug');
  }

  const s = clampScore(score);
  return { id: 'seo', rating: scoreToRating(s), score: s, hints };
}

function scoreRelations(
  fields: readonly FieldEntry[],
  objectType: string | null,
): SemanticDimension {
  if (!objectType) {
    return { id: 'relations', rating: 'missing', score: 0, hints: [] };
  }

  const supported = relationTypesForObjectType(objectType);
  const filled = supported.filter((t) => hasFilledEntry(fields, t));

  if (supported.length === 0) {
    return { id: 'relations', rating: 'medium', score: 50, hints: [] };
  }

  const score = clampScore(Math.min(100, filled.length * 50));
  const hints = filled.length === 0 ? supported.slice(0, 2) : [];

  return {
    id: 'relations',
    rating: scoreToRating(score),
    score,
    hints,
  };
}

function scoreDiscoverability(
  fields: readonly FieldEntry[],
  objectType: string | null,
): SemanticDimension {
  if (!objectType) {
    return { id: 'discoverability', rating: 'missing', score: 0, hints: [] };
  }

  let score = 0;
  const hints: string[] = [];

  if (hasFilledEntry(fields, UPDATE_TYPES.TAG_CATEGORY)) {
    score += 30;
  } else {
    hints.push(UPDATE_TYPES.TAG_CATEGORY);
  }

  const tagItems = fields.filter(
    (f) => f.updateType === UPDATE_TYPES.TAG_CATEGORY_ITEM && isFieldFilled(f),
  );
  if (tagItems.length > 0) {
    score += Math.min(60, tagItems.length * 30);
  } else {
    hints.push(UPDATE_TYPES.TAG_CATEGORY_ITEM);
  }

  if (hasFilledEntry(fields, UPDATE_TYPES.CATEGORY)) {
    score += 20;
  }

  if (hasFilledEntry(fields, UPDATE_TYPES.AGGREGATE_RATING)) {
    score += 20;
  } else if (score < 50) {
    hints.push(UPDATE_TYPES.AGGREGATE_RATING);
  }

  const s = clampScore(score);
  return { id: 'discoverability', rating: scoreToRating(s), score: s, hints };
}

function scoreAiReadability(
  fields: readonly FieldEntry[],
  objectType: string | null,
): SemanticDimension {
  if (!objectType) {
    return { id: 'aiReadability', rating: 'missing', score: 0, hints: [] };
  }

  let score = 0;
  const hints: string[] = [];

  const description = textFromField(fields, UPDATE_TYPES.DESCRIPTION);
  if (description.length >= 120) {
    score += 40;
  } else if (description.length > 0) {
    score += 15;
    hints.push('description_length');
  } else {
    hints.push(UPDATE_TYPES.DESCRIPTION);
  }

  const groups = groupFieldsByPriority(objectType);
  const supportedStructured = AI_STRUCTURED_UPDATE_TYPES.filter(
    (t) =>
      groups.required.includes(t) ||
      groups.recommended.includes(t) ||
      groups.advanced.includes(t),
  );

  let structuredPoints = 0;
  for (const t of supportedStructured) {
    if (hasFilledEntry(fields, t)) {
      structuredPoints += 20;
    }
  }
  score += Math.min(60, structuredPoints);

  if (structuredPoints === 0 && supportedStructured.length > 0) {
    hints.push(supportedStructured[0] ?? UPDATE_TYPES.INGREDIENTS);
  }

  const s = clampScore(score);
  return { id: 'aiReadability', rating: scoreToRating(s), score: s, hints };
}

const EMPTY_COMPLETENESS: SemanticCompleteness = {
  dimensions: DIMENSION_ORDER.map((id) => ({
    id,
    rating: 'missing' as const,
    score: 0,
    hints: [],
  })),
  overallPercent: 0,
};

export function computeSemanticCompleteness(
  objectType: string | null,
  fields: readonly FieldEntry[],
): SemanticCompleteness {
  if (!objectType) {
    return EMPTY_COMPLETENESS;
  }

  const dimensions: SemanticDimension[] = [
    scoreIdentity(fields, objectType),
    scoreMedia(fields, objectType),
    scoreSeo(fields, objectType),
    scoreRelations(fields, objectType),
    scoreDiscoverability(fields, objectType),
    scoreAiReadability(fields, objectType),
  ];

  const overallPercent =
    dimensions.length > 0
      ? clampScore(
          dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length,
        )
      : 0;

  return { dimensions, overallPercent };
}
