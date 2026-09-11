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
   when it is a CONTAINER, and this section's own `<ul>` is neither: it is
   the html() widget's own markup, untouched by Elementor's wrapping at all.)

   No cssClass passed to html() here, matching `.tl-line`'s own choice: the
   class and the data-reveal attribute both live on the real `<ul>` tag
   inside the markup string, not routed through the widget's own wrapper via
   cssClass/`_attributes`, so js/reveal.js and css/what-we-do-a.css see
   exactly the element they saw in the static build. */

const HEADLINE = 'View our annual reports:';

/* THE FOUR REPORTS, AND WHERE EACH ONE ACTUALLY LIVES.
 *
 * dist/what-we-do-a.html writes these as `/reports/<year>`, which is a route
 * that has never existed on this install. elementor/links.mjs recorded all four
 * as NO_CONVERTED_PAGE so they could not be mistaken for an oversight, and the
 * project's own todo carried them as "the one link defect the remap does not
 * fix". Paolo asked for them wired up on 2026-08-20, so they are.
 *
 * WHAT THEY POINT AT NOW: the report PDFs in Empower's own media library.
 * Every URL below was taken from the announcement post that Empower published
 * for that year's report, NOT from a filename match and NOT from the
 * attachment's parent, and that distinction caught a real trap. Attachment
 * 16797 (`EM-Annual-Report-FINAL.pdf`) has post 16794, the 2022 announcement,
 * as its POST PARENT, so a parent-based match would have chosen it. That post's
 * own body links attachment 16810 (`2022-Annual-Report-web-1.pdf`) instead. The
 * attached file and the published file are two different PDFs, and only one of
 * them is the one Empower actually released.
 *
 * All four were checked live on 2026-08-20 and return 200 with
 * Content-Type: application/pdf.
 *
 * EMPOWER CHANGED THE NAME AND THE HEADING DID NOT. 2022 is an "Annual
 * Report"; 2023, 2024 and 2025 are each an "Impact Report". The heading above
 * this list still reads "View our annual reports:", which is the signed-off
 * copy, so it is left alone and the discrepancy is Empower's to settle. Nothing
 * here renames anything.
 *
 * THESE ARE ABSOLUTE URLS ON PURPOSE, and they are the only absolute internal
 * URLs this page carries. A media-library file is not a route: it has no page,
 * no slug, and nothing for elementor/links.mjs's remap to key on, so writing it
 * as a path would be inventing a shape the install does not have.
 *
 * NO `target="_blank"`. dist/what-we-do-a.html's own anchors carry none, and
 * the static build is frozen. That means a 2022 click replaces the page with a
 * 50 MB PDF, which is worth knowing and is on the task report as Empower's
 * call rather than settled quietly here. */
const REPORTS = [
  {
    year: '2025',
    /* Post 20396, "Empower MS Releases 2025 Impact Report", 2026-03-02. */
    href: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/03/2025-EM-Impact-Report-.pdf',
  },
  {
    year: '2024',
    /* Post 19392, "2024 Impact Report: Celebrating 10 Years Of Service In
       Mississippi", 2025-02-18. */
    href: 'https://empv2.wpenginepowered.com/wp-content/uploads/2025/02/2024-EM-Impact-Report-for-Web.pdf',
  },
  {
    year: '2023',
    /* Post 17643, "Empower releases 2023 impact report", 2024-02-19. */
    href: 'https://empv2.wpenginepowered.com/wp-content/uploads/2024/02/EM-Impact-Report.pdf',
  },
  {
    year: '2022',
    /* Post 16794, "Empower releases 2022 annual report", 2023-03-02. This is
       the one with the decoy attachment; see the note above. 50 MB. */
    href: 'https://empv2.wpenginepowered.com/wp-content/uploads/2023/03/2022-Annual-Report-web-1.pdf',
  },
];

const yearMarkup = ({ year, href }) => `<li><a href="${href}"><span>${year}</span>Report</a></li>`;

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
      ${REPORTS.map(yearMarkup).join('\n      ')}
    </ul>`,
            }),
          ],
        ),
      ]),
    ],
  );
}
