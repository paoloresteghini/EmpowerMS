# The `podcast-a` spike: report and go decision

**Date:** 2026-08-13
**Scope:** Phase 1 of the Elementor conversion (Tasks 1 to 8). One page,
`podcast-a`, converted end to end on the WP Engine install `empv2`, to answer
the five questions Phase 2 is planned from.
**Audience:** whoever plans Phase 2 (the other fourteen pages). This document
does not repeat the plan; it reports what actually happened when the plan met
a real install, including what the plan got wrong.

**Decision: go.** The native-first architecture works, the page is genuinely
editable, and every trap this spike hit has a named fix or a named cost. None
of them argue for a different architecture. Phase 2 should proceed with the
five findings below priced into its estimate, not discovered again one page
at a time.

---

## 1. Where CSS classes land, and the bridge stylesheet

**Container classes land on the container element itself. Widget classes
land on a wrapper `<div>`, not on the semantic element.** Confirmed directly
from a captured render (`docs/elementor/schema-4.2.2.md`): a heading widget's
class sits on the wrapping `<div>`; the `<h2>` inside carries only
Elementor's own classes. A `container` with `html_tag: section` produces a
real `<section>` carrying the class as expected.

So the bridge stylesheet the spec made conditional on this answer **is
needed**. Two distinct problems, not one:

1. Selectors that assume the class sits on the semantic element: typography
   still works by inheritance (the wrapper is the parent of the real tag),
   but `margin`, `display`, grid/flex participation, `::before`/`::after`,
   and any selector that combines a class with a tag or a combinator, do
   not.
2. Boxed containers insert `div.e-con-inner` between the container and its
   real children, so a `.foo > *` child-combinator selector matches the
   inner div, never the real children. Full-width containers (`content_width:
   'full'`) do not insert it. Every mapping module in this spike used
   `content_width: 'full'` throughout, for exactly this reason.

### The measurement

The brief asked for a measured number, not an estimate, with the method
shown so it can be re-run. Method:

For each of the 50 files in `css/`, strip comments, extract every rule's
selector text (the part before its `{`, excluding `@`-rule preludes), split
on top-level commas, and test each individual selector against four regex
shapes that the finding above makes structurally risky:

```python
import re, glob

# (a) an element type immediately followed by .class, e.g. h2.foo, ul.foo
tag_class_re = re.compile(
    r'\b(?:a|abbr|address|article|aside|b|blockquote|body|button|caption|'
    r'cite|code|dd|del|details|dfn|div|dl|dt|em|fieldset|figcaption|figure|'
    r'footer|form|h[1-6]|header|hr|html|i|iframe|img|input|label|legend|li|'
    r'main|mark|nav|ol|p|picture|pre|q|section|select|small|span|strong|sub|'
    r'summary|sup|table|tbody|td|textarea|tfoot|th|thead|time|tr|ul|video)'
    r'\.[a-zA-Z_][\w-]*'
)
# (b) .class immediately followed by a child combinator: .foo >
class_child_re = re.compile(r'\.[a-zA-Z_][\w-]*\s*>')
# (c) .class immediately followed by an adjacent-sibling combinator: .foo +
class_sibling_re = re.compile(r'\.[a-zA-Z_][\w-]*\s*\+')
# (d) .class immediately followed by ::before / ::after (or legacy :before/:after)
class_pseudo_re = re.compile(r'\.[a-zA-Z_][\w-]*::?(before|after)\b')

def strip_comments(css):
    return re.sub(r'/\*.*?\*/', '', css, flags=re.S)

def extract_selectors(css):
    css = strip_comments(css)
    out = []
    for m in re.finditer(r'([^{}]*)\{', css):
        text = m.group(1).strip()
        if text and not text.startswith('@'):
            out.append(text)
    return out

for f in sorted(glob.glob('css/*.css')):
    css = open(f, encoding='utf-8').read()
    hit = False
    for group in extract_selectors(css):
        for sel in group.split(','):
            sel = sel.strip()
            if not sel:
                continue
            if (tag_class_re.search(sel) or class_child_re.search(sel)
                    or class_sibling_re.search(sel) or class_pseudo_re.search(sel)):
                hit = True
    if hit:
        print(f)
```

(The full script also totals matches per shape and per file; the count
below is what it produces. Re-run it to reproduce these numbers exactly.)

**Whole `css/` directory (50 files, everything the build has ever produced,
including the 30 files that belong to archived readings, the chooser tool,
and pages still `open` with Empower):**

| Shape | Total matches | Files affected |
| --- | --- | --- |
| `tag.class` (element + class combined) | 13 | 3 |
| `.class >` (child combinator off a class) | 67 | 14 |
| `.class +` (adjacent-sibling combinator) | 6 | 5 |
| `.class::before` / `::after` | 116 | 29 |
| **Any of the four** | **202** | **33 of 50** |

**Restricted to the 20 stylesheets the 15 in-scope pages actually load**
(traced by grepping every `dist/<page>.html` for its `<link rel="stylesheet">`
tags; `education`, `work` and `safety` all load the shared `css/solution.css`,
and `final` alone pulls in four extra files, `current-2.css`, `homepage.css`,
`option-a.css`, `option-d.css`, left over from its per-section combination
build):

| In-scope stylesheet | At-risk shapes found |
| --- | --- |
| `current-2.css`, `epic-a.css`, `homepage.css`, `option-a.css`, `option-d.css`, `podcast-a.css`, `site.css`, `solutions-b.css`, `team-a.css`, `team-bio.css`, `what-we-do-a.css`, `who-we-are-a.css` | at least one match |
| `amb-a.css`, `capitol-a.css`, `final.css`, `give-c.css`, `header-2.css`, `mail-a.css`, `motion.css`, `solution.css` | none |

**12 of the 20 in-scope stylesheets carry at least one at-risk selector
shape. This is the number that sizes Phase 2's bridge-stylesheet work**: not
33 of 50 (most of that 33 belongs to pages that are archived, still open
with Empower, or the internal chooser tool, and none of it ships), but 12 of
20, concentrated in `team-a.css` (15 matches, mostly `tag.class` and
`::after`, from the roster's placeholder-tile styling) and `option-a.css` /
`option-d.css` (child combinators, from `final`'s process-step and timeline
blocks).

What this count does **not** capture: a selector can be structurally safe in
shape (a bare `.foo { margin: ... }`, say) and still be wrong once `.foo`
sits on a widget's wrapper div rather than the widget itself, because moving
the class does not change the selector's text at all. `podcast-a`'s own
spike found exactly this outside of any of the four shapes: `.em-btn` styles
the wrapper correctly by class but the design expected the class on the
`<a>`, so the button renders with Elementor's own default chrome inside a
correctly-styled wrapper. Shape-grepping finds the selectors that are
provably broken by wrapping; it cannot find every selector that is
*differently* broken. The bridge stylesheet's real scope is "every one of
these 12 files, read section by section against a rendered page," not "add
these 202 matches."

---

## 2. Custom Attributes and dynamic tags: both things are true

The spec's stated risk was binary: either Custom Attributes take dynamic
tags, or they don't, and if not, a child-theme filter stamps attributes onto
loop items instead. What actually happened does not fit that shape.

**Custom Attributes do accept dynamic tags, on both containers and
widgets.** Confirmed from the live control definition
(`controls._attributes` carries `dynamic: { categories: ['text'], active:
true }`) and proven by rendering a real loop item with a dynamic
`post-terms` tag bound into `_attributes`: six items rendered, all six
carried the attribute, each with its own post's terms, correctly
differentiated per item, including a two-term case. The mechanism is real.

**The child-theme filter fallback was still needed, for a different reason
than the spec predicted.** `post-terms` is the only dynamic tag capable of
emitting taxonomy data, and it renders each term wrapped in `<span>` even
with its `link` option switched off (`<span>Podcast</span>`, not a bare
value). A CSS attribute selector like `[data-guest~="lawmaker"]` cannot
match markup, so the dynamic-tag route resolves correctly per item and
still produces an unusable value: every card renders, every filter control
moves, nothing errors, and no card ever hides on the right criterion. That
is the exact silent-failure shape the spec was designed to guard against, it
just arrives from a different mechanism than "the field refuses dynamic
input."

So Task 7b built the filter as planned:
`wp/empowerms-child/inc/loop-attributes.php`, hooked on
`elementor/frontend/container/before_render`, stamping `data-guest` from the
post's real `guest_type` term slug (word-boundary scoped to the `pca-ep`
container specifically, so it does not also match `pca-ep__title` or
`pca-ep__tags`). Live count on the deployed page: exactly 9 `data-guest`
attributes, 3 lawmaker / 3 expert / 3 leader, matching the nine termed
posts exactly, no markup in any value.

**`loop-attributes.php` takes only the first guest term** (`$terms[0]->slug`
at line 82), a single-term assumption, not a limitation of the mechanism. Record
this precisely for Phase 2: it is **not** a quick fix, because `data-guest` is
matched exactly (`[data-guest="lawmaker"]` in `css/podcast-a.css`), not with
`~=`. Widening the PHP side to write every term (space-separated, the shape
`~=` expects) does nothing on its own; the CSS would also need to change from
`=` to `~=`, and `css/podcast-a.css` is a protected file (see "The static
build does not change" in this repository's constraints). So a second guest
term is a bridge-stylesheet item, coordinated across both files, not a PHP-only
change. (`docs/elementor/schema-4.2.2.md` currently writes `[data-guest~="lawmaker"]`
where the shipped CSS uses `=`; that is a documentation slip, corrected there,
not evidence the code already supports multiple terms.)

**Building that filter correctly was not the end of the story**, because of
Finding 5.1 below. Record the reason precisely for Phase 2: not "Custom
Attributes will not take dynamic tags" (they will, and reliably), but "the
only dynamic tag able to surface taxonomy terms emits them as HTML, so a
PHP-side filter is still the only route to a value a CSS attribute selector
can match." Any Phase 2 loop item that needs to filter, sort or style on a
taxonomy term hits the same wall and needs the same kind of filter, not a
dynamic tag.

---

## 3. Timing: what one section costs, and what the library section cost

Two numbers, both taken directly from the implementer reports, both real
wall-clock time in one continuous working session rather than an estimate.

- **One plain section (Task 6, `01-hero`): about 30 minutes**, reading the
  brief to the final commit. Most of that time went into three schema
  investigations (reading Elementor's live PHP source to answer three of the
  six named risks) and working out the draft-preview 404 problem, not into
  writing the mapping module itself. A second plain section (Task 7a,
  `02-about`, no button, no image, no id collisions `01-hero` hadn't already
  resolved) took about 35 minutes, nearly all of it verifying a link
  destination against the live install rather than guessing it. Once the
  structural questions (class-key placement, `content_width: 'full'`, the
  `_attributes` `key|value` shape) are settled, as they now are for Phase 2,
  a plain section costs **roughly 30 to 35 minutes**, and most of that time
  is verification, not authoring.

- **The library section (Task 7b, `03-library`): roughly 4 to 5 hours.**
  That is 8 to 10 times a plain section, for one section out of 65 slots.
  The cost was not the filter bar (a verbatim `html()` widget, the sanctioned
  exception) or the SVG icons; it was tracing the Loop Grid's actual query
  settings, the `loop-item` document type, and Elementor's element cache
  through live plugin source, because none of it is documented anywhere the
  earlier tasks had already captured, and then diagnosing why the first
  working-looking deploy still produced wrong data on 65 of 66 cards (see
  Finding 5.1).

**What this means for sizing Phase 2.** The spec's own section count is 43
plain layout slots and 10 Loop Grid slots (across 8 `data-cms="loop"`
markers plus `final`'s two `auto-populated` sections), 51 distinct
compositions in total after accounting for the shared solution template.
At these two rates, the plain sections alone are on the order of 25 hours
of section-conversion work, and the remaining loop sections, even assuming
each is cheaper than `03-library` because the element-cache trap and the
query-settings investigation are now solved once and documented rather than
rediscovered per page, should each be budgeted far closer to the library
number than to the plain number until proven otherwise. Loop items are
where this phase's only genuinely silent, non-obvious failure lived.

---

## 4. Is the page genuinely editable, or effectively opaque?

**Genuinely editable.** This was checked directly in the Elementor editor
(Task 6, Step 9), not inferred from the JSON: the converted page is 16
nodes, zero HTML widgets outside the one sanctioned exception taken (the
filter form), a nested tree of native containers and widgets, each carrying
the build's own classes and editable through Elementor's normal panel
controls. The SVG icons in `03-library` are not a second exception: the spec
(line 52) treats inline SVG as its own row, native containers with SVG
staying as markup, separate from the three named HTML-widget exceptions at
lines 163 to 171, and `03-library.mjs` note 3 records this. No fourth
HTML-widget exception was needed or taken anywhere in the spike. That is the
check that validates the whole native-first decision, and it validates it:
opening the page in the
editor shows Empower's actual structure, not one opaque block of pasted
markup.

The qualification is what is inside the two sanctioned HTML widgets: the
filter form's markup and the SVG icons are not editable as Elementor
controls, by design, exactly as the spec named them as exceptions rather
than accidents.

---

## 5. What broke that this plan did not predict

Generous, as asked, because several of these are the most valuable
information in this document for whoever plans Phase 2.

### 5.1 Elementor's own element cache (the crux finding)

**A Loop Item's top-level element is baked once per page load and reused
for every iteration, unless that element carries its own `__dynamic__`
setting.** Traced through the live Elementor and Elementor Pro source, not
guessed: `Skin_Loop_Base::render_post()` reads a cached render off
`_elementor_element_cache` postmeta on the loop item's TEMPLATE post (one
row, shared by all 66 iterations of the same template), unless the element
defers itself to a per-request `[elementor-element]` shortcode, which only
happens for elements that already carry `__dynamic__`.

The three child widgets in `03-library`'s card (title, date, guest pill) all
carry `__dynamic__` (bound through Elementor's own `post-title` /
`post-date` / `post-terms` tags), so they were always correct per card. The
`pca-ep` container's `data-guest` comes from a PHP hook, not a dynamic tag,
so it has no `__dynamic__` of its own and got baked into the shared cache
from whichever post rendered first: every other card silently reused that
one post's value. Titles and dates varying correctly per card, while
`data-guest` stayed constant, is what made this look like a filter bug
rather than a caching bug, and it is why the PHP hook appeared "never to
fire" under manual testing: it fires exactly once per page load, on the
render that builds the cache.

Fix: `_element_cache: 'yes'` on the container, Elementor's own escape hatch
(`modules/element-cache/module.php`), labelled "Inactive" in the editor's
Advanced tab, meaning cache inactive for that one element. The cost of that
escape hatch: it opts the element out of the per-template cache entirely, so
that container is freshly shortcode-rendered on every iteration rather than
baked once and reused, 66 fresh renders per page load for this page's loop
instead of one. Phase 2 has ten Loop Grid slots and will apply this fix by
rote wherever an attribute comes from PHP rather than a dynamic tag; each one
carries this same per-render cost, not just the correctness fix.

**Why this belongs at the top of Phase 2's risk list:** it produces no
error, no visible symptom beyond a wrong data attribute, and the page
otherwise renders, every filter control moves, and nothing looks broken to
casual inspection. Any Phase 2 loop item that stamps an attribute from PHP
rather than from a dynamic tag, and there is no reason to expect this is the
last one, hits exactly this trap. It should be a named check in every loop
item's own verification step, not something rediscovered by symptom.

### 5.2 Elementor Site Settings cannot be saved on this install at all

An Elementor Pro 4.2.1 bug, not caused by UiCore and not caused by this
project's own write path. The Components package's
`window.elementorCommon.__beforeSave` hook calls `.model.get("elements")`
on the document being saved without guarding that call the way it guards
`.toJSON()` immediately after it; kit (Site Settings) documents have no
`elements` collection, so every kit save throws `Cannot read properties of
undefined (reading 'toJSON')`. Reproduced three ways: a full settings
write, the editor's own Save Changes button (values silently reverted to
UiCore's on reload), and a single `container_width` change through the same
internal command the UI uses. No newer Elementor or Elementor Pro is
available to take (`update: none` on both plugins), and no experiment flag
disables the Components package.

**Consequence for Phase 2:** the two structural Site Settings values this
build needs, container width (Empower's `--container-max`, 1200px, against
UiCore's default 1170) and zero widget spacing (against UiCore's default
20), must live in the bridge stylesheet, not in Elementor's own settings
panel. That was already the natural home for the bridge stylesheet's other
work, so this does not add a new mechanism, but it does mean the bridge
stylesheet is now load-bearing for layout as well as class-shape fixes.

**Consequence for Empower:** nobody, including Empower's own editors, can
save Site Settings on this install until Elementor Pro ships a fix. If
Empower opens Global Colors or Global Fonts and presses save, it will fail
the same way. This needs to be told to Empower explicitly before handover;
it is not a Phase 2 engineering task, it is a fact about the install they
need to know before they touch it.

### 5.3 WP Engine's page cache serves stale pages with HTTP 200

Found at Task 4 (a cascade check that appeared to show none of the child
theme's stylesheets loading, until `wp page-cache flush` and a confirmed
`x-cache: MISS` revealed the real order), and it recurs everywhere a check
in this project fetches a URL: the harness's own `fetchConverted()`
(Task 5) throws by design rather than trusting a `200`, because a stale page
returns `200` indistinguishably from a fresh one, and the cache re-warms
within seconds of a flush (observed directly: a flush-then-fetch that
succeeded was followed, with no further action, by the very next request
coming back `HIT: 1`). Any Phase 2 verification step, including one written
outside `fidelity.mjs`, that fetches a URL without checking `x-cache` on
that specific response grades whatever the cache happened to be serving,
which can be a page from before the change under test.

### 5.4 The draft-fetch problem

Step 8 of the Task 6 brief, "fetch the draft's preview URL," does not work:
WordPress 404s a draft's front-end URL for an unauthenticated request, and
this install has no logged-in preview route reachable from a plain HTTP
client. Every page in this build sits as a draft while under conversion, so
this is not page-specific, it recurs for every page Phase 2 builds.

Task 6 worked around it with Elementor's own server-side renderer
(`get_builder_content_for_display()` via `wp eval-file`), which proves the
JSON produces the right markup but proves nothing about the cascade, the
page cache, or computed styles, the exact places every other trap in this
project has lived. Task 7's Playwright harness needs a real URL, so Task 6
raised the question rather than deciding it, and the controller's ruling
(with Paolo's direct approval) was to **publish the spike page**: the
clone's `robots.txt` disallows the whole install, the page is linked from
nothing, and unpublishing is one command. Phase 2 needs a deliberate
decision here, made once, rather than reinvented per page: either publish
pages during conversion under the same robots.txt cover, or build an
authenticated Playwright session that can reach a draft, before the first
Phase 2 page is built, not after.

### 5.5 UiCore's own stylesheet outranked the child theme's, silently

The child theme's stylesheets loaded in correct internal order, but
UiCore's own global stylesheet loaded after `empower-site-css`, meaning
every one of this build's WCAG accessibility overrides was silently beaten
in the cascade. Found only because a check was built for it (Task 4's
cascade check), and the first read of that check was itself a false
negative from the page cache (5.3) until the flush-and-MISS discipline was
applied. Fixed with a raised enqueue priority (60, past UiCore's real
enqueue call at 50, both read from UiCore's own source rather than guessed)
plus a guarded dependency so a future UiCore rename cannot silently drop the
whole `css/site.css` chain. **Ordering is fixed; specificity is not fully
verified.** Loading later only wins at equal specificity, and the
computed-style probe in Task 7b confirmed only four spot values match, not
an exhaustive sweep of UiCore's rules. Phase 2 should treat this as
"probably safe, spot-checked, not proven" rather than closed.

### 5.6 `image()`'s `alt` parameter looked functional and silently discarded its input

Elementor's image widget has no alt-text control at all
(`elementor.widgetsCache.image.controls` filtered for `/alt/i` returns
nothing of its own); alt text is read from the attachment's own
`_wp_attachment_image_alt` in the WordPress media library, never from
anything in `_elementor_data`. `image({ alt })` was caught before it shipped
(Task 3's review), and the parameter was removed rather than fixed, because
there is nothing for it to do.

**This is new, unscoped editorial work, not a code task.** Measured
directly against the 15 in-scope static pages: **64 `<img>` elements in
total**, of which 30 are the Empower logo (2 per page, already
correctly alt-texted "Empower Mississippi" and not part of this problem)
and 34 are content photography, drawn from **12 distinct files**, the same
12 the go-live gate already tracks as licensed-photography stand-ins. Every
one of those 12 attachments (plus whatever host photography and ambassador
photos eventually replace the pages' `data-placeholder="photo"` markers)
needs its alt text set by hand on the WordPress attachment once uploaded,
using the static build's own `alt="..."` strings as the source copy, since
that copy already exists and is good. This sits on the go-live gate
alongside the licensed-photography item itself, not folded into it, because
it is editorial effort nobody has costed, separate from the licensing
question.

### 5.7 The converted page currently wears UiCore's chrome, not Empower's

Confirmed by the screenshot comparison at `docs/elementor/spike/1440.png`
against `docs/elementor/spike/static-reference/1440.png`: UiCore's logo, a
"Get a Quote" button, a "Home > Spike Podcast" breadcrumb, and a "©
UiCore 2026" footer, where the static build has Empower's own header and
footer. This is the expected, named consequence of deferring the header and
footer Theme Builder parts to the start of Phase 2 (they are site-wide, so
building them now would touch all 45 Beaver Builder pages), not a defect in
this spike. Stated here plainly, with the screenshot as evidence, because
"expected" and "invisible until someone opens the page" are different
things, and the second one is what this report exists to prevent.

Everything else in that comparison is good news: hero, about and library
content all convert faithfully, and the Loop Grid renders the real
66-episode archive where the static build shows nine placeholders, which is
itself evidence the loop is genuinely live rather than a styled mockup.

### 5.8 Harness defects, caught only because a check existed to catch them

The fidelity harness (`fidelity.mjs`, `fidelity-browser.mjs`) is the thing
that will gate all fourteen remaining pages, so its own defects matter as
much as anything in the build. Three rounds of fixes on `checkCopy` and
`checkSections` alone, all the same shape: **a check reporting success
while looking at nothing real.**

- `checkCopy` originally flattened all markup to plain text before
  searching, so two unrelated block-level elements (`<h1>Real</h1>
  <p>Solutions</p>`) could satisfy a deck string ("Real Solutions") that was
  never actually on the page as a single phrase. Fixed by segmenting on
  block tags while still joining across inline tags (a heading genuinely
  split by a `<span>` mid-sentence still has to pass).
- The fix that closed that hole reopened the same class of bug through HTML
  comments: the new tag-classification regex required a letter after `<`,
  so `<!--` never matched, and a comment's text content survived as literal
  page text. A deck string sitting only inside a conversion note
  (`<!-- Real Solutions For All is not shipped -->`) read as present.
- The same comment hole existed independently in `checkSections`, because
  the comment strip lived only inside `checkCopy`'s helper. `checkSections`
  is the check that a whole section still exists in the right place, and "a
  section deleted during conversion but left behind commented out" is the
  single most likely way a section silently disappears while the markup
  still mentions its class. This is the more damaging of the two comment
  holes, and it was found by the controller building a reproduction, not by
  a test that happened to catch it.

Also, in the write path rather than the check path: `deployPage` could fail
to write `_elementor_data` and still resolve successfully, because the
assembled remote script had no `set -e`, so bash continued past a failed
write and the script's exit code was whatever its last command (the CSS
flush) returned. A page could silently keep its previous content while the
deploy reported success. Every page in Phase 2 goes through this same write
path.

**The lesson for Phase 2, stated as the brief asked:** every one of these
was found by a check built specifically to catch that failure shape (the
comment holes were found by someone constructing an adversarial input and
running it, not by incidental test coverage), and two were found by a human
opening a file and looking (the two broken static-reference screenshots at
Finding 5.9, and Task 7a's correction that a "missing" staff bio page
already existed as a live `person` record). Static assertions and one
person reading real output both earned their keep repeatedly in this
phase. What did not earn its keep on its own: trusting a fetch's `200`, and
trusting a script's exit code, without checking what specifically produced
it.

### 5.9 The screenshot harness produced two unusable reference images, and the first report explained the wrong cause

Two of four static-reference screenshots (768px, 1440px) rendered blank
below the fold on the first capture pass: hero copy invisible, the about
heading a grey ghost, the whole episode grid empty. The original report
called this "a property of the shared motion system" and treated it as
expected, not a defect. That explanation was wrong and was retracted in the
same report once tested: the real cause was the screenshot function itself
never scrolling the page before capturing, combined with `css/motion.css`'s
transition delay (`--dur-reveal` plus a per-item stagger, up to 4550ms on a
66-card group) not having elapsed by the time the `.is-revealed` class was
checked. Neither `js/reveal.js` nor `css/motion.css` was at fault; the
harness was capturing mid-transition frames and mistaking that for a
property of the page. Fixed with a `settleReveal()` step that scrolls
through the page, waits for every `[data-reveal]` element to carry
`.is-revealed`, then waits out the slowest computed transition before
capturing. Recorded here because "the static reference and the converted
page look the same broken way" is exactly the kind of finding that should
raise suspicion of the tool before it is accepted as a fact about the
pages, and the first draft of this report did not raise that suspicion.

### 5.10 Two live, real usability findings surfaced as side effects of testing

Neither is a code defect in this build; both belong on the go-live gate.

- **A MailMunch popup (a pre-existing, site-wide third-party plugin)
  intercepts pointer events across the whole viewport roughly 6 to 8
  seconds after page load**, established by testing both input methods
  directly rather than assuming: a real, non-forced mouse click on the
  guest-filter checkboxes times out once the popup's backdrop triggers, but
  real Tab-key navigation reaches the same checkbox in 7 presses with no
  focus trap, and Space toggles it correctly (the card count moves 66 to
  60). The popup has a working close control and responds to Escape. Net:
  a real, live, mouse-only, site-wide usability defect from existing
  plugin configuration, not caused by this conversion and not fixable from
  a single page's own markup.
- **The filter bar's checkbox counts ("3") are accurate only by coincidence**,
  hardcoded in the verbatim filter markup because the sanctioned
  HTML-widget exception leaves no route to make them live without moving
  code out of that widget. They will read wrong the moment Empower
  back-fills the guest taxonomy archive beyond the nine posts termed for
  this spike. Parked rather than fixed, and recorded here so it is not
  rediscovered as a live bug on the go-live gate later.

### 5.11 Every brief in this plan contained at least one defect

Not a complaint; a finding about how Phase 2's briefs should be written,
since several of these would have shipped silently if not caught:

- Task 1's brief specified `execFile` with `{ input: script }` for the SSH
  channel. Node's asynchronous `execFile` has no `input` option (only
  `execFileSync`/`spawnSync` do), so the script never reached the remote
  shell's stdin and the call hung indefinitely. Proven directly: the brief's
  exact code, run standalone, hung until killed at 180 seconds.
- Task 4's brief omitted `header-2` from `podcast-a`'s page-style array,
  which would have reproduced this build's own known bug (five permanently
  open navigation panels) the first time the page rendered.
- Task 6's brief's copy-check regex (`{12,}`) silently dropped "Listen Now"
  (10 characters) from the derived deck, and named the Elementor CSS-flush
  subcommand as `flush-css` where the real one is `flush_css`.
- Task 6's brief's Step 8 ("fetch the draft's preview URL") cannot work at
  all, unauthenticated, against any draft (Finding 5.4).
- Task 7a's dispatch stated no staff bio page existed. A live, published
  `person` record for Grant Callen already did; the implementer checked
  instead of trusting the dispatch.
- Task 7b's own draft of `fidelity-browser.mjs` shipped a promise that
  raced `browser.close()`, and used `waitUntil: 'networkidle'`, which hangs
  indefinitely against this install's real third-party traffic. Its Steps 9
  and 10 built two working check functions that were never wired into
  `test-elementor.mjs`, caught only by review.

None of these were hidden; every one is disclosed in its own task report
with the evidence that found it. The pattern is what matters for Phase 2:
**a brief being wrong was the normal case in this phase, not the
exception**, so Phase 2's briefs should be written expecting the
implementer to verify against the real install rather than trust the brief,
and its review process should keep budgeting for that verification rather
than treating "matches the brief" as sufficient.

---

## What Task 6 also confirmed, briefly

Two smaller spike answers, settled on the live page and worth carrying
forward without their own section:

- **Valueless HTML attributes convert correctly**, even though Elementor's
  own attribute renderer always quotes: `data-reveal-entrance|` (empty
  value) in the factory renders as `data-reveal-entrance=""`, and both
  `css/motion.css` and `js/reveal.js` test attribute presence only, never a
  specific value, so this is invisible to the motion layer. No HTML-widget
  exception is needed for it anywhere in the remaining fourteen pages.
- **`aria-labelledby` is correct in outcome, wrong in target.** `_element_id`
  lands on a heading widget's wrapper div, not the `<h1>` itself, so a
  reference built against it points at a div. The accessible-name
  computation walks all descendant text of the referenced element, and the
  wrapper's only content is the heading text, so the computed name is
  still correct. What is lost is that the reference no longer points at a
  real heading element, which matters only to tooling that inspects the
  referenced node's role rather than reading its computed name.

---

## Test suite

Run at the end of this task, from the branch's current head:

- `node --test test.mjs`: **228 passing**, unchanged. `src/`, `css/`,
  `tokens/`, `components/`, `build.mjs` and `test.mjs` were not touched by
  any task in this phase.
- `node --test test-elementor.mjs`, run without `SPIKE_URL`: **50 passing,
  4 failing**, all four failures the browser-driven checks that require a
  live URL (`the podcast guest filter actually filters`,
  `podcast-a is visible without JavaScript, matching a JS-enabled load`,
  `the converted page matches the static build on four computed-style
  probes`, `the podcast library loop grid is scoped to category 133, not
  the whole site`), each failing loudly with `page.goto: url: expected
  string, got undefined` rather than skipping silently. This is the
  expected, correct result of running this file with no live URL
  configured, not a defect: with `SPIKE_URL` set to the deployed page, all
  54 pass (evidenced in Task 7b's report and the controller's own runs
  during the phase).

---

## Spec updated

`docs/superpowers/specs/2026-08-12-elementor-conversion-design.md`: the
class-placement open question, the Custom Attributes risk, and the UiCore
globals risk are marked resolved, struck through in the same style the
document already uses, each pointing at the finding above that settled it.
