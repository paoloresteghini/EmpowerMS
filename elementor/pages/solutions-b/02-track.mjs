import {
  container, text, image, html,
} from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/solutions-b.html, the <section class="sb-track">
   block (lines 187-238). Every class, string and attribute below is read
   from that file, not typed from memory.

   Structural decisions:

   1. `.sb-stations` IS AN <ol> OF THREE <li>, BUILT AS A CONTAINER TREE
      CARRYING role="list"/role="listitem", NOT AS AN html() WIDGET.

      This was a NEW decision, not a copy of an existing one, reviewed and
      APPROVED by team-lead (2026-08-18), on the ground that
      css/solutions-b.css styles this whole section entirely by class, with
      no `ol`/`li` element selector anywhere in the file, and `.sb-stations`
      itself sets `list-style:none`: a div tree carrying the same classes
      styles identically and the markers were never visible either way.

      Elementor's container html_tag control offers div, header, footer,
      main, article, section, aside, nav and a. It offers neither ol nor li,
      the same gap final/02-solutions.mjs's `.tl-line` and
      what-we-do-a/03-reports.mjs's `.da-years` both hit. Both of those
      chose html() and passed the whole list through as a raw markup string,
      because every station in the list at hand had a decorative dot, a
      short label and a body with no photograph. THIS list is different:
      each station carries a real, meaningful photograph
      (`.sb-station__media img`), and this build's own rule is that every
      photograph is an image() widget. html() markup is a raw string; it
      cannot contain an actual nested widget, so wrapping the whole <ol> in
      one html() call the way `.tl-line`/`.da-years` did would mean building
      the photographs as plain <img> tags inside that string instead, which
      the brief for this page rules out directly ("Every photograph is an
      image()").

      final/02-solutions.mjs's own comment considered role="list"/
      role="listitem" and rejected it, but that rejection assumed a real
      <ol>/<li> was the alternative on the table (which it was, there, since
      nothing in that list needed to be a widget) and judged the ARIA-patched
      div tree worse than the real thing available. That comparison does not
      hold here: the real thing is not available (the photographs force a
      container tree), so the actual choice is div-with-no-role versus
      div-with-role, and role="list"/role="listitem" clearly wins that one,
      restoring the "list, 3 items" / "item 2 of 3" announcement at the cost
      of two custom attributes per node on four nodes, the same per-node cost
      final's own comment names, paid here because the better option this
      page does not have.

      Checked before choosing: css/solutions-b.css has NO child-combinator
      rules anywhere in the file (confirmed by grep; its only `>` appears
      inside a comment, not a selector), so nesting `.sb-station` inside
      `.sb-stations` as containers rather than as real <li> elements cannot
      break a selector expecting a particular DOM depth. `.sb-station:
      nth-child(2)` selectors still work: containers with content_width
      'full' insert no e-con-inner wrapper, so each `.sb-station` remains a
      direct DOM child of `.sb-stations`, preserving the sibling positions
      those :nth-child rules depend on. CONFIRMED live (2026-08-18,
      team-lead, a depth-tracking DOM scan of the deployed page): `.sb-
      stations` has exactly three direct children, all `.sb-station`
      containers, nothing of Elementor's inserted between them. The
      alternating layout (FIVE rules in css/solutions-b.css: lines 97, 99
      and 128, plus two inside the 780px media query at 183 and 186;
      corrected in fix round 1, this comment previously undercounted at
      four and omitted 186, caught in review as M1) renders correctly at
      both 1440 and 390, confirmed by eye against the deployed page's own
      screenshots.

      THE COST OF THIS DECISION, recorded rather than left implicit, and
      CORRECTED in fix round 1 after review (M2) caught the first version
      overstating it: a role="listitem" that is a direct child of a
      role="list" DOES get its position-in-set announced, the same as a
      real <li> would (<ol> and <ul> both map to the single ARIA role
      "list", so "item 2 of 3" survives here). The actual residual loss is
      only the ordered-versus-unordered distinction itself, which most
      screen readers do not announce either way and which the static
      build's own `list-style:none` had already suppressed visually.
      Accepted, not silently dropped, and arguably not even a net loss:
      Safari and VoiceOver strip list semantics entirely from a real list
      carrying `list-style:none`, so the explicit role="list"/
      role="listitem" pair used here may be MORE accessible than a genuine
      <ol> styled the same way would have been.

   2. `.sb-station__node` IS A DECORATIVE, EMPTY CONTAINER, the same pattern
      as this page's own `.sb-hero__lead-in` (01-hero.mjs) and
      final/04-stories.mjs's `.em-rule`: no <figcaption>-equivalent content,
      styled entirely by background/transform in CSS.

   3. <figure> BECOMES A DIV CONTAINER for `.sb-station__media`, the same
      substitution this build has made everywhere a <figure> carries no
      <figcaption>.

   4. EVERY STATION PHOTOGRAPH IS MEANINGFUL, NOT DECORATIVE. Source: a real
      alt on every <img>, no aria-hidden anywhere in `.sb-station__media`.
      See media.mjs for the one alt-text conflict this creates
      (child-classroom-tablet, station 1) and how it is handled.

   5. THE HEADING IS A text() WIDGET CARRYING A BARE <h3>, never heading().
      No `heading()` import above. `<h3>Quality Education</h3>` carries no
      class in source, styled entirely by `.sb-station h3` (a descendant
      selector, not a child combinator, so it is unaffected by Elementor's
      wrapper insertion either way).

   6. `.sb-more` IS AN html() WIDGET CARRYING A REAL <a href>, not a
      decorative span. This was also a new combination, reviewed and
      APPROVED by team-lead (2026-08-18): css/solutions-b.css needs the SVG
      inline in the anchor's own markup either way, since `.sb-more svg`
      sizes the icon and `.sb-more:hover svg` translates it on hover.
      `.sb-more` is a real, only-instance CTA link (there is no other <a>
      anywhere in the station the way `.da-door`'s `<h3><a>` gives that
      section a separate real link for `.da-door__cue` to sit decoratively
      beside): its href is the actual navigation target
      (/solutions/education, /solutions/work, /solutions/safety), so it
      cannot be built as a decorative aria-hidden span the way
      `.da-door__cue`/final's `.c2-panel__cue` are. It also carries an inline
      <svg> that css/solutions-b.css animates on hover
      (`.sb-more:hover svg{transform:translateX(4px)}`), which needs the SVG
      to be a real DOM descendant of the hovered `.sb-more` element for that
      selector to reach it, ruling out a link() widget (Elementor's button
      widget has no control that emits this build's own inline SVG markup;
      only an icon-library icon, a different asset and a different render)
      with a separate sibling widget for the icon. Built with html() for the
      same reason exception #1 in the design spec is inline SVG in an HTML
      widget (`mail-a/03-receive`'s CSS-animated ticks): the SVG here is
      likewise CSS-animated and there is no native route to it. No cssClass
      passed to html(): the real class sits on the `<a>` tag directly in the
      markup string, the same choice `.da-years`/`.tl-line` made for their
      own outer tag, so css/solutions-b.css's `.sb-more` and `.sb-more svg`
      rules reach the real elements with nothing in between.

      Checked before choosing: css/solutions-b.css has no child-combinator
      rule involving `.sb-more`, so wrapping it in html()'s own widget
      wrapper breaks nothing that expected it at a particular DOM depth.

      THE TRAP TEAM-LEAD NAMED FOR THIS ONE, checked directly rather than
      assumed safe: `.sb-more{display:inline-flex;min-height:24px}`
      (css/solutions-b.css:35) is the exact shape of a defect that has hit
      this project three times, a declared inline-level display that comes
      back wrong once its element stops being a flex ITEM. In the static
      build `.sb-more` sits inside `.sb-station__copy`, an ordinary block
      container, not a flex context, so the trap's precondition was never
      met here either way; measured live and static at both 1440 and 390
      (2026-08-18) to confirm rather than reason it away: the anchor's own
      computed display is `inline-flex` on both sides at both widths, and
      its measured box (height 24px; width 208.75/202.31/211.55px for the
      three stations) is IDENTICAL live and static in every case. The
      html() wrapper (`.elementor-widget-html`, block) does measure taller
      than the anchor inside it (27.19px against the anchor's 24px), the
      same shape as Task 1.5's Join Us wrapper-vs-anchor pixel, but it
      costs nothing here: nothing in css/solutions-b.css keys off that
      wrapper's own height, and the full fidelity sweep (both instruments,
      both widths, see the task report) found no difference anywhere in
      `.sb-station__copy` beyond the four deferred photographs, so the
      extra wrapper height never reaches anything measurable. No bridge
      rule needed. */

const HEADLINE = 'Solutions That Expand Opportunity';

const arrowSvg = () =>
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" '
  + 'stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';

const STATIONS = [
  {
    photo: 'child-classroom-tablet',
    href: '/solutions/education',
    title: 'Quality Education',
    promise: 'Every child deserves the opportunity to learn, grow, and reach their full potential.',
    body: 'We work to expand educational opportunity, empower parents, and ensure more Mississippi students have access to an education that meets their needs and prepares them for what comes next.',
    cue: 'Explore Quality Education',
  },
  {
    photo: 'worker-workshop-bw',
    href: '/solutions/work',
    title: 'Meaningful Work',
    promise: 'Every Mississippian should have the opportunity to build a meaningful career and create a better future.',
    body: 'We work to connect more people with meaningful work, strengthen Mississippi’s workforce, and advance solutions that help individuals and families build greater stability and opportunity.',
    cue: 'Explore Meaningful Work',
  },
  {
    photo: 'grandparents-grandchild',
    href: '/solutions/safety',
    title: 'Public Safety',
    promise: 'Opportunity grows when people feel safe in the places they live, work, and raise their families.',
    body: 'We work to advance practical public safety solutions that promote accountability, improve outcomes, and help build safer, stronger communities across Mississippi.',
    cue: 'Explore Safe Communities',
  },
];

const station = (s) =>
  container(
    { cssClass: 'sb-station', content_width: 'full', _attributes: 'data-reveal|rise\nrole|listitem' },
    [
      container({ cssClass: 'sb-station__node', content_width: 'full', _attributes: 'aria-hidden|true' }),
      container({ cssClass: 'sb-station__copy', content_width: 'full' }, [
        text({ markup: `<h3>${s.title}</h3>` }),
        text({ markup: `<p class="sb-station__promise">${s.promise}</p>` }),
        text({ markup: `<p class="sb-station__body">${s.body}</p>` }),
        html({
          markup: `<a class="sb-more" href="${s.href}">${s.cue}
            ${arrowSvg()}
          </a>`,
        }),
      ]),
      container({ cssClass: 'sb-station__media', content_width: 'full' }, [
        image({ ...photo(s.photo) }),
      ]),
    ],
  );

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'sb-track',
      content_width: 'full',
      _element_id: 'solutions',
      _attributes: 'aria-labelledby|solutions-head',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        text({
          markup: `<h2 id="solutions-head" class="sb-track__head">${HEADLINE}</h2>`,
          _attributes: 'data-reveal|rise',
        }),
        container(
          { cssClass: 'sb-stations', content_width: 'full', _attributes: 'data-reveal-group|\nrole|list' },
          STATIONS.map(station),
        ),
      ]),
    ],
  );
}
