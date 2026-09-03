import { container, text, html } from '../../factory.mjs';

/* Source of truth: dist/landing.html, the <section class="lnd-reading"> block
   (lines 325-352). Every class, string and attribute below is read from that
   file, not typed from memory.

   BLOCK 6 OF SIX, INDEPENDENT OF THE OTHER FIVE.

   IT SHIPS AUTHORED, NOT AS A LOOP GRID, and that is a decision with a reason
   rather than a shortcut. The list's own `data-cms-note` offers two readings of
   what it should become: "A Loop Grid over the campaign's own tag, or three
   chosen posts if the campaign has no tag." A TEMPLATE cannot take the first:
   the tag it would query belongs to a campaign that does not exist yet, and a
   Loop Grid pointed at nothing renders Elementor's own empty view. So this page
   ships the second reading, three chosen posts, and keeps `data-cms` and
   `data-cms-note` on the <ul> as the contract that says the first reading is
   available once a campaign has a tag. `content-a`, converted alongside this
   page, takes the opposite decision for the opposite reason: its feed queries a
   taxonomy that exists today.

   THE THREE POSTS ARE REAL, and the last of them is the outcome, which the
   source comment says is on purpose: a campaign page that closed should end by
   saying what happened. Their titles, hrefs and dates are read off
   dist/landing.html:338-349 and are Empower's own posts.

   Structural decisions:

   1. CONTAINERS ARE 'full', per 01-hero.mjs note 1.

   2. `.lnd-reading__list` IS ONE html() WIDGET, forced by the tags exactly as
      02-ask.mjs note 4 records: Elementor's ALLOWED_HTML_WRAPPER_TAGS holds no
      `ul`, no `li` and no `time`, so a container tree could not produce this
      markup even if it were wanted. Same route give-c's ladders, epic-a's area
      list and education's stub and feed lists take.

      AND IT HOLDS THREE THINGS AT ZERO. `.lnd-reading__list`'s
      `grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))` and
      its `clamp()` gap (:206-209), `.lnd-read`'s
      `display:flex;flex-direction:column` (:211-213), and `.lnd-read::after`'s
      growing mark all land on real elements inside one authored string, so no
      Elementor container default can reach any of them. Note that `.lnd-read`
      declares its `flex-direction`, so it would not have been the sixth
      category even as a container; the ones that would have broken are the
      grid's auto-fit columns, which would have been laying out widget wrappers
      rather than cards.

   3. THE OVERLAY LINK SURVIVES, and it is worth naming because it is the
      pattern that makes the whole card clickable. `.lnd-read__title a::before`
      is `content:"";position:absolute;inset:0` (:220) against `.lnd-read`'s
      `position:relative` (:211). Both elements are inside the same authored
      string with nothing between them, so the pseudo-element's containing
      block is the card on both sides. Built as a container tree the anchor
      would have sat inside two widget wrappers and the overlay would still
      have found `.lnd-read`, but `.lnd-read:hover .lnd-read__title a` and
      `.lnd-read:focus-within::after` are the kind of state selector the twelfth
      cost category is about, and keeping the subtree authored removes the
      question rather than answering it.

   4. THE EIGHTH AND NINTH CATEGORIES BOTH COST NOTHING HERE, checked against
      the stylesheet before deploying and hand-probed after.

      EIGHTH: `.lnd-read__title a` (:219) declares `text-decoration:none` at
      rest ITSELF, and the hover rule (:222) changes `color` only, so nothing on
      this card relies on the UA underline that Elementor's
      `.elementor a{text-decoration:none}` removes. That is the opposite of
      `.lnd-hero__aside` and `.lnd-pair__link a`, which declare
      `text-underline-offset` and no `text-decoration` and therefore DO rely on
      it (01-hero.mjs note 6, 03-pair.mjs note 6).

      NINTH: the card link's focus indicator is an `outline` (:224,
      `outline:3px solid var(--focus-ring);outline-offset:4px`), and the other
      half of the same Elementor reset is `box-shadow:none`, which does not
      touch `outline`. Probed on real keyboard focus rather than inferred, and
      probed on the ANCHOR rather than on any carrier, because focus binds to
      the focused element (bridge block 40).

   5. `id="reading-title"` IS AUTHORED IN THE MARKUP, on the real <h2>, per
      01-hero.mjs note 8.

   6. `data-reveal` RIDES ON THE CONTAINER AND THE WIDGET WRAPPER outside the
      blob and is AUTHORED inside it, per 01-hero.mjs note 7 and 04-voice.mjs
      note 2: `.lnd-reading__head` carries `data-reveal-group` on the container,
      its <h2> carries `data-reveal="rise"` on the wrapper, and the <ul>'s own
      `data-reveal-group` and each <li>'s `data-reveal="rise"` reach the page
      authored.

   7. `data-cms` AND `data-cms-note` ARE CARRIED VERBATIM on the <ul>, curly
      apostrophe included. They are the hand-off contract, not decoration, and
      the header above records what they are asking for.

   8. THE SECTION COMMENT (325-331) is carried at the top of the heading's
      markup, the first authorable point inside the section. */

/* Copied from dist/landing.html:325-331, indentation included. The middot is
   the source's, per 00-note.mjs note 5. */
const BLOCK_NOTE = '<!-- BLOCK 6 · RELATED READING\n'
  + '     Three links out, and the block that keeps a campaign page attached to the\n'
  + '     rest of the site. Real posts from the real campaign, so the shape is shown\n'
  + '     with the kind of content it will actually hold.\n'
  + '\n'
  + '     The last of the three is the outcome, on purpose: a campaign page that\n'
  + '     closed should end by saying what happened. -->';

const HEAD = 'More on this';

/* Copied from dist/landing.html:337-350, attribute order and indentation
   included. The curly apostrophe in data-cms-note is the source's. The three
   <li>, the three <time> and the three <a> are real tags inside one string,
   per note 2. */
const LIST = '<ul class="lnd-reading__list" data-cms="loop" data-cms-note="Related reading for the campaign, newest three. A Loop Grid over the campaign’s own tag, or three chosen posts if the campaign has no tag." data-reveal-group>\n'
  + '      <li class="lnd-read" data-reveal="rise">\n'
  + '        <span class="lnd-read__date"><time datetime="2024-11-11">November 11, 2024</time></span>\n'
  + '        <h3 class="lnd-read__title"><a href="https://empowerms.org/waitlisted-again/">Waitlisted, Again</a></h3>\n'
  + '      </li>\n'
  + '      <li class="lnd-read" data-reveal="rise">\n'
  + '        <span class="lnd-read__date"><time datetime="2024-12-13">December 13, 2024</time></span>\n'
  + '        <h3 class="lnd-read__title"><a href="https://empowerms.org/dakota-bland-kicked-off-the-waitlist/">Dakota Bland: Kicked Off the Waitlist</a></h3>\n'
  + '      </li>\n'
  + '      <li class="lnd-read" data-reveal="rise">\n'
  + '        <span class="lnd-read__date"><time datetime="2025-05-29">May 29, 2025</time></span>\n'
  + '        <h3 class="lnd-read__title"><a href="https://empowerms.org/waitlist-funded-lawmakers-increase-funding-for-special-needs-esa/">Waitlist funded: lawmakers increase funding for Special Needs ESA</a></h3>\n'
  + '      </li>\n'
  + '    </ul>';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'lnd-reading',
      content_width: 'full',
      _attributes: 'aria-labelledby|reading-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'lnd-reading__head', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `${BLOCK_NOTE}\n<h2 id="reading-title">${HEAD}</h2>`,
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
        html({ markup: LIST }),
      ]),
    ],
  );
}
