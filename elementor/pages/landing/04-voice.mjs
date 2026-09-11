import { container, text, html } from '../../factory.mjs';

/* Source of truth: dist/landing.html, the <section class="lnd-voice"> block
   (lines 275-299). Every class, string and attribute below is read from that
   file, not typed from memory.

   BLOCK 4 OF SIX, INDEPENDENT OF THE OTHER FIVE, and the one css/landing.css's
   own header names as the block a campaign will most often delete ("Delete
   block 4"). Deleting it means dropping one import and one entry from
   page.mjs's array; nothing else on the page reads anything this module builds.

   THE SLOT STAYS A SLOT. dist/landing.html:275-283 argues why and the argument
   is not overridden here: the quotation belongs to a real person, and inventing
   one for a template, or lifting somebody's words out of an article to decorate
   a demo, is the one placeholder that would read as finished work while being
   false. `data-placeholder="quote"` is carried verbatim on the real
   <blockquote>, where it is the hand-off contract that says this space is held
   open on purpose.

   Structural decisions:

   1. CONTAINERS ARE 'full', per 01-hero.mjs note 1.

   2. THE WHOLE <figure> IS ONE html() WIDGET, and that is forced by the tags
      rather than chosen for convenience. Elementor's
      Utils::validate_html_tag falls back to 'div' for any tag outside
      ALLOWED_HTML_WRAPPER_TAGS, and that list holds a, article, aside, button,
      form, div, footer, h1 to h6, header, main, nav, p, section and span, and
      NO figure, NO figcaption and NO blockquote (read off the install on
      2026-08-18, recorded at who-we-are-a/04-people.mjs). Built as containers
      this block would be three nested <div>s.

      SPLITTING IT WAS CONSIDERED AND REJECTED. A container for `.lnd-quote`
      with the blockquote and the figcaption as their own widgets would keep
      those two tags, because markup authored inside a widget string reaches the
      page unaltered, but it would leave a <figcaption> whose parent is a <div>,
      which is a figcaption outside a figure and is not valid markup. One blob
      keeps the whole figure/blockquote/figcaption relationship intact, which is
      the part of this block that is worth anything: the block's own comment
      says "What the block fixes is the SHAPE".

      AND IT HOLDS A PRICED REPAIR AT ZERO. css/landing.css:160 is
      `.lnd-quote__by{display:flex;flex-wrap:wrap;align-items:baseline;
      gap:var(--space-2) var(--space-4)}`, a `display:flex` with no
      `flex-direction`, which is the SIXTH cost category and is exactly what
      `.lnd-hero__actions` pays a bridge rule for in 01-hero.mjs note 4. It
      costs nothing here because the figcaption is a real element inside an
      authored string rather than an Elementor container, so
      `.e-con-full.e-flex{flex-direction:var(--flex-direction)}` can never
      reach it. Same mechanism give-c/01-hero.mjs note 5 records for its two
      lists, and the measurement is in the report rather than assumed: the
      counterfactual was run by giving the figcaption Elementor's own column
      direction in the browser and reading what moved.

      THE REVEAL LAYER IS BYTE-IDENTICAL FOR THE SAME REASON. The source puts
      `data-reveal-group` on the <figure> and `data-reveal="rise"` on the
      <blockquote> and the <figcaption>; inside one blob all three reach the
      page authored, on the same three elements, so js/reveal.js's
      `closest('[data-reveal-group]')` resolves exactly as it does in the static
      build. Split across widgets, the group would sit on a container and the
      two rises on widget wrappers, which is the standing convention elsewhere
      on this page but would be a needless difference here.

      WHAT IT COSTS, stated so the trade is legible: the quotation and the two
      caption lines are edited in a code field rather than a rich-text one.
      That is the correct trade for THIS block and would not be for block 2's
      prose: the whole point of a slot is that it is replaced as a unit, and
      what a campaign drops in here is a quotation, a name and a role together,
      not a paragraph edited in place.

      WHAT IT DOES NOT COST: census() counts <blockquote> among the elements it
      compares, and the blockquote survives as a blockquote, so its key stays on
      both sides. Building it as a container would have dropped it.

   3. `.lnd-quote`'s CENTRING SURVIVES THE WIDGET WRAPPER, predicted and then
      measured. css/landing.css:151 is `.lnd-quote{margin:0 auto;max-width:64ch}`,
      and the html() wrapper is a flex item of `.em-container` which stretches
      to its full width, so the figure's `auto` margins resolve against the same
      box they resolve against in the static build.

   4. THE VISUALLY HIDDEN HEADING IS ITS OWN text() WIDGET, carrying the class
      in the markup on the real <h2> and the `id` the section's
      `aria-labelledby` points at. css/site.css:46 makes it
      `position:absolute`, so it is out of flow on both sides and its widget
      wrapper contributes no height; measured rather than assumed.

   5. THE SECTION COMMENT (275-283) is carried at the top of that heading's
      markup, the first authorable point inside the section, per
      education/03-problem.mjs note 7.

   6. NO PROSE REPAIR AND NO MARGIN COLLAPSE. `.lnd-quote__slot p` (:156-158)
      is the only paragraph rule in this block, it is a descendant selector with
      no structural pseudo-class anywhere near it, and the paragraph it names is
      inside the blob in any case. Nothing on this page declares a top margin
      (02-ask.mjs note 7). */

/* Copied from dist/landing.html:275-283, indentation included. The middot, the
   two em dashes and the curly apostrophe are the source's, per 00-note.mjs
   note 5. */
const BLOCK_NOTE = '<!-- BLOCK 4 · A VOICE\n'
  + '     Drawn as a SLOT rather than filled, and that is the honest thing to do:\n'
  + '     the quotation belongs to a real person, and inventing one for a template —\n'
  + '     or lifting somebody’s words out of an article to decorate a demo — is the\n'
  + '     one placeholder that would read as finished work while being false.\n'
  + '\n'
  + '     What the block fixes is the SHAPE: one quotation, one name, one line saying\n'
  + '     who they are, held to a reading measure in the middle of the field, and\n'
  + '     nothing else competing with it. -->';

const HEAD = 'A voice from the campaign';

/* Copied from dist/landing.html:287-297, attribute order and indentation
   included. `data-placeholder="quote"` is the hand-off contract and is carried
   verbatim; see the header. The three source lines of the quotation are joined
   with single spaces, which is what census()'s whitespace normalisation reduces
   the static build's newlines and indentation to. */
const QUOTE = '<figure class="lnd-quote" data-reveal-group>\n'
  + '      <blockquote class="lnd-quote__slot" data-placeholder="quote" data-reveal="rise">\n'
  + '        <p>One quotation from someone the campaign is about, in their own words. '
  + 'Two or three lines is the size that carries; longer and it stops being '
  + 'a voice and becomes another paragraph.</p>\n'
  + '      </blockquote>\n'
  + '      <figcaption class="lnd-quote__by" data-reveal="rise">\n'
  + '        <span class="lnd-quote__name">Their name</span>\n'
  + '        <span class="lnd-quote__role">Who they are, in six words</span>\n'
  + '      </figcaption>\n'
  + '    </figure>';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'lnd-voice',
      content_width: 'full',
      _attributes: 'aria-labelledby|voice-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        text({ markup: `${BLOCK_NOTE}\n<h2 class="em-visually-hidden" id="voice-title">${HEAD}</h2>` }),
        html({ markup: QUOTE }),
      ]),
    ],
  );
}
