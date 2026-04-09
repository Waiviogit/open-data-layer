'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
} from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

const INSERT_BTN_SIZE_PX = 40;
const INSERT_BTN_RADIUS = INSERT_BTN_SIZE_PX / 2;

type InsertLabelKey =
  | 'editor_insert_photo'
  | 'editor_insert_video'
  | 'editor_insert_object'
  | 'editor_insert_line'
  | 'editor_insert_code'
  | 'editor_insert_table'
  | 'editor_insert_emoji'
  | 'editor_insert_nearby';

const INSERT_ITEMS: {
  labelKey: InsertLabelKey;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { labelKey: 'editor_insert_photo', Icon: IconPhoto },
  { labelKey: 'editor_insert_video', Icon: IconVideo },
  { labelKey: 'editor_insert_object', Icon: IconObject },
  { labelKey: 'editor_insert_line', Icon: IconLine },
  { labelKey: 'editor_insert_code', Icon: IconCode },
  { labelKey: 'editor_insert_table', Icon: IconTable },
  { labelKey: 'editor_insert_emoji', Icon: IconEmoji },
  { labelKey: 'editor_insert_nearby', Icon: IconNearby },
];

function IconPhoto({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function IconVideo({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconObject({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

function IconLine({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
    </svg>
  );
}

function IconCode({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconTable({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

function IconEmoji({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" strokeLinecap="round" />
      <line x1="15" y1="9" x2="15.01" y2="9" strokeLinecap="round" />
    </svg>
  );
}

function IconNearby({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <path d="M11 8v6l3 1.5" />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function getRangeForCaret(editorRoot: HTMLElement): Range | null {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0);
    if (editorRoot.contains(r.commonAncestorContainer)) {
      return r;
    }
  }
  const firstBlock = editorRoot.querySelector('p, h1, h2, h3, h4, h5, h6');
  if (firstBlock && editorRoot.contains(firstBlock)) {
    const r = document.createRange();
    try {
      r.selectNodeContents(firstBlock);
      r.collapse(true);
      return r;
    } catch {
      return null;
    }
  }
  const r = document.createRange();
  try {
    r.selectNodeContents(editorRoot);
    r.collapse(true);
    return r;
  } catch {
    return null;
  }
}

/**
 * Collapsed DOM ranges in contenteditable often yield empty `getClientRects()` and
 * zero-height `getBoundingClientRect()`. Expand a clone by one character or use
 * a BR block rect so the + button can track the active line.
 */
function getCaretLineViewportRect(
  range: Range,
  editorRoot: HTMLElement,
): { top: number; height: number } | null {
  const rects = range.getClientRects();
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (r.height > 0.5) {
      return { top: r.top, height: r.height };
    }
  }

  let br = range.getBoundingClientRect();
  if (br.height > 0.5) {
    return { top: br.top, height: br.height };
  }

  const clone = range.cloneRange();
  if (!clone.collapsed) {
    br = clone.getBoundingClientRect();
    return br.height > 0.5 ? { top: br.top, height: br.height } : null;
  }

  const node = clone.startContainer;
  const offset = clone.startOffset;

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    if (offset < text.length) {
      clone.setEnd(node, offset + 1);
      br = clone.getBoundingClientRect();
      if (br.height > 0) {
        return { top: br.top, height: br.height };
      }
    }
    if (offset > 0) {
      const c2 = range.cloneRange();
      c2.setStart(node, offset - 1);
      c2.setEnd(node, offset);
      br = c2.getBoundingClientRect();
      if (br.height > 0) {
        return { top: br.top, height: br.height };
      }
    }
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    if (offset < el.childNodes.length) {
      const child = el.childNodes[offset];
      if (child.nodeName === 'BR') {
        const lineEl = el as HTMLElement;
        const lh =
          Number.parseFloat(getComputedStyle(lineEl).lineHeight) ||
          Number.parseFloat(getComputedStyle(lineEl).fontSize) * 1.25 ||
          22;
        const r = (child as HTMLBRElement).getBoundingClientRect();
        return { top: r.top, height: Math.max(r.height || lh * 0.8, lh * 0.85) };
      }
      if (child.nodeType === Node.TEXT_NODE && child.textContent) {
        const c3 = range.cloneRange();
        c3.setStart(child, 0);
        c3.setEnd(child, 1);
        br = c3.getBoundingClientRect();
        if (br.height > 0) {
          return { top: br.top, height: br.height };
        }
      }
    }
  }

  let block: HTMLElement | null =
    node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
  while (block && block !== editorRoot) {
    const display = getComputedStyle(block).display;
    if (display === 'block' || display === 'list-item' || block.tagName === 'LI') {
      break;
    }
    block = block.parentElement;
  }
  if (block && editorRoot.contains(block)) {
    const lh =
      Number.parseFloat(getComputedStyle(block).lineHeight) ||
      Number.parseFloat(getComputedStyle(block).fontSize) * 1.25 ||
      22;
    const blockRect = block.getBoundingClientRect();
    return { top: blockRect.top, height: lh };
  }

  const lh = Number.parseFloat(getComputedStyle(editorRoot).lineHeight) || 22;
  br = range.getBoundingClientRect();
  if (br.top > 0 || br.left > 0) {
    return { top: br.top, height: lh };
  }
  return null;
}

function scheduleMeasure(fn: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}

/**
 * Positions the insert control on the left edge (straddling the border) and
 * vertically aligned with the current caret / active line.
 */
export function EditorInsertCaretOverlay() {
  const [editor] = useLexicalComposerContext();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [buttonTop, setButtonTop] = useState(12);
  const containerRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const insertTitleId = useId();
  const insertPanelId = useId();
  const searchInputId = useId();
  const comingSoon = t('app_header_coming_soon');

  const measurePosition = useCallback(() => {
    const container = containerRef.current;
    const root = editor.getRootElement();
    if (!container || !root) {
      return;
    }

    const range = getRangeForCaret(root);
    if (!range) {
      setButtonTop(12);
      return;
    }

    const line = getCaretLineViewportRect(range, root);
    if (!line) {
      setButtonTop(12);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const centerY = line.top + line.height / 2;
    const topPx = centerY - containerRect.top - INSERT_BTN_RADIUS;
    const maxTop = container.clientHeight - INSERT_BTN_SIZE_PX - 8;
    setButtonTop(Math.max(8, Math.min(maxTop, topPx)));
  }, [editor]);

  useLayoutEffect(() => {
    scheduleMeasure(measurePosition);
    return editor.registerUpdateListener(() => {
      scheduleMeasure(measurePosition);
    });
  }, [editor, measurePosition]);

  useEffect(() => {
    const onSel = () => scheduleMeasure(measurePosition);
    document.addEventListener('selectionchange', onSel);
    const root = editor.getRootElement();
    const onRootActivity = () => scheduleMeasure(measurePosition);
    root?.addEventListener('scroll', measurePosition);
    root?.addEventListener('keyup', onRootActivity);
    root?.addEventListener('input', onRootActivity);
    root?.addEventListener('click', onRootActivity);
    window.addEventListener('resize', measurePosition);
    return () => {
      document.removeEventListener('selectionchange', onSel);
      root?.removeEventListener('scroll', measurePosition);
      root?.removeEventListener('keyup', onRootActivity);
      root?.removeEventListener('input', onRootActivity);
      root?.removeEventListener('click', onRootActivity);
      window.removeEventListener('resize', measurePosition);
    };
  }, [editor, measurePosition]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onDocMouseDown(e: MouseEvent) {
      const el = shellRef.current;
      if (el && !el.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-[5] overflow-visible">
      <div
        ref={shellRef}
        className="pointer-events-auto absolute start-0 z-[60] -translate-x-1/2"
        style={{ top: buttonTop }}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? insertPanelId : undefined}
          aria-label={t('editor_insert_open_aria')}
          title={t('editor_insert_open_aria')}
          onClick={() => setOpen((o) => !o)}
          className={[
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-circle border border-border',
            'bg-bg text-fg-secondary shadow-none',
            'hover:bg-ghost-surface',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          ].join(' ')}
        >
          <IconPlus />
        </button>

        {open ? (
          <div
            id={insertPanelId}
            className="absolute start-1/2 top-full z-[70] mt-2 w-[min(100vw-2rem,20rem)] -translate-x-1/2 rounded-card border border-border bg-surface p-3 shadow-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={insertTitleId}
          >
            <h2 id={insertTitleId} className="mb-3 font-label text-body-sm text-heading">
              {t('editor_insert_title')}
            </h2>

            <div className="grid grid-cols-2 gap-2">
              {INSERT_ITEMS.map(({ labelKey, Icon }) => (
                <button
                  key={labelKey}
                  type="button"
                  disabled
                  title={comingSoon}
                  className="flex flex-col items-center gap-1.5 rounded-btn bg-secondary px-2 py-3 text-body-sm text-secondary-fg opacity-70"
                >
                  <Icon className="text-fg-secondary" />
                  <span className="text-center leading-tight">{t(labelKey)}</span>
                </button>
              ))}
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <label htmlFor={searchInputId} className="sr-only">
                {t('editor_search_object_by_name')}
              </label>
              <input
                id={searchInputId}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('editor_search_object_by_name')}
                autoComplete="off"
                className={[
                  'w-full rounded-btn border border-border bg-surface-control px-3 py-2 text-body-sm text-fg',
                  'placeholder:text-fg-tertiary outline-none',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                ].join(' ')}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
