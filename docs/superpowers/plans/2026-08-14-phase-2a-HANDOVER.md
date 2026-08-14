# Phase 2A handover

Everything a fresh session needs to execute the Phase 2A plan. The prompt to
paste is at the end; the rest is why it says what it says.

## State at handover, 2026-08-14

- Repo `/Users/paolo/Code/EmpowerMS`, branch `elementor-phase-1`, 32 commits
  ahead of `master`, tree clean, head `90071de`.
- `node --test test.mjs`: 228 pass.
- `SPIKE_URL=https://empv2.wpenginepowered.com/podcast-a/ node --test test-elementor.mjs`: 64 pass.
  Without `SPIKE_URL`, four fail on purpose with a message naming it.
- `.env` exists locally and is gitignored. `install.mjs` reads `WPE_SSH_HOST`,
  `WPE_SSH_KEY`, `WPE_ROOT`. Load with `set -a; . ./.env; set +a` in any shell
  that touches the install.
- Elementor 4.2.2 and Elementor Pro 4.2.1 are both active on `empv2`, verified
  2026-08-14. Earlier notes claiming Pro was absent are stale; delete that
  belief rather than re-checking it every session.
- The branch is still `elementor-phase-1` and Phase 1 is merged into nothing.
  Whether Phase 2A continues on this branch or starts a new one is Paolo's
  call; the plan does not depend on the answer.

## What Phase 2A is

Foundations for the fourteen remaining page conversions. It converts **no
pages**. Header and footer become site-wide Elementor Theme Builder parts, the
bridge stylesheet is created, the enqueue widens, and the harness gains the
checks every later page inherits.

Sliced this way deliberately: fourteen pages and fifty-one compositions is too
large for one plan, and its later tasks would be written furthest from
evidence, which is the condition under which every Phase 1 brief acquired a
defect.

## Reading order

1. `docs/superpowers/plans/2026-08-14-elementor-phase-2a-foundations.md` (the plan, 8 tasks)
2. `docs/superpowers/specs/2026-08-14-elementor-phase-2-foundations-design.md` (the spec the plan argues from)
3. `docs/elementor/spike-report.md` (Phase 1's findings, especially §5.1 element cache, §5.2 Site Settings, §5.3 page cache, §5.11 every brief was wrong)
4. `docs/elementor/schema-4.2.2.md` (the captured Elementor schema)

The parent design, `docs/superpowers/specs/2026-08-12-elementor-conversion-design.md`,
is context rather than instruction: read it if a question is not answered by the
two above.

## Cross-task couplings, so the pre-flight scan is cheap

The skill requires a conflict scan before Task 1. These are the couplings that
exist, found while writing the plan:

| Producer | Consumer | What crosses |
| --- | --- | --- |
| Task 1 | Tasks 3, 4, 5 | `deployThemePart(postId, elements, location)`, `setConditions(postId, conditions)` |
| Task 3 | Tasks 4, 5 | the two `elementor_library` post ids, recorded in `docs/elementor/theme-part-mechanism.md` |
| Task 2 | Task 3 | the five chosen Beaver slugs and their before-screenshots |
| Tasks 4, 5 | Task 7 | the written lists of layout defects, which are the bridge stylesheet's only input |
| Task 5 | Task 6 | the header being live is what makes `header-2.css` site-wide necessary |
| Tasks 4, 5 | Task 8 | `footerPart()`, `headerPart()`, `FOOTER_POST_ID`, `HEADER_POST_ID` |

Two ordering constraints that are not obvious and matter:

- **Task 2 must complete before Task 3.** Its before-screenshots are worthless
  once the switch is made.
- **Task 3 sets both conditions or neither.** Elementor Pro's `get_header()`
  discards UiCore's `header.php` output including its opening wrapper divs,
  while `footer.php` still prints their closing tags unless the footer location
  is filled too.

## Hard constraints

- **The static build does not change.** `src/`, `css/`, `tokens/`,
  `components/`, `build.mjs`, `test.mjs` are untouched. 228 must stay 228. When
  a converted page looks wrong, the fix goes in `wp/empowerms-child/css/bridge.css`,
  never in `css/`.
- **Do not touch Beaver layouts 11248, 11272, 11276, 11322, 11325, 11338.**
  They are the post, archive, category, author, search and `person` templates.
  Only 29 (Header) and 154 (Footer) are drafted; 11365 (Pre-footer) is decided
  on evidence in Task 3 Step 8.
- **No new dependencies.** The repo has exactly one, `playwright`, dev.
- **No em dashes** anywhere, including commit messages.
- **Every fetch checks `x-cache`.** WP Engine serves stale pages with HTTP 200.
  `fetchConverted()` enforces it; anything new that fetches must too.
- **Install coordinates come from the environment**, never from source.
- Code blocks in the plan are labelled **VERIFIED** (run during planning) or
  **SKETCH** (written from source-reading, unrun). Treat a SKETCH as a starting
  point and report what it actually took.

## The one place to stop and ask

Task 3 Step 4 is the plan's hinge. It fetches `podcast-a` and looks for the two
marker strings with UiCore's chrome gone. Everything after it rests on that
answer. If the markers are absent, or `uicore-header` is still present, **stop
and report** rather than working around it: the mechanism was verified from
Elementor Pro's source, not yet observed, and a capability being present is not
the same claim as it producing the output you need.

Otherwise the skill's rule holds: rule, ledger the ruling, keep going.

## Not in scope, and not to be started

No page conversions. No work on the eleven at-risk stylesheets belonging to
unconverted pages. No Beaver Builder removal. No post, archive, search or 404
templates. No go-live gate work. Phase 2B is planned after 2A lands, with the
foundations' real costs known.

## Paolo's, not the plan's

- Alt text for the media library, roughly 42 photographs, editorial work nobody
  costed.
- MailMunch's popup blocks the episode filter for mouse users, site-wide, from
  existing plugin configuration.
- Elementor should be told about the kit-save bug; it is a one-character fix on
  their side and it currently stops anyone, Empower included, saving Site
  Settings on this install.
- Still unanswered by Empower: the podcast guest taxonomy, a Reports category,
  and whether the clone gets re-synced from live before cutover. None blocks
  Phase 2A; all three block later pages.

---

## The prompt to paste

Execute the Phase 2A plan in subagent-driven mode. Do not start Phase 2B.

Read first, in this order:
`docs/superpowers/plans/2026-08-14-elementor-phase-2a-foundations.md` (the plan),
`docs/superpowers/specs/2026-08-14-elementor-phase-2-foundations-design.md` (the spec it argues from),
`docs/elementor/spike-report.md` (Phase 1's findings),
and `docs/superpowers/plans/2026-08-14-phase-2a-HANDOVER.md` (state, couplings, constraints).

STATE. Repo `/Users/paolo/Code/EmpowerMS`, branch `elementor-phase-1`, clean,
head `90071de`, 32 commits ahead of master. `node --test test.mjs` = 228 pass.
`SPIKE_URL=https://empv2.wpenginepowered.com/podcast-a/ node --test test-elementor.mjs` = 64 pass.
Load install credentials with `set -a; . ./.env; set +a` before anything that
touches `empv2`. Elementor Pro 4.2.1 is installed and active; ignore any note
saying otherwise.

THE WORK. Eight tasks, foundations only, no page conversions. Header and footer
as site-wide Elementor Theme Builder parts, the bridge stylesheet, the widened
enqueue, and the harness checks every later page inherits.

HOW. Use superpowers:subagent-driven-development. Workspace and ledger at
`.superpowers/sdd/2026-08-14-elementor-phase-2a-foundations/`. The handover
document lists the cross-task couplings, so the pre-flight scan is a check
rather than a discovery. Dispatch explicit models: cheapest tier for Tasks 1
and 6 (the plan carries their complete code), standard for Tasks 2, 3, 4, 5
and 8, most capable for the final whole-branch review.

CONSTRAINTS. The static build does not change: `src/`, `css/`, `tokens/`,
`components/`, `build.mjs` and `test.mjs` are untouched and `test.mjs` stays at
228. A converted page that looks wrong is fixed in
`wp/empowerms-child/css/bridge.css`, never in `css/`. Do not touch Beaver
layouts 11248, 11272, 11276, 11322, 11325 or 11338; they are the post, archive,
search and `person` templates. No new dependencies. No em dashes anywhere,
commit messages included.

THE ONE STOP. Task 3 Step 4 proves the theme-part mechanism against the live
page. Everything after it rests on that result. If the marker strings are
absent, or `uicore-header` is still present, stop and report rather than
working around it. Otherwise rule, ledger the ruling, and keep going.

Finish with the final whole-branch review, then stop and report the rulings you
made.
