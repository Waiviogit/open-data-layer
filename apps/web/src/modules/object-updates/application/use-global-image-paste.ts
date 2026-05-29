'use client';

import { useCallback, useEffect, useRef } from 'react';

import {
  imageFileFromClipboard,
  parseHttpUrlFromPaste,
} from './image-cid-or-url-paste';

type HandlerState = {
  uploadFile: (file: File) => void;
  importImageFromUrl: (url: string) => void;
  hasImage: boolean;
  lastActive: number;
};

type HandlerRef = { current: HandlerState };

/**
 * Module-level registry: stable refs keyed by symbol.
 * Populated/cleaned by `useGlobalImagePaste` effect; never modified on the server.
 */
const registry = new Map<symbol, HandlerRef>();
let documentListenerActive = false;

function pickTarget(): HandlerState | null {
  if (registry.size === 0) {
    return null;
  }
  const all = [...registry.values()].map((r) => r.current);

  // Prefer empty fields (no image yet), most recently active first.
  const empty = all.filter((h) => !h.hasImage);
  if (empty.length > 0) {
    return empty.reduce((a, b) => (a.lastActive >= b.lastActive ? a : b));
  }
  // All filled — least-recently active (i.e. the other one first), then most recent.
  return all.reduce((a, b) => (a.lastActive >= b.lastActive ? a : b));
}

function isTextInputActive(): boolean {
  const el = document.activeElement;
  if (!el) {
    return false;
  }
  const tag = el.tagName.toLowerCase();
  if (tag === 'textarea') {
    return true;
  }
  if (tag === 'input') {
    const type = ((el as HTMLInputElement).type ?? 'text').toLowerCase();
    const nonText = new Set([
      'button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image',
      'range', 'color',
    ]);
    return !nonText.has(type);
  }
  return (el as HTMLElement).isContentEditable === true;
}

function handleDocumentPaste(e: ClipboardEvent): void {
  if (!e.clipboardData) {
    return;
  }

  const imageFile = imageFileFromClipboard(e.clipboardData as unknown as DataTransfer);
  if (imageFile) {
    const target = pickTarget();
    if (!target) {
      return;
    }
    e.preventDefault();
    target.uploadFile(imageFile);
    return;
  }

  // For URL paste: respect text inputs so the user can still paste URLs into Name/Description.
  if (isTextInputActive()) {
    return;
  }

  const pastedUrl = parseHttpUrlFromPaste(e.clipboardData.getData('text/plain'));
  if (pastedUrl) {
    const target = pickTarget();
    if (!target) {
      return;
    }
    e.preventDefault();
    target.importImageFromUrl(pastedUrl);
  }
}

function ensureDocumentListener(): void {
  if (!documentListenerActive) {
    document.addEventListener('paste', handleDocumentPaste);
    documentListenerActive = true;
  }
}

function maybeRemoveDocumentListener(): void {
  if (registry.size === 0 && documentListenerActive) {
    document.removeEventListener('paste', handleDocumentPaste);
    documentListenerActive = false;
  }
}

export type UseGlobalImagePasteParams = {
  uploadFile: (file: File) => void;
  importImageFromUrl: (url: string) => void;
  hasImage: boolean;
};

/**
 * Registers this image field in the global paste registry.
 * Returns `markActive` — call on hover/focus to signal priority when multiple
 * image fields compete for the same paste.
 */
export function useGlobalImagePaste({
  uploadFile,
  importImageFromUrl,
  hasImage,
}: UseGlobalImagePasteParams): { markActive: () => void } {
  const idRef = useRef<symbol | null>(null);
  if (idRef.current === null) {
    idRef.current = Symbol();
  }

  // Stable ref — updated every render so the document listener always reads fresh state.
  const handlerRef = useRef<HandlerState>({
    uploadFile,
    importImageFromUrl,
    hasImage,
    lastActive: 0,
  });
  handlerRef.current.uploadFile = uploadFile;
  handlerRef.current.importImageFromUrl = importImageFromUrl;
  handlerRef.current.hasImage = hasImage;

  useEffect(() => {
    const id = idRef.current as symbol;
    registry.set(id, handlerRef);
    ensureDocumentListener();
    return () => {
      registry.delete(id);
      maybeRemoveDocumentListener();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markActive = useCallback(() => {
    if (idRef.current) {
      handlerRef.current.lastActive = Date.now();
    }
  }, []);

  return { markActive };
}
