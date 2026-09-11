import { container, text, link } from '../../factory.mjs';

/* Source of truth: dist/solutions-b.html, the <section class="sb-research">
   block (lines 242-255). Every class, string and attribute below is read
   from that file, not typed from memory.

   No structural surprises here: two headings, two paragraphs and one
   outline button, all of them plain text()/link() widgets. `.sb-research
   __panel` climbs over the section above it with a negative top margin in
   css/solutions-b.css; nothing here needs to know about that, it is the
   static build's own CSS reaching a converted DOM that keeps the panel a
   direct child of `.em-container`, matching the source. Checked: css/
   solutions-b.css has no child-combinator rule inside this section (the
   file has none at all, see 02-track.mjs's own note), so nothing here needs
   a bridge rule. */

const HEADLINE = 'Research That Drives Solutions';
const LEDE = 'Effective solutions start with understanding the problem.';
const BODY = 'Our research examines the challenges facing Mississippi, identifies opportunities for improvement, and provides practical recommendations grounded in data and real-world experience.';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'sb-research',
      content_width: 'full',
      _attributes: 'aria-labelledby|research-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'sb-research__panel', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            container({ cssClass: 'sb-research__head', content_width: 'full' }, [
              text({
                markup: `<h2 id="research-title">${HEADLINE}</h2>`,
                _attributes: 'data-reveal|rise',
              }),
              text({
                markup: `<p class="sb-research__lede">${LEDE}</p>`,
                _attributes: 'data-reveal|rise',
              }),
            ]),
            container({ cssClass: 'sb-research__body', content_width: 'full' }, [
              text({
                markup: `<p>${BODY}</p>`,
                _attributes: 'data-reveal|rise',
              }),
              link({
                label: 'Explore Research',
                href: '/latest',
                cssClass: 'em-btn em-btn--outline em-btn--md',
                _attributes: 'data-reveal|rise',
              }),
            ]),
          ],
        ),
      ]),
    ],
  );
}
