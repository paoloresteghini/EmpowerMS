# Empower Mississippi — homepage options

Static HTML + CSS builds of the Empower Mississippi homepage: **four complete
alternative designs for the client to choose from**, plus the original
reference build kept for comparison and one variation of it.

Content is the **Homepage** section of the *Empower Mississippi Website Refresh
Roadmap* (Google Doc). Every headline, subhead, section intro, solution promise
and Join Us block is that copy, used verbatim, on all six pages. What differs
between them is the composition.

This is a **reference implementation for hand-off to WordPress + Elementor**,
not a production runtime.

## The six pages

| Page | What it is |
| --- | --- |
| `dist/final.html` | **The agreed build** — Empower's chosen combination. This is what ships. |
| `dist/index.html` | Chooser — opens the five proposals side by side. Review tool, never ships. |
| `dist/option-a.html` | **Front Porch** — interlocking mosaic, warm and photographic |
| `dist/option-b.html` | **The Index** — persistent sticky rail, typographic, credible |
| `dist/option-c.html` | **The Atlas** — horizontal rails and expanding panels |
| `dist/option-d.html` | **The Throughline** — a route, with a sticky photographic stack |
| `dist/current-2.html` | **The Evolution** — the existing design moved forward, not replaced |
| `dist/current.html` | **The Starting Point** — the original wireframe build, toggles stripped |

## The agreed build

Empower picked section by section rather than picking one option:

| | Section | Chosen |
| --- | --- | --- |
| | Header | Evolution — utility strip + plain dropdowns |
| 1 | Hero | **Front Porch** |
| 2 | How Change Happens | **Throughline** |
| 3 | Three Foundations | **Evolution** |
| 4 | Mississippi Stories | Evolution → *the original build's section* |
| 5 | Latest Insights | Evolution → *the original build's section* |
| 6 | Join Us | Evolution → *the original build's section* |

Sections 4–6 need reading carefully. Evolution never overrode them — its shell
includes the shared `sections/0[456]-*.html`, which are the **original build's**
partials. So "Evolution" for those three resolves to the current site's
sections, not to anything new.

That matters for one reason beyond composition: **the original build rewrote
seven of the seventeen approved roadmap strings**, and picking it for sections
5 and 6 brings the rewrite with it. Missing from `dist/final.html`:

- the Latest Insights intro (*"Stay connected with the latest research…"*)
- the entire Join Us block — *Stay Connected*, *Become an Ambassador*,
  *Support Our Work* and all three descriptions, replaced by *"This is where
  you come in."*, *Bring it home* and *Fund the work*

The four options all restore the roadmap wording; this combination does not.
Either the approved copy goes back into `final`'s sections 5 and 6, or Empower
sign off the rewrite — until then `final.html` is deliberately held out of the
`ROADMAP_COPY` assertion in `test.mjs`, with the reason written at the
exclusion.

**Hand-off cleanup, not yet done.** `final.html` loads four section
stylesheets — `homepage.css`, `option-a.css`, `option-d.css`, `current-2.css` —
because it composes from tested sources rather than a hand-merge. Most rules
in three of those are inert here. Consolidating to one stylesheet and deleting
the option files is the next step, and it should happen once Empower confirm
the composition, not before.

## The chooser

The chooser leads with **The Evolution** and marks it *Paolo's pick*. It shows
five cards: `current.html` still builds and its URL still resolves, but it was
pulled from the grid once the five proposals were finished — Empower are not
being asked to consider it, and it is kept only for diffing against what
exists today. A named exemption in `test.mjs` allows that; every other page in
`PAGES` must still be linked from the chooser.

The filenames stay `current-2` and `current` — renaming them would break the
review URLs already shared.

`dist/current-2.html` is the current build with three parts replaced: a navy
utility strip above a centred nav using **simple dropdowns instead of the mega
menus** (same six top-level items, same sitemap); a centred banner whose three
photographs straddle the edge of a tinted band; and **Three Foundations as
Option C's expanding photographic panels, restated for a white section** rather
than the bento grid. Everything else — the solutions model, stories, insights,
Join Us, the footer — is the reference build's own. It is the only page that
loads `css/current-2.css` and `js/dropdown.js` and the only one that loads
neither `css/megamenu.css` nor `js/megamenu.js`.

The foundations panels are `c2-*`, not `at-*`: this page never loads
`css/option-c.css`, and a shared prefix across two stylesheets that never meet
would imply a dependency that does not exist. If Empower picks Option C, that
section then exists twice and one copy should go.

**Live review link:** <https://paoloresteghini.github.io/EmpowerMS/> — the
chooser, linking all six. Published from `master` by
`.github/workflows/pages.yml`, which runs the suite, then `pages.mjs` to
assemble `_site/`. The published copy carries `robots.txt` and a `noindex`
meta that the hand-off files do not: it is a client review link for unreleased
brand work and stand-in photography, so it is reachable by anyone holding the
URL and invisible to search engines. Both are injected into the `_site` copy,
so `dist/` and `src/` stay byte-identical to what WordPress receives.

Each option's design rationale is in `docs/homepage-options-brief.md`. Each
stylesheet opens with a comment stating that option's spatial idea and its
signature interaction — read that first before changing anything in it.

**Only one option ships.** Once Empower picks, delete the other three
`src/option-*/` directories and their `css/option-*.css`, and cut the
corresponding entries from `PAGES` in `build.mjs`.

## Structure

```
tokens/*.css              ← design system, imported verbatim, never edit
components/components.css ← design system, imported verbatim, never edit
assets/                   ← design system, imported verbatim, never edit

patterns/hex-lattice.svg  ← seamless brand honeycomb tile — shippable
patterns/hex-lattice.mjs  ← the script that generates it — never ships
docs/pattern-lab.html     ← pattern review page — never ships

css/site.css              ← SHARED site chrome: header, mobile nav, footer,
                            and the accessibility overrides that apply
                            wherever those appear. Every page loads it.
css/motion.css            ← scroll + entrance reveals — shippable, shared
css/megamenu.css          ← desktop mega menu panels — shippable, shared
css/homepage.css          ← sections of the original reference build only
css/option-a.css          ← Front Porch
css/option-b.css          ← The Index
css/option-c.css          ← The Atlas
css/option-d.css          ← The Throughline
css/current-2.css         ← the new header + banner fitted to the current build
css/chooser.css           ← the review chooser — never ships

src/_shared/header.html   ← ONE header + five mega menus + mobile nav,
src/_shared/header-2.html   the same nav items as simple dropdowns.
src/_shared/footer.html     Shared. Change one, changes every page using it.
src/index.html            ← page shell for the original build
src/sections/0*.html        and its sections
src/option-a/index.html   ← page shell per option
src/option-a/sections/      and that option's own sections
src/current-2/index.html  ← the current build with header-2, its own banner and
src/current-2/sections/     its own foundations; 02, 04–06 are the reference
                            build's own partials, included unchanged
src/chooser.html          ← the review chooser — never ships

js/nav.js                 ← mobile menu behaviour — shippable
js/reveal.js              ← reveal engine + sticky header flag — shippable
js/megamenu.js            ← desktop mega menu behaviour — shippable
js/dropdown.js            ← simple dropdown behaviour — shippable

build.mjs                 ← PAGES manifest; resolves <!--@include--> markers
dev.mjs                   ← watch + live-reload dev server — never ships
test.mjs                  ← node:test suite against every built page
dist/*.html               ← generated by build.mjs, gitignored
```

`build.mjs` exports `PAGES`, and `test.mjs` imports it — adding a page to the
manifest automatically brings it under the whole cross-page contract described
in **Testing** below. A page whose source file does not exist yet is skipped
with a warning rather than crashing the build, but a test fails if any entry
in `PAGES` never produced a file.

Include markers resolve relative to `src/`, not to the page's own directory,
so a section and a shared partial are referenced the same way from anywhere.
`dist/` stays flat and one level deep, because every partial references assets
as `../assets/…`.

## Build and view

```bash
node dev.mjs
```

Then open `http://localhost:8000/dist/index.html` — the chooser, which links
to all six. Editing anything in `src/` rebuilds every page and reloads the
tab; editing `css/`, `js/`, `tokens/`, `components/` or `assets/` just reloads
it. `--port 9000` moves it.

`dev.mjs` is a review tool and never ships. It matters for two reasons beyond
convenience:

- **It serves everything `no-store`.** A plain static server lets the browser
  hold on to a stylesheet, so a CSS edit appears not to apply and the next
  half hour goes into debugging a rule that was already correct.
- **The reload client is injected into the HTTP response, never written to
  `dist/index.html`.** The file on disk stays byte-identical to what
  `build.mjs` produced, so nothing dev-only can reach the WordPress hand-off.
  A test enforces this.

The one-shot equivalent, if you would rather not run a watcher:

```bash
node build.mjs
python3 -m http.server
```

Rebuild by hand only when you have edited a partial — `css/` and `js/` are
linked by path and read live on every page load, and `node --test test.mjs`
runs `build.mjs` itself, so tests always see fresh markup.

**The automation browser caches stylesheets hard.** A CSS change that appears
not to have applied is usually a stale sheet, not a bad rule: check the file on
disk and `curl` the served copy before debugging the CSS. Bust the `<link>`
hrefs with a query string to confirm. This has cost real time twice on this
project.

**Do not open the built pages directly as a `file://` URL.** Chrome blocks
`<script type="module">` and cross-origin `@font-face` over `file://`, so opening
the file directly gets you fallback system fonts and no mobile
menu, and it fails silently,
with no console error pointing at the cause.

Requires Node ≥18. No dependencies, no install step.

## Test

```bash
node --test test.mjs
```

116 tests. They come in two halves.

Everything up to the divider comment near the end of `test.mjs` is about the
**original reference build** specifically — it names `.em-*` section classes
that only that page has.

Below the divider is the **cross-page contract**, asserted for every page in
`PAGES`. That is what stops six presentations of one brand drifting into six
different brands:

- every line of the roadmap's approved copy appears verbatim on all four options
- one `h1` per page, no skipped heading levels
- exactly one orange filled button per page, and it is the hero CTA
- exactly one email input per page, and it has a label
- every image has `alt`, intrinsic dimensions and a loading strategy
- every referenced asset exists on disk
- every `aria-controls` / `aria-labelledby` resolves to a real id
- nothing focusable is buried inside `aria-hidden`
- every page has the skip link and a `<main id="main">` for it to reach
- stylesheets load in cascade order, and no page links a deleted preview file
- no option stylesheet hides content behind a hover-only rule
- every option honours `prefers-reduced-motion` and hard-codes no brand colours
- the header and footer are shared partials, not per-option copies

Adding a page to `PAGES` brings it under all of that automatically.

## Mobile navigation

Below 960px the desktop nav (`.em-header__nav`) hides and a mobile menu takes over: a
toggle button in the header actions plus an inline dropdown panel (`.em-mobilenav`,
in `src/sections/00-header.html`) with accordion sub-items, driven by `js/nav.js`.

It is progressively enhanced. The panel and all 16 links ship live in the static
HTML — every group's sub-list is a real `<ul>` of real `<a href>` elements, with no
`hidden` attribute in the markup itself. `js/nav.js` only collapses them once it
loads (setting `aria-expanded="false"` and the `hidden` DOM property, then wiring
click/`Escape` handlers). If the script fails to load, the menu stays open and every
link is still reachable by scrolling and tabbing.

The nav tree (six top-level items, five expandable sub-groups) came from the design
system's own `docs/Empower Mississippi Design System/ui_kits/website/data.js`. Note
that source data calls the third group `"The Latest"`; the header label used
throughout this build is `"All Content"` instead — the design system's own component
files disagree with each other on this label, and `"All Content"` was carried over
from the existing header nav test rather than invented here.

## Motion

Scroll and entrance animation is an attribute layer: `css/motion.css` holds the
states, `js/reveal.js` decides when to apply them. Nothing about it is
homepage-specific — moving it to another page means copying two files and adding
attributes.

| Attribute | Where | Effect |
| --- | --- | --- |
| `data-reveal="rise"` | any element | fades up 20px |
| `data-reveal="fade"` | any element | fades only |
| `data-reveal="slide-l"` / `"slide-r"` | any element | fades in from 24px left/right |
| `data-reveal="clip"` | photos | wipes up and settles from a 1.04 scale |
| `data-reveal-group` | a container | each `[data-reveal]` inside it is delayed 70ms more than the previous one |
| `data-reveal-entrance` | a container | reveals on load instead of on scroll — the hero only |

`js/reveal.js` sets `<html data-reveal="on">` as its first statement, and every
hidden start-state in `css/motion.css` is nested under that attribute. If the
script fails to load, nothing is hidden — the page just renders without motion.
Never write an ungated `opacity:0`; `test.mjs` fails the build if you do.

The `data-reveal-group` stagger is a custom property, not CSS alone: `js/reveal.js`
walks each group’s `[data-reveal]` children in document order and sets
`--reveal-i` on each one to its position within that group (0, 1, 2, …);
`css/motion.css` reads it back as `transition-delay:calc(var(--reveal-i, 0) * 70ms)`.
Porting the CSS without the script gets you no `--reveal-i` and so no stagger,
with nothing in the stylesheet to explain why.

Reveals are one-shot: an element animates the first time it enters view and is
then unobserved. It does not re-hide on scroll-up.

`prefers-reduced-motion: reduce` is honoured in both files — every start-state
collapses to the settled state and all durations go to zero.

**Rebuilding in Elementor:** either paste `css/motion.css` + `js/reveal.js` in
wholesale and add the attributes to each widget’s advanced settings, or map each
section to Elementor’s own entrance animations. If you use Elementor’s, the
closest equivalents are `fadeInUp` for `rise`, `fadeIn` for `fade`, and
`fadeInLeft`/`fadeInRight` for the slides; there is no built-in equivalent of
`clip`, and Elementor’s per-widget animation delay is what reproduces
`data-reveal-group`.

**Warning:** `js/reveal.js` isn’t only entrance animation — it’s also what sets
`<html data-scrolled>` for the sticky header (see below). Dropping the script in
favour of Elementor’s built-in presets silently loses the header condense too,
not just the reveals; keep the script (or reimplement the scroll listener) even
if you replace every `data-reveal` attribute with an Elementor animation.

The header is `position: sticky` and condenses from 92px to 68px past 80px of
scroll, driven by `<html data-scrolled>` from the same script. The preview
control bar (`.ctl`) is deliberately **not** sticky — it would sit on top of the
sticky header. It never ships, so this only affects the preview.

## Mega menus

Each of the five desktop nav triggers opens a full-width panel: grouped link
columns on the left, one promoted feature card on the right. Markup lives in
`src/sections/00-header.html` (five `.em-mega` panels), styles in
`css/megamenu.css`, behaviour in `js/megamenu.js`.

Behaviour: hover-intent opens after 120ms and closes after 200ms, but only on a
fine pointer; moving between triggers while one is open swaps instantly; click
toggles and pins; Escape closes and returns focus to the trigger; ArrowDown moves
into the panel; ArrowLeft/ArrowRight move along the nav; outside click and focus
leaving the header both close. Exactly one panel is open at a time. Below 960px
the whole feature stands down and the mobile menu takes over.

Plain Tab order does not route into an open panel next: the panel markup sits
after `.em-header__actions` in the DOM, so with a panel open, its links come
after the toggle/search/Donate actions in tab order, not right after the
trigger. ArrowDown is the intended route in — it opens the panel (if not
already open) and moves focus straight to its first link.

Same progressive-enhancement contract as the motion layer: `js/megamenu.js` sets
`<html data-mega="on">`, and only then does `css/megamenu.css` position the panels
and close them. Without the script they are five plain stacked link lists.

`js/megamenu.js` also sets `hidden` on every closed panel, and `css/megamenu.css`
depends on that: its `prefers-reduced-motion` block makes panels opaque
regardless of open state, so it is the plain `[data-mega="on"] .em-mega[hidden]{
display:none}` rule that keeps a closed panel out of the layout for
reduced-motion users. The stylesheet alone does not get this right — ship the
script alongside it, or gate the panels some other way.

**Link content is not placeholder — panel copy is.** Every link label and href is
copied from the mobile nav, and `test.mjs` fails if the two sets ever diverge:
change one nav, change both. The one-line link descriptions, the feature-card
titles, and the feature images are stand-ins written for this build and need
Empower’s real content. Feature images carry `alt=""` deliberately — they are
decorative beside a titled link, and the stand-in photo filenames do not describe
their contents.

## Simple dropdowns (`dist/current-2.html` only)

The same six top-level items and the same sitemap as the mega menus, rendered as
one narrow panel per trigger: label plus a one-line description, no feature card,
no columns. Markup is `src/_shared/header-2.html`, styles are in
`css/current-2.css`, behaviour is `js/dropdown.js`.

`js/dropdown.js` is `js/megamenu.js`'s contract at a smaller surface, and the
interaction is deliberately identical — hover intent at 120ms/200ms on a fine
pointer only, click to toggle and pin, Escape back to the trigger, ArrowDown into
the panel, ArrowLeft/ArrowRight along the nav, outside click and focus-leave both
close, one panel open at a time, stands down below 960px. The gate attribute is
`<html data-dropdown="on">` rather than `data-mega`.

One thing this page has to undo that the mega menus do not:
`components/components.css` ships `.em-header__menu` already `position:absolute`.
Left alone, a no-JS visitor would get five panels stacked on top of one another
under the bar. `css/current-2.css` therefore returns the panel to normal flow and
only the `[data-dropdown="on"]` gate makes it an overlay — same
progressive-enhancement contract as everything else here, but it costs an
explicit override of an upstream component rather than a plain addition.

## Responsive breakpoints

`css/homepage.css` has rules at `max-width: 1200px, 1150px, 960px, 900px, 600px,
400px`. Most are the obvious content-reflow steps; two are not:

- **1150px** — the five-step solutions chevron switches to a vertical stack here,
  not at the more obvious 900px. Its steps have `min-width:218px` and overlap by
  34px each, so the strip needs roughly `5*218 - 4*34 = 954px` to render
  horizontally. Inside the 1200px container (minus gutters) that only clears once
  the viewport is above ~1002px — so the chevron needs its own breakpoint higher
  than 900px, or there's a real overflow window between 900px and ~1002px.
  `min-width` is a text floor: "IMPLEMENTATION" is a single unbreakable 153px
  word, and 218px is that plus the panel's 30px gutters and clearance.
- **960px** — the desktop nav hides here, not at 900px, because `.em-header__bar`
  (logo + six nav links + search + Donate, none of which wrap or shrink) has a
  measured intrinsic min-content width of roughly 940px. The mobile toggle and
  panel activate at the same breakpoint so navigation is never unreachable.
- **400px** — `.em-header__bar` and `.em-header__actions` tighten their gaps and
  the decorative search icon hides, so the header keeps clearing the 320px floor
  after the mobile toggle button was added as a third non-shrinking action
  alongside search and Donate.

## Wide viewports

`.em-hero`'s grid is:

```css
grid-template-columns:minmax(0,calc(max(0px,(100vw - var(--container-max))/2) + 680px)) 1fr;
```

`.em-hero__copy`'s left padding grows with the viewport above the 1200px breakpoint
to keep the copy aligned with the page container. The column width grows by exactly
that same viewport-relative term, so the copy keeps a constant 592px of content
width at any viewport from 1280px up. **Do not** replace this with a bare
`minmax(0,680px)` cap — that lets the growing padding eat directly into the fixed
680px column instead of being additional space outside it, so content width shrinks
as the viewport widens. At 2000px that starves the headline down to ~192px of
width, wrapping it to five lines and colliding with the photograph column. A test
(`hero copy column grows with the viewport instead of a bare cap` in `test.mjs`)
guards against this regression.

## Known accessibility issues

All five pages were swept in-browser with a computed-contrast pass over every
rendered text node at 1440px — 710 nodes across the four options — and all four
come back clean. Text sitting over photography is excluded from that sweep and
measured analytically instead; the worst-case figure is in a comment beside
each scrim.

Every page also clears 320px with no horizontal scroll **including at 200%
text zoom** (SC 1.4.4), and the horizontal rails in Option C are focusable
regions with accessible names so a keyboard user can scroll them.

The 200% reflow failure that was open through the earlier builds is **closed**.
Two things did it, both in `css/site.css`:

- `h1,h2,h3{overflow-wrap:break-word}` at the top of the file was silently
  beating the `body{overflow-wrap:anywhere}` in the ≤420px block, because an
  element-level declaration out-specifies an inherited value. `break-word` does
  not reduce min-content width; `anywhere` does. So headings alone kept their
  long-word minimum and pushed a grid track 14px past a 320px viewport. The
  narrow block now names `body,h1,h2,h3`.
- `.em-header__bar` gains `flex-wrap:wrap` below 400px. The Donate label is
  deliberately **not** capped in px — SC 1.4.4 asks for text to reflow at 200%,
  not to stay small — so the actions group drops to its own line instead. At
  320px with text at normal size the row is ~234px against 272px of bar and
  stays on one line, so this only fires when it is genuinely needed.

Three findings from that sweep are fixed in `css/site.css` and the option
stylesheets, and are listed here because they are **reversible local overrides
of brand values**, not silent corrections:

- **`.em-badge--accent` was white on `--em-orange`, 3.59:1** at an 11px label,
  where the large-text exemption cannot apply. Now `--orange-700`, already in
  the ramp, at 5.55:1. Other orange fills keep the exact brand value.
- **`--text-muted` (`#6E6E6E`) is 4.48:1 on `--surface-tint` (`#E8F2F5`)** — a
  fail by 0.02. It passes on white (5.10:1) and on `--surface-subtle` (4.75:1).
  **Do not use `--text-muted` for small text on the tint.** Two places hit this
  (Option B's rail label, Option D's newsletter note) and both now take
  `--text-body`, which is 7.79:1 there.
- The **19px primary-button label**, carried over from the original build: the
  orange fill stays exactly as the brand defines it and the label crosses
  18.66px instead, where SC 1.4.3's 3:1 bar applies and 3.59:1 passes.

The two below are real brand tokens (`tokens/colors.css`), used systemically
across multiple components, and are **pending a design decision** — they are
not oversights for the WordPress developer to quietly fix.

- **`--em-orange` (`#E65A28`) on white measures 3.59:1**, below the WCAG AA 4.5:1
  minimum for normal text. It affects `.em-eyebrow`, `.em-heading__eyebrow`,
  `.em-article__more`, `.em-solution__more`, `.em-podcast__show`, and similar
  small orange text throughout the page. Remedy options: darken the orange for
  text use only (keep the current value for non-text uses), restrict orange text
  to large sizes (3:1 applies at ≥24px, or ≥18.66px bold), or accept and document
  the exception.
- **`--border-inverse` (`rgba(255,255,255,.28)`) on navy measures 2.28:1**, below
  the 3:1 minimum for UI component borders (WCAG SC 1.4.11). It affects the footer
  social buttons and the footer divider. This is the last of the original
  accessibility findings still open. (It used to affect the footer newsletter
  input too; that form was removed when Join Us took over the page's single
  subscribe field, so the question is now narrower than it was.)

## Hand-off to WordPress + Elementor

1. Copy `tokens/`, `components/` and `assets/` into the child theme. **Keep them as
   siblings** — `tokens/*.css` references `url('../assets/…')`.
2. Enqueue in this order: the eight `tokens/*.css` files, then
   `components/components.css`, then `css/homepage.css`, then `css/motion.css`
   and `css/megamenu.css`. `css/megamenu.css` must load **after**
   `css/homepage.css` — it overrides `.em-mega`’s base layout rules for the
   enhanced state.
3. Each file in `src/sections/` is a standalone fragment. Paste one into an Elementor
   HTML widget, or use it as the reference for a native Elementor section.
4. Fix up asset paths: partials use `../assets/…` relative to `dist/`. In WordPress
   these become theme URLs.
5. Replace the "auto-populated" placeholder strings with dynamic content —
   they mark CMS slots (blog posts, EPIC research, Community Stories).
6. `js/nav.js`, `js/reveal.js`, and `js/megamenu.js` should ship (or be replaced
   by Elementor’s own responsive nav, entrance-animation and dropdown-menu
   behaviour) — they drive the real mobile menu, the scroll/entrance reveals
   plus the sticky-header condense, and the desktop mega menus, respectively.

## Known substitutions

- **Fonts** — Gotham and Whitney are licensed and were not supplied. Figtree and
  Source Sans 3 stand in. To swap, change the `src` URLs in `tokens/fonts.css`;
  nothing else changes.
- **Photography** — extracted from the brand guide PDF at roughly 900–1250px on the
  long edge. Stand-in material, not a licensed library. `classroom-students.jpg` is
  reused in two places.
- **Photography filenames do not reliably describe their contents.** The images
  were misnamed at extraction time — e.g. `family-outdoors-park.jpg` is actually a
  child reading in a school library, and `young-man-portrait-bw.jpg` is a colour
  photo of a classroom, not a black-and-white portrait. All `alt` text in this
  build was written by looking at each image, not by reading its filename; treat
  the filenames themselves as unreliable if you reuse these assets elsewhere.
- **Icons** — the brand defines no icon system. The search and play glyphs are
  single inline paths; social glyphs come from the design system's `SiteFooter.jsx`.

## Deliberate deviations from the source wireframe

These apply to `dist/current.html`, the original build. The four options are
new compositions and do not inherit them.

- Header is 92px, per `components.css`, not the wireframe's 88px placeholder metric.
- Footer is full-bleed navy; the wireframe drew a rounded inset panel.
- The 88×6 orange rule is added under section headings — a brand motif the grayscale
  wireframe could not express.
- Exactly one orange filled button on the page (hero "Explore Our Work"), per the
  brand's one-action-per-view rule. The wireframe drew four solid pills.
- The chevron becomes a vertical numbered stack below the 1150px breakpoint (see
  "Responsive breakpoints" above). The source specifies no responsive behaviour;
  see the spec's Open Questions.
- **Join Us is rebuilt as a stacked composition** (`src/sections/06-joinus.html`),
  not the wireframe's panel-plus-two-cards. Foundations, Stories and the original
  Join Us layout were all "one dominant panel left, two stacked cards right"
  under a title/lead head grid, so the closing section read as a repeat of the
  Stories section directly above it. It is now one navy slab carrying the
  headline and the newsletter, then two photo-washed panels beneath it. Notes
  for the Elementor build:
  - The `<h2>` lives inside the slab, so this section has no head grid and no
    eyebrow. `aria-labelledby` still points at it.
  - The slab uses `--surface-navy-deep`, deliberately darker than the Stories
    band and the footer, which both use `--surface-navy`.
  - `.em-join__wash` is a decorative `<img>` (empty `alt`, `aria-hidden`, lazy),
    masked to a radial gradient so it fades out before it reaches the copy. Both
    photographs already appear earlier in the page, so they cost no extra
    request. Opacity is capped at `.26`; the contrast measurement behind that
    number is in the CSS comment, and a test enforces the cap.
  - The footer newsletter form was removed. The page asked for an email address
  twice within one scroll; Join Us now owns the single subscribe field, and a
  test enforces that there is exactly one `type="email"` input on the page.

## Brand pattern

`assets/pattern-blue.png` and `assets/pattern-orange.png` are declared in
`tokens/base.css` as `.em-pattern-blue` / `.em-pattern-orange`. **Neither class is
used in this build**, for three reasons:

1. They are compositions, not tiles. Roughly half of each canvas is empty, so at
   `repeat` the empty region meets the dense region and the seam is visible.
   `docs/pattern-lab.html` shows it.
2. The colour is baked into the pixels, which is why the same artwork ships twice.
3. 767×885 displayed at 340px softens the `EM` letterforms into noise.

`patterns/hex-lattice.svg` replaces them for the one place this build uses a
pattern — the Join Us slab:

- **A true tile.** 120 × 69.28 is the hexagon lattice's own period (`3s` by
  `s√3` at side 40). Every hexagon that can cross the tile box is drawn and
  clipped by the SVG viewport, so the lattice continues across repeats on both
  axes at any `mask-size`.
- **Applied as a mask, not a background image.** The paint is `--pattern-ink`,
  so one 950-byte file serves navy, orange and tint alike.
  Retinting is a one-token override, not a second export.
- **Graduated in the paint.** The ::before's background is a `to top left`
  linear gradient of `--pattern-ink` showing through the tile mask: densest in
  the slab's empty bottom-right corner, gone before it reaches the headline.
  `to top left` follows the corner diagonal at whatever aspect the slab is, so
  the direction holds from 1440 down to 320 with no per-breakpoint angle.
  `mask-composite` would
  be the more obvious way to fade a mask, but where it is unsupported the mask
  layers add rather than intersect and the fallback is a solid ink blob — a test
  pins this.
- **Vector.** The same file is texture at 60px and architecture at 300px.
- Contrast measured over a lattice stroke, not over the flat slab: white 11.75:1,
  `--text-inverse-muted` 7.24:1. The ink at full strength is 6.56:1 for white, so
  no opacity value can put the slab's copy under AA.

`patterns/hex-lattice.mjs` regenerates the tile (`node patterns/hex-lattice.mjs`).
The **EM monogram cell** in the supplied pattern is deliberately not reproduced:
the only logo files here are PNGs rendered from a PDF, and redrawing a logotype by
eye from a raster gives a facsimile rather than the mark. Once Empower supplies the
vector original, adding the cell is a change to the generator, not a redraw.

For Elementor: the slab pattern is one `::before` rule in `css/homepage.css`. If
the section is rebuilt with native widgets, apply it as a background overlay on
the container and keep `patterns/hex-lattice.svg` next to `css/`.

## What the client still owes us

These are flagged throughout and are not defects in the build:

- **Gotham and Whitney webfonts** (or licences). Figtree and Source Sans 3
  stand in; swapping is a change to the `src` urls in `tokens/fonts.css` and
  nothing else.
- **Licensed photography.** Everything here was extracted from the brand guide
  PDF at 900–1250px and is stand-in material. All `alt` text was written by
  looking at each image, because the extracted filenames do not describe their
  contents — treat the filenames as unreliable if you reuse these assets.
- **The logo in vector.** The only files here are PNGs rendered from a PDF,
  which is why the brand pattern's EM monogram cell is deliberately not
  reproduced (see **Brand pattern**).
- **The five steps of the Empower Solutions Model.** The roadmap names the
  model but supplies no steps; the five in every option were written for this
  build and need Empower's real wording.
- **Mega menu panel copy.** Link labels and destinations are real and
  test-enforced against the mobile nav. The one-line descriptions and the five
  feature cards are placeholder.
- **Everything marked "auto-populated".** Those strings mark CMS slots — blog
  posts, EPIC research, Community Stories, the podcast feed.
- **A decision on the two open brand-colour questions** in *Known accessibility
  issues* above.

## Not built

The four other pages in the design project's `ui_kits/website/` (Solutions Center,
Quality Education, The Latest, Join Us).
