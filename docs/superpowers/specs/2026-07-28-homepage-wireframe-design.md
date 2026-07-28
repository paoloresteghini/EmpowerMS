# Empower Mississippi homepage — design spec

**Date:** 2026-07-28
**Source:** Claude Design project `90d5c4ff-6ad8-4c31-bede-e44a6a862e96` — "Empower Mississippi Design System"
**Implementing:** `templates/homepage-wireframe/HomepageWireframe.dc.html`

## Goal

Build the Empower Mississippi homepage as static HTML + CSS in this repo, using the
structure defined by the homepage wireframe and the visual language defined by the
design system's tokens and components. The page must render in two skins — the
grayscale wireframe and the branded design — from one set of markup.

The output is a **reference implementation for hand-off to WordPress + Elementor**,
not a production runtime.

## Context

### What the remote design project contains

- `tokens/*.css` — eight files of CSS custom properties (colors, type, spacing,
  radius, elevation, motion, fonts, base). Two-layer: semantic tokens
  (`--surface-navy`, `--text-strong`, `--border-subtle`) alias primitives
  (`--blue-800`, `--grey-700`).
- `components/components.css` — every component style, as `em-*` classes.
- `components/**/*.jsx` — thin class-name wrappers. `Button.jsx` contains no styling;
  it assembles `em-btn em-btn--primary em-btn--md`. All visual design lives in CSS.
- `assets/` — 8 woff2 fonts, logo lockups, hexagon patterns, illustration set,
  12 photographs.
- `ui_kits/website/` — an existing branded recreation of the current site. **Not the
  target.** The wireframe describes a different, newer homepage structure.
- `templates/homepage-wireframe/support.js` — generated DC preview runtime (React +
  `<x-dc>` + `<sc-if>`), marked do-not-edit. Preview harness only; not shipped.

### Why static HTML rather than React

The design system's CSS has zero framework coupling — the `.jsx` files contribute
markup and nothing else. The destination is WordPress + Elementor. A React build
would be discarded at hand-off, paying the componentisation cost twice. Static HTML
using the same `em-*` classes transfers directly: enqueue the stylesheets in a child
theme, and every class name survives into Elementor.

## Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Fidelity | Both skins, toggleable | Mirrors the source's prop panel; structure can still be shown to stakeholders while the branded build proceeds |
| Stack | Static HTML + CSS, no runtime deps | Clean hand-off to WordPress + Elementor |
| File granularity | One HTML partial per section | Maps 1:1 onto Elementor sections/templates |
| Primary CTA | One orange action per page | Strictest reading of the brand rule; orange stays scarce |
| Page builder | Elementor | Supersedes the readme's "Beaver Builder" — confirmed with the user 2026-07-28 |

## Architecture

### Repo layout

```
EmpowerMS/
├── tokens/*.css                imported verbatim, unmodified
├── components/components.css   imported verbatim, unmodified
├── assets/                     fonts, logos, photography, patterns, illustrations
├── css/
│   ├── homepage.css            NEW — layout wrappers
│   └── wireframe.css           NEW — wire skin, token overrides
├── src/
│   ├── index.html              shell: <head>, control bar, include markers
│   └── sections/
│       ├── 00-header.html
│       ├── 01-hero.html        1 · Awareness
│       ├── 02-solutions.html   2 · Interest
│       ├── 03-foundations.html 3 · Consideration
│       ├── 04-stories.html     4 · Trust
│       ├── 05-insights.html    5 · Authority
│       ├── 06-joinus.html      6 · Action
│       └── 07-footer.html
├── js/controls.js              toggle bar, ~40 lines
├── build.mjs                   Node stdlib, zero deps
└── dist/index.html             generated
```

`tokens/` and `components/` are copied down **unmodified**. They are upstream files;
all local additions go in `homepage.css` and `wireframe.css`. This keeps re-syncing
from the design project a straight overwrite.

**`tokens/`, `components/` and `assets/` must sit at repo root, as siblings — not
nested under `css/`.** `tokens/fonts.css` resolves its eight woff2 files through
`url('../assets/fonts/…')`, and `tokens/base.css` reaches the hexagon patterns through
`url('../assets/pattern-blue.png')`. CSS `url()` resolves relative to the stylesheet,
so any other arrangement breaks files we have committed to keeping verbatim. This
mirrors the design project's own root layout, which is why re-syncing stays a
straight overwrite.

### Build

`build.mjs` reads `src/index.html` and replaces each `<!--@include sections/NN-x.html-->`
marker with that file's contents, writing `dist/index.html`. Node standard library
only — no `package.json`, no install step.

```
node build.mjs && open dist/index.html
```

Each `src/sections/*.html` is a self-contained fragment with no wrapper markup, so it
can be pasted straight into an Elementor HTML widget or handed over one file per
Elementor section.

### Skin and variant system

State lives in `data-*` attributes on `<html>`. `js/controls.js` sets them from the
control bar and persists to `localStorage`.

| Attribute | Values | Default |
| --- | --- | --- |
| `data-skin` | `brand` \| `wire` | `brand` |
| `data-annotations` | `on` \| `off` | `off` |
| `data-foundations` | `bento` \| `equal` | `bento` |
| `data-stories` | `feature` \| `carousel` | `feature` |

Because the token layer is semantic, the wireframe skin is **mostly** a token
override — but not entirely, and the exceptions matter.

```css
[data-skin="wire"] {
  --text-strong: #1f2427;
  --text-body: #7a7a7a;
  --text-muted: #a8a8a8;
  --surface-navy: #2c2f31;
  --surface-tint: #f6f6f5;
  --border-subtle: #e2e2e2;
  --em-orange: #2c2f31;   /* neutralises filled actions */
}
```

`--em-orange` is a **primitive**, not a semantic token, and `components.css`
references it directly in eleven places — `em-btn--primary`, `em-heading__eyebrow`,
`em-heading__rule`, `em-stat__value`, `em-quote__attr`, `em-article__more`,
`em-solution__more`, `em-podcast__show`, `em-podcast__play`, `em-check:checked`, and
the input focus border. Overriding it therefore needs three corrections:

1. **Restore the focus ring.** `--focus-ring` must stay orange in both skins;
   greying it out would regress accessibility for a purely cosmetic toggle.
2. **Eyebrows go grey, not near-black.** The wireframe's eyebrows are `#9a9a9a`;
   the blanket override would render them `#2c2f31`. Needs an explicit rule.
3. **Suppress `em-heading__rule`.** The 88×6 bar has no wireframe equivalent;
   `display: none` in wire skin.

Plus four structural wire-only rules: diagonal-cross image placeholders, `LOGO`
outline boxes replacing the logo images, the rounded inset footer panel, and the
funnel annotation pills.

**Invariant: the two skins differ in colour, imagery and ornament only — never in
layout geometry.** Same grid, same spacing, same component sizes. If a change would
move a box, it belongs in `homepage.css`, not `wireframe.css`. This is what keeps one
set of markup honest across both skins.

Both Foundations layouts and both Stories layouts ship in the markup; CSS reveals one
and `display: none`s the other. This mirrors `<sc-if>` in the source and leaves both
options visible to the Elementor developer.

The control bar exists only in `src/index.html`, never in a section partial, so it
cannot leak into hand-off.

## Sections

Copy is taken verbatim from the wireframe — it is real roadmap copy, not filler.
Strings marked "auto-populated from…" remain placeholders; they are CMS slots.

### 00 — Site header

Shipped `em-header` markup. Logo lockup, six nav items (Home, About, Solutions, All
Content, Podcast, Join Us) with dropdown carets, search, Donate button.
Header height follows `components.css` (92px), not the wireframe's 88px — the
wireframe's metrics are placeholders and the component is the design of record.
Donate renders `em-btn--secondary` (navy), per the one-orange-per-page rule.

### 01 — Hero · Awareness

Split band: copy column (max 680px) and full-bleed image column. Eyebrow "Real
people. Real problems. Real solutions.", `h1` "Your American Dream starts here.",
lede, then the page's single **orange** CTA "Explore Our Work" (`em-btn--primary`)
plus a "Sign up →" text link. A floating "Our north star" card overlaps the image
edge.

New CSS: `em-hero`, `em-hero__media`, `em-hero__northstar`.

### 02 — Solutions model · Interest

Tinted band. `em-heading` (eyebrow "How change happens" + `h2` + orange rule) with a
lede in a second column. Below, the five-step chevron: Define the problem · Conduct
research · Craft policy solution · Advocate for change · Policy implementation.

Each step is a photographic panel under a navy scrim, clipped to a chevron with
`clip-path` and overlapped by −34px. On hover the step expands (`flex: 1 → 2.7`), the
scrim lightens, and a description plus "Learn more →" fades in. Transitions use the
brand motion tokens (`--dur`, `--ease-out`) rather than the wireframe's inline values.

New CSS: `em-process`, `em-process__step`, `__scrim`, `__num`, `__detail`.

### 03 — Foundations · Consideration

`em-heading` + lede, then one of two layouts:

- **bento** — two stacked cards (Quality Education, Meaningful Work) beside one tall
  card (Public Safety) whose lower half is a photograph.
- **equal** — three equal cards.

Both use the shipped `em-solution` component, which already provides `__icon`,
`__title`, `__promise`, `__body`, `__more` — matching the wireframe's
"**Real solution:** …" pattern without inventing classes. Icons come from
`assets/illo-*.png`. Buttons are `em-btn--outline`.

New CSS: `em-bento` (grid wrapper only).

### 04 — Stories · Trust

Navy band (`--surface-navy`). `em-heading--light` + "Read Community Stories"
(`em-btn--inverse-outline`). Then one of two layouts:

- **feature** — a wide feature card (256px portrait + Jodi Berry pull-quote) beside
  two stacked small quote cards.
- **carousel** — single centred quote card with prev/next controls and three dots.

Quote content uses the shipped `em-quote` component.

New CSS: `em-stories`, `em-stories--feature`, `em-stories--carousel`,
`em-stories__nav`, `em-stories__dots`.

The carousel is **presentational only** — arrows and dots render but do not advance.
Motion behaviour is out of scope for this pass; see Open questions.

### 05 — Insights · Authority

Two columns. Left: `em-heading`, lede, "See all" (`em-btn--outline`), and a podcast
card (shipped `em-podcast`). Right: three article rows, each a 184px thumbnail beside
`em-badge` + read-time + `h3` + excerpt + "Read more →", separated by hairlines.
Row content uses the shipped `em-article__*` classes.

New CSS: `em-insights`, `em-insights__row`.

### 06 — Join Us · Action

Tinted band. `em-heading` + lede. A wide newsletter panel (shipped `em-newsletter`
with `em-input` and a navy Subscribe button) beside two stacked cards — Become an
Ambassador (`em-btn--outline`) and Donate (`em-btn--secondary`, navy).

No new CSS beyond a grid wrapper.

The hexagon pattern band (`em-cta__pattern` with `assets/pattern-blue.png`) is
available but unused here — the wireframe specifies a light treatment.

### 07 — Site footer

Shipped `em-footer`. Reversed logo, mission sentence, newsletter form, social
glyphs (Facebook, Instagram, X, YouTube — inline SVG already in `SiteFooter.jsx`),
a More column, and a legal row with the Ridgeland address.

`em-footer__top` ships as a 4-column grid; the wireframe supplies only 3 groups.
Resolved by overriding to `1.4fr 1fr 1fr` in `homepage.css`. See Open questions.

## Brand mapping

| Wireframe | Branded skin |
| --- | --- |
| `#2c2f31` dark band | `--surface-navy` → Empower Blue `#003C50` |
| `#1f2427` headings | `--text-strong` → `--blue-800` |
| `#f6f6f5` / `#f4f4f4` fills | `--surface-tint` → `--blue-100` |
| Card radius 14px, panel 24px | `--radius-card` 20px, `--radius-panel` 28px |
| Diagonal-cross placeholder boxes | `assets/photography/*`, `--radius-media` 16px |
| `LOGO` outline boxes | `logo-primary.png`, `logo-primary-reversed.png` in footer |
| Google-CDN Figtree / Source Sans 3 | local woff2 via `tokens/fonts.css` |
| Bare `h2` | `em-heading` — eyebrow + title + 88×6 orange rule |
| Grey `44×44` icon squares | `assets/illo-*.png` illustration set |
| Dark solid pills | See CTA hierarchy below |

### CTA hierarchy

The brand permits one orange action per view. Allocation:

| Action | Treatment |
| --- | --- |
| Hero — Explore Our Work | `em-btn--primary` — **the single orange CTA** |
| Header — Donate | `em-btn--secondary` (navy) |
| Join Us — Support Our Work | `em-btn--secondary` (navy) |
| Newsletter — Subscribe | `em-btn--secondary` (navy) |
| Read Community Stories | `em-btn--inverse-outline` (on navy) |
| Learn more / See all / Ambassador | `em-btn--outline` |
| "Read more →" / "Listen →" | `em-article__more` text link (orange text, permitted) |

Orange text links and the `em-heading__rule` are unaffected — the scarcity rule
governs filled buttons.

## Semantics

The source uses `<div>` and `<span>` throughout, which suits a preview harness but
not hand-off. The implementation uses:

- `<header> <nav> <main> <section> <footer>` landmarks
- `<a>` for navigation, `<button>` for actions, `<form>` for both newsletter blocks
- Ordered headings: one `h1` (hero), `h2` per section, `h3` within cards
- `alt` text on all photography; decorative placeholders `aria-hidden`
- `:focus-visible` rings inherited from `components.css` (3px orange)
- The chevron's hover-revealed detail is present in the DOM and reachable by keyboard,
  not hover-only

## Responsive

**The wireframe is desktop-1440 only. Neither source file specifies smaller screens.
The following is an assumption and needs review.**

- **≥1200px** — as designed; 1200px container, 24px gutters
- **900–1200px** — container fluid; hero split becomes 55/45; bento collapses to a
  single column; insights sidebar moves above the rows
- **600–900px** — all multi-column grids to one column; chevron becomes a vertical
  stack of numbered blocks with the detail always visible; footer to two columns
- **<600px** — single column throughout; header nav collapses to a menu button;
  hero image below copy

The chevron cannot survive five-across below roughly 1100px — the vertical numbered
stack is a deliberate substitution, not a scaled-down chevron.

## Out of scope

- The other four pages in `ui_kits/website/` (Solutions Center, Quality Education,
  The Latest, Join Us)
- Working carousel motion
- Header dropdown menu contents (`em-header__menu` styles exist; the wireframe shows
  carets only)
- Any WordPress theme, PHP, or Elementor template files
- Live CMS data for the "auto-populated" slots
- Print and social surfaces

## Open questions

1. **Responsive behaviour** — the breakpoints above are assumed. Confirm or replace.
2. **Footer columns** — the wireframe has three groups; the shipped footer grid
   expects four. Override to three, or add a fourth (e.g. Solutions links)?
3. **Fonts** — Gotham and Whitney are unlicensed here; Figtree and Source Sans 3 ship
   as stand-ins. If Empower holds the licences, swapping `src` URLs in
   `tokens/fonts.css` is the only change needed.
4. **Photography** — `assets/photography/*` was extracted from the brand guide PDF at
   roughly 900–1250px on the long edge. Adequate for a reference build; not a licensed
   library for production.
5. **Icons** — the brand defines no icon system. The design system substitutes Lucide
   for functional glyphs. If Empower has an approved set, it replaces this.
