export interface FieldEntry {
  /** Stable row id (supports multiple rows per `updateType`, e.g. tag categories). */
  entryKey: string;
  updateType: string;
  value: unknown;
  /** Content locale for localizable updates (from workspace language selector). */
  locale?: string;
}

export interface ObjectCreateState {
  /** Fixed 3-letter prefix for this create session. */
  objectIdPrefix: string;
  objectId: string;
  objectType: string | null;
  fields: FieldEntry[];
  /** Content locale for localizable update payloads on publish. */
  language: string;
}

export type SemanticDimensionId =
  | 'identity'
  | 'media'
  | 'seo'
  | 'relations'
  | 'discoverability'
  | 'aiReadability';

export type SemanticDimensionRating =
  | 'excellent'
  | 'good'
  | 'medium'
  | 'weak'
  | 'missing';

export interface SemanticDimension {
  id: SemanticDimensionId;
  rating: SemanticDimensionRating;
  /** 0–100; drives optional mini-indicator inside the badge. */
  score: number;
  /** Update types or hints that are missing or underfilled. */
  hints: string[];
}

export interface SemanticCompleteness {
  dimensions: SemanticDimension[];
  /** Weighted average 0–100. */
  overallPercent: number;
}

/** @deprecated Prefer {@link SemanticCompleteness} for the create workspace UI. */
export interface HealthScore {
  required: { filled: number; total: number };
  recommended: { filled: number; total: number };
  hasMedia: boolean;
  hasRelations: boolean;
  percent: number;
}

export type FieldPriorityGroup = 'required' | 'recommended' | 'advanced';

export interface GroupedFieldTypes {
  required: readonly string[];
  recommended: readonly string[];
  advanced: readonly string[];
}
