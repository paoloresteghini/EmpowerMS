import { container, text, html } from '../../factory.mjs';

/* Source of truth: dist/safety.html, the <section class="sol-latest"> block
   (lines 343-370). Every class, string and attribute below is read from that
   file, not typed from memory. This section carries no HTML comment in source.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, the reason 01-hero.mjs note 1 records.

   2. `.sol-latest__head` IS A CONTAINER WITH TWO text() CHILDREN AND NEEDS
      NOTHING. css/solution.css:337 gives it `max-width:64ch` and no display at
      all, so it becomes a flex column; its <h2> carries a 20px bottom margin
      (:338) against a <p> whose margin is 0 (:342), so the one join is
      max(20,0) = 20 + 0 and nothing collapses away. Walked before the page was
      deployed. There is no `p:last-child` rule on this block, so the prose
      repair 03-problem.mjs and 05-grid.mjs pay does not arise here.

   3. THE STUB LIST IS ONE html() BLOB, for all four of the reasons
      06-stories.mjs note 5 sets out, and it is the second and last of them on
      this page. `.sol-stub__date` carries the same `margin-top:auto` (:365)
      that `.sol-feed__date` does, so the same flex-item argument applies; the
      list carries the same `data-cms`/`data-cms-note` hand-off contract; the
      content is a query placeholder rather than editable copy; and `<ul>` and
      `<li>` survive. `.sol-stubs` collapses to one column at 780 (:370-372)
      where `.sol-feed` collapses at 860, so the two lists step at DIFFERENT
      widths and the middle-band sweep has to cross both.

   4. SHAPE C, SITE TWO OF TWO: `.sol-latest__more` TAKES ROUTE A, ONE html()
      WIDGET CARRYING THE WHOLE <p>, AND COSTS NOTHING. This is the opposite
      answer to 06-stories.mjs note 3 on the same page, and the reason it is a
      different answer is that this site is a different shape.

      `.sol-latest__more` (dist/safety.html:368) is a bare <p> whose only child
      is `<a class="em-btn em-btn--inverse-outline em-btn--md">`, and
      css/solution.css:368 gives it a top margin and nothing else. It holds no
      prose: it is a layout wrapper around one anchor, which is exactly the
      shape amb-a, give-c and team-bio built as one blob. Inside the blob the
      <p> and the <a> reach the page unaltered, the anchor stays inline-level
      in a block container the way the static build has it, so it shrink-wraps
      by itself and no `align-self` repair exists to be needed.

      THE WRAPPER-DESCENDER DEFECT (block 34) CANNOT BITE HERE, checked rather
      than assumed, because the question it asks is not "is this anchor
      inline-level inside a blob" but "did it STOP being a flex item". In the
      static build this anchor is already inline-level inside a <p>, so its
      line box already carries the strut's descender; the blob reproduces that
      line box exactly. team-bio's `.tp-more__link` was a direct child of a
      flex container, which blockified it, and the blob is what took the
      blockification away.

      THE NINTH CATEGORY CANNOT BITE HERE EITHER, and this one IS a Route A
      site with a real anchor carrying build classes, so it was checked
      property by property rather than by precedent.
      `components/components.css:21` gives `.em-btn--inverse-outline` a
      background, a colour and a border colour and NO `box-shadow` at rest, so
      Elementor's `.elementor a{box-shadow:none}` at 0,1,1 has nothing to take
      away. The focus ring is safe for a different reason: `:23` is
      `.em-btn--inverse-outline:focus-visible,.em-btn--inverse:focus-visible
      {box-shadow:var(--shadow-focus-inverse)}` at 0,2,0, which outranks
      0,1,1 on its own. Probed at rest, on hover and on real keyboard focus
      anyway; the numbers are in the task report.

      What Route A costs here is the same thing it costs everywhere: the link
      stops being retargetable from Elementor's panel. What it saves is recipe
      section 7's coverage cost, which under a container-plus-link() build
      would take `p|See all public safety research` out of census() and
      `a|See all public safety research` out of controlBoxes() at once.

   5. `id="latest-title"` is authored in the markup, per 01-hero.mjs note 5. */

const HEAD = 'The Latest on Public Safety';
const LEDE = 'Explore the latest research, ideas, and policies shaping public safety, effective '
  + 'justice, and stronger communities across Mississippi.';

/* Verbatim from dist/safety.html:350-366, attribute order included. */
const STUBS = '<ul class="sol-stubs" data-cms="loop" data-cms-note="Latest articles and research for this solution area, newest three, mixed types. A Loop Grid narrowed to this area." data-reveal-group>\n'
  + '  <li class="sol-stub" data-reveal="rise">\n'
  + '    <span class="sol-stub__kind">Article</span>\n'
  + '    <a class="sol-stub__title" href="https://empowerms.org/accountability-and-action-the-path-to-safer-communities/">Accountability and Action: The Path to Safer Communities</a>\n'
  + '    <span class="sol-stub__date">October 16, 2025</span>\n'
  + '  </li>\n'
  + '  <li class="sol-stub" data-reveal="rise">\n'
  + '    <span class="sol-stub__kind">Research</span>\n'
  + '    <a class="sol-stub__title" href="https://empowerms.org/empower-releases-report-on-violent-crime-in-mississippi/">Empower releases report on violent crime in Mississippi</a>\n'
  + '    <span class="sol-stub__date">December 8, 2022</span>\n'
  + '  </li>\n'
  + '  <li class="sol-stub" data-reveal="rise">\n'
  + '    <span class="sol-stub__kind">Article</span>\n'
  + '    <a class="sol-stub__title" href="https://empowerms.org/new-law-expands-prison-work-release-programs/">New Law Expands Prison Work Release Programs</a>\n'
  + '    <span class="sol-stub__date">May 30, 2024</span>\n'
  + '  </li>\n'
  + '</ul>';

/* Verbatim from dist/safety.html:368. */
const MORE = '<p class="sol-latest__more">'
  + '<a class="em-btn em-btn--inverse-outline em-btn--md" href="/latest">See all public safety research</a>'
  + '</p>';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'sol-latest',
      content_width: 'full',
      _attributes: 'aria-labelledby|latest-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'sol-latest__head', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({ markup: `<h2 id="latest-title">${HEAD}</h2>`, _attributes: 'data-reveal|rise' }),
            text({ markup: `<p>${LEDE}</p>`, _attributes: 'data-reveal|rise' }),
          ],
        ),
        html({ markup: STUBS }),
        html({ markup: MORE }),
      ]),
    ],
  );
}
