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
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { LineBreakNode, ParagraphNode, TextNode } from 'lexical';
import { useMemo } from 'react';

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

function LexicalAutoLinkConfigured() {
  const matchers = useMemo(
    () => [createLinkMatcherWithRegExp(URL_REG_EXP, (text) => text)],
    [],
  );
  return <AutoLinkPlugin matchers={matchers} />;
}

function EditorInner({ bodyPlaceholder }: { bodyPlaceholder: string }) {
  return (
    <>
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            className={[
              'relative min-h-[12rem] resize-y px-4 py-3 ps-8 text-body text-fg outline-none',
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
};

export function LexicalPostEditor({ bodyPlaceholder }: LexicalEditorProps) {
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

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative w-full min-h-[12rem] overflow-visible rounded-card border border-border bg-surface shadow-card">
        <EditorInner bodyPlaceholder={bodyPlaceholder} />
        <EditorInsertCaretOverlay />
      </div>
    </LexicalComposer>
  );
}
