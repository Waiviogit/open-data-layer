'use client';

import { useEffect, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { ModalShell, ModalShellCloseButton } from '@/shared/presentation';

import { shortContractId } from '../../../domain/dispute-resolution';
import type { LedgerContractRow, LedgerServiceOrderRow } from '../../../domain/ledger.types';
import { isCancelledServiceOrderId } from '../../../domain/service-order-cancel';
import { ObjectBuilder } from '../object-builder';

export type BusinessCreateReportModalProps = {
  open: boolean;
  onClose: () => void;
  isBusy: boolean;
  contracts: LedgerContractRow[];
  serviceOrders: LedgerServiceOrderRow[];
  onSubmit: (input: {
    contractId?: string;
    serviceOrderId?: string;
    details?: Record<string, unknown>;
  }) => Promise<void>;
};

export function BusinessCreateReportModal({
  open,
  onClose,
  isBusy,
  contracts,
  serviceOrders,
  onSubmit,
}: BusinessCreateReportModalProps) {
  const { t } = useI18n();
  const titleId = 'business-create-report-modal-title';
  const [contractId, setContractId] = useState('');
  const [serviceOrderId, setServiceOrderId] = useState('');
  const [details, setDetails] = useState<Record<string, unknown>>({});
  const [detailsValid, setDetailsValid] = useState(true);
  const [detailsBuilderKey, setDetailsBuilderKey] = useState(0);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setContractId('');
      setServiceOrderId('');
      setDetails({});
      setDetailsValid(true);
      setDetailsBuilderKey((key) => key + 1);
      setLinkError(null);
    }
  }, [open, contracts]);

  const hasLink =
    contractId.trim().length > 0 || serviceOrderId.trim().length > 0;
  const canSubmit =
    !isBusy && hasLink && detailsValid && linkError === null;

  async function handleSubmit() {
    const contract = contractId.trim();
    const serviceOrder = serviceOrderId.trim();
    if (!contract && !serviceOrder) {
      setLinkError(t('business_report_link_required'));
      return;
    }
    if (isCancelledServiceOrderId(serviceOrder, serviceOrders)) {
      setLinkError(t('business_service_order_cancelled_ref'));
      return;
    }
    setLinkError(null);

    const detailsPayload =
      Object.keys(details).length > 0 ? details : undefined;
    await onSubmit({
      contractId: contract || undefined,
      serviceOrderId: serviceOrder || undefined,
      details: detailsPayload,
    });
    onClose();
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      closeOnBackdrop={!isBusy}
      labelledBy={titleId}
      maxWidthClass="max-w-md"
      header={
        <div className="flex items-center justify-between gap-3 border-b border-border px-card-padding py-3">
          <h2 id={titleId} className="text-body font-weight-strong text-heading">
            {t('business_create_report')}
          </h2>
          <ModalShellCloseButton onClose={onClose} disabled={isBusy} ariaLabel={t('business_modal_close')} />
        </div>
      }
      footer={
        <div className="flex justify-end gap-2 border-t border-border px-card-padding py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="rounded-btn border border-border px-4 py-2 text-body-sm disabled:opacity-50"
          >
            {t('business_modal_cancel')}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            className="rounded-btn bg-accent px-4 py-2 text-body-sm text-accent-fg disabled:opacity-50"
          >
            {t('business_create_report_submit')}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 px-card-padding py-4">
        <p className="text-caption text-fg-secondary">{t('business_report_link_hint')}</p>
        {contracts.length > 0 ? (
          <label className="flex flex-col gap-1 text-body-sm">
            {t('business_field_contract')}
            <select
              value={contractId}
              onChange={(e) => {
                setContractId(e.target.value);
                setLinkError(null);
              }}
              className="rounded-btn border border-border px-3 py-2"
            >
              <option value="">{t('business_report_no_contract_option')}</option>
              {contracts.map((c) => (
                <option key={c.contract_id} value={c.contract_id}>
                  {c.offer_name} · {shortContractId(c.contract_id)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-body-sm">
          {t('business_field_service_order')}
          <input
            type="text"
            value={serviceOrderId}
            onChange={(e) => {
              setServiceOrderId(e.target.value);
              setLinkError(null);
            }}
            className="rounded-btn border border-border px-3 py-2 font-mono text-caption"
            placeholder="service-order-…"
          />
        </label>
        {linkError ? (
          <p className="text-caption text-error" role="alert">
            {linkError}
          </p>
        ) : null}
        <ObjectBuilder
          key={detailsBuilderKey}
          value={{}}
          label={t('business_report_details_label')}
          disabled={isBusy}
          onChange={(next, valid) => {
            setDetails(next);
            setDetailsValid(valid);
          }}
        />
      </div>
    </ModalShell>
  );
}
