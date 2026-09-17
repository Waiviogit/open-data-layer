---
id: docs-spec-osl-activity-fingerprint
title: Object activity fingerprint (v1)
description: Normative SimHash contract for archival object-channel imports.
type: spec
status: active
scope: platform
tags: [osl, messaging, dedup]
related:
  - docs/spec/osl/messages.md
  - docs/apps/query-api/spec/osl-messaging.md
---

# Object activity fingerprint (v1)

Agents import social posts onto **object channels** with rewritten `body` text. Dedup identity comes from the **original author caption**, carried on chain in `message_create.source.text_simhash` (never derived from `body` at index time).

Implementation: `@opden-data-layer/core` → `computeActivityFingerprint`, `normalizeOriginalText`, `isNearDuplicate`.

## Normalization (order is normative)

1. Unicode NFKC
2. Lowercase
3. Strip `http(s)://…` URLs
4. Strip `@handles` and `#hashtags`
5. Replace non-letter/non-number runs with a single space (`\p{L}\p{N}` preserved)
6. Collapse whitespace and trim

## SimHash (text)

- Shingles: word 3-grams (if fewer than 3 words, each word is its own shingle)
- Hash each shingle: FNV-1a 64-bit (`offset 0xcbf29ce484222325`, prime `0x100000001b3`), interpreted as signed 64-bit
- Bit vote: +1 if shingle hash bit set, else −1; set output bit when vote ≥ 0
- Minimum normalized length: **40** chars → below that, `text_simhash` is omitted (`null`)

## Near-duplicate thresholds

| Signal | Max Hamming distance |
|--------|----------------------|
| `text_simhash` | 3 |
| Each `image_phashes` pair | 8 |

- Compare only rows with the same `fingerprint_v` (`fp_v` on chain)
- Window: `|t₁ − t₂| ≤ 72h` on `COALESCE(original_created_at_unix, created_at_unix)`

## On-chain encoding

`source` on `message_create` (object channels only):

```json
{
  "platform": "instagram",
  "id": "ABC123",
  "fp_v": 1,
  "text_simhash": "0f0f0f0f0f0f0f0f",
  "image_phashes": ["aabbccddeeff0011"]
}
```

- `fp_v` required when `text_simhash` or `image_phashes` present
- Hex values: 16 lowercase hex chars (64-bit), high bit allowed
- `image_phashes`: agent-supplied in v1 (no in-repo pHash computation yet)

## Canonical `source.id`

| Platform | `source.id` |
|----------|-------------|
| instagram | shortcode (`/p/{code}/`), not `pk` |
| facebook | native post id |
| tiktok, x, youtube | platform-native id |
| other | opaque string |

## Test vectors

Run `pnpm nx test core --testPathPatterns=activity-fingerprint` for frozen vectors. Any reimplementation must match `computeActivityFingerprint` output for the same normalized caption.

### Frozen LONG_CAPTION (v1)

| Field | Value |
|-------|-------|
| Input | `Our seasonal tasting menu features locally sourced ingredients prepared by our award winning chef team every evening` |
| Normalized | `our seasonal tasting menu features locally sourced ingredients prepared by our award winning chef team every evening` |
| `text_simhash` (hex) | `9528595b27876241` |

Variant with `🔥 #food https://instagram.com/p/abc @chef` appended → **same** `text_simhash`.

### Hamming 3 limits

Hamming distance ≤ 3 matches punctuation, emoji, URL, and hashtag variants (see tests). It does **not** reliably match single-word noun swaps within an otherwise identical caption — word replacement typically yields distance ~6 on this SimHash. Do not treat TC-002-style edits as near-duplicates.
