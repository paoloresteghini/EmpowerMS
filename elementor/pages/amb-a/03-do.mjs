import { container, text, html } from '../../factory.mjs';

/* Source of truth: dist/amb-a.html, the <section class="aba-do"> block
   (lines 245-257). Every class, string and attribute below is read from that
   file, not typed from memory.

   Structural decisions:

   1. THE WHOLE <ul class="aba-ways"> IS ONE html() WIDGET, and that one
      decision is why this section costs nothing. Four <li class="aba-way">,
      no photographs, nothing inside any of them that must be a widget: as an
      authored string the <ul> and its four <li> reach the page unaltered, so
      real list semantics survive with no `role` attribute needed, and
      `data-reveal-group` and the four `data-reveal="rise"` ride on the real
      elements the static build gives them.

      Built as containers it would buy nothing and cost three things: `ul` and
      `li` are outside Elementor's allowed container tags so both would render
      as `div` (the category that cost who-we-are-a six rules), the semantics
      would need `role` attributes to be restored, and each <li> would gain a
      wrapper between it and the grid. This is the same call who-we-are-a's
      `.wa-people__list` and mail-a's `.mla-receive__list` both made.

      NOTHING HERE DEPENDS ON POSITION, checked rather than assumed:
      css/amb-a.css:112-118's `.aba-way` is a plain class selector with no
      structural pseudo-class and no child combinator, so this list would not
      have hit either of recipe section 6's greps even built the other way.
      The blob is chosen for the tag and semantics half of the cost, not for a
      pseudo-class defect it does not have.

   2. `.em-container` CARRIES NO SECOND CLASS in this section, unlike the hero
      and join sections. Read from the source, not inferred from them.

   3. THE HEADING IS A text() WIDGET CARRYING A BARE <h2>, never a heading()
      widget, and the id travels on the <h2> itself so the section's
      aria-labelledby="do-title" resolves to the heading element.

   4. THE INTRO PARAGRAPH IS THE ONE ELEMENT ON THIS PAGE WITH A BOTTOM
      MARGIN FACING A SIBLING (css/amb-a.css:103-106,
      `margin:var(--space-5) 0 clamp(32px,4.5vw,64px)`), which is worth
      recording because recipe section 5 names margin collapsing as a
      recurring cost: Elementor makes every container flex, and margins do not
      collapse in a flex container. It costs nothing here. The <ul> below it
      has `margin:0` (css/amb-a.css:107-111) and the <h2> above it has
      `margin:0` (css/amb-a.css:96-102), so there is no adjacent pair whose
      margins collapse into one gap in the static build either, and the
      converted page pays exactly the same total. Confirmed by measurement at
      both widths rather than left at the reasoning. */

const HEADLINE = 'What Do Ambassadors Do?';
const INTRO = 'Every Ambassador gets involved in different ways. You might:';

/* The curly apostrophes in the last two are the source's, reproduced byte for
   byte: census() does not read <li>, but the box sweep and a future reader
   both do, and normalising copy silently is how a build stops matching its
   own hand-off. */
const WAYS = [
  'Share your story and advocate for practical solutions.',
  'Attend Capitol Days, listening tours, and community events.',
  'Connect others with Empower’s research and resources.',
  'Help grow a network of citizens committed to Mississippi’s future.',
];

/* Indentation is the source's, which costs nothing and makes a future diff
   against dist/amb-a.html:250-255 readable. */
const WAYS_LIST = `<ul class="aba-ways" data-reveal-group>
${WAYS.map((w) => `      <li class="aba-way" data-reveal="rise">${w}</li>`).join('\n')}
    </ul>`;

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'aba-do',
      content_width: 'full',
      _attributes: 'aria-labelledby|do-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        text({
          markup: `<h2 class="aba-do__title" id="do-title">${HEADLINE}</h2>`,
          _attributes: 'data-reveal|rise',
        }),
        text({
          markup: `<p class="aba-do__intro">${INTRO}</p>`,
          _attributes: 'data-reveal|rise',
        }),
        html({ markup: WAYS_LIST }),
      ]),
    ],
  );
}
