import { container, text, html } from '../../factory.mjs';

/* Source of truth: dist/epic-a.html, the <section class="epa-method"> block
   (lines 254-275). Every class, string and attribute below is read from that
   file, not typed from memory.

   Structural decisions:

   1. `.em-container` AND `.epa-method__inner` ARE ONE DIV, matching source:
      `<div class="em-container epa-method__inner">`, a single element carrying
      both classes in that order.

   2. THE WHOLE `<ol class="epa-method__rows">` IS ONE html() WIDGET, and the
      same 2026-08-18 ruling that keeps the prose as three widgets names this
      block by hand as an instance the html() lever has already paid for: the
      lever "stays available ... where nothing inside the block needs to be a
      widget and the block is not prose Empower will edit", and it names
      "epic-a's method rows".

      WHAT THE BLOB ACTUALLY BUYS, stated precisely rather than as a list of
      everything that happens to be inside it, because two of the obvious
      answers are not costs at all:

        - `<ol>` and `<li>` survive as real tags. THIS is the load-bearing one.
          Elementor's container html_tag control offers neither, so built as
          containers the ordered list becomes four nested divs: the section
          stops being a list to assistive technology and loses the numbering
          semantics that are the whole content of this block, where the ORDER
          of the three steps is the argument. Rebuilding it with
          role="list"/role="listitem", the way 03-research.mjs has to for its
          panels, would recover the list and still not recover the ordering.
        - `.epa-method__row` keeps two REAL children as its grid items.
          css/epic-a.css:183-189 makes each row a two-track grid and :331 makes
          it one track under 900px. Built as containers the grid items would be
          the h3's and p's widget wrappers instead, which happens to lay out the
          same way but puts a wrapper between the row and everything the design
          measures against it.

      NOT costs, checked rather than assumed, and recorded so nobody re-argues
      them: css/epic-a.css:190's `.epa-method__row:last-child` would be correct
      either way (a container IS the element, and recipe section 6's own rule is
      "container target: no rule"), and :205's `.epa-method__row p` is a
      DESCENDANT selector, so it would keep matching through a widget wrapper
      too. The blob is chosen for the tags, not for those two.

      :193-198's `.epa-method__row::before` draws each step's node on the rail,
      positioned from the row's own left edge with
      `left:calc(-1 * var(--epa-rail) - 3px)`. `--epa-rail` is declared on
      `.epa-method` (:150) and inherits down, so it reaches the rows whatever
      sits between.

   3. THE RAIL IS ITS OWN html() WIDGET, two nested empty <span>. It cannot be
      a container (a container is a div, and an empty div carrying
      `position:absolute` would work, but the rail's fill is a second nested
      element and neither has any content, so there is nothing a widget would
      buy). `aria-hidden="true"` is authored inside the string, on the real
      <span>, matching source.

      css/epic-a.css:162-167 gives it `position:absolute;top:0;bottom:0;
      left:var(--gutter)`, resolved against `.epa-method__inner`'s
      `position:relative` (:155). Both classes travel in the markup, so the
      containing block is unchanged. THE ONE THING TO CHECK ON THE LIVE PAGE
      rather than assume: whether any Elementor wrapper between the two computes
      `position:relative`, which would re-parent the absolute box. Checked, and
      recorded in this task's report.

      The widget wrapper itself is a flex item of `.epa-method__inner` and costs
      no height, because its only child is out of flow, and no gap, because
      bridge.css zeroes Elementor's `--widgets-spacing` defaults site-wide.

   4. THE SCROLL-DRIVEN FILL NEEDS NOTHING, and this is the build's first
      conversion of a `view-timeline`. css/epic-a.css:302-310 names
      `view-timeline:--epa-method block` on `.epa-method__inner` and drives
      `.epa-method__rail-fill` from it, inside `@supports (animation-timeline:
      view())` inside `prefers-reduced-motion:no-preference`. Three properties
      make it survive, and all three were confirmed on the live page rather than
      argued:

        - a timeline name is looked up on ANCESTORS, and the fill stays a
          descendant of `.epa-method__inner` whatever Elementor inserts between
          them;
        - `.epa-method__inner` keeps `position:relative` and its `padding-left`
          because both ride on the class, and the class travels in the markup;
        - the animation is `scaleY` on a 2px bar, not a dash offset, so it is
          not the shape that breaks under non-uniform scale.

      The base state is a rail already filled orange, so failing either
      condition leaves the finished state rather than an empty one. That is the
      motion layer's standing rule in this build and it is unchanged by
      conversion.

   5. THE HEADING IS A text() WIDGET CARRYING A BARE <h2>, never a heading()
      widget. No heading() import above. The id travels on the <h2> itself, so
      the section's aria-labelledby="method-title" resolves to the heading
      element. */

const TITLE = 'How EPIC Turns Research Into Solutions';

/* Copied from dist/epic-a.html:257. */
const RAIL = '<span class="epa-method__rail" aria-hidden="true">'
  + '<span class="epa-method__rail-fill"></span>'
  + '</span>';

/* Copied from dist/epic-a.html:261-274, `data-reveal` authored on the real
   <li> exactly as source has it: inside an authored string the real element
   carries it, which is one wrapper closer to the static DOM than a
   wrapper-level attribute. The `&amp;` in the first step name is the source's
   own entity. */
const ROWS = '<ol class="epa-method__rows">'
  + '<li class="epa-method__row" data-reveal="rise">'
  + '<h3 class="epa-method__step">Listen &amp; Define</h3>'
  + '<p>Hear from Mississippians and use available data to clearly define the problem.</p>'
  + '</li>'
  + '<li class="epa-method__row" data-reveal="rise">'
  + '<h3 class="epa-method__step">Research</h3>'
  + '<p>Produce credible, state-specific research that explains what is happening, why it matters, '
  + 'and what the evidence shows.</p>'
  + '</li>'
  + '<li class="epa-method__row" data-reveal="rise">'
  + '<h3 class="epa-method__step">Design Solutions</h3>'
  + '<p>Turn those findings into practical policy solutions designed for Mississippi’s needs and realities.</p>'
  + '</li>'
  + '</ol>';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'epa-method',
      content_width: 'full',
      _attributes: 'aria-labelledby|method-title',
    },
    [
      container({ cssClass: 'em-container epa-method__inner', content_width: 'full' }, [
        html({ markup: RAIL }),
        text({
          markup: `<h2 class="epa-method__title" id="method-title">${TITLE}</h2>`,
          _attributes: 'data-reveal|rise',
        }),
        html({ markup: ROWS }),
      ]),
    ],
  );
}
