
/**
 * Shared types for Mongo Concept v2.
 * Single source of truth for GeoPoint, positions, update value shapes, and enums.
 */

export type GeoPoint = {
  type: 'Point';
  coordinates: [number, number];
};

export type UpdateCardinality = 'single' | 'multi';
export type ValidityVoteValue = 'for' | 'against';

/**
 * Canonical event position.
 * All "latest wins" semantics must use this ordering.
 */
export interface CanonicalPosition {
  blockNum: number;
  trxIndex: number;
  opIndex: number;
  transactionId: string;
}

export interface TextUpdateValue {
  valueKind: 'text';
  valueText: string;
}

export interface GeoUpdateValue {
  valueKind: 'geo';
  valueGeo: GeoPoint;
}

export interface JsonUpdateValue {
  valueKind: 'json';
  valueJson: unknown;
}

export type UpdateValue = TextUpdateValue | GeoUpdateValue | JsonUpdateValue;
