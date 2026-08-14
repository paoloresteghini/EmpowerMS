# Beaver Builder before-set: what the 45 pages look like before the chrome switch

Captured 2026-08-14 against the WP Engine install `empv2`, before any Elementor
Theme Builder work touches the site's header or footer (Task 3 onward). This
document exists to separate two causes that would otherwise be impossible to
tell apart once the switch happens: Phase 1's already-shipped, unconditional
enqueue of `tokens/*.css`, `components/components.css`, `css/site.css`,
`js/nav.js` and `js/reveal.js` on all 45 Beaver pages, versus whatever Phase
2A's header/footer switch does next.

## The five pages, and how the shape was established

The full page list was pulled with `wp post list --post_type=page
--post_status=publish --fields=ID,post_name,post_title --format=csv` (54
published pages). Shape was not assumed from the slug or title alone: each
candidate was rendered with `screenshots()` and read with the Read tool before
being accepted, so the shape claim below reflects what the page actually
contains, not what its name suggests.

| Slug | Shape | Confirmed by |
|---|---|---|
| `save-our-esa-petition` | Campaign / petition page | Rendered page: "Sign the Petition" CTA repeated five times down the page, a "TAKE ACTION" petition sign-up form at the foot (name, email, zip, eligibility radios, "Sign this Petition" submit) |
| `thank-you-saveouresa` | Thank-you page | Rendered page: hero reads "TAKE THE NEXT STEP. SHARE YOUR STORY." with a single "NEXT STEP" button, i.e. post-conversion messaging that assumes the visitor already acted, not a fresh ask |
| `esa-handbook` | Resource / download page | Rendered page: a single lead-gen form ("Request Handbook") gating a PDF cover image, no other content |
| `2025-tax-calculator` | Calculator | Rendered page: an accordion ("Click on a tax to see the changes...") followed by a "2025-2040 Personal Tax Calculator" section built to hold an interactive widget |
| `updates` | Content index | Rendered page: a tag-filter bar (All / Education / Work / Justice / Community Stories / Press Releases / The Empower Podcast), a 9-per-page card grid, and pagination running to page 41 (empv2) / 42 (live) |

None of the five were the first rows of the CSV list; each was picked to be
the clearest example of its shape after reading the full 54-row list.

`esa-handbook`'s real path is `/education-old/esa-handbook/` on both
`empv2` and live; `/esa-handbook/` redirects there on both. The directory
name in `docs/elementor/beaver-before/` stays the short slug for readability;
the capture itself used the redirect-following URL.

## Live equivalents

All five exist on `empowerms.org` at the same slug (confirmed by `curl -s -o
/dev/null -w "%{http_code}" -L`, all 200, and by effective URL after
redirects). Nothing here had to be substituted or skipped for lack of a live
counterpart.

## What Step 4's eye comparison actually showed

**A larger, unrelated difference dominates the view and has to be named
first so it isn't mistaken for a Phase 1 or Phase 2A effect.** Every one of
the five `empv2` captures shows a generic placeholder theme's header and
footer: a top utility bar reading "Learn as if you will live forever, live
like you will die tomorrow.", a logo reading "UiCore", a "Get a Quote" button,
a fabricated phone number and Florida address, and a footer reading "©
UiCore 2026. All Rights Reserved." Live shows Empower Mississippi's real
header (logo, OUR STORY / ISSUES / THE LATEST / PROJECTS / JOIN US / DONATE
nav) and real footer (address, phone, social links). This is consistent
across all five sampled shapes, so it reads as the install's current
site-wide state, not a per-page issue. It has nothing to do with the CSS
enqueue Phase 1 shipped; it is the site sitting on the placeholder theme's
own default header/footer while it waits for Phase 2A Tasks 3 to 5 to build
the real Elementor Theme Builder parts. It is flagged here so that once those
tasks land, nobody reads "the header changed" as evidence of what this task
was built to check: the CSS restyling below.

**Within the actual Beaver Builder page content, no visible restyling was
found, and this was checked past the point of eyeballing.** A same-page
computed-style comparison (`computedStyles()`, both environments, the
`save-our-esa-petition` page) was run against `.fl-rich-text p`, the class
Beaver Builder gives its own text modules and which is present verbatim on
both installs:

| Property | empv2 | live |
|---|---|---|
| `font-size` | 24px | 24px |
| `font-weight` | 400 | 400 |
| `line-height` | 32.4px | 32.4px |
| `color` | rgb(255,255,255) | rgb(255,255,255) |
| `font-family` | "Source Sans 3", Whitney, "Helvetica Neue", Helvetica, Arial, sans-serif | "Whitney SSm A", "Whitney SSm B", sans-serif |

Size, weight, line-height and color are identical. Only the declared
font-family string differs, and even that does not reach Figtree: Beaver
Builder's own module-scoped styling is winning the cascade over
`css/site.css`'s bare `p{}` rule for this element, so real body copy is not
visibly or numerically different between the two.

**The bare `h1`/`p` rules from `css/site.css` do reach elements that Beaver
Builder does not style, and this is a real, confirmed effect, not a
false alarm.** Probing the plain `h1` selector (no Beaver scoping) on
`empv2` returns:

```
h1 font-family: Figtree, Gotham, "Avenir Next", Helvetica, Arial, sans-serif
h1 font-size: 48px
h1 font-weight: 700
```

`tokens/typography.css:2` defines `--font-display` as exactly that stack,
and `tokens/fonts.css` ships a real `@font-face` for Figtree at weight 700,
so this is genuine Figtree rendering, not a fallback. The element it lands
on is the placeholder theme's own page-title band (`<h1 class="uicore-title
uicore-animate h1 uicore-typo-h1">`), not anything Beaver Builder generates,
because live has no comparable bare `<h1>` at all (the same probe against
live returns null: zero elements match the selector). So this specific delta
cannot be read as "Phase 1 changed a heading that used to look like X and
now looks like Y" against live, only asserted directly: the unconditional
enqueue does restyle plain `h1` and `p` elements wherever the surrounding
theme leaves them unscoped, exactly as predicted, and the placeholder
header's own title text is the visible proof of it. The same mechanism
explains the 12px, 12px-line-height paragraph the naive `p` probe first
turned up: it is the top utility bar's tagline ("Learn as if you will live
forever...") picking up `css/site.css`'s bare `p{}` rule too, confirmed by
`tokens/typography.css:3`'s `--font-body` (Source Sans 3, Whitney,
"Helvetica Neue"...) matching the computed value exactly. Neither of these
elements belongs to Beaver Builder's own page content, so this is a
placeholder-theme-chrome effect, not a body-copy effect.

**Per page, at 1440, comparing content area only (excluding the header/footer
chrome difference above):**

- `save-our-esa-petition`: hero, two-column intro, timeline, stats band,
  county map, quote band and the "TAKE ACTION" form all match live in
  layout, spacing, section order and colour (orange #E65A28-ish accents,
  dark teal bands). No visible difference in body copy size, weight or
  spacing.
- `thank-you-saveouresa`: "SHARE YOUR STORY" section, "FREE RESOURCES" with
  two resource cards, and an empty "MORE ESA RESOURCES" placeholder row all
  match live structurally and typographically. No visible difference.
- `esa-handbook`: form layout, field order, radio options and button text
  match live exactly. No visible difference.
- `2025-tax-calculator`: the accordion and the calculator's intro heading
  and note match live. The interactive calculator widget itself renders
  blank (just the page's watermark background) on **both** `empv2` and
  live, so no comparison of the widget's own typography is possible from
  either capture. See "capture limitations" below; this is not attributed
  to Phase 1.
- `updates`: filter bar, card grid layout, headline/byline/excerpt
  typography and pagination controls match live. One real, specific
  difference: every card on `empv2` is missing its featured-image area
  entirely (text starts flush at the top of the card); live shows either a
  photo or a solid teal placeholder block above the text for the same
  cards. This looks like a media-library sync gap in the staging clone
  rather than anything CSS-related, since a broken `<img>` reference
  would normally leave a broken-image icon or reserved blank space, not
  remove the image container outright. Recorded here because it affects
  visual parity between the two environments and someone will notice it
  later if it isn't written down now.

**"No visible difference" is itself the headline finding for the content
area on all five pages.** Nobody had looked at this before; now it is
recorded, with computed-style evidence, that Beaver Builder's own styling
is currently winning over `css/site.css`'s bare selectors for real page
content, and only unscoped elements belonging to the placeholder theme
itself are affected.

## Capture limitations found while doing this (harness, not content)

- **`settleReveal`'s warning fired on every single capture, on both
  `empv2` and live**, e.g. `settleReveal: not every [data-reveal] element
  reached is-revealed within 10000ms`. This is not a per-page finding.
  `js/reveal.js:10` sets `data-reveal="on"` on `document.documentElement`
  itself (the gate for the whole page), but `settleReveal`'s wait condition
  in `fidelity-browser.mjs:208` queries `document.querySelectorAll('[data-reveal]')`,
  not scoped to `document.body` the way `js/reveal.js` scopes its own query.
  The `<html>` element therefore always matches the selector and never
  gains `.is-revealed` (only `js/reveal.js`'s own `document.body`-scoped
  collection ever gets that class), so the `every()` check is structurally
  unsatisfiable on any page where `js/reveal.js` runs at all. The function
  still falls through to its timeout-and-capture-anyway path by design (see
  its own comment about Finding 5.9), and every capture in this before-set
  was inspected by eye and confirmed fully rendered, not a grey ghost, so
  the captures themselves are trustworthy. Flagging the warning's cause
  here rather than leaving it looking like 45 pages' worth of per-page
  reveal failures.
- **`2025-tax-calculator` timed out on first capture attempt**
  (`page.goto: Timeout 30000ms exceeded` waiting for `load`) and had to be
  retried; the retry succeeded. Only this one page did this, out of the
  five, and only on `empv2`; the equivalent live capture completed without
  a retry. Worth a note for whoever automates Task 3 onward: this page may
  need a longer navigation timeout or a `waitUntil: 'domcontentloaded'`
  fallback if it recurs at scale across all 45 pages.
- The calculator widget blank-render (above) is suspected to be a
  slow-loading third-party embed that never finishes within the capture
  window on either environment, not a defect in `settleReveal` itself
  (the surrounding static content around it rendered correctly on both
  sides).

## What the brief got wrong

Step 2's verified command (`wp post list ... --format=csv`) worked exactly as
written; no correction needed there. The brief's Step 4 instructions to
compare "by eye" undersold what was actually needed: eyeballing two pages
that share almost no header/footer markup made it easy to mistake the
placeholder-theme difference for a content-restyling difference, and it
could not distinguish "Beaver's own style is winning" from "the two fonts
just look similar." The computed-style probes above (using
`computedStyles()`, already built into `fidelity-browser.mjs` for exactly
this kind of question per its own Check 5 comment) were necessary to turn
"looks about the same" into a checkable claim, and are recommended reading
for whoever does the equivalent comparison after Task 3 onward, since the
same "which selector are you actually looking at" trap will recur once the
real header/footer replace the placeholder ones.

## Files

- `docs/elementor/beaver-before/<slug>/{390,768,1024,1440}.png`, one
  directory per page above, all four widths captured for all five pages.
- Live-site comparison captures were written to a scratch directory outside
  the repository and are not committed, per the task's own instruction.
