# Continuation prompt, paste into a new context window

> **SUPERSEDED for STATE, still current for METHOD.** Written at the end of
> the session that began 2026-08-18 morning. A document audit on 2026-08-18 found EIGHT of its claims
> wrong (enumerated W1 to W8 in
> `.superpowers/sdd/2026-08-15-class-in-markup/document-audit.md`) and about
> thirty stale. That audit's summary says 31 stale of 83 claims; its enumerated
> entries number thirty and skip S3, and its HOLD claims are not enumerated at
> all, so treat the totals as approximate and the enumerated entries as the
> record. Nearly all the stale ones are descriptions of state that later work
> changed within hours: pages listed as unconverted are converted, suite counts
> have moved, and the four-category pricing model it describes now has six.
> The push-state item below was WRONG rather than stale and has been corrected
> in place, because acting on it could have caused harm.
>
> Read it for the method, the mechanics and the rulings, which hold. Do not
> read any number in it as current. The current state lives in the newest
> handover in this directory and in
> `.superpowers/sdd/2026-08-15-class-in-markup/progress.md`.

Continue the EmpowerMS Elementor conversion. Repo `/Users/paolo/Code/EmpowerMS`,
branch `elementor-phase-2b-class-in-markup`, head `2aec97d`, 51 commits ahead of
master, NOT PUSHED. `master` untouched and unpushed.

## READ FIRST, IN THIS ORDER

1. `docs/superpowers/plans/2026-08-18-HANDOVER-session-3.md` — verified state,
   what each page cost, the method, and what needs Paolo. Everything else is
   context for this.
2. `docs/elementor/phase2b/2026-08-18-repricing-after-four-pages.md` — the four
   cost categories and the per-page prices. Read its caveats: four of this
   session's five reviewer-caught defects were in this file.
3. `docs/elementor/phase2b/2026-08-17-conversion-recipe.md` — sections 1, 6 and
   7 are the standing per-page recipe.
4. `.superpowers/sdd/2026-08-15-class-in-markup/progress.md` — the ledger, 34
   rulings, several of which correct the plan and several of which correct each
   other. Read it before dispatching anything.

## EXECUTE

`docs/superpowers/plans/2026-08-15-class-in-markup.md` using
`superpowers:subagent-driven-development`. Per-page briefs live in
`.superpowers/sdd/2026-08-15-class-in-markup/task-N-brief.md`; write the next one
the way `task-9-brief.md` is written, with the page priced BEFORE dispatch.

### FIRST, finish team-a, which is done but uncommitted

Its code is complete, deployed and verified live by the previous controller. In
the working tree right now: `elementor/pages/team-a/` (untracked, 6 files),
plus modifications to `elementor/pages/register.mjs`,
`wp/empowerms-child/css/bridge.css` and `wp/empowerms-child/functions.php`.

It needs: the full suite run, a commit STAGED BY FILE NAME, and a review. Its one
rule is `.ta-hero__media > .elementor-widget-image{height:100%}` and its
photograph measures 453x566 at 1440 and 342x214 at 390, matching static exactly.

### THEN, in order

`who-we-are-a`, `mail-a`, `amb-a`, `epic-a`, `give-c`, `safety`, `work`,
`education`, `team-bio`. `safety`, `work` and `education` share
`css/solution.css`, so their structural cost is paid once.

`who-we-are-a` is already pre-priced in the ledger: ten structural hits classify
to ONE to THREE repairs, because nine of the ten target containers. If that
holds, correct the re-pricing table, which currently flags it as the hard page.

## THE METHOD, which is this phase's real output

Class-in-markup fixed WHICH element carries a class. What remains is POSITION:
Elementor wraps every widget in its own div.

> A position-dependent selector needs a bridge rule when the widget wrapper
> falls BETWEEN the selector's reference point and its target.

Containers cost nothing (a container IS the element). Anything authored inside a
single `html()` or `text()` string costs nothing (no wrapper falls inside it).

**Price a page on FOUR things, not one:**

1. Structural pseudo-classes (`:last-child` family), classified widget or
   container. The main axis.
2. Photographs in fixed `aspect-ratio` or fixed-height containers. One named
   rule each. Five instances so far.
3. Native controls counted INSIDE `<main>`. Only `amb-a` (10) and `mail-a` (5).
4. Child combinators (`>`). EXHAUSTED: zero on every remaining page.

Categories 2 and 3 are invisible to any stylesheet grep by construction, and
BOTH of the previous controller's per-page misses came from them. Hits are an
upper bound: `solutions-b` turned six hits into one rule.

**The cheapest lever is a BUILD decision.** A structural pseudo-class over a
list costs nothing if the whole list is ONE `html()` widget. Only available when
nothing inside needs to be a widget. Predicted and delivered zero twice, on
`capitol-a`'s triptych and `team-a`'s ledger.

## MECHANICS SETTLED BY MEASUREMENT, do not rediscover

- **Section ids.** `_attributes: 'id|x'` is SILENTLY REFUSED (other attributes
  in the same string land, which is what hid it). `_element_id` WORKS on a
  container. Six remaining pages carry in-page anchors and need this.
- **Image wrappers.** Elementor containers are COLUMN flex, so a widget wrapper
  stretches to its parent's WIDTH for free and never to its HEIGHT. Repair by
  giving the WRAPPER `height:100%`, named, never generalised.
- **Image triage has a third question.** "Only image keys differ" is necessary
  but NOT sufficient. Ask whether the difference is shaped like a PHOTOGRAPH
  (one image, differing by its own aspect ratio: defer) or like a WRAPPER (a set
  the design sizes identically rendering at different sizes: fix).
- **MailMunch masks defects.** It injects a hidden div at the mid-post point, so
  a paragraph that measures CORRECT may only be correct because that div holds
  it off `:last-child`. Twice now. Never ship a page that depends on it.
- **`syncTheme()` is silent on success AND failure.** Verify with a hash over a
  direct `ssh`, NOT through `wpe()`, whose `stripNotices()` collapses blank
  lines and produces a false mismatch.
- **A `<p>`-wrapped CTA converted to a container costs one census key**, since
  the census keys on element text. Record it; watch it on small pages.

## CONSTRAINTS

- Static build unchanged: `src/`, `css/`, `js/`, `tokens/`, `components/`,
  `build.mjs`, `test.mjs`. `node --test test.mjs` stays at 228.
- No new dependencies. NO EM DASHES anywhere, commit messages and reports
  included.
- Bridge rules NAMED, never general. Four recorded occasions where a general
  rule became a defect.
- Never stage by directory.
- Credentials: `set -a; . ./.env; set +a`. Suite needs every page URL set plus
  `FIDELITY_REQUIRE_ALL=1`, or a skipped page passes silently.
- Open every file reference and line number you write into a comment before
  committing it, INCLUDING ones handed to you. A citation is the cheapest thing
  to write and the least checked.

## OPEN FOR PAOLO, not blockers

1. **The branch IS pushed, through `8f64ff6` only.** This line used to read
   "nothing is pushed", which was wrong: `origin/elementor-phase-2b-class-in-markup`
   exists and has been stale since task 4.5, and local `master` is 11 commits
   ahead of `origin/master`. The rest was blocked by a permission classifier and
   was not routed around. The repository is public, so check what consumes the
   pushed branch before assuming the gap is harmless.
2. **Alt text, one content decision in three parts.** `child-classroom-tablet`
   is used meaningfully by two pages wanting different words, and alt is an
   attachment-level property: unresolvable in code. `children-running-parent`
   ships EMPTY alt while `team-a` uses it MEANINGFULLY, which is a live
   accessibility gap; the correct sentence is written in `media.mjs` and needs
   someone with write access. Two attachments gained alt mid-session, leaving
   `final/media.mjs` and `what-we-do-a/media.mjs` with a stale reading.
3. **`.pca-ep__title`'s anchor** is `display:inline` live against the static
   build's flex-blockified `display:block`, about a pixel per card. Deferred
   with a ruling.
4. **podcast-a is deliberately NOT in the page register**: 66 real episodes
   against 9 static placeholders makes its box sweep permanently non-zero.
   Gating it needs a content-independent key nobody has designed.

## METHOD NOTES THAT SAVED REAL TIME

- One dispatch per page, not per step. Take over deploy-measure yourself if an
  implementer goes quiet.
- A filesystem watchdog cannot see work that lands on the remote install. Before
  treating silence as a stall, query the INSTALL, not the workspace. The
  previous controller killed a working agent and deleted its file by getting
  this wrong.
- Verify a disputed fact yourself before dispatching a fix round. It inverted
  several instructions this session.
- Use `snapshot.mjs` for CSS iteration; it takes the live install out of the loop.
