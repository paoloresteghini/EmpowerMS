# The per-page conversion recipe, and how image findings are triaged

Written 2026-08-17, before page two. Paolo's instruction, in his words: the
photographs are placeholder and can be added later, so do not spend the phase
chasing pixel parity on pictures that are going to be replaced.

This file is the standing recipe for converting one page. Task 6 of the
class-in-markup plan (`what-we-do-a`) is the first page built to it, and the
real per-page cost measured there is what re-prices the remaining eleven.

## 1. Image findings are triaged, not all fixed

The instruments compare every image on the converted page against the static
build. Most of what they find about images is not worth fixing yet. Two
categories, and the boundary between them is the whole rule.

**DEFER: the image's own box is wrong and nothing else moves.** Wrong size,
wrong crop, wrong border radius, wrong aspect. Record it, do not repair it. The
photograph is placeholder, the final one arrives later, and the repair is the
same shape whenever it is made. Repairing it now spends the budget twice.

**FIX: the image or its wrapper changes the layout of other content.** Then it
is not an image finding at all, it is a structural one that happens to involve
an image, and leaving it means every measurement of that page's real content is
taken against a page that is laid out wrongly. Three instances are already on
record and each cost real height:

- A Loop Grid inserting four wrappers between a container and its items,
  which cost 222px on one card and showed up in NO computed-style comparison
  because every property on both sides agreed.
- `.c2-panel` losing its mobile flex-basis to Elementor's `.e-con.e-flex`, so
  three panels stacked full width instead of forming the horizontal scroll rail
  the design calls for.
- `.em-join__wash` and `.c2-panel__bg` failing to fill their positioned
  ancestors, which changed the ancestor's own height and moved the text under
  it.

**The operational test, so this is decidable rather than a judgement call.**
Take the sweep's difference list. If the only keys that differ are the image's
own, defer it. If anything that is not an image also differs, or the containing
block's measured height differs, fix it. That is checkable from the same
measurement that raised the finding, and it does not require anybody to reason
about intent.

**A THIRD QUESTION, added 2026-08-18 after the test above got a page wrong.**
The two questions the test asks are "does this image move other content" and
"does anything else differ". Both can answer no while the image is still wrong
for a STRUCTURAL reason, and `solutions-b` shipped four deferrals that way
before review caught them. Its containing blocks matched exactly on both sides,
because their height came from `aspect-ratio`, so the test said defer. The real
cause was that `.elementor-widget-image` did not stretch, so the build's own
`height:100%` on the `<img>` resolved against an auto-height wrapper and every
photograph fell back to its intrinsic size. No photograph would have fixed that;
the entries could never have expired.

So before deferring, ask the third question: **is this difference shaped like a
photograph, or shaped like a wrapper?**

- **Shaped like a photograph:** ONE image differs, and it differs in the way its
  own aspect ratio differs from the one the design assumed. Defer it.
- **Shaped like a wrapper:** a SET of images the design sizes identically render
  at DIFFERENT sizes, or an image renders at exactly its intrinsic ratio where
  the design asked for a crop. Fix it. The repair is a named rule giving the
  widget wrapper the height it is failing to take, and the precedent is
  `bridge.css:403-419`, which repaired the same defect on the
  homepage for `.fp-hero__media` and `.fp-hero__aside`, both of which size
  themselves with `aspect-ratio` and ask the image for `height:100%`. Pointer
  corrected 2026-08-18 by Task 9's review: this line used to name
  `bridge.css:472-520` and `.c2-panel__bg`/`.em-join__wash`, which are a
  DIFFERENT defect wearing the same symptom. Those two wrappers are themselves
  the positioned box (`position:absolute;inset:0`), so they already had a
  definite height; their defect was `image()` moving `cssClass` off the `<img>`
  onto the wrapper, and their repair targets the `<img>`. Following them for a
  fixed-ratio container fixes nothing. The two repair techniques for THIS
  category, and when each applies, are set out in
  `docs/elementor/phase2b/2026-08-18-repricing-after-four-pages.md`.

The tell is uniformity. Three photographs that the design crops to the same box,
rendering at three different heights, is never a placeholder problem. Measured
on `solutions-b`: 348, 269 and 266 against a uniform 318 (corrected 2026-08-18,
review round 2, N5: an earlier draft of this line gave 244 and 242 for the
second and third figures, disagreeing with the box sweep's own recorded
output in `fidelity-deferred.mjs` and `bridge.css`; those two are the
authoritative measurement, taken directly from the automated
`controlBoxes()` harness rather than transcribed by hand). After one grouped
rule all four images matched their static counterparts to the pixel.

**Why the sweep cannot answer this for you.** It compares each image's own box
and never asks whether that image's WRAPPER is doing its job, so a wrapper
failure and a placeholder-crop difference are indistinguishable in the
difference list. "Only image keys differ" is NECESSARY but NOT SUFFICIENT.

## 2. Deferring has to be expressed in the test, or the gate stops working

Tasks 3, 4 and 5 each open by requiring both instruments to pass, because a
migration that starts from a failing measurement cannot prove anything. A
deferred difference is a permanent failure, so "defer" cannot mean "leave the
suite red". It has to be recorded where the test can see it.

The mechanism, to be built in Task 6 alongside the first page converted this
way:

- A single deferred list, keyed by page and by the sweep's own element key,
  each entry carrying a one-line reason and the date it was deferred.
- The box sweep subtracts those keys from its difference list, and prints how
  many it subtracted, on green as well as on red. A silent subtraction is how a
  gate stops being a gate.
- **A deferred entry that no longer differs FAILS the test.** This is the half
  that keeps the list honest. Without it the list only ever grows, entries stay
  after the thing they excused is fixed, and eventually it is excusing defects
  nobody has looked at. An exemption that has expired is a defect in the
  exemption list.
- Nothing may be deferred except an image key. A deferred control, link or
  heading is out of scope of Paolo's instruction and needs asking about.

## 3. What is NOT deferred, and why the distinction is not academic

The class-in-markup work itself is unaffected by any of this. `text()` widgets
carry the build's class on the real element; images stay `image()` widgets by
design, because Empower must be able to change photographs through the media
library, and the Image widget owns its own markup.

So an image's SIZING RULE is photo-independent. `.c2-panel__bg` sets
`width:100%;height:100%;object-fit:cover` and the repair that makes that reach
the `<img>` inside Elementor's wrapper works the same whether the photograph is
a placeholder or the final one. Where such a rule is already written, it stays
written. This section is about what to do with NEW findings on pages 2 to 14,
not about unpicking repairs that already measure correct.

## 4. The per-page sequence

1. Record the before state: both instruments green. A page cannot be measured
   against a baseline that is already failing.
2. Build the section modules from `dist/<page>.html`, reading every class, tag,
   string and attribute from the partial rather than from memory. Every
   paragraph and heading is a `text()` carrying the build's own element and
   class. Every photograph is an `image()`.
3. Deploy, then flush BOTH caches. `bridge.css` is versioned by theme version
   and not by mtime, so the CDN serves the old file otherwise.
4. Measure. Triage every image finding by section 1. Fix the structural ones,
   defer the rest into the list from section 2.
5. Write the bridge rules the non-image findings need, one at a time,
   re-measuring after each. Named selectors, never general.
6. Look at the page at 1440 and at 390. The instruments do not see everything.
7. Record how many bridge rules the page needed. That number re-prices what is
   left.

## 5. Findings carried from the homepage that will recur

- A bridge rule overriding an Elementor container property needs
  `.your-class.e-con` at 0,2,0. A bare `.your-class` at 0,1,0 ships inert.
- Restating a build declaration at raised specificity silently disables every
  responsive override of it, because those overrides sit at the original
  specificity and rely on source order. Any restatement brings its media
  queries with it.
- Wrapping an element changes what it IS, not only where it sits. A declared
  inline-level display that was blockified by being a flex item comes back the
  moment the element stops being one, and `margin:auto` computes to 0 for the
  same reason.
- Margins do not collapse in a flex container, and Elementor makes every
  container flex. Anywhere the build relies on two adjacent siblings' margins
  collapsing into one gap, the converted page pays both.
- A widget whose content comes from a dynamic tag has no authored markup, so it
  keeps its `cssClass` on the wrapper and keeps its bridge repair.
- If every property agrees and the page still looks wrong, the defect is in the
  tree, not the values.

## 6. Pricing a page before you build it, added 2026-08-18 after pages 3 and 4

Two pages built the new way, `what-we-do-a` and `solutions-b`, cost ONE bridge
rule each. That is the number to plan with, and it is low because the class now
travels in the markup. What remains is not about classes at all.

**Moving classes into the markup fixes WHICH element carries the class. It does
not fix WHERE that element sits.** Elementor wraps every widget in its own
`.elementor-widget-*` div, so a build selector that depends on an element's
POSITION still breaks. The discriminator, which is decidable from the section
module before anything is deployed:

> A position-dependent selector needs a bridge rule when the widget wrapper
> falls **between the selector's reference point and its target**.

That single sentence covers all three cases, and the first draft of this rule
(committed 2026-08-18, corrected the same day after review) got one of them
wrong by saying "needs a rule whenever its target is built as a widget":

- **Container target: no rule.** A container IS the element; nothing is
  inserted above it.
- **Target inside ONE authored markup string: no rule.** Breakage happens at
  WIDGET BOUNDARIES. Anything authored inside a single `html()` or `text()`
  string reaches the page unaltered, so a structural pseudo-class whose subject
  AND parent both sit inside that one string is completely faithful. The
  header proves it: `css/site.css:104-106` and `:119`, and
  `css/header-2.css:89`, are five structural pseudo-classes targeting content
  built as widgets, and every one needs nothing, because
  `elementor/theme-parts/header.mjs` delivers those subtrees as three `html()`
  blobs. The first draft of this rule predicted five bridge rules there where
  zero are needed.
- **Wrapper between reference point and target: one rule.** This is the real
  failure, and it is what `.da-door__body>p` and `.sb-hero__copy p:last-child`
  both are.

**The two failure modes are not symmetrical, and the difference changes the
repair, not just the count.** Once an element is the only child of its own
wrapper:

- `:last-child`, `:first-child` and `:only-child` become ALWAYS TRUE. That
  over-matches, so the wrong rule wins. It is LOUD (a visible style change) and
  it is repaired by restating the intended declaration at raised specificity.
- `:nth-child(n)` for n above 1 becomes NEVER TRUE. That under-matches, so the
  rule goes inert and nothing wins that should. It is SILENT, and restating at
  raised specificity does not help: the declaration has to be put on the element
  that should have had it.

**Two greps, and neither alone is sufficient.** Run both over the page's own
stylesheet plus any shared sheet it loads, and classify every hit:

1. **Child combinators**, `>`. Found on `what-we-do-a`:
   `.da-door__body>p{margin:0}` matched a `text()` widget, so the real tree was
   `.da-door__body > .elementor-widget-text-editor > p` and the paragraph fell
   back to `tokens/base.css`'s 16px. One rule. The same page's
   `.da-doors>:nth-child(2)` matched a `container()` and needed nothing, which
   is why counting combinators overestimates: four combinator lines, one rule.

2. **Structural pseudo-classes**, `:last-child`, `:first-child`, `:only-child`,
   `:nth-child`. Found on `solutions-b`, which scored ZERO on grep 1 and still
   cost a rule. `.sb-hero__copy p:last-child` (0,2,1) beat
   `.sb-hero__copy .sb-hero__lede` (0,2,0), because each paragraph is the last
   child of its OWN wrapper, so `p:last-child` matches every paragraph rather
   than the last of two real siblings. The hero lede rendered as the muted body
   paragraph, 17px and 76 percent opacity against 24px and white.

The same page proves the container half of the rule in the same file:
`.sb-station:nth-child(2)`, used four times to drive an alternating layout,
targets containers and needed nothing. Confirmed structurally as well as by
measurement: a depth-tracking parse of the live DOM found exactly three direct
`.sb-station` children of `.sb-stations`, with nothing of Elementor's between
them.

**A warning about the class of defect this produces.** Both instruments missed
the `nth-child` risk entirely, and would have missed it if it had gone wrong:
a station laid out on the wrong side has every computed property correct and
every box the right size. Structural defects are checked by reading the tree
and by looking at the page, not by the sweeps. The census caught the
`p:last-child` defect only because it changed colour and size, which is luck
rather than coverage.

**A correction to this section's own first draft, kept because it is
instructive.** It closed by saying podcast-a "scores zero on both greps". That
is false, and podcast-a is in fact the FIRST recorded instance of the grep 2
defect. `css/podcast-a.css:129` is `.pca-about__copy p:last-child{margin-bottom:0}`,
and converted, every paragraph is the only child of its own wrapper, so every
one of them matched and took the zero: measured 0px live against 20px static on
the middle paragraph, and repaired during that page's migration
(`bridge.css:1209-1219`). So the defect has now been hit on two independent
pages, which is the better argument for running grep 2 than the one the first
draft made. What podcast-a scores zero on is grep 1, child combinators, and
that alone is what made its migration look cheap.

**Two repair shapes, and the choice is not arbitrary.** podcast-a's repair moved
the logic up a level, `:not(:last-child)` on the WRAPPERS, because the rule's
real subject was "the last of several siblings" and after conversion the widgets
are the siblings that rule was written about; it keeps working if the section
gains or loses a paragraph. solutions-b's repair restated the one declaration at
raised specificity, because there the losing rule named a specific element
(`.sb-hero__lede`) rather than a position. Prefer the first when the original
selector expresses a relationship among siblings, and the second when a named
element is simply losing a specificity contest it used to win.

## 7. A coverage cost the census cannot report, added 2026-08-18

The static build sometimes wraps a call to action in a paragraph, e.g.
`<p class="cca-hero__action"><a class="em-btn ...">Listen Now</a></p>`. Converted,
that paragraph becomes a CONTAINER holding a `link()`, which is correct and has
precedent, because the `<p>` is a layout wrapper rather than prose.

The cost, which nothing reports: the census keys on each element's own text, so
`p|Listen Now` exists on the static side and no longer exists on the live side.
It drops out of the shared set and STOPS BEING COMPARED. Measured on
`capitol-a`: census shared is 15 of 16, and that is the missing key.

No page has been harmed by it yet, and the CTA's own box is still covered by the
box sweep through `link()`'s wrapper contract. But it narrows census coverage
silently, once per converted CTA, and the per-page `minShared` floor is the only
thing watching. Two things follow:

- Record it in the module comment wherever it happens, as a coverage cost rather
  than a neutral restructure.
- Watch it on any page whose census count is already small. A page with a low
  element count and several wrapped CTAs could drift under its floor for a
  reason that has nothing to do with fidelity.
