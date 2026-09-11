# The slug rename

**Decision taken by Paolo, 2026-08-20: rename all seventeen converted pages to
real site slugs, and set the converted homepage as the front page.**

The link remap earlier the same day made every link point at the right page, but
the pages themselves sat at chooser variant names: `/final/`, `/solutions-b/`,
`/give-c/`, `/work-2/`. Links were correct; URLs were not.

## What changed

| Was | Now |
| --- | --- |
| `/final/` | **`/`** (WordPress front page, `page_on_front` 20588) |
| `/who-we-are-a/` | `/who-we-are/` |
| `/what-we-do-a/` | `/what-we-do/` |
| `/solutions-b/` | `/solutions/` |
| `/education/` | `/quality-education/` |
| `/work-2/` | `/meaningful-work/` |
| `/safety/` | `/public-safety/` |
| `/epic-a/` | `/epic/` |
| `/content-a/` | `/all-content/` |
| `/podcast-a/` | `/podcast/` |
| `/capitol-a/` | `/capitol-chat/` |
| `/mail-a/` | `/newsletter/` |
| `/amb-a/` | `/ambassadors/` |
| `/give-c/` | `/donate/` |
| `/team-a/` | `/team/` |
| `/team-bio/` | `/grant-callen/` |
| `/landing/` | unchanged |

`/work-2/` was the one that was an accident rather than a decision: a collision
with Empower's own `work` page (18512) that WordPress resolved by suffixing.

## Empower's records that moved, and how to put them back

Three changes were made to Empower's own content so the converted pages could
take the real slugs. Original values recorded here rather than only in a shell
history, because that is what makes them reversible:

| Record | Was | Now |
| --- | --- | --- |
| page 41 | `donate` | `donate-old` |
| page 14691 ("Our Team") | `team` | `team-old` |
| option `page_on_front` | `11` | `20588` |

**The `person` entry 605 (`grant-callen`) was NOT touched.** Pages and custom post
types do not share a slug namespace, so `/grant-callen/` serves the converted
page (20607) while the person entry keeps its own URL. Verified by fetching both.

## Two redirect rules that had to be disabled

`/solutions` and `/podcast` were intercepted by Empower's own Redirection rules,
which predate this work and survive a cache flush:

| id | Source | Target | Hits |
| --- | --- | --- | --- |
| 1 | `/solutions` | `/learn-more/?utm_campaign=10th+anniv` | **249** |
| 25 | `/podcast` | `/the-empower-podcast/` | 8 |

Both are **disabled, not deleted**, so restoring either is one click in
Tools > Redirection. THIS IS A LAUNCH DECISION FOR EMPOWER, not a staging
detail: `/solutions` was driving a live campaign with 249 recorded hits, and
putting the Solutions page there means that campaign gives up the URL.

Note also that wp-admin is disguised by WPS Hide Login. The login path is
`/clientlogin`, and Redirection is at
`/wp-admin/tools.php?page=redirection.php`.

## The trap: renaming a slug silently unstyles the site

`empower_page_styles()` in the child theme is **keyed by page slug**. Renaming the
pages orphaned all sixteen rows at once. Every page still rendered, still carried
every class, and every one of them lost its stylesheet.

The suite caught it as **46 failures** spread across census, computed-style and
both filter tests. That spread is the tell: it was not sixteen defects, it was
one map going stale, and the cost of finding out that way was a full 14-minute
run plus the time to read it.

The map cannot be derived, because the key is an install slug and the value is a
stylesheet filename, and the two genuinely differ: `/solutions/` loads
`css/solutions-b.css`, and the three solution pages share `css/solution.css`.
What CAN be derived is the KEY SET, and that is the half that goes stale. A test
now reads `empower_page_styles()` and asserts every page in `PAGE_REGISTER` and
`EXCLUDED_PAGES` has a row, with the front page checked by its stylesheet
instead of its path. Proved red twice: against one key reverted to its old slug,
and against a missing homepage row.

**The rule this adds to the phase's list: a page's slug is not just its URL. Grep
for the old slug before renaming, because anything keyed on it fails silently.**

## What the rename gave back for free

The Redirection plugin has `monitor_post: 1` set, so it auto-created a redirect
from every old slug to its new one (`/solutions-b/` to `/solutions/`,
`/give-c/` to `/donate/`, `/work-2/` to `/meaningful-work/`, and nine more).
Any `empv2` URL already shared with Empower still resolves. That is a setting
rather than luck, and it is worth knowing before anyone deletes those rows.
