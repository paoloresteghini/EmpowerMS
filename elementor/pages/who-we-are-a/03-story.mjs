import { container, text, image } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/who-we-are-a.html, the <section class="wa-story">
   block (lines 206-223). Every class, string and attribute below is read from
   that file, not typed from memory.

   Structural decisions:

   1. THE IN-PAGE ANCHOR IS `_element_id`, NEVER `_attributes: 'id|...'`.
      Source: `<section class="wa-story" id="our-story" ...>`, and the hero's
      `.wa-jump` (01-hero.mjs, note 6) links to `#our-story`. Elementor's
      custom-attributes control SILENTLY REFUSES an `id` pair while accepting
      every other pair in the same string, which is what hid this on
      solutions-b; `_element_id` on a container works, measured there
      (elementor/pages/solutions-b/02-track.mjs:218). Verified after deploy by
      fetching the live page and grepping for the id, not by the deploy's exit
      code. `aria-labelledby` is an ordinary attribute and rides in
      `_attributes` alongside nothing else.

   2. `.wa-story__grid` AND `.em-container` ARE ONE DIV. Source:
      `<div class="wa-story__grid em-container">`, one element with both
      classes. css/who-we-are-a.css:135 makes it a two-column grid whose
      tracks are `.wa-story__aside` and `.wa-story__copy`, so both must be
      real children: containers, not widgets.

   3. THE STORY PHOTOGRAPH IS MEANINGFUL. Source:
      `alt="A young man standing outdoors in a field, smiling"`, no
      aria-hidden. So no aria-hidden on this image() widget, and the alt comes
      from attachment 20597, which media.mjs confirms already carries that
      exact sentence.

      IT ALSO NEEDS A BRIDGE RULE. css/who-we-are-a.css:139-140 gives
      `.wa-story__photo` `aspect-ratio:4/3` and :141 gives the <img>
      `height:100%`. Elementor containers are column flex, so the
      `.elementor-widget-image` wrapper it inserts stretches to the
      container's WIDTH for free and never to its HEIGHT, and the img's own
      `height:100%` then resolves against the wrapper's auto height instead of
      the container's real one. Repaired by giving the WRAPPER `height:100%`,
      grouped with this page's two other instances in one bridge.css rule.
      `display:contents` on the wrapper is the other technique on record for
      this category (the homepage's, bridge.css:413-419) and was deployed and
      measured here as well: it gives identical numbers on both instruments at
      both widths, and the reasons it is not the one chosen are argued in full
      beside the rule.
      The 1100px override at :245 changes the ratio to 16/9 and nothing else,
      so the same rule holds at both widths; both were measured.

   4. `.wa-story__year` IS A text() WIDGET, not a container, and the <span>
      inside it is part of the same authored string. css/who-we-are-a.css:164
      is `.wa-story__year span{display:block;...}`, a descendant selector, so
      nothing of Elementor's can fall between the <p> and the <span> as long
      as both are authored in one markup string. The chip's own
      `display:inline-grid` and its negative top margin (:158-159), which is
      what lifts it over the photograph's bottom-left corner, both sit on the
      real <p>. Measured live at 1440 and 390 rather than assumed, because the
      converted <p> sits inside a widget wrapper that is itself a flex item of
      `.wa-story__aside`, which the static build lays out as an ordinary block:
      see the report for the numbers.

   5. `.wa-story__copy` IS THIS PAGE'S ONE STRUCTURAL REPAIR, and the shape is
      not quite podcast-a's. css/who-we-are-a.css:170 is
      `.wa-story__copy p{margin:0 0 var(--space-6)}` and :172 is
      `.wa-story__copy p:last-child{margin-bottom:0}`. Converted, every
      paragraph is the only child of its own wrapper, so EVERY one of them
      matches `p:last-child` (0,2,1), beats :170 (0,2,0), and takes the zero:
      the section loses the 24px between all four paragraphs, not just after
      the last.

      THE REPAIR IS NOT podcast-a's, and the reason is a third party.
      podcast-a (bridge.css:1297) moves the "last of several siblings" logic
      up to the wrappers with `:not(:last-child)`, on the argument that after
      conversion the widgets ARE the siblings the build's rule was written
      about. That argument holds only while each widget contains exactly its
      own paragraph, and here it does not: MailMunch injects
      `<div class='mailmunch-forms-in-post-middle' style='display: none
      !important;'></div>` INSIDE the third paragraph's widget, right after
      the <p>. Read out of the live markup, not inferred. That paragraph is
      therefore not its wrapper's `:last-child`, `p:last-child` never matched
      it, and it kept its 24px by accident: the census found TWO paragraphs
      wrong where there should have been three. A `:not(:last-child)` rule on
      the wrapper would then have added a SECOND 24px on top, for 48px
      against the static build's 24px.

      So the definite value goes back on the PARAGRAPH, where the build puts
      it, and the wrapper set is used only for the position test, which
      MailMunch does not disturb (it injects inside a widget, never as a
      sibling widget). Correct with the div present and without it. Two rule
      blocks, at 0,3,1 and 0,4,1, both naming `p`, which is also what leaves
      css/who-we-are-a.css:168's heading margin alone: a bare
      `:not(:last-child)` on the wrappers would have put 24px on the
      heading's wrapper on top of the heading's own 20px, since
      `.wa-story__copy` holds an <h2> where `.pca-about__copy` and
      `.cca-about__copy` did not. Written out in full beside the rule in
      bridge.css.

   6. THE HEADING IS A text() WIDGET CARRYING A BARE <h2>, never a heading()
      widget. No `heading()` import above. The id travels on the <h2> itself.

   7. THE EM DASH IN THE LAST PARAGRAPH IS THE BUILD'S OWN COPY and is
      reproduced verbatim ("communities—so every Mississippian"). This
      project's no-em-dash rule governs what is WRITTEN here: code, comments,
      commit messages, reports. Signed-off body copy transcribed out of
      dist/who-we-are-a.html is quoted, not written, and altering it would
      change the census key and silently drop the paragraph out of the
      comparison. Same for the U+2019 apostrophes in "Mississippi’s". */

const HEADLINE = 'Our Story';
const QUESTION = 'Empower Mississippi began with a simple question: Why are so many Mississippians struggling to build the life they want right here at home?';
const BODY = 'In 2013, a small group of Mississippians gathered around a restaurant patio table with a shared love for their state and a belief that Mississippi’s best days were still ahead. They envisioned an organization that would listen first, understand the root causes behind our greatest challenges, and bring people together to develop practical solutions.';
const TURN = 'That vision became Empower Mississippi.';
const TODAY = 'Today, we work alongside citizens, community leaders, and policymakers to remove barriers to opportunity and expand access to quality education, meaningful work, and safer communities—so every Mississippian has the opportunity to achieve the American Dream right here at home.';

const YEAR = '<span>2013</span>The year it started';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'wa-story',
      content_width: 'full',
      _element_id: 'our-story',
      _attributes: 'aria-labelledby|story-title',
    },
    [
      container({ cssClass: 'wa-story__grid em-container', content_width: 'full' }, [
        container(
          { cssClass: 'wa-story__aside', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            container(
              { cssClass: 'wa-story__photo', content_width: 'full', _attributes: 'data-reveal|clip' },
              [image({ ...photo('video-still-man-outdoors') })],
            ),
            text({
              markup: `<p class="wa-story__year">${YEAR}</p>`,
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
        container(
          { cssClass: 'wa-story__copy wa-mark', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `<h2 id="story-title">${HEADLINE}</h2>`,
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: `<p class="wa-story__question">${QUESTION}</p>`,
              _attributes: 'data-reveal|rise',
            }),
            text({ markup: `<p>${BODY}</p>`, _attributes: 'data-reveal|rise' }),
            text({
              markup: `<p class="wa-story__turn">${TURN}</p>`,
              _attributes: 'data-reveal|rise',
            }),
            text({ markup: `<p>${TODAY}</p>`, _attributes: 'data-reveal|rise' }),
          ],
        ),
      ]),
    ],
  );
}
