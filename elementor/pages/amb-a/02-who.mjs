import { container, text, image } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/amb-a.html, the <section class="aba-who"> block
   (lines 202-239). Every class, string and attribute below is read from that
   file, not typed from memory.

   Structural decisions:

   1. THE THREE-DEEP NESTING IS PRESERVED EXACTLY, and flattening it is the
      one thing this section must not do. Source is
      `div.em-container > div.aba-who__grid > (div.aba-who__col, ul.aba-mosaic)`.
      css/amb-a.css:48-50 records why the heading and the passage are one
      column rather than two rows of a shared grid, in the build's own words:
      splitting them left a 250px hole between the heading and the first line,
      because the mosaic beside them was sizing the row they sat in.

      Note that `.em-container` here carries NO second class, unlike the hero
      and join sections where `.em-container` and the grid class are one
      element. Read from the source rather than assumed by analogy.

   2. THE <ul> AND ITS FOUR <li> BECOME CONTAINERS AND CARRY role, because
      Elementor's html_tag control offers neither `ul` nor `li`, so both
      render as `div` and the list semantics would simply be gone. `role|list`
      on the mosaic and `role|listitem` on each cell restore them, the way
      elementor/pages/solutions-b/02-track.mjs already does for `.sb-stations`
      and `.sb-station`.

      THE CELLS COULD NOT BE ONE html() BLOB, which is the lever `.aba-ways`
      uses in 03-do.mjs and this section does not have: each cell holds one
      PHOTOGRAPH, photographs stay image() widgets under recipe section 3, so
      each cell has to be a real container.

      No CSS rule on this page addresses `ul` or `li` by tag (checked: every
      selector in css/amb-a.css is a class selector or a descendant of one),
      so the tag substitution costs nothing here beyond the semantics.

   3. THE MOSAIC IS THIS PAGE'S ONE PRICED REPAIR, and it is category 4.
      css/amb-a.css:85-88 gives `.aba-mosaic__cell img` `height:100%` while
      :89-92 puts `aspect-ratio` on the four CELLS. Elementor's container is a
      column flex box, so `.elementor-widget-image` takes the parent's WIDTH
      for free and never its HEIGHT, and the percentage resolves against an
      auto-height wrapper. The named repair lives in bridge.css under the
      block headed "amb-a: the mosaic's four fixed-ratio cells" and covers all
      four cells through their one shared class.

   4. `data-reveal-group` ON `.aba-who__say` AND ON `.aba-mosaic`, and
      `data-reveal` ON EACH CELL, exactly where the source puts them. The
      group attribute is valueless in the source (`data-reveal-group`), which
      is why its _attributes pair ends in a bare `|`: the same shape
      solutions-b's `.sb-stations` uses.

   5. THE TWO UNCLASSED PARAGRAPHS STAY UNCLASSED. Source gives them
      `<p data-reveal="rise">` with no class; their styling comes entirely
      from css/amb-a.css:66-69's `.aba-who__say p`, a DESCENDANT selector,
      which keeps matching through Elementor's text-editor wrapper. Adding a
      class would be inventing markup the build does not have.

   6. `.aba-who__close` CARRIES `!important` ON THREE PROPERTIES
      (css/amb-a.css:70-74). Nothing is done about that here and nothing needs
      to be: an `!important` declaration in the page sheet beats every normal
      declaration of Elementor's whatever its specificity. This build had not
      converted an `!important` paragraph before, so it was measured rather
      than assumed; the numbers are in this task's report.

   7. ALT TEXT IS AN OPEN EDITORIAL ITEM ON ALL FOUR OF THESE PHOTOGRAPHS.
      media.mjs records each one against
      docs/elementor/phase2b/2026-08-18-alt-text-decisions.md. Nothing is
      written to the install. */

const HEADLINE = 'Who Are Our Ambassadors?';
const SAY_1 = 'Our Ambassadors are parents, educators, business owners, community leaders, and citizens '
  + 'from every corner of Mississippi.';
const SAY_2 = 'Many have been directly impacted by the issues we work on. Others have seen the challenges '
  + 'facing their communities and want to be part of the solution.';
const CLOSE = 'They share one thing in common: a desire to help create more opportunity for Mississippi.';

/* In markup order, read from dist/amb-a.html:214-236. The names are the
   media-library keys, not descriptions: docs/elementor/phase2b/
   2026-08-18-alt-text-decisions.md records that these filenames do not
   describe the photographs (young-man-portrait-bw is a classroom, in colour),
   so nothing here should be inferred from a name. */
const CELLS = [
  { modifier: 'aba-mosaic__cell--1', photo: 'worker-workshop-bw' },
  { modifier: 'aba-mosaic__cell--2', photo: 'young-man-portrait-bw' },
  { modifier: 'aba-mosaic__cell--3', photo: 'video-still-man-outdoors' },
  { modifier: 'aba-mosaic__cell--4', photo: 'classroom-students' },
];

const cell = (c) =>
  container(
    {
      cssClass: `aba-mosaic__cell ${c.modifier}`,
      content_width: 'full',
      _attributes: 'data-reveal|clip\nrole|listitem',
    },
    [image({ ...photo(c.photo) })],
  );

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'aba-who',
      content_width: 'full',
      _attributes: 'aria-labelledby|who-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container({ cssClass: 'aba-who__grid', content_width: 'full' }, [
          container({ cssClass: 'aba-who__col', content_width: 'full' }, [
            text({
              markup: `<h2 class="aba-who__title" id="who-title">${HEADLINE}</h2>`,
              _attributes: 'data-reveal|rise',
            }),
            container(
              { cssClass: 'aba-who__say', content_width: 'full', _attributes: 'data-reveal-group|' },
              [
                text({ markup: `<p>${SAY_1}</p>`, _attributes: 'data-reveal|rise' }),
                text({ markup: `<p>${SAY_2}</p>`, _attributes: 'data-reveal|rise' }),
                text({
                  markup: `<p class="aba-who__close">${CLOSE}</p>`,
                  _attributes: 'data-reveal|rise',
                }),
              ],
            ),
          ]),
          container(
            { cssClass: 'aba-mosaic', content_width: 'full', _attributes: 'data-reveal-group|\nrole|list' },
            CELLS.map(cell),
          ),
        ]),
      ]),
    ],
  );
}
