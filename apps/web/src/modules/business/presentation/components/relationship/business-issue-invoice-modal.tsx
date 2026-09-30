'use client';

import { useEffect, useMemo, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { UserRefSearchField } from '@/modules/object-updates/presentation/components/user-ref-search-field';
import { ModalShell, ModalShellCloseButton } from '@/shared/presentation';

import type { InvoiceIssueSubmitPayload } from '../../../domain/invoice-issue';
import {
  allowedDebtorAccounts,
  isAttestorIssue,
  issuerInBeneficiaries,
  normalizeHiveAccountInput,
  predictSplitLineStates,
  requiresGoverningContract,
  sumBeneficiaryAmounts,
  validateSimpleIssue,
  validateSplitIssue,
  type BeneficiaryLineDraft,
  type InvoiceIssueMode,
} from '../../../domain/invoice-issue';
import type { LedgerContractRow, LedgerServiceOrderRow } from '../../../domain/ledger.types';
import { isCancelledServiceOrderId } from '../../../domain/service-order-cancel';
import { shortContractId } from '../../../domain/dispute-resolution';
import { ObjectBuilder } from '../object-builder';
import { StateBadge } from '../state-badge';
import {
  AccountPairSwapRow,
  RelationshipReadonlyField,
  parsePositiveUsdAmount,
} from './relationship-modal-fields';

export type BusinessIssueInvoiceModalProps = {
  open: boolean;
  onClose: () => void;
  isBusy: boolean;
  issuer: string;
  counterparty: string;
  debtor: string;
  creditor: string;
  contracts: LedgerContractRow[];
  serviceOrders: LedgerServiceOrderRow[];
  onSubmit: (payload: InvoiceIssueSubmitPayload) => Promise<void>;
};

type ModalStep = 'form' | 'confirm';

function emptyBeneficiaryLine(): BeneficiaryLineDraft {
  return { beneficiary: '', amountUsd: '10', role: '' };
}

export function BusinessIssueInvoiceModal({
  open,
  onClose,
  isBusy,
  issuer,
  counterparty,
  debtor,
  creditor,
  contracts,
  serviceOrders,
  onSubmit,
}: BusinessIssueInvoiceModalProps) {
  const { t } = useI18n();
  const titleId = 'business-issue-invoice-modal-title';
  const [step, setStep] = useState<ModalStep>('form');
  const [ack, setAck] = useState(false);
  const [mode, setMode] = useState<InvoiceIssueMode>('simple');
  const [amount, setAmount] = useState('10');
  const [details, setDetails] = useState<Record<string, unknown>>({});
  const [detailsValid, setDetailsValid] = useState(true);
  const [detailsBuilderKey, setDetailsBuilderKey] = useState(0);
  const [contractId, setContractId] = useState('');
  const [serviceOrderId, setServiceOrderId] = useState('');
  const [reportId, setReportId] = useState('');
  const [soError, setSoError] = useState<string | null>(null);
  const [parties, setParties] = useState({ debtor, creditor });
  const [splitDebtor, setSplitDebtor] = useState(debtor);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryLineDraft[]>([
    emptyBeneficiaryLine(),
  ]);

  useEffect(() => {
    if (open) {
      setStep('form');
      setAck(false);
      setMode('simple');
      setParties({ debtor, creditor });
      setSplitDebtor(debtor);
      setContractId(contracts[0]?.contract_id ?? '');
      setServiceOrderId('');
      setReportId('');
      setSoError(null);
      setBeneficiaries([emptyBeneficiaryLine()]);
      setDetails({});
      setDetailsValid(true);
      setDetailsBuilderKey((key) => key + 1);
    }
  }, [open, debtor, creditor, contracts]);

  const allowedDebtors = useMemo(
    () => allowedDebtorAccounts(issuer, contracts),
    [issuer, contracts],
  );

  useEffect(() => {
    if (mode !== 'split' || !contractId) {
      return;
    }
    const contract = contracts.find((c) => c.contract_id === contractId);
    if (!contract) {
      return;
    }
    const contractParties = [
      normalizeHiveAccountInput(contract.provider),
      normalizeHiveAccountInput(contract.client),
    ];
    const current = normalizeHiveAccountInput(splitDebtor);
    if (!contractParties.includes(current)) {
      const issuerNorm = normalizeHiveAccountInput(issuer);
      const fallback = contractParties.find((party) => party !== issuerNorm) ?? contractParties[0];
      if (fallback) {
        setSplitDebtor(fallback);
      }
    }
  }, [contractId, contracts, issuer, mode, splitDebtor]);

  function beneficiaryExcludeForRow(index: number): string[] {
    const exclude: string[] = [];
    if (splitDebtor.trim().length > 0) {
      exclude.push(splitDebtor);
    }
    beneficiaries.forEach((line, i) => {
      if (i !== index && line.beneficiary.trim().length > 0) {
        exclude.push(line.beneficiary);
      }
    });
    return exclude;
  }

  function swapSplitDebtor() {
    const current = normalizeHiveAccountInput(splitDebtor);
    const issuerNorm = normalizeHiveAccountInput(issuer);
    const counterpartyNorm = normalizeHiveAccountInput(counterparty);
    const next =
      allowedDebtors.find((account) => account !== current) ??
      (current === issuerNorm ? counterpartyNorm : issuerNorm);
    setSplitDebtor(next);
  }

  const selfBeneficiary =
    mode === 'split' && issuerInBeneficiaries(issuer, beneficiaries);
  const attestor =
    mode === 'split' && isAttestorIssue(issuer, splitDebtor, beneficiaries);
  const contractRequired =
    mode === 'split' && requiresGoverningContract(issuer, splitDebtor, beneficiaries);
  const splitTotal = sumBeneficiaryAmounts(beneficiaries);
  const predictedLines = useMemo(
    () =>
      mode === 'split'
        ? predictSplitLineStates({
            issuer,
            debtor: splitDebtor,
            beneficiaries,
            contracts,
          })
        : [],
    [beneficiaries, contracts, issuer, mode, splitDebtor],
  );

  const canSubmitSimple =
    mode === 'simple' &&
    !isBusy &&
    detailsValid &&
    validateSimpleIssue({
      viewer: issuer,
      counterparty,
      debtor: parties.debtor,
      creditor: parties.creditor,
      amountUsd: amount,
    });

  const canSubmitSplit =
    mode === 'split' &&
    !isBusy &&
    detailsValid &&
    validateSplitIssue({
      issuer,
      debtor: splitDebtor,
      beneficiaries,
      contracts,
      contractId: contractId || undefined,
    });

  const canSubmit = mode === 'simple' ? canSubmitSimple : canSubmitSplit;

  async function handleSubmit() {
    const detailsPayload =
      Object.keys(details).length > 0 ? details : undefined;
    const trimmedSo = serviceOrderId.trim();
    if (isCancelledServiceOrderId(trimmedSo, serviceOrders)) {
      setSoError(t('business_service_order_cancelled_ref'));
      return;
    }
    setSoError(null);

    if (mode === 'simple') {
      if (!parsePositiveUsdAmount(amount)) {
        return;
      }
      await onSubmit({
        mode: 'simple',
        amountUsd: amount,
        parties,
        contractId: contractId || undefined,
        serviceOrderId: serviceOrderId.trim() || undefined,
        reportId: reportId.trim() || undefined,
        details: detailsPayload,
      });
    } else {
      await onSubmit({
        mode: 'split',
        debtor: normalizeHiveAccountInput(splitDebtor),
        beneficiaries: beneficiaries.map((line) => ({
          beneficiary: normalizeHiveAccountInput(line.beneficiary),
          amountUsd: line.amountUsd,
          role: line.role?.trim() || undefined,
        })),
        contractId: contractId || undefined,
        serviceOrderId: serviceOrderId.trim() || undefined,
        reportId: reportId.trim() || undefined,
        details: detailsPayload,
      });
    }
    onClose();
  }

  function onPrimaryAction() {
    if (step === 'confirm') {
      void handleSubmit();
      return;
    }
    if (mode === 'split' && selfBeneficiary) {
      setStep('confirm');
      return;
    }
    void handleSubmit();
  }

  function updateBeneficiary(index: number, patch: Partial<BeneficiaryLineDraft>) {
    setBeneficiaries((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  const modalTitle =
    step === 'confirm'
      ? t('business_invoice_split_confirm_title')
      : t('business_modal_issue_invoice_title');

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      closeOnBackdrop={!isBusy}
      labelledBy={titleId}
      maxWidthClass="max-w-lg"
      header={
        <div className="flex items-center justify-between gap-3 border-b border-border px-card-padding py-3">
          <h2 id={titleId} className="text-body font-weight-strong text-heading">
            {modalTitle}
          </h2>
          <ModalShellCloseButton onClose={onClose} disabled={isBusy} ariaLabel={t('business_modal_close')} />
        </div>
      }
      footer={
        <div className="flex justify-end gap-2 border-t border-border px-card-padding py-3">
          {step === 'confirm' ? (
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setAck(false);
              }}
              disabled={isBusy}
              className="rounded-btn border border-border px-4 py-2 text-body-sm disabled:opacity-50"
            >
              {t('business_invoice_split_confirm_back')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="rounded-btn border border-border px-4 py-2 text-body-sm disabled:opacity-50"
            >
              {t('business_modal_cancel')}
            </button>
          )}
          <button
            type="button"
            disabled={step === 'confirm' ? isBusy || !ack : !canSubmit}
            onClick={() => void onPrimaryAction()}
            className="rounded-btn bg-accent px-4 py-2 text-body-sm font-weight-label text-accent-fg disabled:opacity-50"
          >
            {step === 'confirm'
              ? t('business_invoice_split_confirm_broadcast')
              : t('business_create_invoice')}
          </button>
        </div>
      }
    >
      {step === 'confirm' ? (
        <div className="flex flex-col gap-4 p-card-padding">
          <p className="text-body-sm text-fg-secondary">{t('business_invoice_split_confirm_body')}</p>
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt text-left text-caption text-fg-secondary">
                  <th className="px-3 py-2 font-weight-label">
                    {t('business_invoice_split_confirm_row_beneficiary')}
                  </th>
                  <th className="px-3 py-2 font-weight-label">
                    {t('business_invoice_split_confirm_row_amount')}
                  </th>
                  <th className="px-3 py-2 font-weight-label">
                    {t('business_invoice_split_confirm_row_status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {predictedLines.map((line) => (
                  <tr key={line.beneficiary} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 font-mono">@{line.beneficiary}</td>
                    <td className="px-3 py-2">${line.amountUsd}</td>
                    <td className="px-3 py-2">
                      <StateBadge
                        variant={line.expectedState === 'confirmed' ? 'confirmed' : 'pending'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label className="flex items-start gap-2 text-body-sm">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              disabled={isBusy}
              className="mt-1"
            />
            <span>{t('business_invoice_split_confirm_ack')}</span>
          </label>
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-card-padding">
          <div className="flex gap-2 rounded-btn border border-border p-1">
            {(['simple', 'split'] as const).map((value) => (
              <button
                key={value}
                type="button"
                disabled={isBusy}
                onClick={() => setMode(value)}
                className={[
                  'flex-1 rounded-btn px-3 py-2 text-body-sm',
                  mode === value ? 'bg-accent text-accent-fg' : 'text-fg-secondary hover:bg-surface-alt',
                ].join(' ')}
              >
                {value === 'simple'
                  ? t('business_invoice_mode_simple')
                  : t('business_invoice_mode_split')}
              </button>
            ))}
          </div>

          <RelationshipReadonlyField label={t('business_field_issuer')} value={`@${issuer}`} />

          {mode === 'simple' ? (
            <>
              <AccountPairSwapRow
                leftLabel={t('business_field_debtor')}
                rightLabel={t('business_field_creditor')}
                leftValue={`@${parties.debtor}`}
                rightValue={`@${parties.creditor}`}
                swapAriaLabel={t('business_invoice_swap_debtor_creditor')}
                disabled={isBusy}
                onSwap={() =>
                  setParties((current) => ({
                    debtor: current.creditor,
                    creditor: current.debtor,
                  }))
                }
              />
              <label className="flex flex-col gap-1 text-body-sm">
                {t('business_field_amount_usd')}
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-btn border border-border px-3 py-2"
                />
              </label>
            </>
          ) : (
            <>
              <AccountPairSwapRow
                leftLabel={t('business_field_debtor')}
                rightLabel={t('business_field_issuer')}
                leftValue={`@${splitDebtor}`}
                rightValue={`@${issuer}`}
                swapAriaLabel={t('business_invoice_swap_debtor_issuer')}
                disabled={isBusy || allowedDebtors.length < 2}
                onSwap={swapSplitDebtor}
              />
              {contracts.length === 0 ? (
                <p className="text-caption text-error" role="alert">
                  {t('business_invoice_debtor_contract_required')}
                </p>
              ) : null}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-body-sm font-weight-label">{t('business_invoice_beneficiaries')}</span>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setBeneficiaries((rows) => [...rows, emptyBeneficiaryLine()])}
                    className="rounded-btn border border-border px-3 py-1 text-caption disabled:opacity-50"
                  >
                    {t('business_invoice_add_beneficiary')}
                  </button>
                </div>
                {beneficiaries.map((line, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 rounded-btn border border-border p-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_auto] items-end">
                      <UserRefSearchField
                        label={t('business_field_beneficiary')}
                        value={line.beneficiary}
                        onChange={(accountName) =>
                          updateBeneficiary(index, { beneficiary: accountName })
                        }
                        fieldLabel={t('business_field_beneficiary')}
                        searchPlaceholder={t('business_hive_account_search_placeholder')}
                        excludeAccountNames={beneficiaryExcludeForRow(index)}
                      />
                      <label className="flex flex-col gap-1 text-caption">
                        {t('business_field_amount_usd')}
                        <input
                          type="text"
                          inputMode="decimal"
                          value={line.amountUsd}
                          onChange={(e) => updateBeneficiary(index, { amountUsd: e.target.value })}
                          className="rounded-btn border border-border px-2 py-1.5 text-body-sm"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={isBusy || beneficiaries.length <= 1}
                        onClick={() =>
                          setBeneficiaries((rows) => rows.filter((_, i) => i !== index))
                        }
                        className="rounded-btn border border-border px-2 py-1.5 text-caption disabled:opacity-50"
                      >
                        {t('business_invoice_remove_beneficiary')}
                      </button>
                    </div>
                    <label className="flex flex-col gap-1 text-caption">
                      {t('business_field_role')}
                      <input
                        type="text"
                        value={line.role ?? ''}
                        onChange={(e) => updateBeneficiary(index, { role: e.target.value })}
                        className="rounded-btn border border-border px-2 py-1.5 text-body-sm"
                        placeholder={t('business_invoice_role_optional')}
                      />
                    </label>
                  </div>
                ))}
                <RelationshipReadonlyField
                  label={t('business_invoice_total')}
                  value={`$${splitTotal}`}
                />
              </div>
              {selfBeneficiary ? (
                <p
                  className="rounded-btn border border-border bg-surface-alt px-3 py-2 text-caption text-warning"
                  role="alert"
                >
                  {t('business_invoice_self_beneficiary_warning').replace(
                    '@debtor',
                    `@${normalizeHiveAccountInput(splitDebtor)}`,
                  )}
                </p>
              ) : null}
              {attestor ? (
                <p className="rounded-btn border border-border bg-surface-alt px-3 py-2 text-caption text-fg-secondary">
                  {t('business_invoice_attestor_hint')}
                </p>
              ) : null}
            </>
          )}

          {contracts.length > 0 ? (
            <label className="flex flex-col gap-1 text-body-sm">
              {t('business_field_contract')}
              {contractRequired ? (
                <span className="text-caption text-fg-secondary">
                  {t('business_invoice_contract_required')}
                </span>
              ) : null}
              <select
                value={contractId}
                onChange={(e) => setContractId(e.target.value)}
                className="rounded-btn border border-border px-3 py-2"
              >
                {!contractRequired ? <option value="">{t('business_invoice_no_contract_option')}</option> : null}
                {contracts.map((c) => (
                  <option key={c.contract_id} value={c.contract_id}>
                    {c.offer_name} · {shortContractId(c.contract_id)}
                  </option>
                ))}
              </select>
            </label>
          ) : contractRequired ? (
            <p className="text-caption text-error" role="alert">
              {t('business_invoice_contract_required_missing')}
            </p>
          ) : (
            <p className="text-caption text-fg-secondary">{t('business_field_no_contract')}</p>
          )}

          <label className="flex flex-col gap-1 text-body-sm">
            {t('business_field_service_order')}
            <input
              type="text"
              value={serviceOrderId}
              onChange={(e) => {
                setServiceOrderId(e.target.value);
                setSoError(null);
              }}
              className="rounded-btn border border-border px-3 py-2 font-mono text-caption"
              placeholder={t('business_invoice_optional_link_placeholder')}
            />
          </label>
          {soError ? (
            <p className="text-caption text-error" role="alert">
              {soError}
            </p>
          ) : null}
          <label className="flex flex-col gap-1 text-body-sm">
            {t('business_field_report')}
            <input
              type="text"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              className="rounded-btn border border-border px-3 py-2 font-mono text-caption"
              placeholder={t('business_invoice_optional_link_placeholder')}
            />
          </label>

          <ObjectBuilder
            key={detailsBuilderKey}
            value={{}}
            label={t('business_invoice_details_label')}
            disabled={isBusy}
            onChange={(next, valid) => {
              setDetails(next);
              setDetailsValid(valid);
            }}
          />
        </div>
      )}
    </ModalShell>
  );
}
