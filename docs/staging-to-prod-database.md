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
- **20589** homepage stories mini card
- **20642** single post template, serves all 490 posts
- **11272** Beaver single, drafted

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
| **Research & Reports** | **not created yet** | homepage card 2, content-a band-research, EPIC ×3 |

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

## Open, raised by Kienna 2026-09-07

**Bulk redirects for archived content.** Empower have archived a large amount of
older content, particularly blog posts more than five years old, and she wants
to know whether the old URLs can be redirected in bulk or need doing one at a
time. Not yet investigated. The first question is what "archived" means on their
install: still present as drafts or trash, or gone entirely. That decides
whether the old URL list can be read out of the database or has to come from
Search Console or the old sitemap.

Related and already known: 41 legacy Beaver pages still render on empv2, 13 of
them with live forms, and a `?cb=` cache buster hides redirects when testing.
