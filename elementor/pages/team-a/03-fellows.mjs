import { container, text, loopGrid } from '../../factory.mjs';
import { LOOP_ITEM_POST_IDS } from './loop-item.mjs';

/* Source of truth for the section's own frame: dist/team-a.html, the
   <section class="ta-fellows"> block. Every class, string and attribute below
   is read from that file. The LEDGER inside it is the `person` post type on
   the install, rendered through a Loop Grid, on the same 2026-08-20 decision
   02-staff.mjs's note 4 records.

   Structural decisions:

   1. `.ta-ledger` IS NOW A LOOP GRID, AND IT COSTS THE ONE THING THIS FILE'S
      PREVIOUS NOTE PREDICTED IT WOULD. That note argued for one html() widget
      holding a <ul> of five <li>, and its reason was exact:

        "built as a container tree instead, each <li> would become the only
         child of its own wrapper, so EVERY row would be :last-child, not only
         the fifth, and every row would take the bottom border. That is the
         LOUD half of the recipe's own asymmetry (over-matching, a visible
         defect)."

      That is precisely what a Loop Grid does, for precisely that reason:
      `.ta-ledger__row` becomes the only child of its own `.e-loop-item`, so
      css/team-a.css:227's `.ta-ledger__row:last-child{border-bottom:...}`
      matches all of them. The prediction was correct and the defect is real.

      IT IS PAID RATHER THAN AVOIDED, and that is a change of judgement, not a
      discovery. When that note was written the alternative bought nothing: the
      five names were as static as the markup holding them. Now the alternative
      is a ledger that disagrees with the install. Two of the five fellows the
      static build lists are not published people at all (J. Robertson is
      `private` on the install; Rebekah Staples has no `person` entry of any
      kind), and two published fellows are missing from it (Donald Nielsen and
      Joe Bishop-Henchman). A hairline in the wrong place is a defect that can
      be repaired in one bridge rule and measured; a list of the wrong people
      cannot be repaired at all from this side.

      THE REPAIR IS TWO DECLARATIONS in wp/empowerms-child/css/bridge.css,
      named to `.ta-ledger`, which exists only inside this section: cancel the
      border on every row, then restore it on the row inside the LAST loop
      item. It is written against `.e-loop-item:last-of-type` rather than
      `:last-child` for the same reason block 53 uses `:first-of-type`, which
      that block's own comment records off a real render: Elementor emits a
      `<style id="loop-...">` element as the first child of
      `.elementor-loop-container`, so the child-counting pseudo-classes are
      offset by one and the type-counting ones are not.

      WHAT THE GRID QUERIES: `post_query_query_id: 'empower_team_fellows'`, and
      nothing else. wp/empowerms-child/inc/person-loop.php answers it with the
      published people whose `position_title` begins with the word "Fellow",
      sorted by surname. That file's docblock carries why the split is derived
      from the title rather than from a taxonomy registered for the purpose,
      and the short version is that a taxonomy has an untermed state and a
      title test does not: a person added in wp-admin with no term would appear
      in NEITHER section, silently, which is the failure mode podcast-a's
      `guest_type` pill is still blocked on.

   2. THE HEADING IS A text() WIDGET CARRYING A BARE <h2>, never heading().
      No `heading()` import above. Unchanged by this task.

   3. `.ta-fellows__slab` HOLDS THE HEADING'S OWN WRAPPER
      (`.ta-fellows__head`) AND THE LEDGER AS TWO DIRECT CHILDREN, matching
      source exactly: `<div class="ta-fellows__slab" data-reveal-group>`
      contains `<div class="ta-fellows__head">` (the h2 alone, no note or
      pending paragraph in this section, unlike the staff section) and the
      ledger as siblings. Unchanged. */

const HEADLINE = 'Contributing Fellows';

/* The query id inc/person-loop.php hooks. Exported for the same reason
   STAFF_QUERY_ID is: the behavioural gate asserts against this string rather
   than a second copy of it. */
export const FELLOWS_QUERY_ID = 'empower_team_fellows';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'ta-fellows',
      content_width: 'full',
      _attributes: 'aria-labelledby|fellows-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'ta-fellows__slab', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            container({ cssClass: 'ta-fellows__head', content_width: 'full' }, [
              text({
                markup: `<h2 id="fellows-title">${HEADLINE}</h2>`,
                _attributes: 'data-reveal|rise',
              }),
            ]),
            loopGrid({
              templateId: LOOP_ITEM_POST_IDS.fellow,
              cssClass: 'ta-ledger',
              post_query_post_type: 'person',
              post_query_query_id: FELLOWS_QUERY_ID,
              posts_per_page: 100,
              pagination_type: '',
            }),
          ],
        ),
      ]),
    ],
  );
}
