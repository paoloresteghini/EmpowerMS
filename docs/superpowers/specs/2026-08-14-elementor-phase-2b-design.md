# Elementor Phase 2B: the page conversions

Design document, written 2026-08-14 against the install and the decisions of
record, not against Phase 2A's forward-looking estimate of what Phase 2B would
be. That estimate is wrong in a way that changes the shape of the phase, and
correcting it is the first section.

**Status: written, not approved. No conversion has started.**

## 1. Phase 2B is ten pages, not fourteen

Phase 2A's completion record and README both describe Phase 2B as "the fourteen
remaining page conversions". Checked against the recorded decisions rather than
carried forward: **four page sets have not been chosen by Empower**, and a page
nobody has chosen cannot be converted, because converting it is work that gets
thrown away the moment they pick the other reading.

**Settled, and convertible now.** Ten pages, each one a reading Empower has
picked, with the decision dated.

| Page | What it is | Chosen |
| --- | --- | --- |
| `final` | The homepage, a per-section combination | 2026-08-07 |
| `who-we-are-a` | The Table | 2026-08-05 |
| `what-we-do-a` | Three Doors | 2026-08-05 |
| `team-a` | The Roster | 2026-08-05 |
| `team-bio` | The one bio screen, template for the other nine | with the Team set |
| `solutions-b` | The Throughline Down | 2026-08-05 |
| `epic-a` | The Pinned Method, with The Instrument's method rows swapped in | 2026-08-11 |
| `mail-a` | Five Minutes | 2026-08-11 |
| `amb-a` | The Network | 2026-08-11 |
| `give-c` | One Screen | 2026-08-12 |

**Blocked on Empower.** Four sets, and the ask that unblocks each one.

| Set | Readings | What is needed |
| --- | --- | --- |
| Podcast | `podcast-a` / `podcast-b`, `capitol-a` / `capitol-b` | A pick per show. Two shows, two readings each |
| All Content | `content-a` / `content-b` | A pick, plus the axis question (type-first vs subject-first), plus a ruling on the missing Research & Reports category |
| Landing templates | `landing` / `landing-b` | A pick. B additionally needs one Elementor setting A does not (right column sticky, Advanced > Motion Effects) |
| Solution detail | `work-a/b/c`, `safety-a/c` | A pick per solution. Quality Education is **not built** and gets cut from whichever reading they pick |

### 1.1 Two documentation defects this surfaced, both to be fixed before work starts

**The README block table's `work, safety, education` row is wrong.** It says
"**One template across all three** (`css/solution.css`, seven `sol-*` blocks),
so build it once as an Elementor saved template and fill it three times". The
decision of record says the opposite: Paolo chose independently composed pages
rather than one template filled repeatedly, asked before building each time and
answered the same way twice, so **there is no solution-page template to hand
off, and the winner has to become the template**. The row describes
`dist/work.html`, `safety.html` and `education.html`, which are the older
template-shaped pages that the six readings supersede. Converting from that row
would build the wrong thing three times.

**`podcast-a` is converted and live on the install, and the podcast set is
unchosen.** That is not a defect in itself, since it was the Phase 1 spike and
its job was to prove the machinery, but it means the install currently shows a
reading Empower has not picked. If they pick `podcast-b`, the converted page is
discarded and the Loop Grid work is rebuilt against a different composition.
Worth saying out loud rather than discovering at handover.

## 2. What Phase 2B does not do

- It does not convert a page whose reading is unchosen. The four blocked sets
  stay static.
- It does not touch the static build. `src/`, `css/`, `js/`, `tokens/`,
  `components/`, `build.mjs` and `test.mjs` stay untouched and `test.mjs` stays
  at 228, exactly as in Phase 2A.
- It does not add a dependency. The repository keeps its single dev dependency.
- It does not re-open the header and footer. Those are Theme Builder parts,
  deployed from the static partials, and a nav change means editing
  `src/_shared/header-2.html` and redeploying.

## 3. The per-page recipe, as `podcast-a` actually proved it

Every conversion is the same eight moves. This is transcribed from what exists
in the repository today, not designed fresh.

1. **A published WordPress page on the install** with the page's slug. Published
   rather than draft or password-gated, per the Phase 2A policy, safe because
   `robots.txt` disallows every crawler and `checkRobots()` asserts it still
   does.
2. **One module per section**, `elementor/pages/<slug>/NN-<name>.mjs`, each
   exporting `section()` and building its tree from `elementor/factory.mjs`
   (`container`, `heading`, `text`, `image`, `link`, `html`, `loopGrid`).
3. **A page manifest**, `elementor/pages/<slug>/page.mjs`, exporting `POST_ID`
   and `sections()`. This exists because `deployPage()` overwrites
   `_elementor_data` wholesale, so a hand-typed section array at the call site
   is one dropped import away from publishing a page missing a third of itself
   that still returns 200.
4. **A stylesheet entry** in `empower_page_styles()` in
   `wp/empowerms-child/functions.php`, keyed by slug, listing the sheets beyond
   the shared cascade. The Stylesheets column of README's per-page table is the
   source for this.
5. **Assets synced** to the child theme.
6. **Deploy**, `deployPage(POST_ID, sections())`.
7. **Fidelity checks** against the live page: `checkCopy()` and
   `checkSections()` on the raw HTML, `computedStyles()` on named probes,
   `screenshots()` at 390 / 768 / 1024 / 1440, plus `checkFilter()`,
   `checkVisibleWithoutJs()` and `checkVisibleWithJs()` where the page is
   interactive. Every fetch preceded by `flushPageCache()`, and by
   `wp cdn-cache flush` as well whenever a CSS change is what is being measured.
8. **Repairs in `wp/empowerms-child/css/bridge.css`**, never anywhere else, with
   the reasoning inline. A rule overriding an Elementor container property needs
   two classes (`.your-class.e-con`); one fighting Elementor's widget defaults
   needs four, because Elementor repeats its own class to reach 0,4,0.

## 4. Order, and the reasoning behind it

Not alphabetical and not by importance. The order front-loads the cheapest page
that exercises the whole pipeline, then spends the unknowns one at a time, then
finishes with the page that needs everything.

| # | Page | Why here |
| --- | --- | --- |
| 1 | `who-we-are-a` | Containers plus one inline-SVG HTML widget. The cheapest complete instance of the recipe, so the first task proves the pipeline rather than a page |
| 2 | `what-we-do-a` | Same shape. Proves the pipeline repeats without new machinery, which is the only way to know step 1 built a pipeline and not a one-off |
| 3 | `solutions-b` | Same shape again, one more inline-SVG widget. Last of the cheap three |
| 4 | `team-a` | Containers, but every portrait is a placeholder tile, so it is the first page where a content gap is visible rather than structural |
| 5 | `team-bio` | Five inline SVGs and the first **saved template**, since nine more bios are cut from it |
| 6 | `mail-a` | The first form. Settles the form question (section 5.1) for three later pages |
| 7 | `amb-a` | The second form, applying whatever 6 settled, plus Ashley Green stays unlinked |
| 8 | `give-c` | The form slot for Gravity Forms and embedded Stripe, plus three outstanding implementation asks (section 5.4) |
| 9 | `epic-a` | Scroll-driven motion inside Elementor containers, the highest-risk page in the phase (section 5.2) |
| 10 | `final` | The homepage. Two Loop Grids, a form, and a composition drawing on five stylesheets. Highest value and highest cost, taken when every mechanism it needs has already been proven on a cheaper page |

**The argument against doing `final` first**, which is the obvious alternative
since it is the page Empower will look at: it is the only page that needs Loop
Grids, a form, inline SVG widgets and a five-stylesheet cascade at once, so a
failure in it cannot be attributed. Every one of those is proven separately by
the time it is reached, and the Loop Grid half is already proven on `podcast-a`.

## 5. The open questions, each with the observable that settles it

Following the rule that an open question must be phrased as something rendered
or returned, never as a capability that is offered.

### 5.1 Form widget or HTML widget

README leaves this as "**Form widget**, or HTML widget keeping the markup as
authored" in three places. It has never been tested. It is settled on `mail-a`
and applied to `amb-a`, `give-c` and `final` after.

**The observable:** on the live converted `mail-a`, does the rendered form carry
a `<label for>` resolving to every control, `autocomplete` tokens on the name,
email and county fields, `type="email"` with native `required` on the address, a
`<fieldset>` with a `<legend>` around the four involvement tick boxes, and a
computed target of at least 44px on each tick box.

That contract is asserted in `test.mjs` against the static build today. If
Elementor's Form widget renders all of it, it wins, because it is the thing
Empower can edit. If it does not, the HTML widget keeps the markup exactly as
authored and the form stays correct at the cost of being editable only in this
repository. **Anything short of all of it means the HTML widget**, and the
decision is recorded either way with the measurement beside it.

### 5.2 Scroll-driven motion inside Elementor containers

Two pages carry it: `epic-a`'s method rows and their local rail, and `mail-a`'s
four ticks, which draw themselves with `animation-timeline: view()` over
`stroke-dashoffset`. The recorded risk is that `dasharray` breaks under
non-uniform scale, and that a per-section timeline reads as several progress
bars rather than one.

**The observable:** on the live converted page at 1440, does the tick's
`stroke-dashoffset` change between a screenshot taken at the top of the section
and one taken after it has been scrolled through; and on `epic-a`, does the rail
render as one continuous line across the three method rows rather than one line
per row. Both are visible in a capture; neither is answered by checking whether
the CSS is present.

`epic-a` additionally must **not** gain Elementor's own sticky effect on top of
its containers.

### 5.3 Saved templates

`team-bio` is the template the other nine bios are cut from, and the landing
template would be the same shape if it were unblocked. Whether an Elementor
saved template survives a `deployPage()` rebuild of its source page is unknown.

**The observable:** after saving `team-bio` as a template and then redeploying
`team-bio` from this repository, does the saved template still exist and still
render its five inline SVGs when inserted into a scratch page.

### 5.4 `give-c`'s three outstanding implementation asks

Recorded as outstanding when Donate closed on 2026-08-12 and not yet answered:
the Gravity Forms dynamic-population parameter names, the amount ladder, and the
`/donate/` confirmation behaviour. The page's amounts are links carrying a
figure, and they populate Empower's existing form by URL. **Without the
parameter names the amount links cannot be wired**, so this is a real
precondition on task 8 rather than a detail inside it, and it is an ask of
Empower.

## 6. Risks

| Risk | Handling |
| --- | --- |
| A converted page is a reading Empower later changes their mind about | Only chosen readings are converted, and the choice date is recorded per page in the plan |
| `deployPage()` overwrites Empower's own editor changes | The named handover point, per page, already documented in README. Once Empower start editing a converted page, `deployPage()` stops being run against it. Each task records whether its page has passed that point |
| Site Settings still cannot be saved (Elementor Pro 4.2.1) | Container width and widget spacing stay in `bridge.css`. The bug report is drafted at `docs/elementor/pro-kit-save-bug-report.md` and unsent |
| A CSS change measured against the install shows the old file | Both flushes, `flushPageCache()` and `wp cdn-cache flush`, never one |
| `bridge.css` grows into an unreviewable pile | Every rule carries its measurement inline, as it does today, and no rule lands without the live measurement that justified it |
| Ten pages is a long phase and review fatigue sets in | One page per task, each independently testable and independently rejectable |

## 7. Completion criteria

- Ten pages live on `empv2`, each rendering its chosen reading.
- `test.mjs` still 228, and the static build untouched, verified per commit.
- `test-elementor.mjs` extended per page, all passing with `SPIKE_URL` set.
- Every `bridge.css` rule carries the measurement that justified it.
- The four blocked sets documented with the exact ask that unblocks each.
- The form question, the motion question and the saved-template question each
  answered with a recorded measurement rather than a preference.
