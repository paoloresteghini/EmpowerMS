# Empower Mississippi — website build

Static HTML + CSS builds for the Empower Mississippi refresh. The homepage is
**settled** — `dist/final.html` is the agreed build, the About Us, Team and
Solutions sets were decided on 2026-08-05, and on 2026-08-07 Empower chose one
template for all three solution detail pages, The Studio for The Empower Podcast
and The Dome for Capitol Chat. Four sets are open: **EPIC** (the research arm,
three readings), the two Join Us destinations — **Email Sign Up** and the
**Ambassador Landing Page** — and **Donate**, two readings each. The alternatives every decision
was made from still build, as reference.

Content is the *Empower Mississippi Website Refresh Roadmap* — the **Homepage**
tab for the homepages, **Who We Are** / **What We Do** for the About pages, the
**Meaningful Work** and **Public Safety** tabs for the solution detail pages,
the **Podcast** and **Capitol Chat** tabs for the two shows, the **EPIC
(Research) Landing Page** tab for the research pages, and the **Email Sign Up**
and **Ambassador Landing Page** tabs for the two Join Us destinations, and the
**Donate** tab for the giving page.
Every headline, subhead, section intro and solution promise is that copy, used
verbatim. What differs between builds is the composition.

The document itself is committed at
`docs/Empower Mississippi Design System/uploads/`, as both `.docx` and `.pdf`.
**Check the tab count before trusting an export.** The committed `.docx` carries
the Homepage tab only — 99 lines against the PDF's 1,865 — and says nothing
about what it is missing; the PDF beside it is complete. Later exports are
complete too: the *final* `.docx` Empower sent on 2026-08-07 has all sixteen
tabs, every one marked approved. Read a `.docx` by unzipping it and pulling the
`<w:t>` runs out of `word/document.xml`, and read `word/comments.xml` as well —
the client's margin comments live only there, and one of them is why the Quality
Education tab was rewritten.

This is a **reference implementation for hand-off to WordPress + Elementor**,
not a production runtime.

## The pages

**The homepage.** Settled — `final.html` is the build. The four `homepage-*`
pages were the options Empower chose between; they are named for what they are
now rather than for a decision that has already happened, and they still build
so the choice can be re-read.

| Page | What it is |
| --- | --- |
| `dist/final.html` | **The agreed build** — Empower's chosen combination. This is what ships. |
| `dist/index.html` | Build review — opens every page side by side. Review tool, never ships. |
| `dist/homepage-a.html` | **Front Porch** — interlocking mosaic, warm and photographic |
| `dist/homepage-b.html` | **The Index** — persistent sticky rail, typographic, credible |
| `dist/homepage-c.html` | **The Atlas** — horizontal rails and expanding panels |
| `dist/homepage-d.html` | **The Throughline** — a route, with a sticky photographic stack |
| `dist/current-2.html` | **The Evolution** — the existing design moved forward, not replaced |
| `dist/current.html` | **The Starting Point** — the original wireframe build, toggles stripped |

**About Us.** Three readings of each page. Empower chose on 2026-08-05: **The
Table** for Who We Are, **Three Doors** for What We Do. The other four still
build so the decision can be re-read.

| Page | What it is |
| --- | --- |
| `dist/who-we-are-a.html` | **The Table** — picture stack, navy slab, the founding year as the one datum |
| `dist/who-we-are-b.html` | **The Record** — the mission at display size, then numbered chapters on a sticky rail |
| `dist/who-we-are-c.html` | **The Ground** — full-bleed photography, every word on solid colour |
| `dist/what-we-do-a.html` | **Three Doors** — homepage-shaped hero, three panels stepped down a diagonal |
| `dist/what-we-do-b.html` | **The Ledger** — indexed hero, one row per solution, reports as ledger lines |
| `dist/what-we-do-c.html` | **The Field** — window-wide photograph, tall cards at three heights |

**Team, Board & Fellows.** The page all six About builds link to. Empower chose
**The Roster** (A) on 2026-08-05. Same ten staff, five fellows
and eight board members, same roadmap copy on all three; what differs is how
much weight the photographs carry.

| Page | What it is |
| --- | --- |
| `dist/team-a.html` | **The Roster** — founder block into a staggered wall of tall portraits, fellows on a dark ledger, board as a ragged roll of pills |
| `dist/team-b.html` | **The Directory** — a numbered index, one hairline row per person, portraits reduced to discs, one window-wide photograph after the list |
| `dist/team-c.html` | **The Frame** — window-wide photograph with the navy hero panel climbing it, staff as square plates, board as a navy ribbon |
| `dist/team-bio.html` | **Staff detail — Grant Callen** — the one bio screen, and the template the other nine are cut from |

Within each variation the three groups get three treatments rather than the same
block three times: ten staff who each have a bio page behind them are scanned by
face, five fellows carry subject areas and no bios, and eight board members carry
nothing but a name and (twice) an officer role. B is the one that still works if
Empower would rather not lead with faces at all.

Two things on all three are unfinished, and both are marked in the markup rather
than left to be noticed:

- **Every portrait is a placeholder.** Nothing in `assets/photography` is a
  headshot, so every one is a monogram tile carrying `data-placeholder="headshot"`
  and a dashed edge, and each page says so in words above its roster. They sit in
  the box the photographs will use (4:5 on A, 1:1 on B and C), so nothing moves
  when the pictures land. A test asserts that every tile on every variation is
  marked and that a page showing tiles still carries the note.
- **The contact block on the bio page is a stand-in.** Empower have not supplied
  Grant's own address or handles, so the "Get in touch" rows carry the
  organisation's inbox and accounts, marked `data-placeholder="contact"` with a
  note under them. A test keeps the mark and the note together.
- **Nine of the ten bio pages do not exist.** The CEO's is built
  (`dist/team-bio.html`), and every staff card on all three variations points at
  it so the flow is clickable in review. When the other nine are cut from that
  template each card takes its own destination; at hand-off the links become
  `/about/team/<name>`. `TEAM_STAFF` in `test.mjs` already holds the slug each
  page will take.

Names, titles and the founder's bio paragraph are the roadmap's copy, asserted
whole in `test.mjs` — a roster is where a quiet omission is invisible in review
and unforgivable after hand-off. The one deviation: the roadmap lists Thigpen
above Richards, which breaks its own "in alphabetical order by last name"; the
page sorts them.

**Solutions.** The landing page for the three areas, in three readings. Empower
chose **The Through Line Down** (B) on 2026-08-05. Same roadmap copy on all
three; what differs is what each one says the three areas ARE.

| Page | What it is |
| --- | --- |
| `dist/solutions-a.html` | **The Commons** — a hero photograph bleeding off the left edge, then the three areas stacked as three identical picture-left panels |
| `dist/solutions-b.html` | **The Throughline Down** — navy across the top half, the three areas descending one orange line, the research panel climbing back over the navy |
| `dist/solutions-c.html` | **The Lattice** — near-monochrome and structural: one beam, three orange nodes, three columns on a shared subgrid, honeycomb behind them |

None of the three reuses a What We Do composition (the diagonal, the alternating
ledger rows, the tall cards at three heights). That constraint is deliberate:
both pages present the same three solutions, and if the compositions repeated,
Empower would be choosing between two pages that look like each other. A test
asserts each variation keeps its own signature composition and carries neither
of the other two.

Section 4's headline is **"Behind every policy is a person."** — not the
homepage's "Behind every solution is a real person." Two tabs of the same
document, two sentences; the test carries both so neither drifts into the other.

The three "Explore" links point at `/solutions/education`, `/solutions/work` and
`/solutions/safety`. All three are now built (below).

**The solution detail pages.** All three of them, on one shared template. Copy is
the roadmap's own **Quality Education**, **Meaningful Work** and **Public Safety**
tabs: its "Standard Solution Page Flow", all seven sections, in the order the
document states them. Empower chose Public Safety B, The Streetlight, on
2026-08-07 and asked for all three pages to be built on it, with the numbered rows
in section 4 replaced by the capped columns from Public Safety A. The four
readings they did not choose still build, so the decision can be re-read.

The three that ship:

| Page | What it is |
| --- | --- |
| `dist/safety.html` | **Public Safety: The Streetlight.** The shared solution template. Dark page, light in sections: no photograph until the stories band, four of seven sections navy, the four approaches as capped columns on the first light break, four work areas as lit cards on navy |
| `dist/work.html` | **Meaningful Work, on the shared template.** The same seven blocks and the same stylesheet, carrying the Meaningful Work tab: five lit work areas rather than four, and a workshop photograph on the stories band |
| `dist/education.html` | **Quality Education, on the shared template.** Four lit work areas, a library photograph on the stories band, and the one thing only this tab has: a closing statement after the work areas rather than a fifth card |

The four readings Empower did not choose:

| Page | What it is |
| --- | --- |
| `dist/work-b.html` | **Meaningful Work B — The Sidelines** — near-monochrome editorial: the headline is the first screen on white, one window-wide photograph under it, the problem the only dark section, four approaches on one horizontal track, five areas as a mosaic led by a double-width navy plate |
| `dist/safety-a.html` | **Public Safety A — The Neighbourhood** — photograph with the headline on a navy panel set inside it, vision and problem as two orange-edged panels facing each other, four approaches laid as an offset course of brick, four work areas as capped posts |
| `dist/work-c.html` | **Meaningful Work C — The Plate** — navy holds the top third with the photograph inset beside the headline and a rail to the five areas on its bottom edge; white plates climb that edge; the four approaches are quartered inside one navy plate |
| `dist/safety-c.html` | **Public Safety C — The Watch** — the inverse: one navy plate on a white field with the photograph as a column inside it, the rail beneath on white, a second navy plate for the vision, and the four approaches as wide rows |

**The C pair** was built with the `impeccable` craft flow after Paolo picked three
sections out of work-b and asked for the rest to be new. Those three are carried
over deliberately and a test holds them there: the work-area mosaic with a
double-width navy lead plate and orange chip labels, the community-story columns
under dashed rules, and the 2×2 of dashed article stubs. Everything above them is
new, and the two pages are the only readings with a **rail** — a real anchor list
to the work areas, because five areas (four on safety) is more than anyone will
scroll to survey. Every rail target carries `scroll-margin-top` so the sticky
header does not cover the heading it just jumped to; a test checks that every
rail href resolves to an id that exists.

The readings were built as **independently composed pages, not one template
filled repeatedly**: Paolo's call on 2026-08-05, reaffirmed when the C pair was
added. That still holds for the four Empower did not choose, and a test asserts
each of those four keeps its own signature composition and carries none of the
other three's. What changed on 2026-08-07 is that Empower chose one of them, so
**there is now a single solution-page template to hand off**: `css/solution.css`,
with the seven `sol-*` blocks. A test asserts the three shipping pages carry the
same seven blocks and link the same stylesheet, which is the opposite check to
the one above it, and another asserts the two axes the template flexes on (five
work areas on Meaningful Work against four, and Education's closing statement).

Two things on all seven are unfinished, and both are marked in the markup rather
than left to be noticed:

- **Sections 6 and 7 are feeds, not content.** All three roadmap tabs end those
  sections with a bracketed instruction to auto-populate, so in WordPress they
  become live queries. Until then the blocks carry real posts from empowerms.org,
  every headline an `<a>` to the post it names, so the client reviews the shape
  with content in it. **No headline on any of the seven pages is invented**, and a
  test enforces it: a plausible article title is exactly the kind of thing that
  reads as approved copy and survives review.
- **The photography is stand-in and its filenames lie.** `young-man-portrait-bw.jpg`
  is a colour classroom scene; `family-outdoors-park.jpg` is a boy reading in a
  library. Every image on these seven pages was opened and looked at before its
  alt text was written, and one was swapped after a render showed a classroom
  where a workplace was meant to be. Do not pick one of these files by name.

Two deliberate transformations of the roadmap's copy, both recorded in
`test.mjs` next to the assertions:

- The work-area labels are set in caps by CSS, not typed in caps, so the copy
  assertion matches the sentence-case string and the page shows what the document
  shows. Same call the homepage made for QUALITY EDUCATION.
- The roadmap's section titles ("The Vision", "The Problem - Why This Work
  Matters") are its internal organisation, which Empower confirmed about the Who
  We Are side labels on 2026-08-03. They are not printed on any of the four
  pages; the existing internal-labels sweep asserts that.

One build-wide fix came out of building these: **two sweeps in `test.mjs` listed
their pages by hand** (the side-stripe check and the hang-out-of-section check).
Both were written when thirteen About pages was all there was, so the four pages
added on 2026-08-05 were never in them — and all four shipped a 3px orange
`border-left` on their feed note, which is exactly the callout-bar reflex the
side-stripe sweep exists to reject, while that sweep passed green. Both now derive
their page list from `PAGES`. Where those pages need a block marked they use the
56×4 orange rule above it, which is the brand's own motif.

**The Empower Podcast.** The show page, in two readings. Copy is the roadmap's
Podcast tab: the three-sentence hero, both of its buttons, "Go Beyond the
Headlines." and the episode library. Empower chose **The Studio** on 2026-08-07;
On the Record still builds so the decision can be re-read.

| Page | What it is |
| --- | --- |
| `dist/podcast-a.html` | **The Studio** — navy hero with the headline, both actions and a contact sheet of behind-the-scenes frames; one quiet white passage for the show's description; the episodes as a catalogue with a sticky filter rail |
| `dist/podcast-b.html` | **On the Record** — the headline is the hero, three sentences on three lines with the third in orange; the picture arrives after the words as one band; the description is the page's single navy panel; the library filters from a row of tag chips |

Three things about this set are unlike anything else in the build:

- **The library actually filters.** The roadmap puts the request directly to
  Paolo: *"have Paolo create a 'database' where people can search or filter for
  previous podcasts based on tags (topic/guest/part of Mississippi)."* Both pages
  answer it with a working filter and **no script** — `:has()` over real
  checkboxes, with a native `<button type="reset">` to clear, which is why the
  `<form>` is load-bearing. Where `:has()` is missing the filter hides itself and
  the full library stays on the page.
- **It composes AND across the two facet groups, OR within each.** The
  hide-everything-then-reveal shape the review index uses works for one group and
  silently becomes an OR when a second group can reveal what the first hid. These
  pages use hide-only rules instead — "this group is in use and this value is not
  ticked, so hide the cards carrying it" — six rules that intersect by
  construction. Verified in the browser, not just asserted: 9 episodes → 3 (one
  topic) → 6 (two topics) → 2 (× one guest) → 4 (× two guests) → 9 cleared. That
  was with both groups on both pages. Empower dropped the Topic facet from The
  Studio on 2026-08-07, so it now filters by Guest alone; On the Record keeps
  both groups, and the composition matters there.
- **There are nine placeholder episodes because that is every topic-and-guest
  pair.** With a gap in that matrix some combination of ticks would show a
  reviewer an empty grid the real library would never produce. A test asserts the
  full matrix rather than the count.

Two roadmap requirements needed a decision rather than an implementation, and
both are recorded in the markup:

- **The hero has two buttons and the brand rule allows one orange action.** Both
  labels ship; Watch on YouTube takes the fill because the roadmap states it
  first, Listen Now takes the outline. A test checks both are present AND that
  only one is filled — the one-orange-action sweep alone would pass just as
  happily on a page that deleted "Listen Now".
- **The behind-the-scenes photographs do not exist.** Nothing in
  `assets/photography` is a studio, stage or event frame, so both pages carry
  marked placeholders at the shape the real pictures will take rather than an
  unrelated stock photo that would look finished.

No episode titles, dates or guest names are invented anywhere.

**Capitol Chat.** The other show in the same dropdown, in two readings. Copy is
the roadmap's Capitol Chat tab: the hero question, "The Capitol Moves Fast. We
Help You Keep Up." and the episode library. Empower chose **The Dome** on
2026-08-07; The Session still builds so the decision can be re-read.

| Page | What it is |
| --- | --- |
| `dist/capitol-a.html` | **The Dome** — the question set centred on a tinted masthead, the only centred hero in the build, with the Capitol photography as a triptych beneath it and a flat dated list below |
| `dist/capitol-b.html` | **The Session** — the question holds the left of a navy hero and the reply the right; the photography runs full-bleed; the show is described in two text columns; the library accumulates under session headings |

Three differences from The Empower Podcast drove this page rather than decorating
it, and each one is a test:

- **One button, and no video anywhere.** The roadmap gives this page only "Listen
  Now", and the show is audio ("listen and subscribe wherever you get your
  podcasts", "audio players") where the other leads on YouTube. A test fails the
  page if a Watch action appears on it.
- **Wil Ervin's name is not a link.** Grant Callen is one on the podcast pages
  because his bio is built; Wil Ervin's is not, and Empower's note on 2026-08-05
  was about precisely this failure — a name that opens somebody else's bio. A test
  checks every anchor on both readings, and separately checks the name is still
  *present*, because not-a-link must not quietly become not-there.
- **No intro paragraph under the library heading.** The Podcast tab gives its
  library one; this tab gives only "Catch Up From the Capitol". None is invented,
  and a test asserts nothing sits between that heading and the placeholder note.

The library filters by **legislative session** on The Dome and by **topic and
legislative session** on The Session. There are no guests to filter by, Wil Ervin
presents every week. Empower dropped the Topic facet from The Dome on 2026-08-07,
and the topic label went from its rows with it: those labels were ours, because
Capitol Chat carries no topic taxonomy upstream, so with the filter gone they
would have been unsourced decoration on a client's page. Six rows, one per
topic-and-session pair, so no combination of ticks can empty the list. On The
Session the session
facet hides whole **groups**, heading included, which is the one thing a flat list
cannot demonstrate; verified in the browser at 2 groups/6 rows → 1 group/3 rows →
1 group/1 row → 2 groups/2 rows → cleared. No episode titles, dates or numbers are
invented: the date column is a marked stub, because that column is where the real
date goes.

**EPIC (Research).** The research arm, in three readings, built 2026-08-07.
Empower chose The Pinned Method on 2026-08-11, with one change: its method
section is now The Instrument's ruled rows rather than the sideways track, and
the EPIC lockup sits beside the hero headline. Copy is the roadmap's *EPIC (Research) Landing Page*
tab: "Better Data. Better Ideas. Better Solutions.", the passage on what EPIC
does, the three-step method and the research index.

| Page | What it is |
| --- | --- |
| `dist/epic-a.html` | **The Pinned Method** (*chosen 2026-08-11*). Drenched navy statement with the EPIC lockup beside it, then the method as three ruled rows against a rail that fills as the section crosses the screen; three quiet columns close it |
| `dist/epic-b.html` | **The Plotted Field** — a white broken grid with an outlined wordmark and a drawn plot, a navy plate pulled up over the hero, staggered steps threaded together, and three full-height doors |
| `dist/epic-c.html` | **The Instrument** — navy end to end with one line down the left edge that fills as the page scrolls; the method is three ruled rows and the research is a dated index |

Four things shaped this set rather than decorating it, and each one is a test:

- **Two roadmap buttons, one orange fill.** The tab gives the page both "Dive
  Into the Research" and "View Research & Reports"; the brand rule here is one
  orange action per view. The hero keeps the fill and the closing CTA is
  demoted, on all three. Deleting the second button would pass the
  one-orange-action sweep just as happily, so the test checks both are present
  and that only the first is primary.
- **No invented statistic.** This is the one page in the build where a made-up
  number would read as a finding. The drawn plot on The Plotted Field has no
  axis, no scale and no value on it, and a test fails any of the three for a
  percentage or a big-number stat.
- **The focus areas, high.** Keri's comms notes ask for Quality Education,
  Meaningful Work and Public Safety "more often and higher up on the page". All
  three readings name them in the hero as real in-page links to the three groups
  in the last section, and the test checks both ends of every link.
- **Motion that nothing depends on.** These are the first pages here to use CSS
  scroll-driven animation — the sideways track, the drawn thread, the filling
  spine — and there is no new JavaScript behind any of it. Every rule sits inside
  both `@supports` and `prefers-reduced-motion: no-preference`, with a static
  composition underneath, and a test enforces that. The motion layer in this
  build has already shipped a section that rendered blank because a start state
  hid content and the trigger never fired.

Every report named in all three indexes is a real post from empowerms.org,
pulled from the WordPress REST API on 2026-08-07, one per focus area, each
linked to the post it names. The roadmap offers a choice of URL, SEO title and
SEO description for this page; all three builds use `/epic` and the first of
each pair, which is the one naming all three focus areas. That choice is
Empower's to confirm.

### What Empower asked for on 2026-08-05

Alongside the four picks, three changes, all applied:

- **Every card on The Roster is the same size.** The founder's feature panel is
  gone and Grant Callen is the first of ten identical cards. His bio paragraph
  now lives only on his own page.
- **Only a card with a bio behind it links to one.** Nine of the ten cards are a
  `<div>`, not an `<a>`. Every card used to open Grant Callen's page, which is
  how a visitor clicking Wil Ervin ended up reading somebody else's bio — that
  is what "remove Wil Ervin's bio" was asking for. When the other nine pages are
  built, each card takes its own destination.
- **Contact rows per person.** Grant keeps email, LinkedIn and X; every other
  staff bio gets the email row only. The bio partial says so where the block is.
- **Our Solutions is a top-level destination.** In `header-2.html` it is now a
  link to the Solutions landing page with a separate disclosure button beside
  it, and the dropdown lists only Quality Education, Meaningful Work, Public
  Safety and Research (EPIC). "Solutions Center" is gone: the item above it is
  that page. The mega-menu header (`header.html`) keeps the old label — it only
  serves the original build and the four reference homepages, which are a record
  of what was reviewed rather than pages that ship. A test names that exception.

### Rules the About set holds to

- **Every sentence is the client's.** All prose comes from the roadmap's Who We
  Are and What We Do tabs. Where a variation sets a list the sentence
  describes, the words are unchanged. `test.mjs` asserts the copy against each
  page's rendered text.
- **The side section labels are not copy.** Empower confirmed on 2026-08-03
  that "Why We Exist", "History of Empower Mississippi", "Nonprofit Status" and
  "Our people" were their own organising labels, and asked for them to be left
  out unless the context needs them. None of them appear on any page; a test
  keeps them out. Two deliberate exceptions:
  - **"Our Story"** — the roadmap marks it `Headline:`, and Empower asked for
    section 3 to start with it. It is a heading on all three variations.
  - **"Our Solutions"** on the What We Do pages — the only heading that
    section has, and three solution panels with nothing above them lose the
    thread. Kept under the client's own "unless the context is necessary".
- The Who We Are tab was renumbered on 2026-08-03 (sections 1–5, previously
  1, 3, 4, 5, 7 — Empower had combined sections rather than losing any). The
  partial filenames match the new numbering.
- **One kicker per page**, in the hero. Not a label above every section — that
  is the scaffold this build already rejected on the homepage.
- **No text sits on a photograph.** Every word is on a solid or near-solid
  surface, because no test in this repo can measure contrast against an image
  and the photography is stand-in material that will be replaced.
- **Every overlap is a negative margin on a child**, inside the section that
  owns it. Nothing is absolutely positioned across a section boundary. See the
  Elementor note below.

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

## The review page

`dist/index.html` is the review index: sixteen sets, a filter rail, and a card
per build carrying what it feels like, what its signature move is and who it is
for. It loads no JavaScript — the rail is real form controls and `:has()` rules
in `css/chooser.css`, and Clear is a native `<button type="reset">`.

**Three statuses, and archived is off by default.** As of 2026-08-12 the rail's
Status facet is `To review` (4), `Signed off` (14) and `Archived` (26), in that
order, and nothing ticked means the first two: the decisions, and the two sets still being
reviewed. The statuses are written as **hides** rather than reveals — each rule
says "if a status is ticked and it is not this one, this one goes" — which is
what lets them compose with the Set facet instead of fighting it, and why they
OR with each other (ticking `Signed off` and `Archived` shows what was decided
*and* what it beat). Sections carry `data-state="decided|open"` so a set whose
only cards are hidden goes with them rather than leaving a heading over nothing.

**The archive.** A decided set shows only the build Empower chose plus one line
pointing at the archive; the 26 they did not choose are rows in an `Archive`
section at the foot, grouped by set. Nothing was deleted and nothing moved on
disk: all 26 still build and are still linked, because the argument for a chosen
build is only re-readable next to what it was chosen over. Three things open it:
the `Archived` box, the archive link in the intro, and the pointer under any
decided set. The last two work through `:target` and `:has(:target)`, because a
link cannot tick a checkbox without a script — which is also why a ticked status
other than `Archived` has to outrank them, for the case where a stale fragment
is still in the address bar. Ticking a set narrows the archive with it, and the
three sets with nothing archived (Quality Education, built as one page, plus the
two still open) get a written line instead of an empty heading.

Four tests derive all of that from the page rather than from a list: which sets
have archive groups, whether the `:not(:has())` guard on that line names exactly
those sets, whether every non-picked build appears in the archive exactly once,
and whether the three Status counts add up to the builds the page offers.

**The Set facet folds.** Sixteen rows made the rail taller than the results beside
it, so it is a `<details>` that ships shut, with the fieldset and a visually
hidden legend kept inside so the group survives for a screen reader. A set ticked
behind the shut panel puts a `Filtered` chip on the summary, because a page
filtered for a reason nobody can see is worse than a long rail. All four
properties are tested.

**The paragraph text under each set is gone** as of the same date: every set now
runs heading, card, and the one line pointing at the archive. It was build
archaeology on sets that are decided, and it was longer than the decisions it sat
under. What was still live in it went with it, so **these are recorded here and
nowhere on the page**, and the client has to be told them another way:

- **Donate** (chosen: One Screen) needs the dynamic-population parameter names for
  the gift type and amount fields on Gravity Forms form 4, the amount ladder, and
  confirmation that the page is `/donate/`.
- **All Content** has the `/empower-commentary` versus `ALL CONTENT` naming
  question outstanding, and two filing caveats: their WordPress has no
  `Research & Reports` category, and `Bill Summaries` is a category there but a
  topic here.
- **The landing template B** needs the right column's widget set to sticky in
  Elementor.

`team-bio.html` was in the Team note and is now a line in the Team card's meta
instead: it is the one built page that is not a set of its own, and a test
requires every built page to be reachable from the chooser.

The homepage set leads with the agreed build; the five references behind it are
in the archive, tagged as references because the agreed build was assembled out
of them rather than chosen over them.
`current.html` still builds and its URL still resolves, but it is not on the
page — Empower are not being asked to consider the original wireframe build,
and it is kept only for diffing against what exists today. A named exemption in
`test.mjs` allows that; every other page in `PAGES` must still be linked.

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

228 tests. They come in two halves.

Everything up to the divider comment near the end of `test.mjs` is about the
**original reference build** specifically — it names `.em-*` section classes
that only that page has.

Below the divider is the **cross-page contract**, asserted for every page in
`PAGES`. That is what stops six presentations of one brand drifting into six
different brands:

- every line of the roadmap's approved copy appears verbatim on all four options
- one `h1` per page, no skipped heading levels
- exactly one orange filled button per page, and it is the hero CTA — except the
  two All Content readings, which carry none by name: an index of everything
  published has nothing to ask for, and the exception is asserted rather than
  waived
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

`npm test` runs `test.mjs` and then `test-elementor.mjs`, the second file
covering the Elementor conversion tooling under `elementor/`, `wp/` and the
harness in `fidelity.mjs` / `fidelity-browser.mjs`. Most of it runs with no
setup, but eight tests in `test-elementor.mjs` need the live converted page
on WP Engine and need `SPIKE_URL` set: five of the eight drive a real browser
(via Playwright, already a devDependency), and three fetch or check the
install directly without a browser.

```bash
SPIKE_URL=https://empv2.wpenginepowered.com/podcast-a/ node --test test-elementor.mjs
```

Without it, those eight fail on purpose, with a message naming `SPIKE_URL`
rather than a silent skip.

## The install

Everything that talks to WordPress (`wpe.mjs`, `wp/sync.mjs`, and the
deployment code in `elementor/` that goes through them) reaches the WP Engine
install over SSH, and reads that install's coordinates from the environment.
This repository is public, so they are not written into its source:

```bash
cp .env.example .env
# fill in the three values, then, in each shell that runs a deploy:
set -a; . ./.env; set +a
```

`.env` is gitignored. `.env.example` documents the three variables:
`WPE_SSH_HOST`, `WPE_SSH_KEY` and `WPE_ROOT`. Nothing there is a password:
WP Engine's SSH gateway is key-only, and the key stays in `~/.ssh`.

Unset any of them and the next call fails immediately with a message naming
the variable, the same way the `SPIKE_URL` guard above does, rather than
reaching the install and failing as a permissions error.

## Mobile navigation

Below 960px the desktop nav (`.em-header__nav`) hides and a mobile menu takes over: a
toggle button in the header actions plus an inline dropdown panel (`.em-mobilenav`,
in `src/_shared/header.html` and `src/_shared/header-2.html`, both header
partials carrying the same mobile nav tree) with accordion sub-items, driven by
`js/nav.js`.

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
`src/_shared/header.html` (five `.em-mega` panels, present only in that
header partial, not in `header-2.html`'s simple-dropdown variant), styles in
`css/megamenu.css`, behaviour in `js/megamenu.js`.

This pair (`css/megamenu.css` / `js/megamenu.js`) applies only to the static
build's mega-menu header (`current.html`, `homepage-a..d`) and is not part of
the WordPress conversion: the header shipped there is `header-2.html`'s
simple-dropdown variant, deployed once as a site-wide Theme Builder part (see
"Phase 2A foundations" below), so no page converted so far enqueues either
file, and none is expected to.

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

**Read the page you are converting, not this list from memory.** The steps below
were written for `dist/current.html`, the original build. The pages that ship —
`final.html` and whichever About Us variations Empower pick — use a different
header, a different script set and different partials. Per-page notes follow.

1. Copy `tokens/`, `components/` and `assets/` into the child theme. **Keep them as
   siblings** — `tokens/*.css` references `url('../assets/…')`.
2. Enqueue in cascade order. Take the list from the page's own `<head>`, which is
   the source of truth. For every page: the eight `tokens/*.css` files, then
   `components/components.css`, then **`css/site.css`** — it carries the shared
   chrome and every local WCAG override, and a build that skips it loses the
   accessibility work — then the page's own stylesheets in the order they are
   linked. `css/megamenu.css` applies **only** to pages using the mega-menu
   header, and must load after `css/homepage.css`.
3. Each partial under `src/` is a standalone fragment: one `<section>`, no page
   chrome. Paste one into an Elementor HTML widget, or use it as the reference
   for a native Elementor section. The section list for a page is the
   `@include` list in its `src/<page>/index.html`.
4. Fix up asset paths: partials use `../assets/…` relative to `dist/`. In WordPress
   these become theme URLs.
5. Wire up the CMS slots. **Every block that is a query rather than authored
   content is marked in the markup with `data-cms`** — grep for it, do not go
   by eye. Three values, and the third matters as much as the first:

   | Value | Means |
   | --- | --- |
   | `loop` | The container repeats from a query. Becomes a Loop Grid |
   | `field` | This element's text and `href` come from a query; what surrounds it is authored. EPIC's three focus areas are the case — the area name and photograph are ours, the report line beneath is the newest post |
   | `manual` | It looks like a feed and deliberately is not. Landing template B's outcome sequence is three chosen posts in the order the campaign happened; a Loop Grid of whatever is recent destroys the point of the block |

   Every marker carries a `data-cms-note` saying which query, in plain language,
   including where the query is not yet answerable — Empower's WordPress has no
   Research & Reports category, and that is recorded beside the two blocks that
   need one rather than only here.

   **`data-cms-item-attrs` is a hard contract, not a hint.** The four filtering
   pages — both All Content readings, The Empower Podcast, Capitol Chat — filter
   in CSS over `data-type`, `data-topic`, `data-guest` and `data-session` on each
   card. When those cards come out of a Loop Grid instead of out of this
   repository, **the loop item template must emit those attributes from the
   post's own terms.** A template that does not produces a page where every
   control still moves, no card ever hides, and nothing anywhere reports an
   error. `test.mjs` holds the contract to the markup in both directions.

   The older homepage stubs use the literal string "auto-populated" instead;
   both markers mean the same thing and both are listed in the conversion sheet
   below.
6. Ship the scripts the page actually links. `js/nav.js` (mobile menu, sticky
   header condense) and `js/reveal.js` (entrance reveals) are on every page.
   In the static build, the desktop navigation is **either** `js/megamenu.js`
   **or** `js/dropdown.js`, never both — see the per-page notes. That choice
   no longer applies once a page is converted: as of Phase 2A the header is
   one site-wide Theme Builder part built from `header-2.html`, so every
   converted page gets `js/dropdown.js` unconditionally (see "Phase 2A
   foundations" below) and `js/megamenu.js` is not enqueued anywhere in
   WordPress.

### Tokens, and what Elementor has to be told

The design tokens are eight small stylesheets of CSS custom properties and they
work unchanged in WordPress — every rule in `css/` reads them by `var()`, so
copying `tokens/` into the child theme is the whole of it. What does **not**
happen by itself is Elementor learning them. Elementor's Site Settings hold
their own colours, fonts and container width, and its editor UI offers those and
not these. Set them to match, or every block built natively in Elementor drifts
from every block pasted from here.

| Elementor Site Setting | Set it from | Value |
| --- | --- | --- |
| Global Colors → Primary | `--em-blue` | `#003C50` |
| Global Colors → Secondary | `--em-orange` | `#E65A28` |
| Global Colors → Text | `--text-body` / `--grey-700` | `#4A4A4A` |
| Global Colors → Accent | `--blue-400` | `#64A0B4` |
| Global Fonts → Primary (headings) | `--font-display` | Figtree — standing in for **Gotham**, see Known substitutions |
| Global Fonts → Secondary (body) | `--font-body` | Source Sans 3 — standing in for **Whitney** |
| Layout → Content Width | `--container-max` | Read the value out of `tokens/spacing.css`; `.em-container` is the build's only page-width rule |
| Layout → Widgets Space | — | Zero it. Vertical rhythm here is section padding, not widget gaps |

Two cascade traps, both silent:

- **`css/site.css` styles bare `h1`, `h2`, `h3` and `p`.** So does Elementor's
  Theme Style. Whichever loads last wins, and Elementor's loads late. Either
  turn Theme Style typography off, or set it to the same values — and if you set
  it, set it from `tokens/typography.css` rather than by eye, because the
  headings here are `clamp()` ramps rather than fixed sizes.
- **The build's breakpoints are not Elementor's.** There are thirty-odd distinct
  widths across `css/`, chosen where each layout actually breaks; Elementor
  offers a fixed set. Pasted CSS is unaffected and keeps working. What it means
  is that a block rebuilt natively cannot be made responsive through Elementor's
  own controls *and* stay aligned with the rest of the page — set responsive
  behaviour in the custom CSS for these blocks, not in the widget panel.

### What each block becomes

The default is a **native Elementor container carrying the section's own custom
class**, with the stylesheets enqueued as above. That keeps the page editable.
Four shapes are the exception and want an **HTML widget** instead, because
Elementor cannot express them without losing the thing that makes them work:

- **Inline SVG.** Several sections draw a glyph or a rule as inline `<svg>`
  because the page's CSS colours and animates it. An icon widget or an `<img>`
  breaks that link. `mail-a`'s ticks are the sharpest case — they animate.
- **The filters.** Both All Content readings, The Empower Podcast and Capitol
  Chat filter with CSS over real radio and checkbox inputs inside a `<form>`,
  no script. The controls have to stay as authored; the cards below them are a
  Loop Grid, and `data-cms-item-attrs` is the contract between the two.
- **The forms.** See the note further down — they are real HTML with real
  labels, and the only change at hand-off is the `action`.
- **The header's `.em-header__nav`, `.em-header__actions` and `.em-mobilenav`
  blocks**, added in Phase 2A. Nothing native emits the `aria-controls` pairs
  `js/dropdown.js` and `js/nav.js` bind to, the split link-plus-disclosure
  Solutions item, or the `aria-expanded="true"` defaults every panel ships
  with so the header stays open before JavaScript runs. Three HTML widgets,
  verbatim from `src/_shared/header-2.html`; see "Phase 2A foundations"
  below for the redeploy path this creates.

Section by section, for the pages that are settled or in front of Empower now.
The section list for any page is the `@include` list in its `src/<page>/index.html`;
this adds what each one turns into.

| Page | Section | Becomes |
| --- | --- | --- |
| `final` | `01-hero` | Container. The north-star card is deliberately **not** here — that is the element that hung out of its own section |
| | `02-solutions` (from option-d) | Container |
| | `03-foundations` (from current-2) | Container + HTML widget for the three inline SVGs |
| | `04-stories` | **Loop Grid** — carries the older `auto-populated` marker |
| | `05-insights` | **Loop Grid** + HTML widget for the one inline SVG — also `auto-populated` |
| | `06-joinus` | **Form widget**, or HTML widget keeping the markup as authored |
| `who-we-are-a` | `01-hero` | Container + HTML widget (inline SVG) |
| | `02-why`, `03-story`, `04-people`, `05-status` | Containers |
| `what-we-do-a` | `01-hero`, `03-reports` | Containers |
| | `02-solutions` | Container + HTML widget (three inline SVGs) |
| `team-a` | `01-hero` | Container + HTML widget (inline SVG) |
| | `02-staff`, `03-fellows`, `04-board` | Containers. Every portrait is a placeholder tile — see the Team notes |
| `team-bio` | `01-profile`, `02-back` | HTML widgets (five inline SVGs between them). This is the template the other nine bios are cut from, so it is the one worth making an Elementor **saved template** |
| `solutions-b` | `01-hero`, `03-research`, `04-stories` | Containers |
| | `02-solutions` | Container + HTML widget (three inline SVGs) |
| `work`, `safety`, `education` | `01`–`05` | Containers. **One template across all three** — `css/solution.css`, seven `sol-*` blocks — so build it once as an Elementor saved template and fill it three times |
| | `06-stories` | **Loop Grid** (`data-cms`) |
| | `07-latest` | **Loop Grid** (`data-cms`) |
| `podcast-a` | `01-hero`, `02-about` | Containers |
| | `03-library` | HTML widget for the filter controls + **Loop Grid** for the episodes. `data-cms-item-attrs="data-topic,data-guest"` |
| `capitol-a` | `01-hero`, `02-about` | Containers |
| | `03-library` | Same shape. `data-cms-item-attrs="data-session"`. Wil Ervin's name must stay unlinked |
| `epic-a` | `01-hero`, `02-work` | Containers |
| | `03-method` | Three nested containers — see the scroll-driven table below. Do **not** add Elementor's sticky effect on top |
| | `04-research` | Container. Three authored focus areas, each with a `data-cms="field"` report line: the area is content, the report line is a query |
| `mail-a` | `01-hero` | **Form widget** or HTML widget. The form is in the hero and the submit is the page's single orange action |
| | `02-about` | Container |
| | `03-receive` | HTML widget — the four ticks are inline SVG **and** animated |
| `amb-a` | `01-hero`, `02-who`, `03-do` | Containers |
| | `04-join` | **Form widget** or HTML widget. Ashley Green is named and must stay unlinked |
| `give-c` | `01-hero` | Container. Nothing here collects payment details; the amounts are links carrying a figure |
| | `03-matters`, `04-next` | Containers. The processor's form goes in the marked slot — Gravity Forms + embedded Stripe, as they run it now |
| `content-a` | `01-hero` | Container |
| | `02-browse` | HTML widget for the filter bar + **four Loop Grids**, one per band. `data-cms-item-attrs="data-type,data-topic"` |
| `content-b` | `01-hero` | Container |
| | `02-choose` | HTML widget (the four switches) |
| | `03-shelves` | **Six containers, no wrapper** — five shelves and the back link — each with a **Loop Grid**. `data-cms-item-attrs="data-type"`. Shelves can be added, deleted or reordered; nothing in them is order-dependent |
| `landing`, `landing-b` | `00-note` | **Do not convert.** Review furniture addressed to Empower, and the only two partials in the build that are not a `<section>` |
| | all others | Containers — and this page is the one to save as an Elementor **template**, since its whole purpose is to be duplicated and cut down |
| | `landing/06-reading` | **Loop Grid** |
| | `landing-b/03-outcome` | **Not** a Loop Grid — `data-cms="manual"`, three chosen posts in campaign order |

### Phase 2A foundations: the policies every later page inherits

Four rules the fourteen remaining page conversions build on top of, settled
while converting `podcast-a` and enforced by `test-elementor.mjs` rather than
left as things to remember:

- **Pages under conversion are published**, not previewed or password-gated,
  covered only by the install's own `robots.txt` disallowing every crawler.
  That choice was made because an authenticated Playwright session no longer
  sees what an anonymous visitor gets (preview bypasses the page cache), and
  a post password replaces the page's content with a form, which breaks the
  section and copy checks that read the real markup. It is safe exactly as
  long as `robots.txt` keeps disallowing everything, linked from nothing, so
  the harness checks that directly (`checkRobots()` in `fidelity.mjs`) rather
  than assuming it: if that file ever stops disallowing, nothing else would
  say so. Unpublishing a page under conversion is one command
  (`wp post update <id> --post_status=draft`).
- **The header and footer are Elementor Theme Builder parts**, built from
  `src/_shared/header-2.html` and `src/_shared/footer.html` and deployed with
  an Entire Site display condition. **A nav change means editing that static
  partial and redeploying it, never editing the live header or footer inside
  the Elementor editor:**

  ```bash
  set -a; . ./.env; set +a
  node elementor/theme-parts/deploy.mjs          # both parts
  node elementor/theme-parts/deploy.mjs header   # header only
  node elementor/theme-parts/deploy.mjs footer   # footer only
  ```

  This is the cost of the header's three verbatim HTML widgets (see the
  fourth exception, above, under "What each block becomes"): the markup
  that carries `aria-controls` pairs, the split Solutions item and the
  no-JS open-by-default contract lives in the partial, and an edit made
  only in Elementor is silently lost the next time the partial is
  redeployed. Anyone touching the nav later needs to know this before they
  reach for the editor.
- **`setConditions()` performs two writes, not one**, because assigning a
  Theme Builder part to a location is not satisfied by postmeta alone.
  Elementor Pro's `Conditions_Manager::get_location_templates()` resolves a
  location's documents from a cached option
  (`elementor_pro_theme_builder_conditions`), not by scanning postmeta at
  render time. A part whose `_elementor_conditions` postmeta is correct and
  whose cache is stale looks perfectly configured in the editor and renders
  nowhere, with nothing reporting it: Task 3 lost an hour to exactly this.
  `setConditions()` therefore writes the postmeta, regenerates the conditions
  cache the same way the editor does on save, and reads the option back to
  verify the post actually landed under the location before it returns.
- **A bridge rule overriding an Elementor container property needs two
  classes, not one.** Elementor resolves container flex-direction through
  `.e-con-full.e-flex{flex-direction:var(--flex-direction)}` at specificity
  0,2,0 (two classes), so a bridge rule written as a bare `.your-class` at
  0,1,0 (one class) loses that tie no matter how late it loads. Writing it as
  `.your-class.e-con` instead wins, because `bridge.css` is enqueued last.
  Measured directly on the container width and widget spacing rules in
  `wp/empowerms-child/css/bridge.css` during Task 7; the single most reusable
  fact this phase produced, and every later bridge rule overriding a
  container property needs it.

**The named handover point.** Once Empower has started editing a converted
page's content inside the WordPress editor, `deployPage()` (and any other
call that overwrites `_elementor_data` wholesale from this repository) must
stop being run against that page: a rebuild from the mapping modules here
would silently destroy Empower's own edits, with no warning and no way to
tell the two apart afterward. The handover point is per page, not a single
date for the whole conversion, and belongs in each page's own task report
once Empower has signed off on it and started using the editor.

**Two live editorial items, not code, and not to be lost:** attachment
20578, the site logo, has no alt text on the install, so the logo link
currently has no accessible name at all; and roughly 42 photographs in the
media library need alt text written before go-live. Neither is fixable from
this repository: they are WordPress media-library edits Empower or their
editor needs to make.

### Per page

The Header and Desktop nav columns below describe the **static build**: which
header partial and script each `dist/*.html` page links in its own `<head>`.
They do not describe what WordPress serves. As of Phase 2A the header (and
its stylesheet and script, `css/header-2.css` and `js/dropdown.js`) is a
site-wide Theme Builder part, enqueued unconditionally in
`wp/empowerms-child/functions.php` rather than kept in
`empower_page_styles()` / `empower_page_scripts()`'s per-page maps (see
"Phase 2A foundations" above). Every page converted so far gets `header-2`
and `js/dropdown.js` regardless of what this table says for its static
counterpart; the `current.html` / `homepage-a..d` row's mega-menu pair
(`header`, `js/megamenu.js`, `css/megamenu.css`) has no WordPress equivalent
at all, since none of those pages are part of the conversion. Only the
Stylesheets column still describes what a page needs enqueued per slug once
converted.

| Page | Header (static build only) | Desktop nav (static build only) | Stylesheets beyond tokens/components/site |
| --- | --- | --- | --- |
| `final.html` | `header-2` | `js/dropdown.js` + `css/header-2.css` | `homepage.css`, `motion.css`, `option-a.css`, `option-d.css`, `current-2.css`, `final.css` |
| `who-we-are-*` | `header-2` | `js/dropdown.js` + `css/header-2.css` | `motion.css`, `who-we-are-*.css` |
| `what-we-do-*` | `header-2` | `js/dropdown.js` + `css/header-2.css` | `motion.css`, `what-we-do-*.css` |
| `team-*` | `header-2` | `js/dropdown.js` + `css/header-2.css` | `motion.css`, `team-*.css` |
| `team-bio.html` | `header-2` | `js/dropdown.js` + `css/header-2.css` | `motion.css`, `team-bio.css` |
| `solutions-*` | `header-2` | `js/dropdown.js` + `css/header-2.css` | `motion.css`, `solutions-*.css` |
| `current.html`, `homepage-a..d` | `header` | `js/megamenu.js` + `css/megamenu.css` | `homepage.css`, `motion.css`, `option-*.css` |
| `epic-a/b/c.html` | `header-2` | `js/dropdown.js` + `css/header-2.css` | `motion.css`, `epic-*.css` |
| `mail-a/b.html`, `amb-a/b.html` | `header-2` | `js/dropdown.js` + `css/header-2.css` | `motion.css`, `mail-*.css` / `amb-*.css` |
| `give-a/b/c/d.html` | `header-2` | `js/dropdown.js` + `css/header-2.css` | `motion.css`, `give-*.css` |

`css/header-2.css` is the header's own stylesheet — utility strip, centred nav,
dropdown panels. In WordPress it is one global header block, enqueued
unconditionally, and this is the CSS that block needs. **A page that includes
`header-2.html` without it renders five permanently open panels across its
hero.** There is a test.

**Email Sign Up** and the **Ambassador Landing Page**, two readings each, built
2026-08-08. Empower chose Five Minutes and The Network on 2026-08-11. These two roadmap tabs are the only ones that end on an instruction
rather than a paragraph — "Insert signup form on webpage" and "Include interest
form for joining the ambassador program" — so unlike everything else in this
build they are shaped around a real form.

| Page | What it is |
| --- | --- |
| `dist/mail-a.html` | **Five Minutes** (*chosen 2026-08-11*). The form is in the hero, on a navy plate, above the fold at every width; the case for filling it in runs underneath, beside an actual Empower email, and the four things you receive are a ticked list against a photograph |
| `dist/mail-b.html` | **The Issue** — the form is the destination, so the page is a piece of publishing first: a photograph the width of the window, the argument on a navy band, and the four things you receive set like the contents of an issue, in display type on ruled lines that step in from the left |
| `dist/amb-a.html` | **The Network** (*chosen 2026-08-11*). The roadmap answers "who are our Ambassadors?" with a list of people, so this answers with faces: an offset mosaic of four photographs with the passage beside it, four ways as one band, and the interest form closing on navy |
| `dist/amb-b.html` | **The First Step** — one held frame instead of a crowd: a sticky left column keeps a single face and one sentence in view while both questions are answered on the right, then the form takes the last screen on its own |

The forms are real and there is no script behind them. Real `<label>` bound to
every control, `autocomplete` tokens on the name, email and county fields,
`type="email"` and native `required` on the address, a `<fieldset>` and
`<legend>` around the four involvement tick boxes, and 44px targets on each one.
At hand-off the `action` becomes the WordPress or Mailchimp endpoint and nothing
else about them changes. Tests assert every control is labelled, that the email
field is required and autocompletes, and that the submit is the page's single
orange action.

Two things to carry into the conversion:

- **The submit is the orange action; the hero button is a link to it.** On the
  two pages where the form sits at the foot (`mail-b`, both Ambassador
  readings), the roadmap's hero button is an in-page link and the form's submit
  takes the fill. Promoting both would put two orange actions on one page.
- **Ashley Green's name is not a link.** The roadmap names her in the Ambassador
  closing section. Her bio page does not exist, and a name that opens somebody
  else's bio is the failure Empower flagged on 2026-08-05 — the same reason Wil
  Ervin is not a link on Capitol Chat. A test checks every anchor on both
  readings, and separately checks the name is still present.

Photography on all four is stand-in, and the Ambassador tab explicitly asks to
"Include ambassador photos", which Empower still owe. Both Email Sign Up
readings also show a real Empower campaign email from the asset library, cropped
to its masthead, so the page shows what arrives rather than describing it. No
page invents a subscriber count, an open rate, or a testimonial.

**The live donate page is Gravity Forms with the Stripe add-on**, and the Stripe
Payment Element is embedded in Empower's own page. Nothing redirects to
stripe.com, no Payment Link, no hosted Checkout. Confirmed from the markup on
2026-08-12: `gravityforms 3.0.2`, `gravityformsstripe 7.0.3`, a
`stripe_creditcard` field and a `payment-element` mount. Three things follow.

- **There is nothing to hand off to.** The form lives on `/donate/` itself, so
  One Screen puts the choice above it and the form below it, on one page.
- **Gravity Forms can be driven by the URL.** A field with "Allow field to be
  populated dynamically" ticked and a parameter name set will fill in from a
  query string, so an amount tile can be a link. **It is not switched on today.**
  Six plausible parameter names were tested against the live form and none
  populated anything, so the names in this build (`gift_type`, `amount`) are
  ours, and swapping in the real ones is one edit per tile.
- **The card row is Stripe's.** Its contents are inside an iframe Stripe owns.
  We style the row around it and the label above it; that is the whole extent of
  it, and it will not match the rest of the form.

**Donate**, four readings, and **Empower chose One Screen on 2026-08-12.** A and B
were built 2026-08-08; Empower said neither landed and asked for something
simpler with the giving form higher up the page and fewer clicks. Two answers
took opposite routes: **One Screen** (2026-08-11) redesigns the giving decision
and holds the processor's part in a marked slot, **The Card** (2026-08-12) leaves
the decision exactly as it is today and redesigns the setting, copying Empower's
own form field for field. One Screen is the pick; the other three are in the
chooser's archive. The last tab in the roadmap and the only page in the build
that asks for money.

Three things are still owed before One Screen can be built for real, and they are
on the chooser as well as here: the dynamic-population parameter names for the
gift type and amount fields on Gravity Forms form 4 (the ones in the build are
stand-ins), the amount ladder, and confirmation that the page is `/donate/`.

| Page | What it is |
| --- | --- |
| `dist/give-a.html` | **Generational** — a photograph the width of the window, then a staircase: three plates stepping down and across with two photographs filling the gaps, because the copy's own picture of a gift is "one opportunity, one family, and one generation at a time". Amounts as a grid of tiles |
| `dist/give-d.html` | **The Card** (*built 2026-08-12*). A short navy banner carrying the EM pattern, and one card lifting out of it, overlapping the banner's lower edge and running down into the white body. Inside the card is Empower's live donation form drawn field for field: name, email, cell, the full address, the three gift types, the credit card notice and the total. Everything else on the page is centred behind it |
| `dist/give-c.html` | **One Screen** (*rebuilt 2026-08-12*). The two decisions that cost the clicks, how often and how much, on the first screen beside a short hero, carried into Empower's own form by the URL so nothing is stated twice. The form is not drawn here; The Card is the reading that reproduces it, and doing it on both made this page about the form rather than the choice |
| `dist/give-b.html` | **Next Chapter** — navy from the header down, with the ask as the only thing that changes colour: a white plate at the end of a dark scroll. The first screen is type alone, the reader's sentence answered by ours, and all the photography lands at once as four edge-to-edge panels. Amounts as a ruled list |

**No reading collects payment details, and that is not a style choice.** Card
numbers, expiry dates, security codes and bank details belong to the donation
processor; a field for any of them on a static page we hand over would be
collecting real card data with nothing behind it. The amount choices are links
that carry a figure to `/donate/give`, which is where the processor's page or
embed lives. On One Screen the dashed box inside the panel is a deliberate
placeholder for that embed, drawn at roughly the height the real form occupies;
it is a `<div>` with a name and a note, never a field.

**The Card needs saying twice, because it looks like an exception and is not.**
It reproduces the live form field for field, and every one of those fields is a
styled `<div>` with its label as text. There is no `<input>`, `<select>`,
`<textarea>`, `<button>`, `<label>` or `<form>` on the page. The facsimile is
`aria-hidden` and introduced by a note saying what it is, so a screen reader is
told about the card rather than walked through a form it cannot fill in. What
ships is Empower's Gravity Form styled to that drawing and dropped into the
card. Note that their own credit card row is already a notice rather than a
field until the payment condition is met, so copying the form exactly means
copying the notice.

`test.mjs` fails any of the four for a card, CVV, expiry or bank field, for a
`cc-` autocomplete token, and for any `<form>` in the main content at all; it
separately fails One Screen or The Card for any real control, and fails The Card
if it loses a field group, the credit card notice, the patterned banner or the
overlap.

Three things to settle before this ships:

- **`/donate/give` is a placeholder route.** Every amount, frequency and Donate
  Today link on all three readings goes there, and a test enforces it. The real
  target is the Gravity Forms donate page itself (or the anchor of the embedded
  form on it). Point it at the real one.
- **The ladder is a proposal, and it does not match the live form.** $25 / $50 /
  $100 / $250 / $500 are ours, on A, B and One Screen. The Card shows no ladder
  at all, and that is the reading rather than an omission: their form reveals the
  suggested amounts only once a gift type is chosen, and a test fails The Card if
  a ladder appears on it. Empower's live donate page runs a Gravity Forms
  form with a Stripe payment element, and its own ladder is a free-entry box for
  a one-time gift, $15 / $25 / $50 / $100 monthly, and $100 / $250 / $500 /
  $1,000 annually. Kienna said on 2026-08-11 that she liked the amounts we
  showed, so ours are what is built; switching to the live ladder means changing
  the figure allow-list in `test.mjs`, which is the point.
- **No page invents a total raised, a donor count or a progress bar.** The only
  figures on either reading are the suggested amounts and the roadmap's own
  501(c)(3) line, which is reproduced verbatim because it is a legal statement
  rather than marketing copy.

**All Content**, two readings, built 2026-08-12 after Kienna asked for a page
like the Georgia Center for Opportunity's (`foropportunity.org/content`) where a
visitor can browse and filter everything Empower publishes.

The roadmap's All Content tab is unusually thin: four content types with a
sentence under each, and a topic list headed "Filter by Topic:". No hero, no
headline, no image note. So both readings carry those four sentences and the
five topic labels word for word, and **every word above the filter on either
page is ours**, written to be replaced.

| Page | What it is |
| --- | --- |
| `dist/content-a.html` | **The Four Doors** — the roadmap's own four-column block standing up and working. The four types are bands down the page, each under its own sentence; choosing one narrows the page to it rather than sending you elsewhere. Type as tabs, topic as chips, both stacked against one label gutter in a sticky bar; a card per post, each carrying its own featured image, with a wide lead card across the head of each band |
| `dist/content-b.html` | **What It's About** — the same posts with A's two axes swapped. Subject is the structure: a shelf each for Quality Education, Meaningful Work and Public Safety with a photographed head, then Bill Summaries, then the two reports that cover all three. Type is the filter, and the roadmap's four sentences do that job as four columns on a navy band. Photography belongs to the subject, never beside a named person's headline |

**The content is real.** Twenty-three live empowerms.org posts with their real
titles, dates and URLs, pulled from the site's REST API, on both pages. A test
asserts the two show the *same* twenty-three, so the readings can be compared
without the content being a variable, and a second test asserts every link is an
empowerms.org URL rather than an invented headline.

**So are the photographs on A.** Every post in their archive carries a featured
image and A carries the same one on every card, taken from their own media
library and held in `assets/posts/` under the post's slug. That is what makes a
picture beside a headline safe: the image next to "How Karl Hampton Found
Freedom" is Karl Hampton rather than a library photograph that reads as him, and
a test fails the page if a card's image file and its link ever stop matching.
Alt text was written from the images themselves, because the file names in this
project have lied before. Five of the twenty-three are not photographs but cards
built at another ratio with their own type on them (the ten-year collage, the
Business Journal feature, the 2025 report cover, School Choice Week, WAITLIST
FUNDED); those are shown whole on the page's grey rather than cropped into the
3:2 plate, which would cut their words in half. B still keeps photography on the
subject in its shelf heads and off its rows, which is now a difference between
the readings rather than a constraint on both.

Two things about that content are ours and need Empower's word:

- **There is no Research & Reports category in their WordPress.** Those four
  items were gathered by hand from their report posts. The new site needs the
  category (or a tag) before this page can populate itself.
- **Bill Summaries is a category there and a topic here**, which is what the
  roadmap asks for. It has a visible consequence: every bill summary is written
  as an article, so pairing that topic with any other type returns nothing. Both
  readings answer that in words rather than with a blank grid, and a test fails
  either of them if the empty state disappears.

**Both filters run with no JavaScript**, the same `:has()`-over-real-inputs
mechanism as the podcast libraries, and both stylesheets gate the controls
behind `@supports` so a browser without `:has()` gets the full unfiltered list
instead of a dead panel. Two consequences, both stated on the chooser: a
filtered view cannot be linked to or bookmarked, and B's facet counts are of
what is on the page rather than of their archive. Both are a small script's work
in WordPress and neither is worth one here.

**The two facets in B use opposite shapes, and the order of the rules carries
the behaviour.** Type is single-valued per item, so it uses the hide-only shape
that composes with anything. Topic is multi-valued (an impact report carries all
three solution areas), so hide-only would turn OR into AND within the facet; it
uses hide-everything-then-reveal instead. A topic reveal can un-hide a row the
type facet hid, which would turn AND into OR across the two — the type rules
come last and are more specific, and a test fails the file if they are ever
reordered. Reading A sidesteps all of this by using radios, which is also what
the roadmap's own "All"-first list implies.

**The name is an open question.** The roadmap heads the tab "ALL CONTENT" and
then gives "Page Title: Empower Mississippi Commentary" at `/empower-commentary`.
Those describe two different pages, and the header nav shipped on all 45 builds
says All Content. Both readings use **All Content** at `/content`; the question
is on the chooser for Empower to answer, and the test that records the decision
is the line to change if they answer the other way. The roadmap leaves the SEO
title and description blank for this page, so both are still owed.

**The landing page template**, built 2026-08-12, in two readings. Kienna asked
to be able to start with a blank page in Elementor and build a campaign or event
page as needed. Elementor already gives her the blank page; what it cannot give
her is this build's decisions, so both pages are the other half of that ask: a
kit rather than a wireframe of a campaign. They carry the same campaign word for
word, and the difference between them is one decision, where the ask sits.

| Page | What it is |
| --- | --- |
| `dist/landing.html` | **The campaign kit** — six independent blocks, one section file each: campaign hero with one action, the ask with a three-point summary beside it, an image-and-text pair that flips and can run twice, a voice, the action band, three links out. The ask is block five, reached by a button in the hero. Best where the case needs making before anyone will act |
| `dist/landing-b.html` | **The held ask** — the ask moves out of the bottom of the page into a panel that stays beside the argument. One dark screen and it is the first one, with the photograph running off the right edge; then the case in the left column, the form held in the right. Best for a deadline, where every screen of scrolling between reader and action costs something |

Delete any block, reorder them, run one twice; nothing depends on what sits
above or below it. On A the unit is the section; on B the rail is one section
with two columns, so B's unit is the block inside the left column. A test
asserts both counts and the one-file-per-block structure.

Three properties of B are tested rather than trusted, because losing any one of
them turns it back into A with a narrower column: the panel is written **before**
the story (on a phone there is no second column, and markup order is what a phone
reader gets), it is **placed** into the second column on desktop so the visual
order is still story-then-panel, and it is **sticky** with an offset for the
sticky site header. The known cost, stated rather than discovered: on a desktop
the tab order reaches the ask before the argument. For a page that exists to be
acted on that is the right order, and the reading order still makes sense.

In Elementor, B needs one thing A does not: the right column's widget set to
sticky under Advanced, Motion Effects.

- **The sample is Empower's own Save Our ESA campaign**, which closed when the
  waitlist was funded in May 2025 — real name, real posts linked from it, so
  nothing reads as an invented programme. A strip at the top of the page says
  so; that strip is review-only chrome and is deleted at hand-off.
- **The Save Our ESA artwork is not used.** The file in their media library
  (`esa-email-mockup.jpg`) is an email mock-up whose body text is lorem ipsum.
  The hero carries a photograph instead. Note that the same file is captioned
  "Research report cover" on `dist/current.html`, which is wrong and predates
  this work.
- **Blocks are drawn as empty slots on purpose**: the quotation, because it
  belongs to a real person and inventing one — or lifting somebody's words out
  of an article to decorate a demo — is the placeholder that reads as finished
  work while being false; and the campaign form, because there is no endpoint
  behind either page. B adds one more, the date line under its headline: the one
  fact a deadline page has to state above the fold is the one fact a closed
  campaign cannot supply. A test fails either page for any `<input>`, `<select>`,
  `<textarea>` or `<form>` in its body, and for any figure written as a
  percentage, a money amount or a thousands-separated number.
- **B's photography needs a crop check, not just an alt check.** Its story
  photograph is a child with her face in the upper third of the frame, and the
  default centred `object-fit: cover` crop removed her head and left the page
  showing a torso. `object-position` is set per photograph, and swapping the
  image means redoing that line.

### Scroll-driven motion: what converts, and what to watch

Four pages use CSS scroll-driven animation — the three EPIC readings and **Email
Sign Up A**, the chosen Join Us page. It is worth being exact about what is
behind it, because it looks like the sort of thing a plugin did. **None of these
pages adds any JavaScript.** The scripts they link are the shared chrome every
page links — `js/nav.js`, `js/reveal.js`, `js/dropdown.js` — and nothing in the
sideways track, the drawn thread, the filling spine or the drawing tick is
scripted. Every one of those is `animation-timeline`, which converts as **custom
CSS**, not as a plugin, a widget setting or an embedded library.

Each signature and what it becomes:

| Page | The move | In Elementor |
| --- | --- | --- |
| EPIC A | The pinned track | Three nested containers: an outer one with `height: 240vh`, an inner one set sticky at `top: 0` and `height: 100vh`, and a flex row inside it at `width: max-content`. Elementor's Flexbox containers nest natively and take custom classes; the animation itself is CSS on those classes. Elementor's own sticky effect is **not** needed and should not be added on top |
| EPIC B | The staggered steps and the thread | A single container with a 12-column custom grid and one inline SVG in an HTML widget, positioned `inset: 0` behind the steps. The overlap of the navy plate on the hero is a negative top margin on the plate, which Elementor sets in the widget's own spacing controls |
| EPIC C | The spine | One wrapper container around all four sections, with an absolutely positioned 2px child. The wrapper is why `<main>` cannot be the positioning context — the skip link asserts `<main id="main">` verbatim across the build |
| `mail-a` | The drawing tick | The smallest of the four and the easiest to lose. Each of the four "what you receive" lines carries an inline SVG tick that draws itself as the line arrives (`animation-timeline: view()` over `stroke-dashoffset`). The SVG has to stay inline — an `<img>` or an icon widget cannot be animated from the page's CSS — so these four lines are an HTML widget, not an icon-list widget. The base state is a **finished** tick, so a browser that ignores the whole block still shows four ticked lines |

Three things to keep whoever does the conversion out of trouble:

- **Do not "improve" the guards away.** Every scroll-driven rule sits inside
  both `@supports (animation-timeline: …)` and
  `@media (prefers-reduced-motion: no-preference)`, over a layout that is a
  static composition without them. Strip either guard and the page stops being
  safe in a browser that lacks the feature, or for a reader who has asked for
  less motion. `test.mjs` fails the build if a declaration escapes its guard.
- **Where scroll-driven animation is unsupported, all four are still whole
  pages.** EPIC A becomes a normal three-column section, B's thread is simply
  drawn, C's spine is simply full, and `mail-a`'s ticks are simply ticked.
  Nothing is hidden waiting for a trigger — which is the failure this build has
  already shipped once, and the reason `css/motion.css` is gated the way it is.
- **The `data-reveal` attributes are the existing motion layer, not new.** Same
  choice as everywhere else: keep `css/motion.css` + `js/reveal.js`, or replace
  each attribute with an Elementor entrance animation. The note further up about
  not losing the header condense when you drop `reveal.js` applies here too.

Photography on all three is from the supplied library and stands in: it was shot
for the solution pages. Nothing in that library shows a neighbourhood, a street
or a reentry programme, so the Public Safety frame is the loosest of the three
and Empower owe a replacement. **That caveat lives here and on the chooser, not
on the pages** — the pages are what Empower show people, and a test fails any of
the three that grows a production notice in front of the reader.

### What the About pages are built to survive

They were written with this conversion in mind, so two constraints hold across
all six:

- **One section is one Elementor section.** Every overlap is a negative margin
  on a child of the section that owns it — never an absolutely positioned
  element reaching into the section below. Elementor sections take negative
  margins natively; an element that hangs out of its own section needs a
  z-index workaround and disappears the first time a later section is given
  `position`. The homepage's north-star card learned that, and `test.mjs` now
  asserts the About stylesheets never do it.
- **One stylesheet per variation, one namespace per stylesheet** — `.wa-`,
  `.wb-`, `.wc-`, `.da-`, `.db-`, `.dc-`. Converting the variation Empower pick
  means taking one file; the five that lose are deleted whole, and nothing they
  contain is load-bearing anywhere else. Also asserted.

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
- **The logo in vector.** Empower supplied their own reversed export on
  2026-08-03 (`assets/logo-reversed-300x136.png`, now the footer logo on every
  page); the header logo and the rest are still PNGs rendered from a PDF,
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
- **Twenty-three headshots**, for the team pages: ten staff, five fellows, eight
  board. Every portrait on all three variations is a marked monogram placeholder
  until they arrive. A has all 23, B gives discs to the staff only, C plates the
  staff and sets the other two groups as type.
- **Nine more staff bio pages.** The CEO's is built as the pattern; the copy for
  the other nine is in the Team tab and each staff card points at the CEO's page
  until they exist.
- **A decision on the two open brand-colour questions** in *Known accessibility
  issues* above.

## Not built

The four other pages in the design project's `ui_kits/website/` (Solutions Center,
Quality Education, The Latest, Join Us).
