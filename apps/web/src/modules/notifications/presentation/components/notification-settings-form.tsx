'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

import type { NotificationSettingsFormState } from '../../application/notification-settings.types';

type NotificationSettingsFormProps = {
  initialSettings: NotificationSettingsFormState;
  pending: boolean;
  saveError?: string | null;
  onSave: (form: NotificationSettingsFormState) => Promise<boolean>;
};

type CheckboxFieldProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
};

function CheckboxField({ label, checked, disabled = false, onChange }: CheckboxFieldProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-body leading-snug text-fg">
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 accent-accent disabled:cursor-not-allowed"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className={disabled ? 'text-fg-muted' : undefined}>{label}</span>
    </label>
  );
}

type SettingsSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-subsection font-weight-display text-heading">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-body text-fg-muted">{description}</p>
        ) : null}
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

type IncomingTransferFieldProps = {
  checked: boolean;
  minimalTransfer: number;
  onCheckedChange: (checked: boolean) => void;
  onMinimalTransferChange: (value: number) => void;
};

function IncomingTransferField({
  checked,
  minimalTransfer,
  onCheckedChange,
  onMinimalTransferChange,
}: IncomingTransferFieldProps) {
  const { t } = useI18n();
  const [minAmountBefore = '', minAmountAfter = ''] = t('min_amount').split('{input}');

  return (
    <label className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body leading-snug text-fg">
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 accent-accent"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
      <span className="shrink-0">{t('incoming_transfers')}</span>
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-fg-muted">
        <span>({minAmountBefore.trimEnd()}</span>
        <input
          type="number"
          min={0}
          step={0.01}
          className="w-20 rounded-btn border border-border bg-surface px-2 py-0.5 text-fg"
          value={minimalTransfer}
          onChange={(e) => onMinimalTransferChange(Number(e.target.value) || 0)}
          onClick={(e) => e.stopPropagation()}
        />
        <span>{minAmountAfter.trim()})</span>
      </span>
    </label>
  );
}

export function NotificationSettingsForm({
  initialSettings,
  pending,
  saveError,
  onSave,
}: NotificationSettingsFormProps) {
  const { t } = useI18n();
  const [form, setForm] = useState(initialSettings);

  useEffect(() => {
    setForm(initialSettings);
  }, [initialSettings]);

  const setBool = (key: keyof NotificationSettingsFormState) => (checked: boolean) => {
    setForm((prev) => ({ ...prev, [key]: checked }));
  };

  return (
    <form
      className="space-y-10"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(form);
      }}
    >
      <div className="space-y-3 text-body text-fg-muted">
        <p>{t('instant_mobile_notifications_description')}</p>
      </div>

      <SettingsSection title={t('community_actions')}>
        <CheckboxField label={t('likes')} checked={form.vote} onChange={setBool('vote')} />
        <CheckboxField label={t('reblog')} checked={form.reblog} onChange={setBool('reblog')} />
        <CheckboxField label={t('replies')} checked={form.reply} onChange={setBool('reply')} />
        <CheckboxField label={t('mentions')} checked={form.mention} onChange={setBool('mention')} />
        <CheckboxField
          label={t('downvotes')}
          checked={form.downvote}
          onChange={setBool('downvote')}
        />
        <CheckboxField label={t('follow')} checked={form.follow} onChange={setBool('follow')} />
        <CheckboxField
          label={t('claimed_object_updates')}
          checked={form.claimed_object_updates}
          onChange={setBool('claimed_object_updates')}
        />
        <CheckboxField
          label={t('group_id_control')}
          checked={form.group_id_control}
          onChange={setBool('group_id_control')}
        />
        <CheckboxField
          label={t('followed_user_threads')}
          checked={form.followed_user_threads}
          onChange={setBool('followed_user_threads')}
        />
        <CheckboxField
          label={t('notification_settings_messages')}
          checked={form.messages}
          onChange={setBool('messages')}
        />
        <CheckboxField
          label={t('notification_settings_obl')}
          checked={form.obl}
          onChange={setBool('obl')}
        />
      </SettingsSection>

      <SettingsSection title={t('wallet_transactions')}>
        <IncomingTransferField
          checked={form.transfer}
          minimalTransfer={form.minimal_transfer}
          onCheckedChange={setBool('transfer')}
          onMinimalTransferChange={(value) =>
            setForm((prev) => ({ ...prev, minimal_transfer: value }))
          }
        />
        <CheckboxField
          label={t('internal_market')}
          checked={form.fill_order}
          onChange={setBool('fill_order')}
        />
        <CheckboxField
          label={t('power_up')}
          checked={form.power_up}
          onChange={setBool('power_up')}
        />
        <CheckboxField
          label={t('claim_rewards')}
          checked={form.claim_reward}
          onChange={setBool('claim_reward')}
        />
      </SettingsSection>

      <SettingsSection title={t('my_actions')}>
        <CheckboxField
          label={t('my_post_notify')}
          checked={form.my_post}
          onChange={setBool('my_post')}
        />
        <CheckboxField
          label={t('my_comment_notify')}
          checked={form.my_comment}
          onChange={setBool('my_comment')}
        />
        <CheckboxField
          label={t('my_like_notify')}
          checked={form.my_like}
          onChange={setBool('my_like')}
        />
      </SettingsSection>

      <SettingsSection
        title={t('security_alerts')}
        description={t('security_alerts_info')}
      >
        <CheckboxField label={t('security_alerts')} checked disabled />
      </SettingsSection>

      <button
        type="submit"
        disabled={pending}
        className="rounded-btn bg-accent px-6 py-2 text-body font-medium text-on-accent disabled:opacity-60"
      >
        {t('save')}
      </button>
      {saveError ? (
        <p className="text-body text-destructive" role="alert">
          {saveError}
        </p>
      ) : null}
    </form>
  );
}
