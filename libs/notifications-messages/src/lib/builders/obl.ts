import type { AnyNotificationEvent } from '@opden-data-layer/notifications-contract';
import {
  oblContractPath,
  oblDisputePath,
  oblInvoicePath,
  oblPublicOfferPath,
  oblRelationshipPath,
  oblReportPath,
  oblServiceOrderPath,
  userProfilePath,
} from '../links';
import { type NotificationMessage, withParamHrefs } from '../message';

function accountHrefs(
  accounts: Record<string, string | null | undefined>,
): Record<string, string> {
  const hrefs: Record<string, string> = {};
  for (const [key, value] of Object.entries(accounts)) {
    if (value && value.trim()) {
      hrefs[key] = userProfilePath(value);
    }
  }
  return hrefs;
}

export function buildOblMessage(
  event: AnyNotificationEvent,
): NotificationMessage | null {
  switch (event.type) {
    case 'obl_offer_publish':
    case 'obl_offer_update':
    case 'obl_offer_retire': {
      const p = event.payload;
      const key =
        event.type === 'obl_offer_publish'
          ? 'notification_obl_offer_publish'
          : event.type === 'obl_offer_update'
            ? 'notification_obl_offer_update'
            : 'notification_obl_offer_retire';
      return withParamHrefs(
        {
          key,
          params: {
            author: p.author,
            kind: p.kind,
            name: p.name,
            offerId: p.offerId,
          },
          href: oblPublicOfferPath(p.kind, p.offerId, p.version),
          icon: 'generic',
          actor: p.author,
        },
        accountHrefs({ author: p.author }),
      );
    }
    case 'obl_contract_sign': {
      const p = event.payload;
      return withParamHrefs(
        {
          key: 'notification_obl_contract_sign',
          params: {
            signer: p.signer,
            contractId: p.contractId,
            provider: p.provider,
            client: p.client,
          },
          href: oblContractPath(p.contractId),
          icon: 'generic',
          actor: p.signer,
        },
        accountHrefs({
          signer: p.signer,
          provider: p.provider,
          client: p.client,
        }),
      );
    }
    case 'obl_service_order_create': {
      const p = event.payload;
      return withParamHrefs(
        {
          key: 'notification_obl_service_order_create',
          params: {
            creator: p.creator,
            serviceOrderId: p.serviceOrderId,
          },
          href: oblServiceOrderPath(p.serviceOrderId),
          icon: 'generic',
          actor: p.creator,
        },
        accountHrefs({ creator: p.creator }),
      );
    }
    case 'obl_report_create': {
      const p = event.payload;
      return withParamHrefs(
        {
          key: 'notification_obl_report_create',
          params: {
            author: p.author,
            reportId: p.reportId,
          },
          href: oblReportPath(p.reportId),
          icon: 'generic',
          actor: p.author,
        },
        accountHrefs({ author: p.author }),
      );
    }
    case 'obl_invoice_issue': {
      const p = event.payload;
      return withParamHrefs(
        {
          key: 'notification_obl_invoice_issue',
          params: {
            issuer: p.issuer,
            invoiceId: p.invoiceId,
            debtor: p.debtor,
            amountUsd: p.amountUsd,
          },
          href: oblInvoicePath(p.invoiceId),
          icon: 'generic',
          actor: p.issuer,
        },
        accountHrefs({ issuer: p.issuer, debtor: p.debtor }),
      );
    }
    case 'obl_payment_declare':
    case 'obl_payment_confirm': {
      const p = event.payload;
      const actor = event.actor ?? p.payer;
      const counterparty =
        actor.trim().toLowerCase() === p.payer.trim().toLowerCase()
          ? p.receiver
          : p.payer;
      const key =
        event.type === 'obl_payment_declare'
          ? 'notification_obl_payment_declare'
          : 'notification_obl_payment_confirm';
      return withParamHrefs(
        {
          key,
          params: {
            payer: p.payer,
            receiver: p.receiver,
            amountUsd: p.amountUsd,
            paymentId: p.paymentId,
          },
          href: oblRelationshipPath(counterparty),
          icon: 'generic',
          actor,
        },
        accountHrefs({ payer: p.payer, receiver: p.receiver }),
      );
    }
    case 'obl_dispute_open':
    case 'obl_dispute_resolve': {
      const p = event.payload;
      const key =
        event.type === 'obl_dispute_open'
          ? 'notification_obl_dispute_open'
          : 'notification_obl_dispute_resolve';
      const actor =
        event.type === 'obl_dispute_open' ? p.disputant : p.resolver;
      return withParamHrefs(
        {
          key,
          params: {
            disputant: p.disputant,
            resolver: p.resolver ?? '',
            disputeId: p.disputeId,
            invoiceId: p.invoiceId,
            amountUsd: p.amountUsd,
          },
          href: oblDisputePath(p.disputeId),
          icon: 'generic',
          actor,
        },
        accountHrefs({
          disputant: p.disputant,
          resolver: p.resolver,
        }),
      );
    }
    default:
      return null;
  }
}
