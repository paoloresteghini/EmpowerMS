# Header search: a working overlay, and a search results page we own

**Date:** 2026-08-20
**Branch:** `elementor-phase-2b-class-in-markup`
**Status:** design, approved in conversation, not yet planned

## The request

Make the search icon in the header work.

## What is actually there today

Four measurements, all taken before any design was proposed, three of them
against the running install rather than the repository.

**The button is decoration.** `src/_shared/header-2.html:80` is a
`<button type="button">` wrapping an SVG. It has an `aria-label`, no
`aria-expanded`, no `aria-controls`, no form anywhere near it and no
JavaScript listening for it. It is styled twice, at `css/site.css:85` for
the static build and at `wp/empowerms-child/css/bridge.css:1570` for the
Elementor one, and neither stylesheet is the problem. Nothing is wired.

**The search backend already works.** `GET /?s=education` on
`empv2.wpenginepowered.com` returns 200 with twelve results. Nothing needs
building server-side, and this is the fact that makes the task smaller than
it looks: search is not broken, it is unreachable.

**The results page belongs to Beaver Builder.** That page's `<main>` is a
Beaver Themer archive layout, post 11325 "Search Results", rendering
`fl-post-feed` cards from a `post-grid` module with a `wpbb` custom layout.
Our header and footer render around it, so the page looks half-ours, but
`wp/empowerms-child/search.php` never runs. Beaver Themer wins the template.

**Beaver Themer owns seven layouts, not one.** Pre-footer (11365), Person
Singular (11338), Search Results (11325), Post Author Archive (11322), Posts
Category Archive (11276), Post Singular (11272), Posts Archive (11248).
Retiring Beaver is a programme of seven. This design takes one of them and
leaves the other six standing, untouched and working.

## What is already in place for us

Two pieces of infrastructure exist and have never been used, both written in
anticipation of exactly this.

`wp/empowerms-child/search.php:12` already calls
`empower_do_elementor_location( 'archive' )`. `functions.php:82` already
calls `$manager->register_all_core_location()`. So an Elementor archive
template will render the moment Beaver stops claiming search. No new PHP
plumbing is required; the hook is waiting.

Elementor Pro 4.2.1 ships `conditions/search.php` and the
`archive-posts.php` widget. Both are the instruments this design needs and
both are present on the install.

## Decisions taken

**The results page is ours, built in Elementor, without a static HTML
stage.** Every page so far was authored as static HTML, signed off, then
converted. This one is not: Beaver Builder is being retired, the page needs
to exist, and no static reading of it will ever be commissioned. Building it
Elementor-first is a deliberate departure from the pipeline, taken on
Paolo's say-so on 2026-08-20, and it is the first page in the build to skip
the static stage.

**SearchWP Live Ajax Search is opted out of.** `searchwp-live-ajax-search`
is active on the install and enabled (`searchwp_live_search_settings` reads
`enable-live-search: true`, pane bottom, auto-width). Left alone it binds
itself to any `input[name="s"]` and injects a typeahead pane with its own
markup and its own stylesheet. That is a free feature and it was declined:
this design is reducing the number of things that render our pages, not
adding one, and the header is the most-seen component on the site. Our input
carries `data-swplive="false"`, which is the plugin's own opt-out attribute,
confirmed present in its shipped JavaScript rather than assumed from its
documentation.

**The static build keeps a dead search icon, and this is recorded.**
`functions.php:479` states that `js/` is part of the protected static build
and may not be edited. `src/_shared/header-2.html` is frozen on the same
grounds. So the overlay lives only in the Elementor build and the child
theme, and the static handoff ships an icon that does nothing. This is the
first deliberate divergence between the two builds, and the whole reason it
is safe is that it is written down: in `header.mjs`'s own comment, in
`todo.md`, and here. An undocumented divergence would be a defect; a recorded
one is a decision.

**New front-end JavaScript lives in a destination-only child theme
directory.** `wp/empowerms-child/theme-js/search.js`, mirroring the way
`wp/empowerms-child/css/bridge.css` is already destination-only. `js/` at
the repository root is synced into the child theme by `wp/sync.mjs` and is
the protected tree; putting an Elementor-only script there would ship it
inside a static handoff it is not part of, and would put it in the arena
where three previous files fought over a top-level `const root`.

## The design

### A. The header overlay

`elementor/theme-parts/header.mjs` gains a fourth child inside the
`.em-header` container, sitting after the container that holds the bar and
before the mobile nav, so the panel can drop full-bleed beneath the bar.

The panel's markup is authored inline in `header.mjs`, not lifted out of the
static partial with `extractBlock()` as the nav and the actions block are.
That difference is the concrete shape of the divergence decided above, and
it is the one place a reader will notice it, so it carries a comment saying
why.

The form is native and submits without JavaScript:

```html
<form role="search" method="get" action="/">
  <label for="site-search-input">Search</label>
  <input type="search" id="site-search-input" name="s" data-swplive="false">
  <button type="submit">Search</button>
</form>
```

A GET to `/?s=` is what the install already answers correctly. With
JavaScript off the panel is simply visible and usable rather than hidden,
which is what makes the button a genuine progressive enhancement rather than
a JavaScript-only control. This follows the contract `js/dropdown.js` and
`js/nav.js` already state for themselves: the markup ships in its working
state and the script adds the closed-by-default behaviour.

The button stops being decoration and becomes a real control, gaining
`aria-expanded` and `aria-controls`. `wp/empowerms-child/theme-js/search.js`
toggles it, moves focus into the input on open, closes on Escape and on
click outside, and returns focus to the button on close.

Styling is a new numbered block in `bridge.css`. Per
`empowerms-child-combinator-cost`, it uses no child combinator and no
`:last-child`-family selector, because the panel is a widget inside a
container and any selector keyed on sibling position will break.

Two known traps get cleared explicitly rather than hoped past:

- `motion.css`'s reveal selector silently deletes an element's own
  `transition` (see `empowerms-motion-transition-trap`, which has caused
  three "it snaps" bugs, one of them shipped). The panel's open transition is
  checked against the live cascade before it is believed.
- `css/site.css:232` hides `.em-header__search` below 400px. That rule
  exists because the header row overflows at 320px, so it cannot simply be
  deleted; the overlay must be reachable on a phone and the row must still
  fit at 320px. Both are measured, not assumed.

### B. The search results archive template

A new `elementor/theme-parts/search-archive.mjs`, built the same way as
`header.mjs` and `footer.mjs`, plus a Loop Item template for the result card.

Page shape, top to bottom:

1. A band echoing the query and the result count, carrying the search form a
   second time so a visitor can refine in place rather than reopening the
   overlay. Refining a search is the common second action and sending people
   back to the header to do it is the flaw in the page as it stands.
2. The results.
3. Pagination.
4. An empty state that says nothing matched and offers somewhere to go.
   Beaver's current page has none, and "nothing matched" is a routine
   outcome, not an edge case.

The results widget is Elementor Pro's Archive Posts with a custom loop-item
template. Archive Posts is the widget that reads the current query, which is
what an archive template needs; the Loop Grid widget used on `podcast-a` and
`content-a` takes its own query and is the wrong instrument here.

The card is deliberately type-agnostic: title, kind label, date, excerpt.
Search crosses pages, posts, `person` records and podcast episodes in one
result set, unlike `content-a`, whose four cards each know their type. One
card that handles all of them beats four cards and a branch.

Per `empowerms-all-content-pages`, no stock photograph is placed beside a
named person's headline. The simplest way to hold that line on a page whose
result set is not known in advance is for the card to carry no photograph at
all, which also suits a results list.

`elementor/deploy.mjs:128` declares `THEME_PART_LOCATIONS = ['header',
'footer']` and `deployThemePart()` rejects anything else. It gains
`'search-results'`, and the comment above it, which explains that the value
is the Elementor template type rather than a label, is extended rather than
replaced.

CORRECTED 2026-08-20. This paragraph first said the array gains `'archive'`,
which contradicted its own next clause: the value IS the template type, and
`archive` is the render location. `deployElements()` writes the argument
verbatim into `_elementor_template_type`, so passing `archive` would have
built Elementor's generic Archive document while the library term said
`search-results`, and the two would have disagreed with nothing reporting it.
Header and footer hide the distinction because their type and location are
the same string; search results is the first part in this build where they
are not. The condition and the render location are unaffected.

The Theme Builder condition is read from Elementor Pro's own registry on the
install, never guessed. Conditions resolve at render time from a cached
option and not from postmeta, which `setConditions()`'s own comment records
as having cost an hour once already.

### C. The handover from Beaver, reversible

`_fl_theme_builder_locations` on post 11325 is the meta that claims search.
It is read first, and its current value recorded verbatim, before anything
is written.

The mechanism then depends on what that value says, and the branch is stated
here so it is not decided under pressure later:

- If 11325 claims search and nothing else, its `post_status` goes to
  `draft`. This is the smallest, most legible, most obviously reversible
  change, and it is the discipline used when Empower's donate and team pages
  were moved aside during the slug rename.
- If it claims search alongside other locations, `post_status` is left alone
  and the search entry is removed from `_fl_theme_builder_locations`
  instead, because drafting the post would silently take down layouts this
  design never intended to touch.

Either way the recorded before-value is the command that puts it back.

The other six Beaver layouts are not touched. Nothing about this design
depends on them, and nothing in it brings their retirement any closer than it
already is.

## Verification

Static gates, run before anything reaches the install:

- `test-elementor.mjs`'s `discoverTrees()` walk (line 1807) counts
  tree-shaped exports in `elementor/theme-parts/` and fails when the
  hard-coded list drifts from what exists. Adding `search-archive.mjs` trips
  it. It is honoured by adding the new tree to the walk, not by adding the
  file to the skip list, because that test exists precisely to catch a
  hand-written list that reports more coverage than it has.
- `bridge.css`'s citation validator must pass: the new block's line
  references have to be real. A previous commit broke all six of the file's
  self-citations by inserting sixteen lines above them.
- The full suite: `test.mjs` and `test-elementor.mjs`, both green.

Live checks, after deploy:

- `/?s=education` returns 200, our template, twelve results.
- A term that matches nothing returns the empty state, not a 404. This check
  is not optional: `empowerms-reserved-query-vars` records that `?s=` on this
  install returns a 200-shaped 404 in some shapes, and that the failure looks
  exactly like a clean result. It was walked into twice in one session.
- The overlay opens, takes focus, closes on Escape, returns focus, and
  submits, at desktop and at 320px.
- The form still submits with JavaScript disabled.

## What this design does not do

- It does not retire the other six Beaver Themer layouts.
- It does not add search to the mobile navigation drawer as a separate
  entry. The overlay is full-width and serves both.
- It does not style or design a `person` or podcast-specific result card.
- It does not touch `src/`, `js/`, `css/` or any other part of the frozen
  static build.
- It does not enable SearchWP's typeahead, and it does not remove either
  SearchWP plugin from the install.
