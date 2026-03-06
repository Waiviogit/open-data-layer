/**
 * Enhanced core object model derived from the spec:
 * - validity/ranking is resolved at query time
 * - governance is calculated before the main object query and is not embedded here
 * - object core stays generic across object types
 * - index-heavy query surfaces should be projected separately from the core document
 */

type GeoPoint = {
  type: 'Point';
  coordinates: [number, number];
};

type UpdateCardinality = 'single' | 'multi';
type UpdateValueKind = 'text' | 'geo' | 'json';
type ValidityVoteValue = 'for' | 'against';

/**
 * Canonical chain/index position.
 * All "latest wins" decisions must use this ordering, not wall-clock timestamps.
 */
interface CanonicalPosition {
  blockNum: number;
  trxIndex: number;
  opIndex: number;
  transactionId: string;
}

/**
 * Active raw validity vote state.
 * A remove operation means the active vote disappears from this projection.
 */
interface ActiveValidityVote {
  voter: string;
  vote: ValidityVoteValue;
  position: CanonicalPosition;
}

/**
 * Active raw rank vote state.
 * Only meaningful for multi-cardinality updates.
 */
interface ActiveRankVote {
  voter: string;
  rank: number; // 1..10000
  rankContext: string; // usually "default"
  position: CanonicalPosition;
}

interface UpdateCommon {
  updateId: string;
  objectId: string;
  objectType: string;
  fieldKey: string;
  creator: string;
  createdAtUnix: number;
  createdPosition: CanonicalPosition;

  /**
   * Transitional simplification for the current phase.
   * This is raw evidence only, not a final governance-derived role decision.
   */
  rejectedBy?: string | null;

  /**
   * Query-time validity must be derived from these raw votes plus governance.
   */
  validityVotes: ActiveValidityVote[];
}

interface TextUpdateValue {
  valueKind: 'text';
  valueText: string;
}

interface GeoUpdateValue {
  valueKind: 'geo';
  valueGeo: GeoPoint;
}

interface JsonUpdateValue {
  valueKind: 'json';
  valueJson: unknown;
}

type UpdateValue = TextUpdateValue | GeoUpdateValue | JsonUpdateValue;

interface SingleValueUpdateDocument extends UpdateCommon {
  cardinality: 'single';
  value: UpdateValue;
}

interface MultiValueUpdateDocument extends UpdateCommon {
  cardinality: 'multi';
  value: UpdateValue;
  rankVotes: ActiveRankVote[];
}

type ObjectUpdateDocument = SingleValueUpdateDocument | MultiValueUpdateDocument;

/**
 * Creator-scoped current pointers for single-cardinality fields.
 * Key: fieldKey -> creator -> updateId
 *
 * Example:
 * singleFieldState["name"]["alice"] = "upd-101"
 */
type SingleFieldState = Record<string, Record<string, string>>;

/**
 * Ordered update pointers for multi-cardinality fields.
 * Key: fieldKey -> [updateId, ...]
 *
 * Order here is storage/application order only.
 * Query-time ranking still comes from rankVotes + governance.
 */
type MultiFieldState = Record<string, string[]>;

/**
 * Generic object core.
 *
 * Important:
 * - This is not place-specific.
 * - Governance is not embedded here because governance resolution is a separate
 *   object-type/domain concern computed before the main query.
 * - We keep updates in one store and use field-state pointers so the object can
 *   support different update types without exploding the top-level schema.
 */
interface ObjectCoreDocument {
  objectId: string;
  objectType: string;
  creator: string;
  weight?: number;
  metaGroupId?: string;

  /**
   * Full active update store by updateId.
   * Good for object reconstruction and deterministic query-time resolution.
   */
  updatesById: Record<string, ObjectUpdateDocument>;

  /**
   * Current creator-scoped state for single-value fields.
   * This models LWW(single) without hardcoding fields like name/map into the root document.
   */
  singleFieldState: SingleFieldState;

  /**
   * Active entries for multi-value fields.
   * For example, "tags" can point to many updateIds.
   */
  multiFieldState: MultiFieldState;
}

/**
 * Optional query projection document.
 *
 * This is where query-oriented indexes should live.
 * Keep it smaller and purpose-built instead of indexing deeply inside ObjectCoreDocument.
 */
interface ObjectQueryProjectionDocument {
  objectId: string;
  objectType: string;

  /**
   * Flattened queryable values.
   * Example for place:
   * - { fieldKey: "name", valueKind: "text", valueText: "Central Park" }
   * - { fieldKey: "map", valueKind: "geo", valueGeo: {...} }
   * - { fieldKey: "tags", valueKind: "text", valueText: "nature" }
   */
  queryFields: Array<{
    fieldKey: string;
    cardinality: UpdateCardinality;
    valueKind: UpdateValueKind;
    sourceUpdateId: string;
    creator: string;
    valueText?: string;
    valueGeo?: GeoPoint;
    valueJson?: unknown;
  }>;
}

/**
 * Example query-time resolved view for a place object.
 * This is derived from ObjectCoreDocument + resolved governance snapshot.
 */
interface ResolvedPlaceView {
  objectId: string;
  objectType: 'place';
  creator: string;
  name?: string;
  map?: GeoPoint;
  tags: Array<{
    updateId: string;
    value: string;
    finalStatus: 'VALID' | 'REJECTED';
    decisiveRole?: 'owner' | 'admin' | 'trusted';
    rejectedBy?: string;
    rankScore?: number;
  }>;
}
