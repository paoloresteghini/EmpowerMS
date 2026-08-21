import { container, text, image, html } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: src/current-2/sections/03-foundations.html. Third source
   directory of the four this page composes from; see page.mjs.

   Three panels, each a background photograph with a body over it. Three
   decisions, all of them forced by something measured or read rather than
   preferred.

   1. .c2-panel__more IS ONE html() WIDGET, NOT A CONTAINER. It holds a <p> with
      an inline <b>, and a <span class="c2-panel__cue"> carrying an inline SVG
      arrow. Inline SVG is the spec's original html() exception, so the SVG
      alone would justify it. The stronger reason is css/current-2.css:319,
      `.c2-panel__more>*{min-height:0;overflow:hidden}`, a CHILD combinator: it
      is the rule that makes the panel's reveal-on-hover clip correctly. If the
      paragraph and the cue became separate widgets, each would sit inside its
      own wrapper div and `>` would match the wrappers instead of the content,
      so the rule would apply to the wrong boxes. Putting the whole block in one
      html() widget keeps <p> and <span> as real direct children of the element
      carrying the class, because html() emits its markup directly inside the
      widget wrapper with no intermediate container level on this install.

      That last fact is load-bearing and is Phase 2A's, not a guess: the header's
      own html() widgets were confirmed against the live DOM to produce
      div.elementor-widget.elementor-widget-html with the markup as its direct
      children, with no .elementor-widget-container level for this widget type.

   2. THE PANEL HEADING IS A text() WIDGET CARRYING <h3><a>…</a></h3>, not a
      heading() widget with a link control. Source is
      `<h3><a href="/quality-education">Quality Education</a></h3>`; text()'s
      markup passes an anchor through exactly as authored, so nothing here
      needs Elementor's heading widget or its separate link control. Class-
      in-markup migration (2026-08-17) converts every heading() on this page
      to text(), which is what removes Elementor's own heading widget from
      these three cards and, with it, the frontend.min.css line-height:1
      default the bridge stylesheet used to repair for this element. The
      link itself is unaffected: it is still a real, retargetable
      <a href> in the markup, only no longer routed through a widget
      control that Empower would open the editor to find.

   3. THE BACKGROUND PHOTOGRAPHS ARE DECORATIVE AND MUST STAY THAT WAY, and one
      of them is the awkward case media.mjs warns about. In source all three
      carry alt="" aria-hidden="true". Two of the three attachments were
      imported with empty alt because every use of them in this build is
      decorative. The third, child-classroom-tablet, is decorative HERE and
      meaningful in 05-insights, and an attachment has exactly one alt text, so
      it was given the meaningful one. That means this section cannot rely on
      the attachment being empty: it sets aria-hidden on the widget wrapper,
      which removes the img and its alt from the accessibility tree regardless
      of what the media library says. The other two get the same treatment for
      consistency and for the same reason the hero's aside does: alt="" alone
      leaves an unlabelled presentational node in the tree, and it would be
      undone the day somebody writes alt text onto the attachment.

      Checked: css/current-2.css has no `.c2-panel>img` child rule (its only
      child-combinator rule in this section is the .c2-panel__more one above),
      so the image widget's wrapper does not break the background positioning,
      which is done by `.c2-panel__bg` on the img itself. The cssClass therefore
      has to reach the img, and it does not: image() puts cssClass on the widget
      WRAPPER. This is the one thing in this section that is expected to need a
      bridge rule, and it is left to be confirmed by measurement rather than
      pre-emptively written, per the phase's own rule that no bridge rule lands
      without the live measurement that justified it. */

const HEADLINE = 'Three foundations of opportunity';
const LEDE = 'The American Dream is built on opportunity, but it isn’t always within reach. That’s why we turn research into action, partnering with communities and leaders to advance practical solutions that help more Mississippians succeed. We believe lasting change starts with the foundations that shape your everyday life.';

const CUE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';

const PANELS = [
  {
    photo: 'child-classroom-tablet',
    href: '/quality-education',
    title: 'Quality Education',
    promise: 'You want to know your child has every opportunity to succeed.',
    solution: 'We’re advancing practical education solutions that expand educational opportunity, empower parents, and help every child reach their full potential.',
  },
  {
    photo: 'worker-workshop-bw',
    href: '/meaningful-work',
    title: 'Meaningful Work',
    promise: 'Working hard should open doors, not leave you struggling to get ahead.',
    solution: 'We’re advancing workforce solutions that connect more Mississippians to meaningful careers, strengthen our workforce, and create more opportunities to succeed.',
  },
  {
    photo: 'grandparents-grandchild',
    href: '/public-safety',
    title: 'Public Safety',
    promise: 'You should feel safe in the community you call home.',
    solution: 'We’re advancing practical public safety solutions that strengthen communities, promote accountability, and create safer neighborhoods where opportunity can thrive.',
  },
];

const panel = (p) =>
  container(
    { tag: 'article', cssClass: 'c2-panel', content_width: 'full', _attributes: 'data-reveal|rise' },
    [
      image({
        ...photo(p.photo),
        cssClass: 'c2-panel__bg',
        _attributes: 'aria-hidden|true',
      }),
      container({ cssClass: 'c2-panel__body', content_width: 'full' }, [
        text({ markup: `<h3><a href="${p.href}">${p.title}</a></h3>` }),
        text({ markup: `<p class="c2-panel__promise">${p.promise}</p>` }),
        html({
          cssClass: 'c2-panel__more',
          markup: `<p><b>Real Solution:</b> ${p.solution}</p>
          <span class="c2-panel__cue" aria-hidden="true">Learn More ${CUE_SVG}</span>`,
        }),
      ]),
    ],
  );

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'c2-foundations',
      content_width: 'full',
      _attributes: 'aria-labelledby|foundations-title',
    },
    [
      container(
        {
          cssClass: 'c2-foundations__head em-container',
          content_width: 'full',
          _attributes: 'data-reveal-group|',
        },
        [
          text({
            markup: `<h2 id="foundations-title">${HEADLINE}</h2>`,
            _attributes: 'data-reveal|rise',
          }),
          text({
            markup: `<p class="c2-foundations__lede">${LEDE}</p>`,
            _attributes: 'data-reveal|rise',
          }),
        ],
      ),
      container(
        {
          cssClass: 'c2-panels em-container',
          content_width: 'full',
          _attributes: 'data-reveal-group|',
        },
        PANELS.map(panel),
      ),
    ],
  );
}
