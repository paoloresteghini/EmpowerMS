# Cutover by promoting empv2, and the content it has to absorb first

Started 2026-09-17, on Paolo's decision to **reverse the direction of the
cutover**. Read `docs/staging-to-prod-database.md` first: it is the plan this
one replaces, and it is still the best description of *why* the old direction
was hard.

## The reversal, in one paragraph

The plan of record was: the converted design goes **onto production's database**,
re-resolving every per-install id there, because empv2 is a stale clone and a
database push from staging would destroy newer content. The new plan is the
opposite. **empv2 is promoted to production.** Redoing the conversion work
against production's database is more work than importing production's newer
content into empv2, so the newer content moves instead.

That trade is only correct if the "newer content" is actually enumerated. Most
of it is not blog posts, and the part that is not blog posts is the part that
cannot be recreated.

## What the reversal makes easy

Nearly all of `staging-to-prod-database.md` stops applying. The three id
couplings it is written about (attachment ids in every `media.mjs`, term ids in
Loop Grid queries, post ids for pages and Loop Item templates) are all **already
correct on empv2**, because empv2 is where they were minted. Of the five scripts
that document says must run against production in order, four exist only to
re-resolve ids on an install that has never seen them:

| Script | Under the old plan | Under this plan |
| --- | --- | --- |
| `apply-research-category.mjs` | creates the category, tags 6 | **still needed**, see below |
| `loop-templates.mjs --ensure` | mints prod's own template ids | no-op, empv2 has them |
| `import-photography.mjs --import` | imports ~69 photographs | no-op, empv2 has them |
| `apply-team-roster.mjs --apply` | roster corrections on prod | no-op, already applied |
| `apply-guest-types.mjs --apply` | tags 52 episodes | **partly needed**, see below |

`resolveTerms()` on every deploy entry point likewise becomes a no-op rather
than a load-bearing step. This is a real simplification and it is most of the
argument for the reversal.

## The clone boundary

**2026-07-28 18:49:34.** Established three independent ways, all agreeing:

- newest user registration on empv2: `2026-07-28 18:49:34`
- newest Gravity Forms entry on empv2: form 3 at `2026-07-28 01:13:44`, form 4
  at `2026-07-28 00:25:19`
- newest published post on empv2: `2026-07-21 12:49:13`
  (`sen-jeremy-england-neighbors-before-opponents`, id 20537)

Everything below is measured against that boundary on 2026-09-17. **Every number
grows until cutover day**, so re-measure rather than trusting these.

## THE CONSTRAINT: the two installs' id counters collided

This is the fact the whole import plan has to be built around, and it is not
obvious.

Both installs kept minting post ids from the same counter after the clone. Live
minted blog posts. empv2 minted Elementor templates, attachments and revisions.
**They landed in the same range.** Seven of the eight live posts published since
the clone have ids that are already occupied on empv2:

| live post id | the live post | what empv2 holds at that id |
| --- | --- | --- |
| 20547 | dayton-duncan-the-story-behind... | `elementor_library` |
| 20549 | more-than-a-backpack | `uicore-cd` |
| 20555 | new-empower-mississippi-report-finds... | `elementor_library` |
| 20564 | rep-celeste-hurst-when-helping-hurts | `revision` |
| 20570 | jack-elizabeth-coleman-betting-on-the-delta | *free* |
| 20573 | what-im-looking-for-in-mississippis-next-governor | `elementor_library` |
| 20578 | were-hiring-vice-president-for-public-policy | `attachment` |
| 20584 | kevin-parkinson-choosing-jackson | `attachment` (girl-writing-bw) |

20573 is the **site header nav template**, which renders on every page of the
site. Nothing may be imported over these ids.

**Pre-clone ids, by contrast, MATCH on both installs**, because empv2 is a clone.
Verified on `the-robinsons`: id 18881 and featured image 18882 on both. That
split is what makes the import tractable, and it divides the work in two:

- **New content (published after the boundary)** must be imported with **new
  ids**, minted by empv2. Anything keyed on a post id has to be re-keyed.
- **Edited content (published before, edited after)** can be updated **in place
  by id**, because the ids already agree.

## What has to move, worst first

### 1. Gravity Forms entries — THE ITEM THAT IS NOT RECOVERABLE

Not mentioned in the brief for this plan, and the reason this document leads
with it. Promoting empv2 discards every form submission production has taken
since 2026-07-28. These are the live forms and where empv2's copy stops:

| Form | empv2 entries | newest on empv2 | What it is |
| --- | --- | --- | --- |
| 3 Contact | 3,116 | 2026-07-28 01:13 | embedded on the converted `/contact/` |
| **4 Donate** | **96** | **2026-07-28 00:25** | **wired to Empower's REAL Stripe, live mode** |
| 2 Become an Advocate | 836 | 2026-07-15 18:30 | |
| 1 Take Action | 591 | 2026-07-15 18:32 | |
| 43 Stay Informed | 24 | 2026-07-24 18:41 | newsletter |

Form 4 is the severe one. `wp_gf_addon_payment_transaction` holds 199 rows on
empv2, and the donate form starts **real recurring Stripe donations**. Losing
production's rows means losing the record of gifts that are still being
collected. The Stripe side survives regardless (Stripe is the system of record
for the money), but the site loses its own history of who gave and against which
entry, and the GF feeds that reference those entries.

Form 3 is 3,116 enquiries from real people on empv2 alone, and the old plan's
instruction was a blunt **"Do not move Gravity Form 3."** That instruction was
written for the old direction, where production kept its own entries. Under this
plan it inverts: the entries must move, or they die.

**These tables carry it:** `wp_gf_entry`, `wp_gf_entry_meta` (40,232 rows on
empv2), `wp_gf_entry_notes`, `wp_gf_addon_payment_transaction`. Entry ids
collide across installs exactly as post ids do, so this is an append-with-
remapping job, not a table copy.

### 2. Posts published since the boundary — 8, and counting

Listed above with their ids. Four are podcast episodes, which matters for §5.
One of them, `new-empower-mississippi-report-finds-mississippians-want-to-work`
(2026-08-13, Press Releases + Work), is the **sixth research report** that
`apply-research-category.mjs` tags and that empv2 has never seen.

### 3. Posts edited since the boundary — 14

Published before the clone, edited after, so empv2 holds a stale copy at a
matching id. Thirteen were edited in one batch on **2026-09-09** and are all
Community Stories / education stories; the change is not the featured image or
the category (checked on `the-robinsons`: both identical), so it is body copy,
title, excerpt or SEO meta and needs a real diff.

The fourteenth was edited **on 2026-09-17, the day this was written**:
`from-incarceration-to-impact-how-karl-hampton-found-freedom-through-opportunity`.
That post is the top item in the Safe Communities "Latest" block. The delta is
live and still moving.

### 4. Pages edited since the boundary — 2

Needs identifying. Most of production's pages are superseded by the converted
set, so a live edit to a page the conversion replaces is irrelevant, while an
edit to one of the 41 legacy pages that survives is not.

### 5. Everything keyed by a post id has to be re-keyed

`elementor/guest-types.json` is the known case, and it is keyed by post id by
deliberate exception. Four of the eight new posts are podcast episodes
(Parkinson, Coleman, Hurst, Duncan). They will be minted at **new ids** on
empv2, so the file must be regenerated after the import, not before. An
untagged episode shows under *every* guest filter rather than none, so the
failure is silent and reads as a broken filter.

### 5b. What needs NO attention at import, stated so nobody re-derives it

The three solution pages' "Latest on <issue>" blocks and the EPIC page's three
"most recent report" lines are **already queries**, converted 2026-09-10/09-11:
`[empower_solution_latest area="..."]` and `[empower_epic_latest_report
area="..."]`, backed by `wp/empowerms-child/inc/solution-latest.php`. Verified
rendering on empv2 on 2026-09-17 with no unrendered shortcode on either page.

So they absorb the import by themselves. When
`what-im-looking-for-in-mississippis-next-governor` (2026-09-08, Education +
Justice + Work) arrives it becomes the top item in all three Latest blocks, and
when the sixth research report is tagged, EPIC's Meaningful Work line moves from
January 2025 to August 2026. No hand-editing, and no step in this plan.

**The trap that makes this worth writing down:** `src/*/sections/07-latest.html`
and `src/epic-a/sections/04-research.html` still carry hard-coded example rows,
because the static build is a design reference and has no database to query. A
reader checking the source will conclude these blocks are hand-picked
placeholders. They are not. Check the rendered page, not the static build.

### 6. Attachments belonging to the new posts

Featured images and inline media for the 8 new posts carry live ids in the same
collided range. They import with new ids, and each post's `_thumbnail_id` and
inline `wp-image-NNN` classes must be rewritten to match.

### 7. Users — 30 on empv2, newest 2026-07-28

Any account created on production since then does not exist on empv2. Low volume
and low stakes, but an author account missing means a post imports under the
wrong byline.

## The plan

**Phase 0 — freeze and re-measure.** Agree a content freeze on production with
Kienna: a window in which nothing is published or edited. Everything above is
measured at a moment and grows daily. Without a freeze the import chases a
moving target and the last thing published before DNS flips is the thing that
gets lost. Re-run every measurement at the start of the window.

**Phase 1 — take a production export.** Full database dump plus `wp-content/
uploads`, from WP Engine, at the freeze. This is the source of truth for the
import and the rollback if the promotion goes wrong. It is also the only copy of
the form entries.

**Phase 2 — import the 8 new posts.** By WXR export/import, or a scripted
`wp post create` per post, so empv2 mints its own ids. WXR handles attachments
and rewrites `_thumbnail_id` if the media is included; a hand-rolled script
must do that itself. Verify each post's slug is unchanged, because the
converted pages and the SEO listings link by slug.

**Phase 3 — apply the 22 edits.** 14 posts and 2 pages, updated in place by id,
which is safe because pre-clone ids match. Diff each one first: a blind
overwrite from production would also revert anything the conversion changed on
that post.

**Phase 4 — migrate the form entries.** The hard one, and it needs its own
sign-off. Append production's post-boundary entries to empv2's tables with
remapped entry ids, preserving `wp_gf_entry_meta`, notes and payment
transactions. Form 4's rows must be reconciled against Stripe rather than
trusted, since Stripe is the system of record for the money.

**Phase 5 — re-key what depends on post ids.** Regenerate `guest-types.json`
against the imported ids and re-run `apply-guest-types.mjs`, then set guest
types on the four new episodes. Re-run `apply-research-category.mjs --apply` so
the sixth report is tagged.

**Phase 6 — the domain move.** Point `empowerms.org` at the empv2 install and
search-replace `empv2.wpenginepowered.com` → `empowerms.org` across the
database. Note that the build deliberately writes root-relative internal links
(`elementor/links.mjs`'s `localisedHref`), so the link corpus needs no rewriting;
this is about absolute urls in options, media and plugin data.

**Phase 7 — verify against the export, not against the page.** The 41 legacy
pages, the 490+ posts, the form entry counts and the redirect map all have a
known expected value from the Phase 1 export. Compare counts, not impressions.

## What is needed, and from whom

- **Kienna:** agreement to a publishing freeze, and its dates.
- **Empower / WP Engine:** production database and uploads export, and confirmation
  of who can perform the domain move.
- **A decision from Paolo on Phase 4.** Migrating payment-linked form entries
  between installs is the highest-risk step here, and "accept the loss of
  post-boundary entries" is a legitimate answer if Empower can work from Stripe
  and from their own inbox instead. It should be an explicit choice rather than
  something discovered afterwards.

## The open question this plan does not answer

Production has been edited every few days throughout September. The freeze makes
the import correct at a moment; it does not make the reversal cheap if cutover
slips. Every week of delay is another handful of posts, another tranche of form
entries and another round of edits to fold in. **The cost of this plan grows with
time, where the old plan's cost did not.** That is worth saying out loud before
the date slips again.
