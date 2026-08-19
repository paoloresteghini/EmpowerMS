# Continuation prompt, session 6. Paste the block below into a new context window

Everything above the line is for a human. Everything below it is the prompt.

---

Continue the EmpowerMS Elementor conversion. Repo `/Users/paolo/Code/EmpowerMS`,
branch `elementor-phase-2b-class-in-markup`, HEAD `30b90e1`, 54 commits ahead of
`origin/elementor-phase-2b-class-in-markup` and 11 ahead of `origin/master` on
`master`.

## STATE, all verified 2026-08-18 evening

| Thing | Value |
| --- | --- |
| Pages converted, live, green | **12**: `final`, `podcast-a`, `what-we-do-a`, `solutions-b`, `capitol-a`, `team-a`, `who-we-are-a`, `mail-a`, `amb-a`, `epic-a`, `give-c`, `team-bio` |
| `node --test test.mjs` | 228 pass, 0 fail. The static build is untouched and must stay so |
| `node --test test-elementor.mjs` | **195 pass, 0 fail, 0 skipped**, with all twelve page URLs plus `FIDELITY_REQUIRE_ALL=1` |
| Gated in `PAGE_REGISTER` | 11. `podcast-a` is still deliberately excluded: 66 real episodes against 9 static placeholders |
| Instruments | three, unchanged in kind; `layoutInvariants()` gained one narrow correctness fix this session |
| `bridge.css` | **4820 lines, 35 numbered blocks** |
| Ledger | `.superpowers/sdd/2026-08-15-class-in-markup/progress.md`, 46 rulings |
| Pushed | NO. Remote sits at `8f64ff6`. The repo is PUBLIC |

Run the suite like this, or a page with no URL is silently skipped:

```
set -a; . ./.env; set +a
FIDELITY_REQUIRE_ALL=1 \
HOME_URL=https://empv2.wpenginepowered.com/final/ \
SPIKE_URL=https://empv2.wpenginepowered.com/podcast-a/ \
WHAT_WE_DO_A_URL=https://empv2.wpenginepowered.com/what-we-do-a/ \
SOLUTIONS_B_URL=https://empv2.wpenginepowered.com/solutions-b/ \
CAPITOL_A_URL=https://empv2.wpenginepowered.com/capitol-a/ \
TEAM_A_URL=https://empv2.wpenginepowered.com/team-a/ \
WHO_WE_ARE_A_URL=https://empv2.wpenginepowered.com/who-we-are-a/ \
MAIL_A_URL=https://empv2.wpenginepowered.com/mail-a/ \
AMB_A_URL=https://empv2.wpenginepowered.com/amb-a/ \
EPIC_A_URL=https://empv2.wpenginepowered.com/epic-a/ \
GIVE_C_URL=https://empv2.wpenginepowered.com/give-c/ \
TEAM_BIO_URL=https://empv2.wpenginepowered.com/team-bio/ \
node --test test-elementor.mjs
```

**It takes 8 to 14 minutes and it is fetching a live install.** Twice this
session a background run was killed by the environment mid-flight, once leaving
a single failure on `final` that was the reaping and not the page: a re-run with
nothing else on the machine was green. If a live test fails after an unusually
long duration, re-run it alone before believing it.

## READ FIRST, IN THIS ORDER

1. `.superpowers/sdd/2026-08-15-class-in-markup/progress.md`, the ledger.
2. `docs/elementor/phase2b/2026-08-17-conversion-recipe.md`. **Section 4 gained
   three steps this session** and they are the most important thing in it.
3. `.superpowers/sdd/2026-08-15-class-in-markup/task-16-report.md`, section 8.
   The largest defect of the phase and the reasoning that found it.
4. `docs/elementor/phase2b/2026-08-18-middle-step-measurement.md`, which is why
   the middle band is now a recipe step.
5. `.superpowers/sdd/2026-08-15-class-in-markup/pricing-solution-unit.md`, the
   next unit, already priced.
6. `.superpowers/sdd/2026-08-15-class-in-markup/task-16-brief.md` as the model
   for the next brief. Price the page BEFORE dispatching.

**`.superpowers/` is gitignored**, so items 1, 3, 5 and 6 exist only in this
working copy and are absent from a fresh clone. The committed substitutes are
the documents under `docs/elementor/phase2b/`.

## WHAT IS LEFT: ONE UNIT, THREE PAGES

`safety`, `work` and `education`. All three load `css/solution.css` and no
page-specific sheet, so every repair is paid ONCE and the other two pages are
fills. Priced at **4 repairs, 0 new blocks** if converted adjacent to `give-c`,
whose prose repairs want the same declaration.

Read `pricing-solution-unit.md` before writing the brief. Its three live points:

- **Two Shape C sites that want DIFFERENT routes.** `.sol-latest__more` is the
  bare `<p>` around a button, which is Route A's shape and costs zero.
  `.sol-stories__panel` holds a heading, a paragraph and the button, so Route A
  there would author prose inside a string, which Paolo's prose ruling argues
  against. First time the fork has landed on one page in two forms.
- **`.sol-feed` carries `data-cms="loop"`** and is a `repeat(3,minmax(0,1fr))`
  grid whose card heights depend on title wrapping. A step-function grid inside
  a widget is exactly the seventh category. Whether it becomes a real Loop Grid
  also changes the register floors, because a Loop Grid over real posts compares
  different CONTENT: that is why `podcast-a` is ungated at all.
- **Category 6 is a measured zero**, the first in the phase: all six
  `display:flex` rules in `css/solution.css` declare `flex-direction:column`
  themselves.

## NINE COST CATEGORIES, and assume a TENTH

Price every page on all nine. The four-category model was low by 90 percent, and
every page priced since has still been low: `epic-a` priced at 4 cost 10,
`give-c` priced at 4 had two of them cost zero and two unpriced ones appear,
`team-bio` priced at 4 cost 6 plus the largest defect of the phase.

1. **Structural pseudo-classes** (`:first-child`, `:last-child`, `:nth-child`).
   Hits are an UPPER BOUND: a container target needs nothing, and anything
   inside one authored string needs nothing.
2. **Photographs in fixed `aspect-ratio` or fixed-height containers.** The safe
   shape is the ratio on the `<img>` with `height:auto`; the costly one is the
   ratio on the container with `height:100%` on the image.
3. **Native controls counted INSIDE `<main>`, as ELEMENTS.** The kit styles only
   `button`, `input[type=button]`, `input[type=submit]` and `.elementor-button`.
   It styles NO fields.
4. **Child combinators.** Exhausted: zero on every remaining page.
5. **Tags Elementor cannot render.** `Utils::validate_html_tag` falls back to
   `div` for anything outside a, article, aside, button, form, div, footer,
   h1-h6, header, main, nav, p, section, span.
6. **`display:flex` with no `flex-direction`.** Elementor's column default wins.
   Its `@media` counterpart is mandatory in the same commit, and adding one
   triggers block A1's cross-check.
7. **A widget wrapper's block size resolved as a flex base size from a
   HYPOTHETICAL inline size.** Content whose height is a step function of its
   width leaves the wrapper taller than its contents. Three instances, blocks
   14, 16 and 24. TWO repair shapes and a discriminator: `display:block` on the
   parent where the static parent is a plain block, `width:100%` on the wrapper
   where the build declares the flex column itself.
8. **Elementor's `.elementor a{box-shadow:none;text-decoration:none}` removing a
   UA default the build never declares.** Blocks 26 and 27. Swept: 49 anchors on
   nine pages, one instance.
9. **The `box-shadow` half of the same rule.** Blocks 30 and 35. **The repair
   MUST bring a `:focus-visible` companion** or it deletes the focus ring and
   ships a WCAG 2.4.7 failure.

**Two of these nine were found by hand-probing anchors and by nothing else, and
the largest defect of the phase was found by LOOKING at two builds side by side.
Budget for both on every page.**

## MECHANICS SETTLED BY MEASUREMENT, do not rediscover

- **Deploy needs FOUR flushes and a browser check.** `wp cache flush` and
  `wp elementor flush_css` do NOT clear WP Engine's edge; `wp page-cache flush`
  and `wp cdn-cache flush` do. An md5 over a direct `ssh` proves only that the
  file reached the disk. Assets are versioned by filemtime, so cached HTML pins
  a cached stylesheet. Verify by comparing `curl -s <page> | grep -o
  'bridge\.css?ver=[0-9]*'` against the file's mtime. This trap fired three
  times in one day and nearly caused a correct rule to be reverted.
- **The install runs a Mailchimp popup** (`#PopupSignupForm_0`, `.mc-modal-bg`,
  `.mc-modal`) that covers the viewport seconds after load and eats pointer
  events. It manufactured thirty false hover differences. Remove those nodes
  before each hover and re-remove them.
- **A probe that asserts a state must carry evidence it entered that state, in
  the same read.** Read `element.matches(':hover')` back in the same `evaluate`
  and retry until true. `.em-btn` also transitions `box-shadow`, so settle
  ~1200ms before reading a focus state.
- **A hover probe that scrolls measures its own timing**: the install sets
  `scroll-behavior:smooth` and Chromium does not recompute the hovered element
  after a programmatic scroll until the mouse moves again.
- **A corpus sweep must key on the element that CARRIES the property**, not on
  the element type that carried it in the static build. Keyed by the anchor, the
  ninth-category sweep reported seven false hits, because `link()` puts the class
  on the wrapper.
- **A hand-maintained list of what ships is a coverage claim.** Two have now
  shipped wrong. Derive them: `FROM_ROOT` is now guarded by a test that reads
  every `url()` root out of the shipped stylesheets at run time.
- **MailMunch injects a hidden div INSIDE a widget.** Four occasions now, and on
  `give-c` it ADDED a margin by making a paragraph stop being its wrapper's
  `:last-child`. It is why the prose repair shape puts the position test on the
  WIDGET and the value on the PARAGRAPH, never `:not(:last-child)` on wrappers.
- **`align-self` repairs the CROSS axis**: horizontal in a column parent,
  vertical in a row parent. This cost a deploy.
- **`_attributes: 'id|x'` is silently refused.** `_element_id` works.
- **Colour, `text-decoration` and `box-shadow` are compared by NO instrument.**

## CONSTRAINTS

- Static build unchanged: `src/`, `css/`, `js/`, `tokens/`, `components/`,
  `build.mjs`, `test.mjs`. `test.mjs` stays at 228.
- No new dependencies. NO EM DASHES anywhere, commit messages included.
- Bridge rules NAMED, never general. Five recorded occasions where a general
  rule became a defect.
- Never stage by directory. Stage by file name.
- Open every file reference and line number you write into a comment. A citation
  test enforces two invariants. **A line number produced by `grep -n` over a
  filtered stream is not a file line**: that mistake was made twice this session.
- Measure the RESULT of a repair at both register widths AND in the middle band.
- One dispatch per page. If an implementer goes quiet, query the INSTALL, not
  the workspace.
- Do NOT run `wp post meta update` for alt text. Paolo has ruled.

## OPEN FOR PAOLO, unchanged all session

1. **Ten alt-text sentences to approve**, in
   `docs/elementor/phase2b/2026-08-18-alt-text-decisions.md`. The phase's one
   live accessibility gap, and NONE needs anybody to look at a photograph.
2. **Nothing is pushed** beyond `8f64ff6`, and the repo is public. 54 commits.
3. **Form submissions.** Both form pages ship as `html()` blobs that submit
   nowhere, by his ruling, and are expected to ship twice.
4. **`podcast-a`'s episode tags.** ROOT-CAUSED this session: the loop template's
   post-terms tag points at taxonomy `guest_type`, which does not exist on the
   install (`wp taxonomy list` returns category, post_tag, resource_topic,
   testimonial_topic and platform ones only), and the episodes carry no
   `post_tag` either, so there is no fallback. Register and populate a taxonomy
   across 66 posts, or drop the pill from the template. Not a CSS fix.

## OPEN, MINE, recorded rather than done

- **The other four `patterns/` pages have been measured but not LOOKED at.** The
  `::before` mask now matches on all six sites across five pages, read directly.
  Nobody has put eyes on `final`, `what-we-do-a`, `team-a` or `who-we-are-a`
  since the motif started rendering.
- **`.tp-portrait` needs re-pricing when a real headshot arrives.** The
  `aspect-ratio` is on the CONTAINER, which is category 2's costly shape, and the
  swap wants an `image()` widget rather than raw markup.
- **`href="team-a.html"` 404s on the install**, preserved deliberately; the
  hand-off remap covers both directions of that link and `team-a`'s nine cards.
- **`podcast-a` is still ungated**, and gating it needs a key that identifies a
  card slot independently of which episode landed in it. Nobody has designed one.

## FIRST ACTION

Write `.superpowers/sdd/2026-08-15-class-in-markup/task-17-brief.md` for the
solution unit from `pricing-solution-unit.md`, the way `task-16-brief.md` is
written, and dispatch ONE agent to convert `safety`. Then fill `work` and
`education` from it. Decide the Loop Grid question BEFORE dispatching: it
changes the seventh-category exposure, the register floors, and what green can
mean on those pages.
