/**
 * @jest-environment jsdom
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { I18nProvider } from '@/i18n/providers/i18n-provider';
import type { LocaleId, Messages } from '@/i18n/types';

import { PLAIN_SEND_DISCLAIMER_STORAGE_KEY } from '../domain/messaging.types';
import type { MessagingComposeBarProps } from './messaging-compose-bar';
import { MessagingComposeBar } from './messaging-compose-bar';

type EncryptResult =
  | { ok: true; input: { ciphertext: string; mode: 'memo'; to: string } }
  | { ok: false; error: 'consent_required' | 'encrypt_failed' };

const encryptHarness = {
  keychainMemoAvailable: true,
  probePending: false,
  ensureMemoKeyProbed: jest.fn<Promise<boolean>, []>(),
  buildEncryptedMessage: jest.fn<Promise<EncryptResult>, [unknown]>(),
};

jest.mock('../application/use-messaging-encrypt-send', () => ({
  useMessagingEncryptSend: () => encryptHarness,
}));

jest.mock('@/config/ipfs-content-base-provider', () => ({
  useIpfsContentBaseUrl: () => null,
}));

jest.mock('@/modules/editor', () => {
  const React = require('react') as typeof import('react');
  return {
    LexicalPostEditor: ({
      initialBody,
      onBodyChange,
      bodyPlaceholder,
    }: {
      initialBody?: string;
      onBodyChange?: (body: string) => void;
      bodyPlaceholder?: string;
    }) => {
      const [value, setValue] = React.useState(initialBody ?? '');
      return React.createElement('textarea', {
        'aria-label': bodyPlaceholder,
        value,
        onChange: (event: { target: { value: string } }) => {
          const next = event.target.value;
          setValue(next);
          onBodyChange?.(next);
        },
      });
    },
  };
});

jest.mock('./encrypted-send-modal', () => ({
  EncryptedSendModal: ({
    open,
    onSendEncrypted,
  }: {
    open: boolean;
    onSendEncrypted: (input: { ciphertext: string; mode: 'memo'; to: string }) => void;
  }) =>
    open
      ? require('react').createElement(
          'div',
          { role: 'dialog', 'aria-label': 'Encrypt dialog' },
          require('react').createElement(
            'button',
            {
              type: 'button',
              onClick: () =>
                void onSendEncrypted({
                  ciphertext: '#from-modal',
                  mode: 'memo',
                  to: 'bob',
                }),
            },
            'Confirm encrypted send',
          ),
        )
      : null,
}));

jest.mock('@/shared/presentation', () => ({
  AppModal: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  AppModalCloseButton: ({ onClose, ariaLabel }: { onClose: () => void; ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel} onClick={onClose}>
      Close
    </button>
  ),
}));

const messages = {
  messaging_write_message: 'Write your message...',
  messaging_send: 'Send',
  messaging_sending: 'Sending…',
  messaging_encrypt_toggle_encrypted: 'Send encrypted message',
  messaging_encrypt_toggle_public: 'Send public message',
  messaging_encrypt_select_recipient: 'Select recipient',
  messaging_plain_send_disclaimer_title: 'Send without encryption?',
  messaging_plain_send_disclaimer_body: 'Plain text warning',
  messaging_plain_send_dont_show_again: 'Don\'t show again',
  messaging_encrypt_keychain_required_title: 'Hive Keychain required',
  messaging_encrypt_keychain_required_body: 'Install Keychain',
  cancel: 'Cancel',
  close: 'Close',
} as Messages;

const encryptedOk: EncryptResult = {
  ok: true,
  input: { ciphertext: '#cipher', mode: 'memo', to: 'bob' },
};

function buttonNamed(name: string) {
  return screen.getByRole('button', { name: (value) => value === name });
}

function queryButtonNamed(name: string) {
  return screen.queryByRole('button', { name: (value) => value === name });
}

function draftField() {
  return screen.getByRole('textbox', { name: 'Write your message...' });
}

function typeDraft(value: string) {
  fireEvent.change(draftField(), { target: { value } });
}

async function pressLock() {
  fireEvent.click(buttonNamed('Send public message'));
  await waitFor(() => {
    expect(buttonNamed('Send encrypted message')).toHaveAttribute('aria-pressed', 'true');
  });
}

function defer<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function renderBar(overrides: Partial<MessagingComposeBarProps> = {}) {
  const onSendPlain = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
  const onSendEncrypted = jest
    .fn<Promise<boolean>, [unknown]>()
    .mockResolvedValue(true);
  const props: MessagingComposeBarProps = {
    editorKey: 0,
    channelKind: 'direct',
    peer: 'bob',
    members: [],
    viewerUsername: 'alice',
    hasPriorMessages: true,
    onSendPlain,
    onSendEncrypted,
    ...overrides,
  };
  const view = render(
    <I18nProvider locale={'en-US' as LocaleId} messages={messages}>
      <MessagingComposeBar {...props} />
    </I18nProvider>,
  );
  return {
    ...view,
    onSendPlain,
    onSendEncrypted,
    rerenderBar(next: Partial<MessagingComposeBarProps>) {
      view.rerender(
        <I18nProvider locale={'en-US' as LocaleId} messages={messages}>
          <MessagingComposeBar {...props} {...next} />
        </I18nProvider>,
      );
    },
  };
}

describe('MessagingComposeBar', () => {
  beforeEach(() => {
    localStorage.clear();
    encryptHarness.keychainMemoAvailable = true;
    encryptHarness.probePending = false;
    encryptHarness.ensureMemoKeyProbed.mockReset();
    encryptHarness.ensureMemoKeyProbed.mockResolvedValue(true);
    encryptHarness.buildEncryptedMessage.mockReset();
    encryptHarness.buildEncryptedMessage.mockResolvedValue(encryptedOk);
  });

  it('clears the draft after a successful encrypted inline send when the parent editor key stays put', async () => {
    const { onSendEncrypted } = renderBar({ editorKey: 0 });
    await pressLock();
    typeDraft('ScrapeCreators');

    fireEvent.click(buttonNamed('Send'));

    await waitFor(() => {
      expect(draftField()).toHaveValue('');
    });
    expect(onSendEncrypted).toHaveBeenCalledTimes(1);
    expect(encryptHarness.buildEncryptedMessage).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'ScrapeCreators', recipient: 'bob' }),
    );
  });

  it('leaves the lock pressed after a successful encrypted inline send', async () => {
    renderBar({ editorKey: 0 });
    await pressLock();
    typeDraft('ScrapeCreators');

    fireEvent.click(buttonNamed('Send'));

    await waitFor(() => {
      expect(draftField()).toHaveValue('');
    });
    expect(buttonNamed('Send encrypted message')).toHaveAttribute('aria-pressed', 'true');
  });

  it('clears the draft after a successful plain send when the parent editor key stays put', async () => {
    localStorage.setItem(PLAIN_SEND_DISCLAIMER_STORAGE_KEY, '1');
    const { onSendPlain } = renderBar({ editorKey: 0 });
    typeDraft('hello');

    fireEvent.click(buttonNamed('Send'));

    await waitFor(() => {
      expect(draftField()).toHaveValue('');
    });
    expect(onSendPlain).toHaveBeenCalledTimes(1);
    expect(onSendPlain).toHaveBeenCalledWith('hello');
  });

  it('clears the draft after a successful send from the encrypt modal', async () => {
    const { onSendEncrypted } = renderBar({
      channelKind: 'group',
      peer: null,
      members: ['alice', 'bob'],
    });
    await pressLock();
    typeDraft('secret');
    fireEvent.click(buttonNamed('Send'));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm encrypted send' }));

    await waitFor(() => {
      expect(draftField()).toHaveValue('');
    });
    expect(onSendEncrypted).toHaveBeenCalledTimes(1);
  });

  it('leaves the lock pressed after a successful send from the encrypt modal', async () => {
    renderBar({
      channelKind: 'group',
      peer: null,
      members: ['alice', 'bob'],
    });
    await pressLock();
    typeDraft('secret');
    fireEvent.click(buttonNamed('Send'));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm encrypted send' }));

    await waitFor(() => {
      expect(draftField()).toHaveValue('');
    });
    expect(buttonNamed('Send encrypted message')).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows Sending for the whole in-flight encrypted send, before broadcast pending', async () => {
    const pendingEncrypt = defer<EncryptResult>();
    encryptHarness.buildEncryptedMessage.mockReturnValue(pendingEncrypt.promise);
    const { onSendEncrypted } = renderBar({ pending: false, pendingEncrypted: false });
    await pressLock();
    typeDraft('ScrapeCreators');

    fireEvent.click(buttonNamed('Send'));

    await waitFor(() => {
      expect(screen.getByText('Sending…')).toBeInTheDocument();
    });
    const send = buttonNamed('Sending…');
    expect(send).toHaveAttribute('aria-busy', 'true');
    expect(send.querySelector('.animate-spin')).not.toBeNull();
    expect(queryButtonNamed('Send')).not.toBeInTheDocument();
    expect(draftField()).toHaveValue('ScrapeCreators');
    expect(onSendEncrypted).not.toHaveBeenCalled();

    pendingEncrypt.resolve(encryptedOk);
    await waitFor(() => {
      expect(onSendEncrypted).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps the lock pressed, disabled, and full accent while sending', async () => {
    const pendingEncrypt = defer<EncryptResult>();
    encryptHarness.buildEncryptedMessage.mockReturnValue(pendingEncrypt.promise);
    renderBar();
    await pressLock();
    typeDraft('ScrapeCreators');
    fireEvent.click(buttonNamed('Send'));

    await waitFor(() => {
      expect(screen.getByText('Sending…')).toBeInTheDocument();
    });
    const lock = buttonNamed('Send encrypted message');
    expect(lock).toBeDisabled();
    expect(lock).toHaveAttribute('aria-pressed', 'true');
    expect(lock.className.split(/\s+/)).toContain('text-accent');
    expect(lock.className.split(/\s+/)).not.toContain('text-accent/40');

    fireEvent.click(lock);
    expect(lock).toHaveAttribute('aria-pressed', 'true');

    pendingEncrypt.resolve(encryptedOk);
    await waitFor(() => {
      expect(draftField()).toHaveValue('');
    });
  });

  it('keeps the draft and the lock when the encrypted send is rejected', async () => {
    const { onSendEncrypted } = renderBar();
    onSendEncrypted.mockResolvedValue(false);
    await pressLock();
    typeDraft('keep-me');
    fireEvent.click(buttonNamed('Send'));

    await waitFor(() => {
      expect(queryButtonNamed('Send')).toBeInTheDocument();
    });
    expect(draftField()).toHaveValue('keep-me');
    expect(buttonNamed('Send encrypted message')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Sending…')).not.toBeInTheDocument();
    const send = buttonNamed('Send');
    expect(send).toHaveAttribute('aria-busy', 'false');
    expect(onSendEncrypted).toHaveBeenCalledTimes(1);
  });

  it('keeps the draft and the lock when encryption fails before broadcast', async () => {
    const { onSendEncrypted } = renderBar();
    encryptHarness.buildEncryptedMessage.mockResolvedValue({
      ok: false,
      error: 'encrypt_failed',
    });
    await pressLock();
    typeDraft('keep-me');
    fireEvent.click(buttonNamed('Send'));

    await waitFor(() => {
      expect(queryButtonNamed('Send')).toBeInTheDocument();
    });
    expect(draftField()).toHaveValue('keep-me');
    expect(buttonNamed('Send encrypted message')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Sending…')).not.toBeInTheDocument();
    expect(onSendEncrypted).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Encrypt dialog' })).not.toBeInTheDocument();
  });

  it('keeps the draft and the lock when encryption requires consent', async () => {
    const { onSendEncrypted } = renderBar();
    encryptHarness.buildEncryptedMessage.mockResolvedValue({
      ok: false,
      error: 'consent_required',
    });
    await pressLock();
    typeDraft('keep-me');
    fireEvent.click(buttonNamed('Send'));

    expect(await screen.findByRole('dialog', { name: 'Encrypt dialog' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Sending…')).not.toBeInTheDocument();
    });
    expect(draftField()).toHaveValue('keep-me');
    expect(buttonNamed('Send encrypted message')).toHaveAttribute('aria-pressed', 'true');
    expect(onSendEncrypted).not.toHaveBeenCalled();
  });

  it('does not enter Sending when plain send only opens the disclaimer', () => {
    const { onSendPlain } = renderBar({ hasPriorMessages: false });
    typeDraft('public');

    fireEvent.click(buttonNamed('Send'));

    expect(screen.getByText('Send without encryption?')).toBeInTheDocument();
    expect(screen.queryByText('Sending…')).not.toBeInTheDocument();
    expect(draftField()).toHaveValue('public');
    expect(onSendPlain).not.toHaveBeenCalled();
  });

  it('does not enter Sending when encrypted send only opens the encrypt modal', async () => {
    const { onSendEncrypted } = renderBar({
      channelKind: 'group',
      peer: null,
      members: ['alice', 'bob'],
    });
    await pressLock();
    typeDraft('later');

    fireEvent.click(buttonNamed('Send'));

    expect(await screen.findByRole('dialog', { name: 'Encrypt dialog' })).toBeInTheDocument();
    expect(screen.queryByText('Sending…')).not.toBeInTheDocument();
    expect(draftField()).toHaveValue('later');
    expect(buttonNamed('Send encrypted message')).toHaveAttribute('aria-pressed', 'true');
    expect(onSendEncrypted).not.toHaveBeenCalled();
  });

  it('shows Sending from parent pending without clearing the draft', () => {
    const { rerenderBar } = renderBar();
    typeDraft('still-here');

    rerenderBar({ pendingEncrypted: true });
    expect(screen.getByText('Sending…')).toBeInTheDocument();
    expect(draftField()).toHaveValue('still-here');

    rerenderBar({ pendingEncrypted: false });
    expect(screen.queryByText('Sending…')).not.toBeInTheDocument();
    expect(draftField()).toHaveValue('still-here');

    rerenderBar({ pending: true });
    expect(screen.getByText('Sending…')).toBeInTheDocument();
    expect(draftField()).toHaveValue('still-here');

    rerenderBar({ pending: false });
    expect(screen.queryByText('Sending…')).not.toBeInTheDocument();
    expect(draftField()).toHaveValue('still-here');
  });

  it('keeps the selected group recipient after a successful encrypted send', async () => {
    renderBar({
      channelKind: 'group',
      peer: null,
      members: ['alice', 'bob'],
    });
    await pressLock();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'bob' } });
    typeDraft('hello group');
    fireEvent.click(buttonNamed('Send'));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm encrypted send' }));

    await waitFor(() => {
      expect(draftField()).toHaveValue('');
    });
    expect(screen.getByRole('combobox')).toHaveValue('bob');
    expect(buttonNamed('Send encrypted message')).toHaveAttribute('aria-pressed', 'true');
  });

  it('replaces the visible draft when the parent editor key changes', () => {
    const { rerenderBar } = renderBar({ editorKey: 0 });
    typeDraft('old');

    rerenderBar({ editorKey: 1, initialBody: 'edited' });

    expect(draftField()).toHaveValue('edited');
  });

  it('returns the send control to idle after the in-flight send settles', async () => {
    const pendingSend = defer<boolean>();
    const { onSendEncrypted } = renderBar();
    onSendEncrypted.mockReturnValue(pendingSend.promise);
    await pressLock();
    typeDraft('ScrapeCreators');
    fireEvent.click(buttonNamed('Send'));

    await waitFor(() => {
      expect(screen.getByText('Sending…')).toBeInTheDocument();
    });

    pendingSend.resolve(true);

    await waitFor(() => {
      expect(screen.queryByText('Sending…')).not.toBeInTheDocument();
    });
    const send = buttonNamed('Send');
    expect(send).toHaveAttribute('aria-busy', 'false');
    expect(send).not.toHaveAttribute('aria-busy', 'true');
  });

  it('restores the composer when the send callback throws', async () => {
    const { onSendEncrypted } = renderBar();
    onSendEncrypted.mockRejectedValue(new Error('broadcast failed'));
    await pressLock();
    typeDraft('keep-me');
    fireEvent.click(buttonNamed('Send'));

    await waitFor(() => {
      expect(queryButtonNamed('Send')).toBeInTheDocument();
    });
    expect(draftField()).toHaveValue('keep-me');
    expect(buttonNamed('Send encrypted message')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Sending…')).not.toBeInTheDocument();
    expect(buttonNamed('Send')).toHaveAttribute('aria-busy', 'false');
  });

  it('does not submit a second message while a send is in flight', async () => {
    const pendingEncrypt = defer<EncryptResult>();
    encryptHarness.buildEncryptedMessage.mockReturnValue(pendingEncrypt.promise);
    const { onSendEncrypted } = renderBar();
    await pressLock();
    typeDraft('ScrapeCreators');
    fireEvent.click(buttonNamed('Send'));

    await waitFor(() => {
      expect(buttonNamed('Sending…')).toBeInTheDocument();
    });
    fireEvent.click(buttonNamed('Sending…'));

    pendingEncrypt.resolve(encryptedOk);
    await waitFor(() => {
      expect(onSendEncrypted).toHaveBeenCalledTimes(1);
    });
  });

  it('defines Sending copy in every locale catalog', () => {
    const localesDir = path.resolve(__dirname, '../../../i18n/locales');
    const files = readdirSync(localesDir).filter((name) => name.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);

    for (const name of files) {
      const buf = readFileSync(path.join(localesDir, name));
      expect(buf.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))).toBe(false);
      const text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
      const json = JSON.parse(text) as { messaging_sending?: string };
      expect({ file: name, messaging_sending: json.messaging_sending }).toEqual({
        file: name,
        messaging_sending: 'Sending…',
      });
    }
  });
});
