import { container, text, image, link } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/epic-a.html, the <section class="epa-research"> block
   (lines 285-326). Every class, string and attribute below is read from that
   file, not typed from memory.

   Structural decisions:

   1. THE SECTION ID GOES ON THE CONTAINER THROUGH `_element_id`, NEVER
      `_attributes: 'id|research'`. Elementor's attributes control refuses `id`
      silently: the deploy succeeds, the page renders, and the anchor simply
      does not exist. `_element_id` on a container works, measured on
      solutions-b, and every id on this page was verified after deploy by
      fetching the live page and grepping for it, never by the deploy's exit
      code.

      It has to land on the element carrying `.epa-research`, because
      css/epic-a.css:211 gives that class its own `scroll-margin-top:100px`,
      which the design put there so the hero's "Dive Into the Research" link does
      not land under the sticky header. The same holds one level down: each
      panel's id sits on the container carrying `.epa-area`, whose own
      `scroll-margin-top:120px` is at :241.

   2. THE THREE PANELS ARE CONTAINERS AND HAVE NO CHOICE, which is the one place
      on this page where the html() lever is unavailable. Each `<li class=
      "epa-area">` holds a PHOTOGRAPH, and photographs stay image() widgets by
      design so Empower can change them through the media library.

      So the `<ul>` and its three `<li>` are lost, and the list semantics are
      carried by ARIA instead: role="list" on the container that was the `<ul>`,
      role="listitem" on each panel, the same shape
      elementor/pages/solutions-b/02-track.mjs uses for `.sb-stations`.

      THE CSS COST IS ZERO, and that is checked rather than assumed: no rule in
      css/epic-a.css addresses `li` inside `.epa-research__areas` by tag. The
      only two `li`-by-tag rules on the page are :96 and :341, and both name
      `.epa-hero__arealist`, which 01-hero.mjs keeps inside one authored string
      for exactly that reason.

      `.epa-research__areas` is `display:grid;grid-template-columns:
      repeat(auto-fit,minmax(260px,1fr))` (:231-235) and its three grid items are
      real containers, so no widget wrapper sits between the grid and its items.
      That is what should make this construct safe from the seventh cost
      category, which bit `amb-a`'s `.aba-ways` (bridge.css block 14) through the
      same `auto-fit` shape sitting inside an html() widget instead. Measured
      across this page's middle band rather than assumed; the widths are in this
      task's report.

   3. `.epa-area__photo` IS A CLASS THAT LIVES ON THE `<img>`, and this is the
      page's one image repair. The static build writes
      `<img class="epa-area__photo" ...>` (dist/epic-a.html:294, :303, :312), and
      image() has no markup of its own: its cssClass goes to the widget WRAPPER
      (elementor/factory.mjs, WIDGET_CSS_CLASS_KEY), so the class would land on a
      <div> and the <img> would get none of it.

      THE CLASS IS STILL PASSED, and that is not a contradiction: it is the
      same shape `.em-join__wash` and `.c2-panel__bg` already use
      (bridge.css's "Decorative washes sized through a class ON THE <img>"
      block). The cssClass goes on the WRAPPER, which is where `margin-bottom`
      belongs anyway, and bridge.css reaches the real <img> through
      `.epa-area__photo img`. ONE class covers all three panels, so it is one
      repair in one block.

      WHAT HAPPENS IF THE CLASS IS DROPPED INSTEAD, measured rather than
      reasoned, because dropping it looks cleaner and is wrong:
      layoutInvariants() keys every element carrying a non-platform class and
      asserts the live and static key sets are EQUAL, so with no class on the
      live side `epa-area__photo`, `#2` and `#3` become three static-only keys
      and the suite goes red naming them. Measured on the first deploy of this
      page, which did exactly that.

      The one declaration deliberately NOT restated on the <img> is
      `margin-bottom`: a wrapper margin separates the same two boxes, so it
      still does its job where it lands, and restating it on the <img> as well
      would pay it twice. That decision is measured, not reasoned; the numbers
      are in bridge.css's own comment.

   4. `.epa-area__latest` IS A SHORTCODE NOW, not an html() widget carrying a
      typed <a href>. See note 8; what note 4 used to say about link() still
      holds and is why the shortcode, rather than a Loop Grid, renders it.

      link() would put the class on the widget WRAPPER and hand the anchor
      Elementor's `.elementor-button` chrome, which the existing
      `.elementor .em-btn a.elementor-button{all:unset}` group does not reach:
      that group is named to `.em-btn`, and this is not one.

      The two `data-cms` attributes are still written INSIDE the string, on the
      real <a>, matching source. They are the build's own marker for a field
      that comes from a query, and a wrapper-level attribute would move the
      marker off the element it describes.

      What it costs: the link stops being retargetable from Elementor's own
      panel. Same cost `.mla-receive__back`, `.wa-jump`, `.ta-jump` and
      `.sb-more` already accepted. These three are the "most recent report" links
      the page's own copy marks as CMS-driven, so they are the least likely
      anchors on the page to be retargeted by hand.

   5. `.epa-research__cta` IS A `<p>` IN SOURCE, BUILT AS A CONTAINER HOLDING A
      link(), which is recipe section 7's shape and what makes this a Shape C
      site. A link() widget's own wrapper always renders as a div (widgets have
      no html_tag control, only containers do), so the `<p>` cannot be reproduced
      literally either way; built as a container the CTA stays a real,
      retargetable link() through Elementor's own panel, the same choice every
      other page's primary CTA in this build makes.

      THE COVERAGE COST, recorded as a cost rather than as a neutral
      restructure, and it is TWO keys on this one element:

        - `p|View Research & Reports` exists on the static side and not on the
          live one, so it drops out of census()'s shared set entirely rather than
          being compared and passing;
        - `a|View Research & Reports` drops out of the box sweep, because
          controlBoxes() skips any anchor inside `.elementor-widget-button` by
          design.

      Both are accounted for in this page's register floors
      (elementor/pages/register.mjs), together with the third key
      01-hero.mjs's own link() costs. Semantically cheap: css/epic-a.css:274's
      `.epa-research__cta{margin:...}` is a bare class selector, not
      `p.epa-research__cta`, so nothing depends on the wrapping element being a
      `<p>`.

      THE SHAPE C REPAIR THIS FORCES. `.epa-research__cta` declares nothing but a
      margin, so once it is an Elementor flex column its one child takes the
      default `stretch` and the `.em-btn` wrapper fills the container's cross
      axis where the design draws a pill. Repaired in bridge.css alongside the
      other `align-self:flex-start` sites. Checked before writing: no ancestor of
      this element declares `text-align`, so `flex-start` is the whole repair
      here and not the half-repair the audit's defect 10 found on capitol-a.

   6. THE TWO HEADINGS AND EVERY PARAGRAPH ARE text() WIDGETS carrying the
      build's own element and class, never heading() widgets. No heading() import
      above. The section's aria-labelledby="research-title" resolves to the <h2>
      itself.

   7. ALT TEXT IS AN OPEN EDITORIAL ITEM ON ALL THREE PHOTOGRAPHS, and one of the
      three (20581, child-classroom-tablet) was not previously in the decisions
      document at all and was added by this task. media.mjs records each against
      docs/elementor/phase2b/2026-08-18-alt-text-decisions.md. Nothing is written
      to the install.

   8. THE THREE REPORTS COME FROM A QUERY, 2026-09-09, and this is the last of
      the three places on the site that held a hand-written list of research.
      The homepage insights band and content-a's Research band went first; this
      one waited on the same thing they did, a Research & Reports category
      existing at all, and it now does (created from Kienna Horn's own list).

      Each panel's `data-cms-note` had ALREADY CLAIMED this since the static
      build: "only this title, its href and the date below it come from a
      query". It was not true. The three titles were typed, and one of them
      (Charter Schools, June 2026) is not on Empower's own list of reports, so
      the page named a post as its newest research report that Empower does not
      count as research.

      WHAT IT IS NOT: a Loop Grid. The full argument is in
      wp/empowerms-child/inc/epic-research.php's docblock, measured against
      Elementor Pro's own source on the install. In short, the query is "in
      Research & Reports AND in this focus area", Elementor collapses two
      categories into one OR, so the query has to be PHP either way; and once
      it is PHP, a Loop Grid adds four wrappers inside a flex column, a fourth
      Loop Item template to create at cutover, and STILL needs a shortcode for
      the anchor, because of what note 4 says about link().

      SO THE PANEL IS UNCHANGED ABOVE THE FOLD. The photograph and the area
      name are design and stay authored widgets; the label, the link and the
      date are one text() widget holding one shortcode. The rendered DOM is the
      static build's, element for element.

      THE LABEL MOVED INTO PHP with the other two. An area with no tagged
      report renders nothing at all rather than "Most recent report" over a
      gap. All three carry one today; the empty case is one untick away. */

const TITLE = 'Research Designed to Lead Somewhere';
const LEAD = 'Explore reports, data, policy briefs, and practical recommendations on the issues shaping '
  + 'opportunity in Mississippi.';

/* The CMS note moved to wp/empowerms-child/inc/epic-research.php, which is now
   the only place that writes these two elements. It was held here as a constant
   for the same reason it is held as a constant there: six identical strings
   that must stay identical are six chances to drift. */

const AREAS = [
  {
    id: 'area-education',
    area: 'education',
    photo: 'teacher-smartboard',
    name: 'Quality Education',
  },
  {
    id: 'area-work',
    area: 'work',
    photo: 'hands-with-product',
    name: 'Meaningful Work',
  },
  {
    id: 'area-safety',
    area: 'safety',
    photo: 'advocates-outside-capitol',
    name: 'Public Safety',
  },
];

const area = (a) =>
  container(
    {
      cssClass: 'epa-area',
      content_width: 'full',
      _element_id: a.id,
      _attributes: 'role|listitem\ndata-reveal|rise',
    },
    [
      image({ ...photo(a.photo), cssClass: 'epa-area__photo' }),
      text({ markup: `<h3 class="epa-area__name">${a.name}</h3>` }),
      /* The label, the report link and its date, all three from one shortcode.
         See note 8 above and wp/empowerms-child/inc/epic-research.php. The
         widget's content is the BARE shortcode on its own line, which is the
         shape Elementor's shortcode_unautop() pass is built for; nesting it
         inside an authored element risks it coming back wrapped in a <p>. */
      text({ markup: `[empower_epic_latest_report area="${a.area}"]` }),
    ],
  );

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'epa-research',
      content_width: 'full',
      _element_id: 'research',
      _attributes: 'aria-labelledby|research-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container({ cssClass: 'epa-research__head', content_width: 'full' }, [
          text({
            markup: `<h2 class="epa-research__title" id="research-title">${TITLE}</h2>`,
            _attributes: 'data-reveal|rise',
          }),
          text({
            markup: `<p class="epa-research__lead">${LEAD}</p>`,
            _attributes: 'data-reveal|rise',
          }),
        ]),
        container(
          {
            cssClass: 'epa-research__areas',
            content_width: 'full',
            _attributes: 'role|list\ndata-reveal-group|',
          },
          AREAS.map(area),
        ),
        container(
          { cssClass: 'epa-research__cta', content_width: 'full', _attributes: 'data-reveal|rise' },
          [
            link({
              label: 'View Research &amp; Reports',
              href: '/latest',
              cssClass: 'em-btn em-btn--secondary em-btn--lg',
            }),
          ],
        ),
      ]),
    ],
  );
}
