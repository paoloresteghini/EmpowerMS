import { readFileSync } from 'node:fs';
import { container, text } from '../../factory.mjs';

/* THE TERMS, converted. Same shape as elementor/pages/privacy/01-doc.mjs, and
   that module's five notes apply here unchanged: the prose is read from the
   built page rather than retyped, `.ps-body` is one text() widget with its
   class on the wrapper because css/post-single.css is written for that, the
   head's classes are in the markup, and the whole document is one widget so
   Empower edit it as a document.

   THE ONE DIFFERENCE IS THE DATELINE, and it is the whole difference between
   the two pages. This document states "Last updated: 01/22/2025" in its own
   text; the privacy policy states no date anywhere. So this module carries a
   second widget in the head and the privacy module does not, rather than both
   carrying one and this build deciding what to print in it. The dateline is
   lifted out of the prose into the head deliberately: left where the source
   puts it, `.ps-body`'s lede treatment would set "Last updated: 01/22/2025"
   larger than the sentence telling a reader what they are agreeing to. Both
   halves of that are asserted by test.mjs.

   THE PAGE IS TITLED "Terms of Service" WHILE THE DOCUMENT CALLS ITSELF "Terms
   of Use" AND ITS OLD PAGE WAS TITLED "Terms and Conditions". Three names, all
   Empower's. The page and the footer link agree with each other, because a link
   disagreeing with its destination is the version a reader actually trips over;
   the body keeps every "Terms of Use" the text itself uses. Listed in
   docs/legal/README.md as a question for Empower rather than settled here. */

const DOC = 'dist/terms.html';

export function documentBody(file = DOC) {
  const html = readFileSync(file, 'utf8');
  const m = html.match(/<div class="ps-body">\n([\s\S]*?)\n\s*<\/div>/);
  if (!m) throw new Error(`${file}: no .ps-body block found — has the section shape changed?`);
  const body = m[1].trim();
  if (body.length < 500) throw new Error(`${file}: .ps-body is ${body.length} bytes, too short to be the document`);
  return body;
}

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'lg-doc',
      content_width: 'full',
      _attributes: 'aria-labelledby|terms-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'lg-head', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: '<h1 id="terms-title">Terms of Service</h1>',
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: '<p class="lg-date">Last updated: 01/22/2025</p>',
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
        text({ markup: documentBody(), cssClass: 'ps-body' }),
      ]),
    ],
  );
}
