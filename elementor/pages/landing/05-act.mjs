import { container, text } from '../../factory.mjs';

/* Source of truth: dist/landing.html, the <section class="lnd-act"> block
   (lines 300-324). Every class, string and attribute below is read from that
   file, not typed from memory.

   BLOCK 5 OF SIX, INDEPENDENT OF THE OTHER FIVE, and the page's one dark field.
   css/landing.css's header states the colour strategy it belongs to: "white and
   the subtle grey for the argument, ONE navy field and it is the action".

   THE SLOT STAYS A SLOT, and the reason is the same one the Donate readings
   gave: there is no endpoint behind this page, and a form that looks real and
   goes nowhere is worse than a marked space. NO REAL FORM IS BUILT HERE, no
   Elementor form widget, no Gravity Forms shortcode, nothing that collects
   anything. `data-placeholder="form"` is carried verbatim on the container,
   where it is the hand-off contract naming the space that a petition, a
   legislator lookup, a sign-up or a share sheet drops into.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, per 01-hero.mjs note 1.
      `.lnd-act__grid` is `grid-template-columns:minmax(0,1fr) minmax(0,.95fr)`
      with `align-items:center` (css/landing.css:177-179), and its two children
      are the copy container and the slot container, both real grid items with
      no grid-item property of their own.

   2. THE SECTION ID GOES ON THE SECTION THROUGH `_element_id`, NEVER
      `_attributes: 'id|act'`. Elementor's custom-attributes control silently
      refuses an `id` pair while accepting every other pair in the same string,
      which is what hid this on solutions-b and what give-c/01-hero.mjs note 7
      records at length. dist/landing.html:309 puts `id="act"` on the <section>
      itself, not on a div inside it, and it is what 01-hero.mjs's
      `href="#act"` points at. Verified after deploying by fetching the live
      page and grepping for the id, not by the deploy's exit code.

      NOTE FOR HAND-OFF, not a conversion defect: css/landing.css gives
      `.lnd-act` no `scroll-margin-top`, so following `#act` from the hero puts
      the heading under the sticky header. That is true of the static build too,
      identically, so it is not repaired here. Same shape give-c/01-hero.mjs
      note 7 records for `#give`.

   3. `.lnd-act__slot` IS A REAL CONTAINER AND COSTS NOTHING, which was checked
      declaration by declaration rather than assumed, because it is the most
      heavily styled container on the page. css/landing.css:185-188 gives it
      `display:grid`, `align-content:center`, `gap:var(--space-3)`,
      `min-height:280px`, `padding:var(--space-7)`, a dashed border, a radius
      and a background. Every one of those is a 0,1,0 declaration, and every
      Elementor rule it competes with is also 0,1,0 (`.e-con{display:var(--display)}`,
      `.e-con{min-height:var(--min-height)}`, `.e-con{border-radius:var(--border-radius)}`,
      and `.elementor-element:where(.e-con-full,.elementor-widget){align-content:...;
      gap:...}`), so the build wins every one of them on source order, because
      Elementor's stylesheets load before /css/landing.css on this install
      (01-hero.mjs note 3). The ONE Elementor container rule that is 0,2,0 is
      `flex-direction`, and a grid container has no use for it.

      Contrast `.lnd-hero__actions`, which declares `display:flex` and pays a
      rule for exactly that reason: the sixth cost category is about
      `flex-direction` specifically, not about containers in general.

   4. THE TWO SLOT LINES ARE TWO text() WIDGETS, so the label and the note stay
      editable as prose, which is what a campaign rewrites first. Their widget
      wrappers become the grid items in place of the two <p>, and that changes
      nothing measurable: both paragraphs declare `margin:0` (:189 and :192), so
      each wrapper is exactly its paragraph's height, and `.lnd-act__slotnote`'s
      `max-width:40ch` limits the paragraph inside a stretched wrapper to the
      same box it occupies as a grid item itself. Measured at both widths rather
      than reasoned about here.

   5. NO PROSE REPAIR IN THIS BLOCK. `.lnd-act__copy p` (:183-184) declares
      `margin:0` and has no `:last-child` companion anywhere in css/landing.css,
      and the copy column holds exactly one paragraph in any case. Block 28 is
      in play in block 2 only.

   6. `data-reveal` RIDES ON THE WIDGET WRAPPERS AND CONTAINERS, per
      01-hero.mjs note 7, read off the source element by element:
      `.lnd-act__copy` carries `data-reveal-group`, its <h2> and <p> carry
      `data-reveal="rise"`, and `.lnd-act__slot` carries `data-reveal="rise"`
      on the container itself and nothing on its two paragraphs.

   7. `id="act-title"` IS AUTHORED IN THE MARKUP, on the real <h2>, per
      01-hero.mjs note 8. It is a different id from note 2's: `act` is on the
      section and is the scroll target, `act-title` is on the heading and is
      what `aria-labelledby` names.

   8. THE SECTION COMMENT (300-308) is carried at the top of the heading's
      markup, the first authorable point inside the section. */

/* Copied from dist/landing.html:300-308, indentation included. The middot and
   the two em dashes are the source's, per 00-note.mjs note 5. */
const BLOCK_NOTE = '<!-- BLOCK 5 · THE ACTION\n'
  + '     Where the campaign asks. A slot, not a drawn form, for the same reason the\n'
  + '     Donate readings hand off rather than collect: there is no endpoint behind\n'
  + '     this page, and a form that looks real and goes nowhere is worse than a\n'
  + '     marked space. Whatever the campaign actually needs — a petition, a\n'
  + '     legislator lookup, a sign-up, a share sheet — drops in here.\n'
  + '\n'
  + '     The heading and the supporting line are the copy that has to be right; the\n'
  + '     mechanism underneath them is plumbing. -->';

const HEAD = 'Tell your legislator to fund the accounts';

/* dist/landing.html:314-315, two source lines joined with a single space. */
const SAY = 'It takes about a minute, and a message from a constituent in the '
  + 'district is worth more than any of ours.';

const SLOT_LABEL = 'Campaign form';

/* dist/landing.html:319-320. The em dash is the source's. */
const SLOT_NOTE = 'Petition, legislator lookup, sign-up or share — whichever this '
  + 'campaign runs on, embedded here at roughly this height.';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'lnd-act',
      content_width: 'full',
      _element_id: 'act',
      _attributes: 'aria-labelledby|act-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container({ cssClass: 'lnd-act__grid', content_width: 'full' }, [
          container(
            { cssClass: 'lnd-act__copy', content_width: 'full', _attributes: 'data-reveal-group|' },
            [
              text({
                markup: `${BLOCK_NOTE}\n<h2 id="act-title">${HEAD}</h2>`,
                _attributes: 'data-reveal|rise',
              }),
              text({ markup: `<p>${SAY}</p>`, _attributes: 'data-reveal|rise' }),
            ],
          ),
          container(
            {
              cssClass: 'lnd-act__slot',
              content_width: 'full',
              _attributes: 'data-placeholder|form\ndata-reveal|rise',
            },
            [
              text({ markup: `<p class="lnd-act__slotlabel">${SLOT_LABEL}</p>` }),
              text({ markup: `<p class="lnd-act__slotnote">${SLOT_NOTE}</p>` }),
            ],
          ),
        ]),
      ]),
    ],
  );
}
