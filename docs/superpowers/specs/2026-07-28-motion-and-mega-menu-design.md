# Motion layer + desktop mega menus — design

Date: 2026-07-28
Repo: EmpowerMS homepage reference implementation (static hand-off build for
WordPress + Elementor)

## Problem

Two gaps in the current build:

1. **No motion.** `tokens/motion.css` defines durations and easings, but nothing
   consumes them beyond hover/press states. The page renders instantly and flat —
   no page-entrance sequence, no scroll reveals.
2. **Desktop mega menus were never built.** `src/sections/00-header.html` has five
   `<button aria-expanded="false">` triggers (About, Solutions, All Content,
   Podcast, Join Us) with no panels behind them. `aria-expanded` is a lie: nothing
   expands. Only the mobile accordion (`js/nav.js`, below 960px) works.

## Decisions taken

| Fork | Decision | Why |
| --- | --- | --- |
| Delivery format | Custom CSS + JS, documented in README | Elementor's built-in entrance presets can't do per-element stagger or the choreography below. Dev pastes the layer into Custom CSS / an HTML widget. |
| Motion level | Layered and choreographed | Per-element stagger, distinct treatment per section type. Movement small (16–24px) and fast (400–600ms) so it reads confident, not bouncy — Empower is a policy nonprofit. |
| Mega menu shape | Full-width panel with feature card | Link columns with short descriptions on the left, one promoted card on the right. |
| Trigger | Hover-intent + click + full keyboard | Desktop users expect hover on a nav like this; keyboard and touch users get real, non-hover paths. |
| Sticky header | Yes — sticky + condense on scroll | Approved explicitly. A condense-on-scroll header only reads if the header is sticky, so this is a real behaviour change, not just decoration. |

## Architecture

Two independent layers. No dependencies, no build-step change, nothing existing
rewritten.

```
css/motion.css       reveal start-states, keyframes, reduced-motion block
css/megamenu.css     .em-mega panel styles
js/reveal.js         one IntersectionObserver, attribute-driven
js/megamenu.js       desktop nav behaviour; js/nav.js untouched
```

Both are linked from `src/index.html` (two `<link>`, two `<script type="module">`).
`js/controls.js` (preview-only) and `js/nav.js` (mobile menu) are unchanged.

### Progressive-enhancement contract

The repo's existing contract, stated in the `js/nav.js` header comment: markup ships
usable, JS opts in. Both new layers follow it.

- `js/reveal.js` sets `document.documentElement.dataset.reveal = 'on'` as its first
  statement. Every hidden start-state in `css/motion.css` is nested under
  `[data-reveal="on"]`.
- `js/megamenu.js` sets `data-mega="on"` the same way. `.em-mega` panels are
  positioned/hidden only under that attribute.

If either script fails to load, the page renders fully visible and every mega-menu
link is still on the page as a static list. Nothing is ever invisible without the
JS that reveals it.

## Layer 1 — reveal

### Public API (what the Elementor dev reads in the README)

```html
<div class="em-insights__grid" data-reveal-group>
  <article data-reveal="rise">…</article>
  <article data-reveal="rise">…</article>
</div>
```

| Attribute | Values | Effect |
| --- | --- | --- |
| `data-reveal` | `rise` | opacity 0 + translateY(20px) → settled |
| | `fade` | opacity only |
| | `slide-l` / `slide-r` | opacity + translateX(±24px) |
| | `clip` | `clip-path` wipe + 1.04→1 scale settle, for photography |
| `data-reveal-group` | (boolean) | JS stamps `--reveal-i` (0-based) on each child carrying `data-reveal`; CSS applies `transition-delay: calc(var(--reveal-i) * 70ms)` |
| `data-reveal-entrance` | (boolean) | Reveals on load instead of on intersection — above-the-fold elements |

### Behaviour

- One shared `IntersectionObserver`, `threshold: 0`,
  `rootMargin: '0px 0px -12% 0px'`. Threshold 0 rather than a fraction: an element
  taller than the viewport can never reach a 15% threshold, so a fractional
  threshold would leave tall blocks permanently hidden. The negative bottom margin
  is what supplies the "reveal slightly before it's fully in view" feel.
- On intersect: add `.is-revealed`, then `unobserve` the element. One-shot, no
  re-hide on scroll-up.
- Only `transform` and `opacity` animate (plus `clip-path` for the `clip` variant).
- Timings come from `tokens/motion.css` (`--dur-reveal`, `--ease-entrance`). No new
  motion tokens — the design system files stay untouched, per README rules.

**Dropped from the earlier draft:** a `count` variant. The homepage has no numeric
statistic anywhere — `em-hero__northstar` is a prose figure with no number — so a
count-up variant would ship with zero consumers. YAGNI.

### Reduced motion

A single `@media (prefers-reduced-motion: reduce)` block in `css/motion.css`
collapses every start-state to the settled state and zeroes durations/delays.
`js/reveal.js` checks the same media query and, when it matches, skips the count-up
animation (writes the final number immediately) and still adds `.is-revealed` so
nothing depends on animation completion.

### Choreography

| Section | Treatment |
| --- | --- |
| Header + hero | Page-entrance on load: header bar → `em-eyebrow` → h1 → `em-hero__lede` → `em-hero__actions`, 70ms apart. `em-hero__media` uses `clip`, `em-hero__northstar` `rise` behind it. |
| Solutions (`em-process`) | `em-process__bg` / `__scrim` fade first, then `em-process__step` items cascade left→right at 80ms. |
| Foundations | `em-foundations__head` rises; bento or equal cards cascade; `em-bento__media` uses `clip`. |
| Stories | Feature card `slide-l`; stacked quotes cascade. Carousel variant cascades horizontally. **Both** layout variants are wired, so the `data-stories` preview switcher keeps working. |
| Insights | Head rises; three article cards cascade; badges 100ms behind their card. |
| Join us | `em-card` rises; form rows cascade. |
| Footer | Columns cascade. |

Both `data-foundations` variants (bento / equal) are likewise wired, so neither
preview control breaks.

## Layer 2 — sticky, condensing header

- `.em-header` becomes `position: sticky; top: 0`.
- `js/reveal.js` owns the scroll flag (it is already the page-lifecycle script):
  past 80px it sets `<html data-scrolled>`, using a passive scroll listener with an
  `rAF` guard.
- CSS transitions `.em-header__bar` `min-height` down (92px → 68px) and adds
  `--shadow-md` while `[data-scrolled]` is set.
- The open mega-menu panel is anchored to the header, so it travels with it.
- **Preview-bar consequence:** `.ctl` is currently `position: sticky; top: 0;
  z-index: 100`. With a sticky header at `top: 0` the two would occupy the same
  strip and the higher-z preview bar would cover the header. `.ctl` therefore
  becomes `position: static` and scrolls away. It is preview-only chrome that never
  ships, so this costs nothing in the hand-off; README notes it.

## Layer 3 — mega menu

### Markup

Added to `src/sections/00-header.html`, one panel per trigger, inside `<header>`
after `.em-header__bar`:

```
.em-mega#mega-<name>            full-bleed, aria-labelledby the trigger
  .em-container
    .em-mega__inner
      .em-mega__links           two columns of grouped links
        .em-mega__col
          .em-mega__group-title
          a.em-mega__link
            .em-mega__link-label
            .em-mega__link-desc
      .em-mega__feature         promoted card
        .em-mega__feature-eyebrow / -media / -title / -meta / CTA
```

Five panels: About, Solutions, All Content, Podcast, Join Us.

**Link source of truth:** the sitemap already encoded in the mobile nav
(`.em-mobilenav__sublist`). Desktop panels use exactly those labels and hrefs, so
the two navs cannot drift. One-line descriptions and feature-card copy are written
for this build and marked as placeholder in the README, for Empower to replace.

Each trigger gains `aria-controls="mega-<name>"`; each panel gains
`aria-labelledby="<trigger id>"`. Triggers get ids.

### Behaviour (`js/megamenu.js`)

- Hover-intent, gated on `matchMedia('(hover: hover) and (pointer: fine)')`:
  120ms open delay, 200ms close delay. Moving between two triggers while a panel is
  open swaps instantly (no delay).
- Click / Enter / Space toggles and pins the panel open; clicking the same trigger
  again closes it.
- Escape closes and returns focus to the trigger.
- Outside click, and focus leaving the header, both close.
- ArrowLeft / ArrowRight move between top-level triggers; ArrowDown moves focus into
  the open panel's first link.
- Exactly one panel open at a time.
- Disabled entirely below 960px (matched via `matchMedia`, kept in sync on resize) —
  the mobile nav owns that range. Panels are `hidden` there.
- `aria-expanded` on each trigger is driven for real.
- Open state reuses `.em-header__item--open`, which `components/components.css`
  already styles (nav pill background + caret flip). No new open-state styling.

### Motion

Panel fades and rises 8px over `--dur` with `--ease-out`; links inside stagger 30ms
using the same `--reveal-i` mechanism. Both are no-ops under
`prefers-reduced-motion: reduce`.

## Accessibility notes

- Open todo: `--em-orange` on white is 3.59:1 and fails AA for normal-size text.
  Mega link descriptions and feature-card meta therefore use body/muted text, not
  orange. This work adds no new AA failures.
- Every mega link is a real `<a href>`, reachable without JS.
- Reduced motion is honoured in both CSS and JS.

## Tests (`test.mjs`, extending the existing node:test suite)

- Each of the five triggers has `aria-controls` resolving to a panel id that exists
  and is unique.
- Each panel has `aria-labelledby` pointing at its trigger's id.
- Every `.em-mega__link` has a non-empty `href`.
- Desktop mega link set matches the mobile nav link set (labels and hrefs), guarding
  against drift.
- `css/motion.css` contains a `prefers-reduced-motion: reduce` block.
- Every `data-reveal-group` has at least one descendant carrying `data-reveal`.
- Every `data-reveal` value is one of the five documented variants.
- `src/index.html` links both new stylesheets and both new scripts.

## Documentation (`README.md`)

Two new sections:

- **Motion** — the attribute table above, the `[data-reveal="on"]` gating rule, the
  reduced-motion behaviour, and a note that the dev can drop `js/reveal.js` +
  `css/motion.css` in wholesale or map each section to an Elementor entrance preset.
- **Mega menu** — panel anatomy, the 960px cutover to the mobile nav, keyboard map,
  and an explicit flag that link descriptions and feature-card content are
  placeholder copy pending Empower's input.

## Out of scope

- No changes to `tokens/*`, `components/components.css`, or `assets/` — the README
  marks those as imported verbatim, never edited.
- No scroll-linked/parallax effects, no `animation-timeline: view()`. One-shot
  reveals only.
- No new pages; the mega-menu link targets stay the same placeholder routes the
  mobile nav already uses.
