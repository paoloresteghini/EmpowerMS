# The homepage conversion, and what it says about the other thirteen

Written 2026-08-15, overnight, after converting `dist/final.html` end to end as
the first page of Phase 2B. This is the evaluation Paolo asked for: what the
conversion cost, how close it got, and what it revealed.

**Look at it here: <https://empv2.wpenginepowered.com/final/>**

Screenshots at 390 / 768 / 1024 / 1440 are in
`docs/elementor/phase2b/final-converted/`, and the static build captured the
same way for comparison is in `docs/elementor/phase2b/final-static/`.

It is a **new page (20588)**, not the install's front page (11). The existing
homepage is untouched. Going live, if you want it, is one command:
`wp option update page_on_front 20588`.

## 1. Where it got to

**31 of 32 computed-style probes match the static build**, up from 15 of 19 on
the first deploy. The one that does not is a probe comparing a wrapper element
that only exists on the converted side, so it is my measurement being
meaningless rather than a defect.

Structure held where structure matters:

| | |
| --- | --- |
| Solutions model | A real `<ol>` with five real `<li>` |
| Featured quote | A real `<blockquote>` |
| Newsletter | A real `<form>` with its label, `type="email"`, `autocomplete` and `required` intact |
| Headings | One `<h1>` on the page |
| Community stories | A real Loop Grid, two posts, scoped to category 9 |

Three of those were forced rather than chosen: Elementor's container offers
`div`, `header`, `footer`, `main`, `article`, `section`, `aside`, `nav` and `a`,
and none of `ol`, `li`, `blockquote` or `form`. Where Elementor cannot express
the markup, the section uses an HTML widget and says so in its own comment.

## 2. What it cost

Six section modules, a media map, a page manifest, one Loop Item template, nine
photographs imported with the alt text the build already carried, and **ten new
rules in `bridge.css`**. Ten tests. Roughly a full working session for one page,
most of it measurement rather than typing.

That number will fall for pages 2 and 3, because a good half of tonight was
spent finding things that are now known and written down. It will not fall as
far as it looks, for the reason in section 4.

## 3. What is still different, and why I stopped

**The page is about a thousand pixels taller than the static build.** Diagnosed,
not guessed: paragraph line-height computes 30px live against 24px static, with
font-size identical. `tokens/base.css` sets line-height on `body` and lets
paragraphs inherit; UiCore sets it on `p` directly, so the inherited value never
arrives and every paragraph on the page runs 25% looser.

**I wrote the fix, deployed it, measured it, and reverted it.** A blanket
`.elementor p{line-height:var(--lh-body);margin:0 0 var(--space-4)}` is
specificity 0,1,1. It duly beat UiCore, and it also beat the build's own
per-block paragraph rules, which sit at the same 0,1,1 and load earlier:
`.tl-node p{margin:0;line-height:1.65}`, `.c2-panel__more p{...}`, `.fp-way p`,
and dozens more across ten stylesheets. Measured after deploying: the solutions
model section went from 1230px to 1288px, further from the static build's
1164px, not closer.

There is no selector that fixes it. Anything specific enough to beat UiCore is
specific enough to beat the build's own rules, because they are the same
specificity and this file loads last. `:where()` drops to 0,0,1 and loses to
UiCore instead.

**The two mini story cards have no pull-quote.** The Loop Grid renders the
featured image and the title, and the excerpt is empty, because these Community
Stories posts have no excerpt written. That is content, not code, and I have not
invented one.

## 4. The UiCore question, costed

You said you think removing UiCore is the way to go. Having spent a night inside
it, **I agree with the direction, and it is a project rather than a delete.**

### The case for, which is stronger than it was this morning

Of the ten bridge rules this page needed, **six exist only to fight UiCore**,
and none of them are about Elementor at all:

- form controls take UiCore's Inter at 16px/30px instead of the build's font
- native `<button>` elements take UiCore's green instead of the build's chrome
- the Join Us heading took UiCore's near-black at 48px instead of white at 36px
- the podcast hero heading took UiCore's 72px instead of the build's 56px
- paragraph line-height, which cannot be repaired at all (section 3)
- the page-title banner, which had been shipping a duplicate `<h1>` on every
  converted page since Phase 1 and which nothing had noticed

And the sharpest evidence arrived by accident. **You saved UiCore's settings this
evening, and it silently restyled a page I was not touching.** UiCore generates
`uicore-global.css` whenever its settings are saved; the new copy sizes
Elementor's heading widget at specificity 0,2,1, which outranks the build. A
page that was correct at 8pm was wrong at 10pm with nothing in this repository
changing and no deploy running. An existing test caught it, which is the only
reason I know the timing.

That is the real argument. It is not that UiCore is opinionated, it is that its
opinions are applied at a specificity the build cannot cooperate with, and they
can change from the admin without anything reporting it.

### The case for care

`empowerms-child` has **no templates of its own**. Its directory is
`functions.php`, `style.css`, `inc/`, and the synced asset directories. Every
template it renders through, page, single, archive, search, 404, comes from
`uicore-pro`, which `style.css` names as its parent. Removing UiCore today
leaves the install with no templates at all.

Behind that:

| | |
| --- | --- |
| Published pages | 54 |
| Published posts | 490 |
| Beaver-built pages and posts | 174 |
| Active UiCore plugins | `uicore-framework` 6.4.1, `uicore-elements` 1.3.16, `uicore-animate` 2.2.4 |

Phase 2B converts fourteen pages. The other 40 pages and 490 posts render
through UiCore today, and Beaver Builder needs a theme underneath it too.

### What I would actually do

**Make `empowerms-child` a standalone theme, before converting pages 2 to 14.**
Not "remove UiCore" as a first step: drop the parent, give the child the handful
of templates it needs, and let UiCore's plugins be deactivated once nothing
renders through them.

The work is smaller than it sounds, because the conversion has already taken
most of it away. Elementor Theme Builder supplies the header and footer
site-wide. Elementor supplies the content of every converted page. What is
missing is a thin set of templates: `index.php`, `page.php`, `single.php`,
`archive.php`, `search.php`, `404.php`, each of which is a header call, a loop
and a footer call.

The reason to do it **before** the remaining thirteen pages, not after: every
UiCore fight I had tonight is per-page, and I would have it thirteen more times
and then throw all of it away. The paragraph line-height alone is currently
unfixable and would leave all fourteen pages measurably taller than the design.
With UiCore gone, the build's own `body` line-height simply inherits and the
difference disappears with no bridge rule at all.

The risk to check before committing to it: what those 174 Beaver-built pages
depend on. They are the reason this is a project and not an afternoon, and I
have not surveyed them yet.

## 5. What I would do next, in order

1. **Look at `/final/` and tell me whether the design survived.** Everything
   below is wasted if the answer is no.
2. **Decide the UiCore question.** If it is yes, I survey the 174 Beaver pages
   and write the standalone-theme plan before touching another conversion.
3. **The excerpt question:** the Community Stories posts have no excerpts, so
   the homepage's story cards have no pull-quote. Empower writing excerpts, or
   the card using something else, is a content decision.
4. Only then, pages 2 to 14, in the order the Phase 2B design sets out.

## 6. Two things I got wrong tonight, recorded

**I scoped Phase 2B from my working notes instead of from the chooser**, and got
it wrong in both directions: I said ten pages and four open sets when it is
fourteen and two, and I withdrew a correct README instruction about the solution
pages on the strength of a note that predated Empower's decision. Paolo caught
it in one line. `dist/index.html` is the register of what is signed off, and a
note about an open choice is stale the moment it is answered.

**I twice wrote a general CSS rule that measured worse than no rule**, once for
paragraphs and once for headings. Both were reverted, and both reverts are
documented in `bridge.css` next to where the rule would have gone, because the
reasoning is worth more than the rules would have been. The heading one was
caught by an existing test rather than by eye, on a page I was not working on.
