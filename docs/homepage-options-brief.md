# Homepage options — design brief

Four complete alternative homepages for empowerms.org, built so Empower can
pick one. Plus the existing reference build, kept for comparison.

## Source of truth

Content is the **Homepage** section of *Empower Mississippi Website Refresh
Roadmap* (Google Doc, Kienna Horn). Every headline, subhead, section intro,
solution promise, "Real Solution" paragraph and Join Us block is used verbatim.
The doc's funnel is the page's spine and is not reordered:

| # | Section | Funnel stage |
|---|---|---|
| 1 | Hero | Awareness |
| 2 | How Change Happens | Interest |
| 3 | Three Foundations of Opportunity | Consideration |
| 4 | Mississippi Stories | Trust |
| 5 | Latest Insights | Authority |
| 6 | Join Us | Action / conversion |

Copy written for this build rather than supplied by Empower is limited to:
the five steps of the Empower Solutions Model (the doc names the model but
supplies no steps), and the CMS placeholder strings that mark dynamic slots.
Both are flagged in the README.

## Fixed across all four

Identity is not up for grabs — these are four compositions of one brand, not
four brands.

- **Colour** — Empower Blue `#003C50`, Empower Orange `#E65A28`, Light Blue
  `#64A0B4`, the grey ramp. Brand & Style Guide p.14–15.
- **Type** — Gotham (display) and Whitney (body), with Figtree and Source Sans 3
  standing in until the licences arrive.
- **Chrome** — one header with the five mega menus, one footer. Site chrome is
  `css/site.css` and `src/_shared/`, shared by every option.
- **Voice** — "you", not "we". Empowering, never pitying. One orange filled
  button per page.
- **Bar** — WCAG 2.2 AA, reduced motion honoured, works without JavaScript,
  no horizontal scroll at 320px with 200% text.

## What differs

The design direction is: elegant and credible for a policy think tank, but not
boring; welcoming to families; visibly the work of a senior team. Concretely
that ruled out the obvious answer — a stack of full-width bands, each with a
centred heading and three cards. **Every option below has a spatial system that
survives past the fold and one signature interaction.**

### Option A — Front Porch

*Interlocking mosaic.* Photography and copy overlap; elements straddle section
boundaries so the page never reads as a sequence of bands. The north-star card
sits across the hero seam. Foundations are three panels at staggered vertical
offsets. Stories pins a portrait while quotes scroll past it.

The warmest of the four, and the most obviously about families. Anchor
reference: the Pelican Institute's hopeful register, composed like a
photographic essay rather than a brochure.

### Option B — The Index

*Persistent armature.* A sticky left rail carries a live section index and the
reader's position; the right column changes rhythm section to section against
generous margins. Hairline rules, tabular numerals, real negative space.

Signature interaction: Foundations is an index, not a card grid — move through
the three rows and each one's photographic plate cross-fades alongside.

The credibility option, aimed at the lawmaker/journalist/donor read. Deliberately
not editorial-magazine pastiche: no display serif, no drop caps, no broadsheet
columns. The grammar is a well-set contents page, not a magazine cover.

### Option C — The Atlas

*Horizontal motion inside a vertical page.* The Solutions Model is a horizontal
rail you scroll, drag or arrow through. The three Foundations are a segmented
switcher driving one large photographic stage. Stories runs as a quote rail.

The most overtly interactive of the four, and the one that most rewards a
visitor who arrived to look around rather than to read.

### Option D — The Throughline

*Pinned stage.* A full-height photographic stage holds one side of the viewport
and swaps image as the narrative column scrolls past it, with an orange line
drawn down the page connecting the six stages. Cards break out over the stage
edge.

The most cinematic, and the closest to the doc's own framing — the homepage as
a journey where each section builds on the one before it.

## Gates

The impeccable craft flow has user gates before code. Paolo was asleep and
explicitly delegated the creative decisions for this run, so the shape brief
above stands in for them and the visual-direction-by-generation step was
skipped — this harness has no native image generation, which collapses that
gate into the brief either way.
