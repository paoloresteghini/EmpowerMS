import { container, text } from '../../factory.mjs';

/* Source of truth: dist/landing.html, the <div class="lnd-note"> block
   (lines 168-177). Every class, string and attribute below is read from that
   file, not typed from memory.

   THIS IS NOT PART OF THE TEMPLATE AND IT IS DELETED AT HAND-OFF. It is its
   own module, numbered 00, for exactly that reason: one import to drop out of
   page.mjs and one container to delete in Elementor's Navigator, and nothing
   else on the page changes. css/landing.css:37-39 calls it "Not part of the
   design. Review-only chrome"; dist/landing.html:168-171 calls it "REVIEW
   CHROME, and the only element on this page that does not convert".

   IT WAS CONVERTED ANYWAY, and that is a decision rather than an oversight.
   Fidelity on this branch is measured against the static build: census(),
   controlBoxes() and layoutInvariants() all compare the live page against
   dist/landing.html, and this strip is inside <main> there
   (dist/landing.html:172, immediately after <main id="main"> at :167). A
   converted page that silently omitted it would differ from the signed-off
   page in a way no instrument could distinguish from a defect, and would push
   every section below it up by the strip's own height. Converting it and
   deleting it deliberately is the honest order of those two operations.

   HOW TO DELETE IT, so the hand-off step is one action rather than a hunt.
   The strip is the FIRST top-level container on the page, above BLOCK 1's
   `.lnd-hero` section, and it is the only element on the page carrying the
   class `lnd-note` and the attribute `role="note"`. In Elementor's Navigator
   it is the first row under the page root. Deleting that one container removes
   the whole strip, its paragraph included; nothing else references it, no
   selector on the page reaches into it, and `css/landing.css`'s two `.lnd-note`
   rules simply stop matching. The equivalent in this repository is deleting
   this file's import and its entry from page.mjs's `sections()`.

   Structural decisions:

   1. THE CONTAINER IS 'full' like every other container in this build, for the
      reason every prior section module records: a boxed container inserts
      div.e-con-inner between itself and its children.

   2. `role="note"` RIDES ON THE CONTAINER through `_attributes`, which accepts
      any pair except `id` (give-c/01-hero.mjs note 7 records Elementor's
      silent refusal of an `id` pair, which is what `_element_id` exists for).
      Nothing on this strip needs an id.

   3. THE PARAGRAPH IS ONE text() WIDGET carrying the whole <p>, `<strong>`
      included. There is no prose repair to pay here and it was walked rather
      than assumed: css/landing.css:40-42 is the only rule reaching this
      paragraph, it is a DESCENDANT selector (`.lnd-note p`), so it keeps
      matching through the widget wrapper, and there is exactly one paragraph,
      so no structural pseudo-class and no sibling margin can be in play.

      `margin:0 auto` on that paragraph is what centres the strip's text at the
      container measure, and it survives: the widget wrapper is a flex item of
      `.lnd-note` and stretches to its full width, so the paragraph's `auto`
      margins resolve against the same box they resolve against in the static
      build. Measured after deploying rather than reasoned about here.

   4. THE SOURCE COMMENT (168-171) IS CARRIED at the top of the paragraph's own
      markup, the first authorable point inside the strip, per the convention
      education/03-problem.mjs note 7 records: a container cannot carry a
      comment, because Elementor renders container markup itself, but a
      widget's own markup string reaches the page unaltered.

      IT NOW CONTRADICTS THE PAGE, and it is carried anyway. The comment says
      this strip "does not convert"; it did. The static build is frozen and is
      the source of truth, so the comment is quoted rather than corrected, and
      the correction lives here and in the task report. It is also useful where
      it is: whoever opens the converted page in Elementor reads, in the page's
      own markup, that this block is meant to be deleted.

   5. THE EM DASH IN THE COPY IS THE SOURCE'S. dist/landing.html:175 puts one
      between "funded in May 2025" and "real words and real links", and census()
      keys on the element's own text, so normalising it to a comma or a hyphen
      would change the key, drop this paragraph out of the shared set and stop it
      being compared at all. The same rule every string in every module on this
      branch follows for the source's curly apostrophes.

      SO EVERY U+2014 IN THIS DIRECTORY IS QUOTED, NEVER AUTHORED. It appears in
      COPY strings and in carried source COMMENTS only, and this note is the one
      place the policy is written down. No prose written for this build uses one,
      here or in bridge.css, functions.php, register.mjs or the task report. */

/* Copied from dist/landing.html:168-171, indentation included. */
const NOTE = '<!-- REVIEW CHROME, and the only element on this page that does not convert.\n'
  + '     It exists so nobody reading the page in isolation mistakes a worked example\n'
  + '     for a live campaign, and so nobody mistakes the sample copy for approved\n'
  + '     copy. Delete this include when the template is handed off. -->';

/* The curly apostrophe and the em dash below are the source's
   (dist/landing.html:173-176), reproduced byte for byte rather than normalised,
   per note 5. The four source lines are joined with single spaces, which is
   what census()'s own whitespace normalisation reduces the static build's
   newlines and indentation to. */
const COPY = '<strong>This page is a template.</strong> Every block below is a slot to duplicate, reorder or '
  + 'delete. The sample content is Empower’s own Save Our ESA campaign, which '
  + 'closed when the waitlist was funded in May 2025 — real words and real links, '
  + 'so nothing here reads as an invented programme.';

export function section() {
  return container(
    { cssClass: 'lnd-note', content_width: 'full', _attributes: 'role|note' },
    [text({ markup: `${NOTE}\n<p>${COPY}</p>` })],
  );
}
