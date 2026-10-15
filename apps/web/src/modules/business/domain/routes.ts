import { buildRelationshipTabHref, type RelationshipTab } from './relationship-tab-url';
import {
  buildArbitrationHref,
  type ArbitrationStatus,
} from './arbitration-status-url';
import {
  buildDisputeResolutionHref,
  type DisputeResolutionStatus,
} from './dispute-resolution-status-url';

export type OblOfferKindRoute = 'offer' | 'request';

export type OffersListTab = 'drafts' | 'published' | 'retired';

export type { RelationshipTab } from './relationship-tab-url';
export { buildRelationshipTabHref, parseRelationshipTab } from './relationship-tab-url';
export type { ArbitrationStatus } from './arbitration-status-url';
export {
  ARBITRATION_STATUSES,
  buildArbitrationHref,
  parseArbitrationStatus,
} from './arbitration-status-url';
export type { DisputeResolutionStatus } from './dispute-resolution-status-url';
export {
  DISPUTE_RESOLUTION_STATUSES,
  buildDisputeResolutionHref,
  parseDisputeResolutionStatus,
} from './dispute-resolution-status-url';

export type BusinessNavId =
  | 'discover'
  | 'offers'
  | 'requests'
  | 'relationships'
  | 'arbitration'
  | 'dispute-resolution';

export function businessNavIdForKind(kind: OblOfferKindRoute): BusinessNavId {
  return kind === 'request' ? 'requests' : 'offers';
}

const MANAGE_OFFERS = '/business/manage/offers';
const MANAGE_REQUESTS = '/business/manage/requests';

export const businessRoutes = {
  discover: '/business/offers',
  discoverOffers: '/business/offers',
  discoverRequests: '/business/requests',
  manageOffers: `${MANAGE_OFFERS}/drafts`,
  manageRequests: `${MANAGE_REQUESTS}/drafts`,
  manageWithKind: (kind: OblOfferKindRoute) =>
    kind === 'request' ? MANAGE_REQUESTS : MANAGE_OFFERS,
  manageTab: (kind: OblOfferKindRoute, tab: OffersListTab) =>
    `${businessRoutes.manageWithKind(kind)}/${tab}`,
  manageNew: (kind: OblOfferKindRoute = 'offer') =>
    kind === 'request' ? `${MANAGE_REQUESTS}/new` : `${MANAGE_OFFERS}/new`,
  offerDraft: (kind: OblOfferKindRoute, draftId: string) =>
    `${businessRoutes.manageWithKind(kind)}/drafts/${encodeURIComponent(draftId)}`,
  offerDraftPreview: (kind: OblOfferKindRoute, draftId: string) =>
    `${businessRoutes.manageWithKind(kind)}/drafts/${encodeURIComponent(draftId)}/preview`,
  offerDetail: (offerId: string) =>
    `${MANAGE_OFFERS}/${encodeURIComponent(offerId)}`,
  offerVersion: (offerId: string, version: number) =>
    `${MANAGE_OFFERS}/${encodeURIComponent(offerId)}/versions/${version}`,
  relationships: '/business/relationships',
  arbitration: '/business/arbitration',
  arbitrationWithStatus: (status?: ArbitrationStatus) => buildArbitrationHref(status),
  disputeResolution: '/business/dispute-resolution',
  disputeResolutionWithStatus: (status?: DisputeResolutionStatus) =>
    buildDisputeResolutionHref(status),
  serviceOrder: (serviceOrderId: string) =>
    `/business/service-orders/${encodeURIComponent(serviceOrderId)}`,
  report: (reportId: string) =>
    `/business/reports/${encodeURIComponent(reportId)}`,
  relationship: (account: string) =>
    `/business/relationships/${encodeURIComponent(account)}`,
  relationshipTab: (account: string, tab?: RelationshipTab) =>
    buildRelationshipTabHref(account, tab),
  contract: (contractId: string) =>
    `/business/contracts/${encodeURIComponent(contractId)}`,
  invoice: (invoiceId: string) =>
    `/business/invoices/${encodeURIComponent(invoiceId)}`,
  dispute: (disputeId: string) =>
    `/business/disputes/${encodeURIComponent(disputeId)}`,
  publicOffer: (offerId: string, version: number) =>
    `/offers/${encodeURIComponent(offerId)}/versions/${version}`,
  publicRequest: (offerId: string, version: number) =>
    `/requests/${encodeURIComponent(offerId)}/versions/${version}`,
  publicOffers: '/business/offers',
  publicRequests: '/business/requests',
} as const;
