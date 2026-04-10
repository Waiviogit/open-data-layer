'use client';

import { AutoLinkNode, LinkNode, createLinkMatcherWithRegExp } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { AutoLinkPlugin } from '@lexical/react/LexicalAutoLinkPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  LineBreakNode,
  ParagraphNode,
  TextNode,
} from 'lexical';
import { useEffect, useMemo, useRef } from 'react';

import { EditorInsertCaretOverlay } from './editor-insert-menu';

const URL_REG_EXP =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const lexicalTheme = {
  paragraph: 'mb-2 text-body text-fg font-weight-body leading-body',
  quote:
    'mb-2 border-s-4 border-border ps-4 text-body italic text-fg-secondary leading-body',
  heading: {
    h1: 'mb-2 font-display text-section text-heading leading-display',
    h2: 'mb-2 font-display text-body-lg text-heading leading-body',
    h3: 'mb-2 font-display text-body text-heading leading-body',
    h4: 'mb-1 font-display text-body-sm text-heading leading-compressed',
    h5: 'mb-1 font-label text-body-sm text-heading leading-compressed',
    h6: 'mb-1 font-label text-caption text-fg-secondary leading-compressed',
  },
  list: {
    ul: 'mb-2 list-disc ps-6 text-body text-fg leading-body',
    ol: 'mb-2 list-decimal ps-6 text-body text-fg leading-body',
    listitem: 'mb-0.5',
    nested: {
      listitem: 'list-none before:hidden',
    },
  },
  link: 'text-link underline underline-offset-2 hover:text-accent-alt',
  text: {
    bold: 'font-weight-strong',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
  },
};

function Placeholder({ text }: { text: string }) {
  return (
    <div className="pointer-events-none absolute start-8 top-3 text-body text-fg-tertiary select-none">
      {text}
    </div>
  );
}

function InitialPlainTextPlugin({ text }: { text: string }) {
  const [editor] = useLexicalComposerContext();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) {
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      applied.current = true;
      return;
    }
    applied.current = true;
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      const lines = trimmed.split('\n');
      for (const line of lines) {
        const p = $createParagraphNode();
        p.append($createTextNode(line));
        root.append(p);
      }
    });
  }, [editor, text]);

  return null;
}

function LexicalAutoLinkConfigured() {
  const matchers = useMemo(
    () => [createLinkMatcherWithRegExp(URL_REG_EXP, (text) => text)],
    [],
  );
  return <AutoLinkPlugin matchers={matchers} />;
}

function PlainTextOnChangePlugin({
  onPlainTextChange,
}: {
  onPlainTextChange?: (text: string) => void;
}) {
  return (
    <OnChangePlugin
      ignoreSelectionChange
      onChange={(editorState) => {
        editorState.read(() => {
          onPlainTextChange?.($getRoot().getTextContent());
        });
      }}
    />
  );
}

function EditorInner({
  bodyPlaceholder,
  initialPlainText,
  onPlainTextChange,
  compact,
  compactBottomInset,
}: {
  bodyPlaceholder: string;
  initialPlainText?: string;
  onPlainTextChange?: (text: string) => void;
  compact?: boolean;
  /** Extra bottom padding for a control (e.g. send) overlaid in the corner. */
  compactBottomInset?: boolean;
}) {
  const minHeightClass = compact ? 'min-h-[3rem]' : 'min-h-[12rem]';
  const verticalPadClass =
    compact && compactBottomInset ? 'pt-3 pb-12' : 'py-3';
  return (
    <>
      {initialPlainText ? <InitialPlainTextPlugin text={initialPlainText} /> : null}
      <PlainTextOnChangePlugin onPlainTextChange={onPlainTextChange} />
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            className={[
              'relative resize-y px-4 ps-8 text-body text-fg outline-none',
              verticalPadClass,
              minHeightClass,
              'focus-visible:outline-none',
            ].join(' ')}
          />
        }
        placeholder={<Placeholder text={bodyPlaceholder} />}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin />
      <LexicalAutoLinkConfigured />
    </>
  );
}

export type LexicalEditorProps = {
  bodyPlaceholder: string;
  /** One-time plain-text seed (e.g. draft body from query-api). */
  initialPlainText?: string;
  /** Fired when plain-text content changes (for autosave). */
  onPlainTextChange?: (text: string) => void;
  /** Shorter editor chrome (e.g. inline comment under a feed story). */
  compact?: boolean;
  /** When `compact`, reserve bottom space for an overlaid action (e.g. send). */
  compactBottomInset?: boolean;
};

export function LexicalPostEditor({
  bodyPlaceholder,
  initialPlainText,
  onPlainTextChange,
  compact,
  compactBottomInset,
}: LexicalEditorProps) {
  const initialConfig = useMemo(
    () => ({
      namespace: 'PostEditor',
      theme: lexicalTheme,
      onError: (error: Error) => {
        console.error(error);
      },
      nodes: [
        ParagraphNode,
        TextNode,
        LineBreakNode,
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        LinkNode,
        AutoLinkNode,
      ],
    }),
    [],
  );

  const shellMinClass = compact ? 'min-h-[3rem]' : 'min-h-[12rem]';
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div
        className={[
          'relative w-full overflow-visible rounded-card border border-border bg-surface shadow-card',
          shellMinClass,
        ].join(' ')}
      >
        <EditorInner
          bodyPlaceholder={bodyPlaceholder}
          initialPlainText={initialPlainText}
          onPlainTextChange={onPlainTextChange}
          compact={compact}
          compactBottomInset={compactBottomInset}
        />
        <EditorInsertCaretOverlay />
      </div>
    </LexicalComposer>
  );
}
