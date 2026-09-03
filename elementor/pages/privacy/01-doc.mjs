import { readFileSync } from 'node:fs';
import { container, text } from '../../factory.mjs';

/* THE PRIVACY POLICY, converted.

   Source of truth: dist/privacy.html, the one <section class="lg-doc"> block.
   Structure below is read from that file rather than typed from memory, the
   same discipline every other page module in this directory follows.

   1. THE PROSE IS READ FROM THE BUILD, NOT RETYPED. Every other module in this
      directory holds its copy as string constants, and that is right for copy
      that was composed for a design. This is a legal document: it is 600 words
      of Empower's own text, it is already asserted verbatim against a captured
      original by test.mjs, and retyping it here would create a SECOND place for
      it to drift from that capture with nothing comparing the two. So the body
      is lifted straight out of dist/privacy.html at deploy time. The static
      build is already the artifact the transcription test guards, which makes
      it the right source for the conversion as well.

   2. `.ps-body` IS ONE text() WIDGET AND ITS CLASS IS ON THE WRAPPER, which is
      the one place this page deliberately does NOT put a class in the markup.
      css/post-single.css was written for exactly that arrangement and says so:
      the class lands on the widget wrapper and every rule that reaches a real
      element is a descendant selector (`.ps-body p`, `.ps-body h2`, and the
      880px measure on the wrapper itself). Putting it in the markup instead
      would leave the wrapper unclassed and break the measure rule, which is
      keyed on `.elementor-widget.ps-body`. The static build's own
      `<div class="ps-body">` is the same box in the same relationship.

      It must also be a DIRECT CHILD of an e-con for that measure rule to
      match, which is why it sits inside `.em-container` rather than being
      nested any deeper.

   3. ONE WIDGET FOR THE WHOLE DOCUMENT, not one per paragraph. A legal document
      is edited as a document: Empower will paste a revised policy in, not
      re-word its fourth bullet. One text widget is what makes that a single
      edit in Elementor rather than eleven. It is still a text() rather than an
      html() blob for the reason Paolo's 2026-08-18 ruling gives, and it matters
      more here than anywhere else in the build: prose keeps its widget so the
      client can edit it, and the page pays whatever repair that costs.

   4. THE HEAD'S CLASSES ARE IN THE MARKUP, unlike the body's. `.lg-date` and
      the `id` the section's aria-labelledby points at both have to land on the
      real elements, so they are authored inside the text widgets. `.lg-head`
      is a container because css/legal.css hangs the 56x4 mark off it with
      `::before` and needs `position:relative` on a real box.

   5. NO DATELINE ON THIS PAGE. The privacy policy states no date; see
      docs/legal/README.md and the test that holds the absence open. The terms
      module is the same file with one extra widget, and that widget is the
      whole difference. */

const DOC = 'dist/privacy.html';

/* Lifted from the built page rather than retyped, per note 1. The match is
   anchored on the two class names this build authors, so a change to the
   section's shape fails loudly here instead of silently deploying a fragment. */
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
      _attributes: 'aria-labelledby|privacy-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'lg-head', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: '<h1 id="privacy-title">Privacy Policy</h1>',
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
        text({ markup: documentBody(), cssClass: 'ps-body' }),
      ]),
    ],
  );
}
