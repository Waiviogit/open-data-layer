# processWobjects — Conceptual Flow

`processWobjects` is the main pipeline that takes **raw wobjects** (decentralized knowledge objects from the Hive/Waivio network) and transforms them into **clean, display-ready objects**. Think of it as a "resolve + filter + merge" pipeline.

---

## Phase 1 — Global Context Setup (runs once for the whole batch)

Before touching any single object, the processor gathers the authority context shared across all objects:

1. **Collect parents.** Scan all input objects for parent references, fetch those parent objects in one batch so they are ready later.
2. **Identify who has power.** Determine the app's owner and admin list. Also fetch the global Waivio platform admins.
3. **Build the blacklist.** Combine all admin-level accounts into one blacklist — votes from these users will be treated specially (stripped from community weight calculations, but processed separately as admin votes).
4. **Determine object-control mode.** Check whether the app owner has toggled "objectControl", which means all objects on the site should behave as if controlled by ownership authorities. Also determine the "extraAuthority" user — typically the shop owner or app owner — who gets elevated rights in that mode.

---

## Phase 2 — Per-Object Processing Loop

Each wobject goes through the same pipeline independently:

### Step A — Resolve who controls this specific object

The object itself declares two authority lists: **ownership** (stronger) and **administrative** (weaker). But these lists only matter if those users are also recognized by the app (via the app's `authority` or `trustedAll` lists). The intersection is computed. On top of that, admins can delegate authority to other users via a special `delegation` field on the object itself — those delegated users are added too. The result is three clean lists: `ownership`, `administrative`, and `objectAdmins`.

### Step B — Enrich every field with vote metadata

Each field on the object is a community contribution — anyone on the blockchain can "vote" for or against it with Hive/WAIV stake. Before any filtering happens, every field is enriched:

- **WAIV weight** is merged into the total weight.
- **Blacklisted voters are stripped** and the weight is recalculated without them.
- **Admin votes are detected**: if any voter in the field's vote list is the master account, the app owner, an admin, or an ownership/administrative authority, that vote is flagged as an `adminVote` with a role (`master > owner > admin > ownership > administrative`) and a status (`approved` or `rejected`).
- **Approval percentage** is calculated: 100% if admin-approved, 0% if admin-rejected, otherwise a stake-weighted ratio of positive vs. negative community votes.

### Step C — Select the winning version of each field

This is the core "consensus" logic. For each field type:

- **Locale filtering first:** prefer fields in the requested language; if none exist, fall back to the most globally popular language available for that field type.
- **Time-gated fields** (e.g., SALE, PROMOTION) outside their active date window are discarded.
- **Array fields** (galleries, phones, buttons, ratings, list items, etc.) keep *all* valid entries — those with admin approval or sufficient community weight. Some have hard caps (max 10 departments, max 3 websites), in which case only the top-weighted ones survive.
- **Single-value fields** (name, description, avatar, etc.) pick *one winner*: if an admin approved any version, the highest-ranking admin's most recent approval wins; otherwise the community version with the highest weight (above a minimum threshold) wins.

The output is a flat map of `fieldName → winning value`.

### Step D — Merge winning fields onto the object

The winning fields are spread directly onto the object as top-level properties (`obj.name`, `obj.description`, `obj.avatar`, etc.). Internal DB fields like `map` and `search` are stripped.

### Step E — Gallery & photo metadata (full-object requests only)

When no field filter is requested (i.e., you want the full object), album and photo counts are computed, a sorted `preview_gallery` is built from gallery items, and the avatar is prepended to it.

### Step F — Product options / variants (when applicable)

If the object belongs to a **product group** (e.g., a T-shirt that comes in different sizes/colors), the processor fetches all sibling objects in the group, runs field enrichment + winning-field selection on each of them (focused on price, avatar, and options), then collects all their option entries and groups them by category. The result is a structured options map like `{ Size: [S, M, L], Color: [Red, Blue] }`.

### Step G — Resolve the parent object

If the object has a parent, the pre-fetched parent is passed recursively through `processWobjects` (with only the essential parent fields, so grandparents are not followed). The processed parent object is attached.

### Step H — Generate affiliate links

If the object has product IDs (e.g., ASIN, ISBN) and the caller provided affiliate codes, affiliate links are generated per product ID, filtered by the user's country and the object type.

### Step I — Determine the default navigation link

Based on the object's type and any custom sort configuration, a `defaultShowLink` is computed — the URL the UI should land on when a user opens this object (e.g., `/object/xyz/list` for a list, `/object/xyz/page` for a page, the first menu item's URL for a business, etc.).

### Step J — Authority stamp for the requesting user

The full `authority` list on the object is reduced to just the entry for the currently requesting user — so the caller can quickly tell whether *this user* has administrative authority over this object.

### Step K — Cleanup

Unless raw Hive data was requested, internal fields (`fields`, `latest_posts`, post-count buckets, etc.) are stripped. Top tags are extracted from the tag-category structure if present.

---

## Phase 3 — Return

If the caller requested a single object (`returnArray=false`), the first processed object is returned directly. Otherwise the full processed array is returned.

---

## Summary

> `processWobjects` resolves **who has authority**, enriches **every field with vote scores**, runs a **consensus algorithm** to pick the winning version of each field for the requested locale, merges those winners onto the object, and hydrates related data (parent, options, affiliate links, navigation link) — then returns a clean, display-ready object the UI can render directly.
