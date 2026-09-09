# What lives in empv2's database and not in this repo

Started 2026-09-07, after Paolo pointed out that everything built so far assumes
one install. It does not travel. Keep this list current: every entry is work
that must happen again, by hand or by script, when the new site goes live.

## The one thing that makes this hard

**The repo writes numeric IDs into Elementor page trees, and IDs are per-install.**

A deploy script does not say "the photograph called vicksburg-bridge-sunrise" or
"the Press Releases category". It says `20706` and `22`. Those numbers are
correct on empv2 and mean something else, or nothing, on production. So
"redeploy the repo against prod" is not a migration plan: it would publish pages
pointing at whatever happens to hold those ids over there.

Three kinds of coupling, worst first:

1. **Attachment ids** in every `media.mjs`. Wrong id renders somebody else's
   photograph, and no structural test can see it, because a widget with a valid
   id is a valid widget.
2. **Term ids** in Loop Grid queries. Wrong id renders an empty band or the
   wrong content type.
3. **Post ids** for Loop Item templates and for the pages themselves. Wrong id
   writes a page tree over the wrong page.

Every entry below is tagged with which of these it carries.

## The list

### Media library, 59 photographs and their alt text  [attachment ids]

`elementor/photography-2026-09.json` is the manifest: name, id, url for each.
Written by `elementor/import-photography.mjs`, which is idempotent and imports
each file with `wp media import --alt`. That `--alt` is the only route the
sentence has to the attachment: Elementor's image widget has no alt control.

On prod: re-run the importer, which mints NEW ids, then regenerate every
`media.mjs` from the new manifest before deploying a single page. There are
earlier 2026-08 attachments too (safety and landing still use them).

### The `person` custom post type  [post ids]

`/team/` and every bio page render from it. Populated by
`elementor/apply-roster.mjs` (writes the roadmap's Team tab) and
`elementor/sync-person.mjs` (pulls a person whole from empowerms.org). Nine
staff, five fellows, plus board. Reproducible, but nothing about it is in the
repo as data.

### Elementor Loop Item templates  [post ids, referenced BY id]

- **20704** homepage stories lead card
- **20589** homepage stories mini card (its title is "Homepage Community Story
  mini", NOT what the key suggests; a guessed title makes `--ensure` create a
  duplicate and leave the page on the original)
- **20710/20711/20712** the three homepage insights rows, created 2026-09-09
- **20642** single post template, serves all 490 posts
- **11272** Beaver single, drafted

**Run `node elementor/loop-templates.mjs --ensure` on production at cutover.**
It resolves by TITLE and creates only what is missing, so it is safe to repeat.
Every deploy then calls `resolveTemplates()` before building a tree;
deploy-round1.mjs and deploy-content-a.mjs already do, and round1 throws rather
than deploying if a template is absent.

Page trees reference these by id. They are posts, so prod will give them
different ids, and `final/page.mjs` pairs each tree with its own id precisely so
a deploy cannot write one into the other.

### SEO titles and descriptions  [postmeta, no id coupling]

490 post descriptions, approved and deployed 2026-08-28. Page-level titles and
descriptions for the converted pages. Written to postmeta. `og:type` is a
dynamic option rather than the named setting, and robots.txt is WP Engine's
edge, not `blog_public`.

### Category term ids, hard-coded in queries  [term ids]

Every one of these is a number typed into a deploy script:

| term | id on empv2 | used by |
| --- | --- | --- |
| Press Releases | 22 | content-a band-press |
| Community Stories | 9 | homepage stories loop, content-a band-story |
| Education | 7 | (EPIC per-area, once built) |
| Work | 28 | (EPIC per-area, once built) |
| Justice | 29 | (EPIC per-area, once built) |
| Podcast | 133 | podcast library loop |
| Capitol Chat | 135 | capitol-a library |
| Bill Summaries | 124 | content-a topic filter |
| **Research & Reports** | **156**, created 2026-09-09 | homepage card 2, content-a band-research, EPIC ×3 |

**Research & Reports must be recreated on production at cutover.** Run
`node elementor/apply-research-category.mjs --apply` against prod. It is written
for exactly this: the list is SLUGS, not ids, so it resolves against whatever
install it runs on, it creates the term only if absent, and `wp post term add`
is additive so re-running is safe. Prod will mint its own term id, NOT 156.

Worth considering before creating the new one: query by SLUG rather than id
wherever Elementor allows it, so the next migration is cheaper. Not yet checked
whether its Loop Grid control accepts slugs.

### Gravity Forms  [form ids, and real user data]

- **Form 3**, contact. **3,116 entries.** Embedded, not rebuilt. The entries are
  real submissions from real people and are not ours to move casually.
- Newsletter and ambassador forms, live on their pages.
- **Forms 37 and 41 are duplicate ambassador forms**, still unresolved.

Forms are embedded in page trees by id.

### Redirects

`elementor/redirects.mjs` and `elementor/deploy-redirects.mjs`. Includes the
wpautoterms plugin's terms URL pointing at the page that replaced it.

**Kienna raised a much bigger redirect question on 2026-09-07** (see below).

### Settings and site-wide state

- Sticky post **15691** ("House and Senate Leaders Reach Historic Tax Cut Deal",
  2022). Any "latest posts" loop needs `ignore_sticky_posts` or it pins a
  four-year-old post to the top.
- Permalink structure.
- Elementor kit and global styles. UiCore is off, but what it seeded into
  Elementor's own kit outlived its removal.
- Menus and nav structure.
- The converted pages themselves exist as WP posts with slugs and ids
  (who-we-are-a = 20601, epic = 20605, and so on). Slugs on the install differ
  from the repo's page names: `/solutions/` not `/solutions-b/`, `/who-we-are/`
  not `/who-we-are-a/`, `/epic/` not `/epic-a/`.

## empv2 is not a current mirror of production

Found 2026-09-09 while resolving Kienna's research list. One of her six posts
does not exist on empv2 under any slug or title, but returns 200 on
empowerms.org: live id 20555, published **2026-08-13**. Counts confirm it:

    live empowerms.org   496 published posts
    empv2                490 published posts  (+413 archived)

So the clone predates mid-August and Empower have kept publishing since.

**This inverts the obvious cutover plan.** Pushing empv2's database to
production would destroy the newer content. The cutover has to go the other way:
apply the theme, the Elementor page trees and templates, the media, and the
taxonomy to production's own database. Which means every id coupling in the list
above gets re-resolved there, and none of empv2's numbers travel.

It also means a script that resolves by SLUG (like
`apply-research-category.mjs`) is the right shape for anything that has to run
twice, and a script that writes ids is not.

## Open, raised by Kienna 2026-09-07

**Bulk redirects for archived content.** Empower archived a large amount of older
content and want the old URLs not to be dead ends. ANSWERED 2026-09-09: they are
a custom post STATUS, `archived`, and there are **413** of them:

    post_type=post, by status:   publish 490,  archived 413

They are still rows in `wp_posts` with their slugs intact, so the full old-URL
list comes out of the database and needs nothing from Kienna or Search Console.
(There is also an `Archived` term in a `post_status` TAXONOMY, term 147, with
zero posts. Red herring, not the mechanism.)

THEY ALREADY 404 ON THE LIVE SITE, not just on empv2. Checked 2026-09-09:
`/providing-a-fresh-start/` and `/first-step-act-provides-second-chance/` both
return a hard 404 on empowerms.org and on empv2, body "That page has moved or
never existed". So this is not a risk the new site introduces; it is a problem
Empower already have, and most of these URLs will already have been dropped by
Google. Redirects still help anyone following an old link from a bookmark, a
newsletter or another site. Recommendation given: category-level 301s
rather than a blanket redirect to the homepage, because a few hundred unrelated
URLs pointing at one page is treated as a soft 404 and helps nobody. Every
archived post still carries its categories, so each can go to its matching
solution page with All Content as the catch-all. Search Console access would let
the handful with real traffic or backlinks be mapped individually.

Migration note: these 413 redirects are database state like everything else on
this list.

Related and already known: 41 legacy Beaver pages still render on empv2, 13 of
them with live forms, and a `?cb=` cache buster hides redirects when testing.
