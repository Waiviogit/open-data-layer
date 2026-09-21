---
id: web-pages-editor
title: Post editor
description: "Authenticated screen for composing a post: title field and rich body using **Lexical** (`lexical`, `@lexical/react`, `@lexical/rich-text`, `@lexical/list`, `@lexical/link`). Legacy Waivio behavior (draft list, campaigns, linked objects, Slate) is described in `tmp/editor-page.md` and is **not** implemented in the MVP; extend with application queries and server actions when APIs exist."
tags: [web, page, editor]
related:
  - docs/apps/web/spec/pages/index.md
  - docs/apps/web/spec/pages/drafts/page.md
type: spec
status: active
scope: web
updated_at: 2026-06-10
---

# Post editor (`/editor`)

**Back:** [web overview](../../overview.md) · **Related:** [architecture](architecture.md), [auth](auth.md), [app-header](app-header.md)

## Purpose

Authenticated screen for composing a post: title field and rich body using **Lexical** (`lexical`, `@lexical/react`, `@lexical/rich-text`, `@lexical/list`, `@lexical/link`). Legacy Waivio behavior (draft list, campaigns, linked objects, Slate) is described in [`tmp/editor-page.md`](../../../../tmp/editor-page.md) and is **not** implemented in the MVP; extend with application queries and server actions when APIs exist.

## Route and access

| Item | Detail |
|------|--------|
| Path | `/editor` — [`apps/web/src/app/(app)/editor/page.tsx`](../../../../apps/web/src/app/(app)/editor/page.tsx) |
| Auth | Server Component calls `createCookieAuthContextProvider().getUser()`; if `null`, `redirect('/')`. Unauthenticated users cannot view the editor. |
| Entry | Logged-in **write** icon in [`LoggedInHeaderActions`](../../../../apps/web/src/modules/app-header/presentation/components/logged-in-header-actions.tsx) → `/editor`. |

## Implementation

| Area | Detail |
|------|--------|
| Module | [`apps/web/src/modules/editor/`](../../../../apps/web/src/modules/editor/) — `EditorScreen`, `LexicalPostEditor`, insert overlay, format toolbar, **`EditorAdvancedSettingsPanel`**, **`EditorAttachedObjectsPanel`**, **`EditorPublishDock`**, **`EditorPostPreviewModal`**; application `lexical-state-to-markdown`, `post-editor-advanced-settings`, `use-editor-post-publish`; domain `format-actions`, `SpoilerNode`, `post-editor-linked-object`, `post-editor-advanced-settings`; drafts in infrastructure. |
| Layout | Main column uses **`max-w-container-content`** (not `container-narrow`). |
| UI | Design tokens (see [theme.md](../../theme.md)); body placeholder uses i18n `story_placeholder`; page title from `editor` in `generateMetadata`. |
| Insert menu | **+** on the left border tracks the caret. Dialog grid: **Photo** (upload panel), **Video** (YouTube / Instagram URL → linked paragraph; render-time iframe via `sanitizePostBodyHtml`), and **Object** (inline search at caret: **+** → **✕**, placeholder `objects_auto_complete_placeholder`, dropdown via `/api/search`). Object pick inserts a **Lexical link** (visible name, `href` = `{origin}/object/{id}`) and appends to `jsonMetadata.objects` when id is new (removing the link in the editor does **not** remove metadata). Remaining grid items stay disabled. i18n: `editor_insert_*`. |
| Format toolbar | Floating bar (`EditorFormatToolbar`) on **non-compact** editors when the user selects text (hidden on collapsed/zero-width selection). Primary: Bold, Italic, Link, More (…). More menu driven by `MORE_ACTIONS` in `domain/format-actions.ts` (H1–H3, Quote, inline code, Spoiler, Mention stub). Positioned above selection via `createPortal` + `position: fixed`; `onMouseDown` `preventDefault` preserves selection. Link opens inline URL field with editor-state snapshot restore on cancel. i18n: `editor_format_*`. |
| Images | **Non-compact** editor only: paste image file or **image-like URL** (`EditorPasteImagePlugin` — pathname image extension or content-gateway `/ipfs-gateway/content/image/{cid}`; other `http(s)` URLs insert as text); drag-drop on editor shell (`EditorImageDropOverlay`), Insert → Photo (`EditorInsertPhotoPanel` + shared `IpfsImageDropZone`). Upload via `uploadImageToIpfs` / `uploadImageFromUrl`; `ImageNode` stores `cid` + `src`. Draft `body` is Lexical JSON. Publish converts body via `lexical-state-to-markdown.ts`. |
| Advanced settings | Collapsible **`EditorAdvancedSettingsPanel`** (closed by default) **above** linked objects: **Reward** (`fifty_fifty` → `percent_hbd: 10000`, `hive_power` → `0`, `declined` → `max_accepted_payout: 0.000 HBD` per [Hive `comment_options`](https://developers.hive.io/apidefinitions/broadcast-ops.html)). **Beneficiaries** (user search + weight sliders; author share = remainder). Default beneficiary from server env `POST_EDITOR_DEFAULT_BENEFICIARY_ACCOUNT` / `POST_EDITOR_DEFAULT_BENEFICIARY_PERCENT` ([`post-editor-defaults.ts`](../../../../apps/web/src/config/post-editor-defaults.ts)). **Hashtags** → `json_metadata.tags` (default chip `waivio`, removable). Reward mode in draft metadata as `_editorRewardMode` (stripped on publish). |
| Bottom dock | Fixed bar (same chrome as object-create `PendingOpsDock`): status line from `resolveEditorPublishDockStatus` — **ready to publish** or a warning (`editor_post_not_ready_*`, `linked_objects_remaining`). **Preview** / **Publish** require non-empty title and body (Lexical text or image), valid linked-object percents, valid beneficiaries, and legal checkbox. Permlink from title via `titleToPostSlug` (Cyrillic transliteration, max slug 128, Hive `[a-z0-9-]`, max 255). **Publish post** broadcasts Hive **`comment`** + **`comment_options`**, `awaitTrxConfirmation`, deletes draft, navigates to `/@username`. Legal checkbox: `legal_notice_create_post`. |
| Linked objects | Below advanced settings: search (`/api/search` via `fetchObjectSearchResults`). On load, all stored `object_id`s are hydrated in one `POST /api/search/objects-by-ids` → query-api `loadByObjectIds` + projection (no FTS / meta_group dedup). **Create new object** opens **`EditorCreateObjectModal`** (name, locale, searchable type, optional like) — flush autosave first; on-chain quick create via `buildEditorQuickCreateOps` (`object_create` + `name` + supposed updates), then `attachReturnedObject` without leaving the editor. The full **`/object-create`** page remains for header **Create object**; optional `?return=` + `attachObject` still works when that page is used. Cards: toggle (detach) and independent percent sliders (equal split only on add/remove). State in draft **`jsonMetadata.objects`**. When a linked object has **`object_type: hashtag`** (linked-objects search, Insert → Object, or `attachObject` return), the editor also adds the normalized tag to **Advanced settings** → `json_metadata.tags` if it is not already present. See [post-json-metadata-objects.md](../../../spec/data-model/post-json-metadata-objects.md), [`editor-create-object-modal.tsx`](../../../../apps/web/src/modules/editor/presentation/components/editor-create-object-modal.tsx), [`build-editor-quick-create-ops.ts`](../../../../apps/web/src/modules/object-create/application/build-editor-quick-create-ops.ts). Autosave: [drafts/page.md](../drafts/page.md). |
| i18n | Document title uses locale messages via `getRequestLocale` + `loadMessages`. Keys: `editor_advanced_settings`, `editor_search_elements`, `editor_search_object_by_name`, `editor_linked_objects`, `create_new_object`, `linked_objects_remaining`, `editor_dock_region`, `editor_publish_post`, `preview`, `ready_to_publish`, `legal_notice_create_post`, `reward_option_*`, `beneficiaries`, `hashtags`. |

## MVP limits

- Publish creates a **new** root post only (no update when opening editor with existing `permlink`).
- Insert grid items except **Photo**, **Video**, and **Object** do not insert content yet (placeholders).
- Reward **50/50** uses `percent_hbd: 10000` (Waivio-compatible), not Hive docs’ `5000` basis-point interpretation for the same UI label.

## Verification

Open `/editor` logged out → redirect to `/`. Logged in → editor UI; header write icon navigates to `/editor`.
