# Continuation prompt, session 5. Paste the block below into a new context window

Everything above the line is for a human. Everything below it is the prompt.

---

Continue the EmpowerMS Elementor conversion. Repo `/Users/paolo/Code/EmpowerMS`,
branch `elementor-phase-2b-class-in-markup`, HEAD `0af902e`, 45 commits ahead of
`origin/elementor-phase-2b-class-in-markup` and 64 ahead of `master`.

## STATE, all verified 2026-08-18

| Thing | Value |
| --- | --- |
| Pages converted, live, green | **8**: `final`, `podcast-a`, `what-we-do-a`, `solutions-b`, `capitol-a`, `team-a`, `who-we-are-a`, `mail-a` |
| `node --test test.mjs` | 228 pass, 0 fail. The static build is untouched and must stay so |
| `node --test test-elementor.mjs` | **182 pass, 0 fail, 0 skipped**, with all eight page URLs set plus `FIDELITY_REQUIRE_ALL=1` |
| Gated in `PAGE_REGISTER` | 7. `podcast-a` is deliberately excluded: 66 real episodes against 9 static placeholders |
| Instruments | **THREE now**, not two. See below |
| `bridge.css` | 3342 lines |
| Ledger | `.superpowers/sdd/2026-08-15-class-in-markup/progress.md`, 46 rulings |
| Pushed | NO. Remote sits at `8f64ff6` (task 4.5). `master` is 11 ahead of `origin/master`. The repo is PUBLIC |

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
node --test test-elementor.mjs
```

## READ FIRST, IN THIS ORDER

1. `.superpowers/sdd/2026-08-15-class-in-markup/progress.md`, the ledger. 46
   rulings, several correcting each other. The tail is this session.
2. `docs/elementor/phase2b/2026-08-18-repricing-after-four-pages.md`, the six
   cost categories and the whole-order price.
3. `.superpowers/sdd/2026-08-15-class-in-markup/repricing-after-the-audit.md`,
   which re-priced everything remaining against the two newest categories and
   found the published price low by 90 percent.
4. `docs/elementor/phase2b/2026-08-17-conversion-recipe.md`, sections 1, 3, 4,
   6 and 7.
5. `.superpowers/sdd/2026-08-15-class-in-markup/task-12-brief.md` as the model
   for the next brief. Price the page BEFORE dispatching.

The two older handovers in `docs/superpowers/plans/` are bannered SUPERSEDED FOR
STATE. Read them for method only.

**`.superpowers/` is gitignored**, so items 1, 3 and 5 exist only in this
working copy and are not on the remote. If you are reading this on a fresh
clone they will be absent, and the committed substitutes are the two documents
under `docs/elementor/phase2b/`, which carry the categories and the price but
not the 46 rulings.

## THE NEXT PAGES, priced

`amb-a`, then `epic-a`, `give-c`, `team-bio`, then `safety`, `work`, `education`.

| Unit | Repairs | Note |
| --- | --- | --- |
| `amb-a` | 3, now **2** | Its submit button repair was paid by `mail-a` (`bridge.css` block 12). Remaining: the mosaic image wrapper, and one Shape C |
| `epic-a` | 4 | Two are the shared prose block |
| `give-c` | 4 | Convert ADJACENT to the solution pages: one `--space-5` block closes four repairs across them |
| `team-bio` | 4 | NOT a signed-off chooser pick. It is in the order on Paolo's say-so |
| `safety` + `work` + `education` | 4, **paid once** | They share `css/solution.css`. Convert them consecutively: one page's bridge work and two fills |

Four sharings decide the order and none is visible in a per-page count: the
solution stylesheet, the `--space-5` block, the submit button (paid), and the
Shape C `align-self` block that five units extend.

## SIX COST CATEGORIES, not four

Price every page on all six before dispatching. The four-category model was low
by 90 percent.

1. **Structural pseudo-classes** (`:last-child` family), classified widget or
   container. Hits are an UPPER BOUND on this category only.
2. **Photographs in fixed `aspect-ratio` or fixed-height containers.** One named
   rule each. TWO repair techniques with different disqualifying conditions:
   `display:contents` (unavailable when the wrapper is load-bearing) and
   `height:100%` on the wrapper.
3. **Native controls counted INSIDE `<main>`, as ELEMENTS not class attributes.**
   The kit styles ONLY `button`, `input[type=button]`, `input[type=submit]` and
   `.elementor-button`. It styles NO fields. Verify by fetching the kit.
4. **Child combinators.** EXHAUSTED: zero on every remaining page.
5. **A tag Elementor cannot render.** `Utils::validate_html_tag` falls back to
   `div` for anything outside a, article, aside, button, form, div, footer,
   h1-h6, header, main, nav, p, section, span. So `figure`, `ul`, `ol`, `li`,
   `table`, `blockquote` become `div` and every rule addressing them BY TAG goes
   inert. Cost `who-we-are-a` six rules.
6. **`display:flex` with no `flex-direction`.** Row is the initial value in the
   static build and never declared; Elementor's column default then wins
   uncontested.

**Assume a SEVENTH category exists.** Every per-page miss so far came from a
category the model did not yet have. Spend the pricing pass hunting one rather
than refining the six.

**The cheapest lever is still a build decision.** Anything authored inside one
`html()` or `text()` string is immune to categories 1, 5 and 6 at once. It has
now paid four times. Photographs must stay `image()` widgets (recipe section 3).

## THE THIRD INSTRUMENT, new this session

`layoutInvariants()` in `fidelity-browser.mjs`, asserted per registered page at
1440 and 390: `mainHeight`, `containerAxis` (flex-direction plus each child's
absolute x), `paintedBox` (border-box top and height for elements with a
non-transparent background). Read it BEFORE building a page; it changes what
green means.

Deliberately NOT in it: tag comparison (188 hits, 1 real), `flex-wrap` (120
hits, 0 real), general width or height sweeps over containers. A noisy shared
gate gets its tolerances widened until it stops being a gate.

**The rule that came out of building it, and it is the most transferable thing
in this phase: a new check must be shown to FAIL on a known defect before it is
trusted to pass on anything.** Its first element key silently dropped two
confirmed defects out of the comparison while reporting zero differences, and
only the requirement to go red first caught it.

`CONTENT_HEIGHT_EXEMPTIONS` in `fidelity-deferred.mjs` handles differences that
are content rather than layout. Entries carry NO pixel value: the difference is
measured at run time and propagated by geometry. Three ways the list can be
wrong are all failures: expired, unmeasured, ambiguous.

## MECHANICS SETTLED BY MEASUREMENT, do not rediscover

- **Section ids.** `_attributes: 'id|x'` is SILENTLY REFUSED. `_element_id`
  works on a container. Verify by fetching the live page.
- **Image wrappers.** Elementor containers are column flex, so a widget wrapper
  takes the parent's WIDTH free and never its HEIGHT.
- **`align-self` repairs the CROSS axis.** In a COLUMN parent that is
  horizontal, which is what you want. In a ROW parent it is vertical, and
  `flex-start` there cancels a stretch the design depends on. Check the parent's
  axis before reusing the shape. This cost a deploy.
- **An `aspect-ratio` height does not contribute to a flex item's hypothetical
  main size.** `flex-shrink:0`, `flex:none` and `display:contents` all fail;
  `min-height` is the fix.
- **MailMunch injects a hidden div INSIDE a widget**, so a paragraph can be
  correct only by accident. Three occasions now. Never ship a page depending on
  it.
- **`syncTheme()` is silent on success AND failure.** Verify with an md5 over a
  DIRECT `ssh`, never through `wpe()`.
- **Colour is compared by NOTHING on a control.** `mail-a`'s submit button
  rendered UiCore green with a purple hover and reported as a 3px height
  difference. When one property differs on an element, ask what else that
  element could be wrong about.

## CONSTRAINTS

- Static build unchanged: `src/`, `css/`, `js/`, `tokens/`, `components/`,
  `build.mjs`, `test.mjs`. `test.mjs` stays at 228.
- No new dependencies. NO EM DASHES anywhere, commit messages included.
- Bridge rules NAMED, never general. Five recorded occasions where a general
  rule became a defect.
- Never stage by directory. Stage by file name.
- Open every file reference and line number you write into a comment. A citation
  test enforces two invariants; where a target file changes often, name the
  anchor's TEXT rather than its line.
- Measure the RESULT of a repair at both widths, not the intention.
- One dispatch per page. If an implementer goes quiet, query the INSTALL, not
  the workspace, before assuming it stalled: one agent's session died mid-task
  this session with the page already deployed.
- Do NOT run `wp post meta update` for alt text. Paolo has ruled.

## OPEN FOR PAOLO

1. **Ten alt-text sentences to approve**, in
   `docs/elementor/phase2b/2026-08-18-alt-text-decisions.md`. Three attachments
   are settled, ten need a sentence chosen, NONE needs anybody to look at a
   photograph. This is the phase's one live accessibility gap.
2. **Nothing is pushed** beyond `8f64ff6`, and the repo is public.
3. **Form submissions.** Both form pages ship as `html()` blobs that submit
   nowhere, by his ruling, and are expected to ship twice.
4. **Two shipped pages have an unmeasured layout state**: `final` at 1200 and
   `team-a` at 900, both three-step grid ladders whose middle step neither
   sampled width renders. `final` is the one to check first.
5. **`podcast-a`'s loop template emits no episode tags** where the static build
   emits two per card. Content or template, not CSS.

## FIRST ACTION

Price `amb-a` across all six categories, write
`.superpowers/sdd/2026-08-15-class-in-markup/task-13-brief.md` the way
`task-12-brief.md` is written, then dispatch ONE agent to convert it. Its
mosaic is the only Shape 2 instance left in the batch, and its four unclassed
checkboxes cost NOTHING: measured, nothing in the kit competes with them.
