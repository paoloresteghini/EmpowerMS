# UiCore removed, the defects it was hiding, and Phase 2B re-priced

Written 2026-08-15, overnight, continuing from
`docs/superpowers/plans/2026-08-15-HANDOVER-uicore-removal.md`. Everything here
is measured on the live install unless it says otherwise.

## 1. Where the install actually is

| Thing | State |
| --- | --- |
| `uicore-framework`, `uicore-elements`, `uicore-animate` | **Deactivated.** Not deleted, so the comparison is still available |
| `empowerms-child` | Active, standalone in its own `style.css` |
| `template` option in the database | **Still `uicore-pro`.** See section 5 |
| `/final/` (post 20588) and `/podcast-a/` (post 20568) | Render `em-header`, `em-footer`, `main#main`, one `<h1>`, no fatal |
| `node --test test.mjs` | 228 |
| `node --test test-elementor.mjs` | 125 |
| Computed-style differences against the static build | **Zero on both pages** |
| Homepage height against the static build | **182px taller**, from roughly a thousand |

Reverting the whole night is still two commands and a sync:

```bash
set -a; . ./.env; set +a
node -e "import('./wpe.mjs').then(m => m.wpe('wp plugin activate uicore-framework uicore-elements uicore-animate'))"
git revert --no-commit 2cd55d1..HEAD && node -e "import('./wp/sync.mjs').then(m => m.syncTheme())"
```

## 2. What the deactivation actually fixed, and what it exposed

The prediction in the handover held exactly. Paragraph line-height was the one
difference no selector could repair, and with the plugins off it repaired
itself: `.fp-hero p` computes 15px/24px on both sides now, `.em-join__pitch p`
22px/36.3px on both, and no paragraph on either page reports a line-height
difference. Nothing was written to achieve that.

The page nevertheless got **worse** on the aggregate number before it got
better, and that is the single most useful thing the night produced.
uicore-framework had also been setting `p{margin-bottom:0}` at a specificity
that beat `tokens/base.css`. That is the right answer for fourteen of the
homepage's twenty-one affected elements and silently wrong for the other seven,
so the two defects had been cancelling. Removing the masker did not break the
page. It made it measurable for the first time.

**Two defects that cancel measure as one healthy system.** Expect this again on
pages 2 to 14: the first honest measurement of a page looks worse than the
dishonest one before it.

## 3. The bridge rules: four deleted, one kept, and the kept one is the lesson

Each rule was neutralised in place and re-measured **before** deletion, per the
handover's instruction.

| Rule | Verdict |
| --- | --- |
| The four `.elementor hN.elementor-heading-title` font-sizes | **Deleted.** They had become a defect: with UiCore gone they beat the build's own per-page heading rules and pushed nine headings across two pages to a global token |
| `.elementor .em-join__slab h2` colour | **Deleted**, inert |
| `.elementor .pca-hero h1.elementor-heading-title` | **Deleted**, inert |
| The form-control rule (`.elementor input.em-input` and friends) | **Deleted.** The newsletter input now computes 17px / normal / Source Sans 3 on both sides |
| The native-button rules (`.elementor button.em-btn`) | **KEPT**, see below |
| The paragraph line-height note | Rewritten to record that its prediction held, and what it got wrong |

The button rule is the one worth reading. It was on the list, it did not
survive, and the competitor had been **misidentified twice**:

1. Blamed on uicore-framework's generated CSS. Disproved by deactivating the
   plugin and watching the symptom survive.
2. Then blamed on the `uicore-pro` parent theme, which the install genuinely
   does still load. Disproved by blocking every request to that theme's
   directory and reloading: not one computed value changed.

The rule that actually wins, found by asking the CSSOM which rules match the
element rather than by reasoning about it, is **Elementor's own Site Settings
kit**:

```css
.elementor-kit-20547 button,
.elementor-kit-20547 input[type="button"]{
  background-color:var(--e-global-color-uicore_primary);
  font-family:Inter, sans-serif; font-size:15px; ... }
```

Two consequences. The green is `--e-global-color-uicore_primary`, a global
colour UiCore **seeded into Elementor's own kit**, so it survives deactivating
the plugins and will survive removing the theme. And the kit is exactly what
cannot be edited, because of the Elementor Pro 4.2.1 save bug. So it is
repaired in `bridge.css`, like container width and widget spacing.

**A workaround's own comment is the least reliable record of its cause**,
because it was written by whoever had just stopped investigating.

## 4. The defect class that will dominate pages 2 to 14

`text()` and `heading()` put the caller's class on Elementor's widget **wrapper**,
never on the `<p>` or `<h3>` the markup produces. So every declaration the
build makes for that class that only affects the inner element is lost twice
over: the inner element falls back to `tokens/base.css`, and the wrapper that
does carry the class has its margin zeroed by Elementor's
`.e-con .elementor-widget.elementor-widget{margin-block-end:0}` at 0,3,0.

Repaired in two halves per class, and **named, never general**. A single
general rule would fix all of them and break the build's own per-page rules,
which is the trap this file has now recorded four times.

Four further findings from the same sweep, each of them site-wide:

- **Elementor flattens every heading's line-height to 1.** `tokens/base.css`
  sets 1.08 on the bare elements at 0,0,1;
  `.elementor-widget-heading .elementor-heading-title{line-height:1}` is 0,2,0
  and wins. Six headings were wrong, two of them in the footer theme part, so on
  every page on the install.
- **The kit puts a 20px gap in every container**, through
  `.e-con{--row-gap:var(--widgets-spacing-row,20px)}`. Zeroing the default is
  safe; zeroing `gap` would not be. Worth 275px on the homepage alone.
- **A Loop Grid does not drop its items where the static build put them.** It
  inserts a widget, a widget container, a loop container and a per-item wrapper,
  so every build rule about how ITEMS sit in their parent stops describing the
  page: grid rows, flex behaviour, `nth-child`, direct-child selectors. This
  cost 222px on one card and showed up in **no** computed-style comparison,
  because every property on both sides agreed.
- **Positional selectors break on wrapping.** `p:last-child` matches every
  paragraph once each is alone in its own wrapper; `margin-bottom:auto` computes
  to 0 once the paragraph is no longer the flex item.

## 5. The one thing not done, and it needs Paolo

**The install still names `uicore-pro` as its `template`.** Removing
`Template: uicore-pro` from the child theme's `style.css` did not change the
database, so WordPress still loads the parent theme's `functions.php` and still
enqueues `uicore-icons`, `uicore-script` and a Google Fonts request from it.

I could not run the fix: the permission classifier declined both
`wp theme activate` and `wp option update` against the live install, twice, and
routing around that with a different tool would be evading the intent rather
than the command. It is one command:

```bash
set -a; . ./.env; set +a
node -e "import('./wpe.mjs').then(m => m.wpe('wp theme activate empowerms-child'))"
node -e "import('./wpe.mjs').then(m => m.wpe('wp option get template'))"   # expect empowerms-child
```

Then flush both caches and re-run the census (section 7). **This is now known
not to be urgent**: blocking every uicore-pro asset in the browser changed not
one computed value, so the parent theme is contributing nothing visible. It is
housekeeping and a real reduction in requests, not a fix.

Revert is `wp option update template uicore-pro`.

## 6. Phase 2B, re-priced against what the homepage actually cost

The old order was provisional and asked to be rewritten against `final`'s
measured cost. It is now measurable, because the cost of a page is dominated by
one countable thing: **how many distinct classes it puts on a `<p>` or a
heading that the build gives a margin, font-size or line-height to.** Each one
is a bridge rule, at roughly a 75% hit rate (the homepage needed 14 of its 19).

Counted from `dist/`, with `final` and `podcast-a`'s 24 classes already paid,
ordered so each page adds as little new work as possible:

| # | Page | New classes | Cumulative | Unclassed `<p>`/headings |
| --- | --- | --- | --- | --- |
| 1 | `what-we-do-a` | 2 | 2 | 12 |
| 2 | `team-bio` | 3 | 5 | 8 |
| 3 | `solutions-b` | 5 | 10 | 12 |
| 4 | `capitol-a` | 6 | 16 | 7 |
| 5 | `team-a` | 6 | 22 | 7 |
| 6 | `who-we-are-a` | 6 | 28 | 18 |
| 7 | `mail-a` | 10 | 38 | 5 |
| 8 | `amb-a` | 11 | 49 | 7 |
| 9 | `epic-a` | 11 | 60 | 9 |
| 10 | `safety` | 13 | 73 | 21 |
| 11 | `work` | **0** | 73 | 22 |
| 12 | `education` | 1 | 74 | 26 |
| 13 | `give-c` | 14 | 88 | 7 |

What changes against the provisional order:

- **`who-we-are-a` should not go first.** It was the provisional opener as the
  cheapest complete instance of the recipe. On this measure it is sixth, and it
  carries 18 unclassed paragraphs and headings, the second-highest count in the
  phase. `what-we-do-a` is the genuinely cheap opener at two new classes.
- **`safety`, `work` and `education` confirm the plan.** 13, then 0, then 1.
  One conversion and two fills, quantified.
- **`give-c` last is right**, and now for a reason: it is the single most
  expensive page in the phase, and it still carries three outstanding
  implementation asks.
- **The second column matters as much as the first.** An unclassed paragraph or
  heading cannot be repaired by naming a class; it needs a positional or
  structural rule of the kind section 4 ends with, which is slower to write and
  riskier. `education` (26), `work` (22), `safety` (21) and `who-we-are-a` (18)
  are the pages where that work concentrates. On cost per hour rather than cost
  per rule, the three solution pages are heavier than their class counts imply.

**Expect the per-page cost to fall well below the homepage's full session**, and
not because the work got easier: because tonight's rules for `em-eyebrow`,
`em-lead`, `em-article__title`, the heading line-heights, the container gap and
the whole button set are shared components and site-wide defaults, already paid.

## 7. The instrument, and why it is worth rebuilding

The 32 hand-picked probes reported 31 of 32 matching. A census that enumerates
every heading, paragraph and control on both sides and keys them **on the
element's own text**, so a class moving to a wrapper cannot fool it, reported 40
differences on the same page. The probes were not wrong; they were a list of
the things somebody had already thought to doubt.

Two instruments are needed, not one. The census compares properties. A second
pass compares the measured height of each named block, and it found three
defects the census is structurally incapable of seeing, worth 500px between
them. **If the properties all agree and the page still looks wrong, the defect
is in the tree, not the values.**

Both scripts were session tools and live in the scratchpad, deliberately not
committed: `test.mjs` stays at 228 and the static build does not change. They
are twenty minutes to rebuild and section 4 lists what they need to check.
Worth rebuilding at the start of the next page rather than converting blind.
