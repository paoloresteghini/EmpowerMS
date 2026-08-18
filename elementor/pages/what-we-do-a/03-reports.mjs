import { container, text, html } from '../../factory.mjs';

/* Source of truth: dist/what-we-do-a.html, the <section class="da-reports">
   block. Every class, string and attribute below is read from that file, not
   typed from memory.

   `.da-years` IS AN html() WIDGET, THE SAME EXCEPTION AND THE SAME REASON
   final/02-solutions.mjs's `.tl-line` uses it. Source is a real <ul> of four
   <li><a>, and Elementor's container html_tag control offers neither ul nor
   li (div, header, footer, main, article, section, aside, nav, a only). A div
   tree in its place would announce nothing to a screen reader where the
   source announces "list, 4 items"; the four report years are exactly the
   kind of enumerable, orderless-but-still-a-list content <ul> exists to mark
   up. Checked before choosing: css/what-we-do-a.css has THREE child-combinator
   rules in total (`.da-doors>:nth-child(2|3)` and `.da-door__body>p`), and
   all three belong to the other section on this page, none to `.da-reports`,
   so wrapping the list in a widget cannot break a selector expecting it to
   sit at a particular DOM depth. (The discriminator that actually predicts
   this, corrected after review round 1: a child combinator only breaks when
   its right-hand side is content another module builds as a WIDGET, never
   when it is a CONTAINER, and this section's own `<ul>` is neither — it is
   the html() widget's own markup, untouched by Elementor's wrapping at all.)

   No cssClass passed to html() here, matching `.tl-line`'s own choice: the
   class and the data-reveal attribute both live on the real `<ul>` tag
   inside the markup string, not routed through the widget's own wrapper via
   cssClass/`_attributes`, so js/reveal.js and css/what-we-do-a.css see
   exactly the element they saw in the static build. */

const HEADLINE = 'View our annual reports:';

const YEARS = ['2025', '2024', '2023', '2022'];

const yearMarkup = (year) => `<li><a href="/reports/${year}"><span>${year}</span>Report</a></li>`;

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'da-reports',
      content_width: 'full',
      _attributes: 'aria-labelledby|reports-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'da-reports__slab', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            container({ cssClass: 'da-reports__head', content_width: 'full' }, [
              text({
                markup: `<h2 id="reports-title">${HEADLINE}</h2>`,
                _attributes: 'data-reveal|rise',
              }),
            ]),
            html({
              markup: `<ul class="da-years" data-reveal="rise">
      ${YEARS.map(yearMarkup).join('\n      ')}
    </ul>`,
            }),
          ],
        ),
      ]),
    ],
  );
}
