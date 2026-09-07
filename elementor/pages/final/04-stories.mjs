import { container, text, image, link, loopGrid, elementId } from '../../factory.mjs';

/* Source of truth: src/sections/04-stories.html.

   THIS SECTION IS ALL QUERY AS OF 2026-09-04, and it was half authored before
   that. The lead card used to carry a real Mississippian's real words with her
   name and town (Jodi Berry, Sumrall) and sat outside the loop; only the two
   mini cards beside it were a Loop Grid. Empower's round-1 feedback ended that
   split. leadLoopItem() below carries the whole argument and what it cost.

   The section now runs on TWO Loop Grids over the same query, not one: the lead
   card takes the newest post, the mini column takes the next two through an
   offset. One grid of three cannot be used, because .em-stories__feature is a
   1.35fr/1fr two-column grid whose two children are the lead card and the
   column of minis, and the two card shapes are different templates.

   THE QUERY IS REAL AND CHECKED. Community Stories is category 9 on the
   install (27 posts), read with `wp term list category` rather than assumed.
   Newest first, stated explicitly rather than left to Elementor's defaults, for
   the reason podcast-a's library records: a reader should see the requirement,
   not have to read Elementor's source to find that the default happens to
   match.

   READ IT WITH `--cat=9`, NOT `--category=9`. The first pass at this check used
   `wp post list --category=9`, which WP-CLI neither honours nor rejects: it
   drops the unknown argument and returns the unfiltered list with exit code 0.
   The result was 31 posts of every kind (bill summaries, Capitol Chat recaps, a
   press release) and it read as "Community Stories is a grab-bag" rather than
   as "that filter did nothing". The term's own count (27) is the cheap check
   that catches it.

   THE OFFSET IS WHAT KEEPS THE THREE CARDS DISTINCT. Both grids run the same
   query; the mini grid sets post_query_offset to the lead grid's
   posts_per_page, so the lead shows post 1 and the minis show posts 2 and 3.
   Without it the newest story renders twice on one screen, in two different
   shapes, which looks like a duplicate-content bug rather than a query one.
   `offset` is a real field on Elementor Pro's query control group
   (modules/query-control/controls/group-control-query.php:264, consumed at
   group-control-posts.php:193 as $settings[$prefix . 'offset']), read there
   rather than guessed.

   _element_cache: 'yes' ON THE LOOP ITEM CONTAINER is not optional, and the
   full proof is in podcast-a/03-library.mjs. Short version: Elementor caches a
   loop item's rendered HTML keyed to the shared template and reuses it for
   every iteration unless the element carries a __dynamic__ setting or this
   control. The container itself carries no dynamic setting, so without it every
   card after the first serves the first card's wrapper markup, which looks
   correct at a glance because the titles inside it do vary.

   KNOWN BREAKAGE, DELIBERATELY NOT PRE-EMPTED. css/homepage.css:261 and :279
   are `.em-stories__lead-card>img` and `.em-stories__mini>img`, both CHILD
   combinators, and both carry the object-fit and sizing that make these cards
   work. image() puts the <img> inside a widget wrapper, so the img stops being
   a direct child and both rules stop matching. This is expected and is a bridge
   stylesheet repair, not a reason to reach for html(): the photographs here are
   the most editable content on the section. The bridge rules are written after
   deploying and measuring, per the phase rule that no bridge rule lands without
   the live measurement that justified it, so they are not in this commit's
   bridge.css yet. */

const EYEBROW = 'Mississippi stories';
const HEADLINE = 'Behind every solution is a real person.';
const LEAD = 'The American Dream is lived one story at a time. Discover how expanding opportunity is helping Mississippians build stronger families, meaningful careers, and brighter futures.';
export const STORIES_CATEGORY_ID = 9;
export const STORIES_LOOP_ITEM_POST_ID = 20589;
/* The elementor_library post created on empv2 on 2026-09-04 to hold the lead
   card's Loop Item template, created and termed the same way the mini's and
   content-a's four were:

     wp post create --post_type=elementor_library --post_status=publish \
       --post_title='Homepage story lead card'
     wp post term set <ID> elementor_library_type loop-item

   The id was read back with `wp post list` on the Node side rather than
   captured from --porcelain into a remote shell variable, per wpe.mjs's note:
   every WP-CLI call on this install glues a PHP deprecation notice onto its
   output, and a captured value arrives dirty. */
export const LEAD_LOOP_ITEM_POST_ID = 20704;

/* The lead grid takes the newest story; the mini grid offsets past it. Named
   rather than written as 1 and 1 at two points of use, because the offset is
   only correct while it equals the lead's page size: change one and the other
   has to move with it or a story renders twice. */
const LEAD_POSTS_PER_PAGE = 1;
const STORIES_POSTS_PER_PAGE = 2;

/* NO post-excerpt TAG ON EITHER CARD, and the reason is worth the space because
   two different attempts at it both shipped something wrong.

   ATTEMPT 1, the original build: the tag with default settings. It rendered
   NOTHING. post-excerpt's render() returns early unless is_post_excerpt_valid(),
   which is false when post_excerpt is empty and `apply_to_post_content` is off,
   and off is the default. All 27 Community Stories have an empty post_excerpt,
   so both mini cards shipped as a photograph and a headline with the quote slot
   silently absent. An invalid dynamic tag emits no element and no error.

   ATTEMPT 2, 2026-09-07: `apply_to_post_content: 'yes'`, which makes the tag
   fall back to get_the_excerpt(). Deployed, and the live card then read
   "Written by Ashley Green Originally from Utah, Amanda came to Mississippi..."
   beside a photograph of Amanda. The generated excerpt carries a BYLINE, so the
   card credited one person next to a picture of another, which is a fresh
   instance of the exact defect Empower reported in round 1.

   THE BYLINE IS NOT REPRODUCIBLE FROM WP-CLI. `apply_filters("the_excerpt",
   get_the_excerpt($post))` in `wp eval` returns the clean sentence; the byline
   only appears when the tag renders inside the loop on the front end, so
   whatever injects it is gated on loop context. It was NOT identified. That is
   the second reason the tag is gone rather than worked around: a filter nobody
   has located is not something to build a card on.

   WHAT THE CARDS USE INSTEAD: the post TITLE, which is the one field on these
   posts that is authored, per-post, and safe. On the lead card it takes the
   display-face slot the quote used to have, and many of these titles already
   read as pull-quotes ("Second chances are crucial", "As a parent, you want the
   best for your child"). On the minis it stays where it was.

   TO GET REAL PULL-QUOTES BACK: Empower write a post_excerpt on each Community
   Story. Then the tag works with `apply_to_post_content` OFF, which is the
   branch that returns $post->post_excerpt verbatim and never touches the
   content filters, so the byline cannot reappear. That is on the round-1
   question list, not something this build can invent.

/* Same shape as podcast-a/03-library.mjs's, and the `id` matters: it is a
   unique per-tag element id, NOT the tag's name. An earlier version of this
   file passed the name as the id, which is what a reader would guess from the
   attribute sitting next to `name`, and it is wrong: two tags in one template
   then share an id. The featured image and the excerpt both rendered nothing
   while the title rendered fine, which is exactly the kind of partial failure
   that reads as "dynamic tags do not work here" rather than as a duplicate id. */
const dynamicTag = (name, tagSettings = {}) =>
  `[elementor-tag id="${elementId()}" name="${name}" settings="${encodeURIComponent(JSON.stringify(tagSettings))}"]`;

/* The mini card, as a Loop Item template. Shape read from the two placeholder
   <article class="em-stories__mini"> in the partial: a photograph, then a div
   holding the pull-quote and the attribution. The featured image is a dynamic
   tag rather than a fixed attachment, since the whole point is that it changes
   per post. */
export function loopItem() {
  return [
    container(
      {
        cssClass: 'em-stories__mini',
        content_width: 'full',
        _attributes: 'data-reveal|rise',
        _element_cache: 'yes',
      },
      [
        /* The tag is `post-featured-image`, read from the filenames in
           elementor-pro/modules/dynamic-tags/tags/ rather than guessed.
           `featured-image` is not a registered tag on this install: the only
           tag with that word at the front is `featured-image-data`, which
           returns data about the image rather than the image. A wrong tag name
           produces no error and no element at all, so the card simply renders
           without its photograph. */
        image({
          id: '',
          url: '',
          __dynamic__: { image: dynamicTag('post-featured-image') },
        }),
        /* NOT touched by the class-in-markup migration (2026-08-17). Both
           widgets below carry `markup: ''`; Elementor supplies the actual
           content at render time through __dynamic__, so there is no
           authored element in this file for a class to move onto. The
           second widget's cssClass stays on the wrapper, and the bridge
           rule that repairs it (`.elementor .em-stories__attr p{margin:0}`)
           stays too, kept out of the deletion that removes the rest of its
           group. */
        container({ content_width: 'full' }, [
          text({
            markup: '',
            cssClass: 'em-stories__attr em-stories__attr--sm',
            __dynamic__: { editor: dynamicTag('post-title') },
          }),
        ]),
      ],
    ),
  ];
}

/* THE LEAD CARD, as its own Loop Item template.
 *
 * WHY IT STOPPED BEING AUTHORED. This file used to argue that the lead card had
 * to stay authored and that looping the whole feature block would be the
 * expensive mistake. Empower's round-1 feedback (2026-09-04, "Website Edits:
 * Round 1", row 2) answered both halves of that in one cell:
 *
 *   "Swap out this story; it seems like she is the person talking when they are
 *    two different people. Can we auto-populate to just pull all the community
 *    stripes rather than having a featured?"
 *
 * The first sentence is a real defect and it is ours. The card paired a stock
 * photograph (shop-owner-portrait, a gift-shop owner) with Jodi Berry's named
 * quote, which is precisely the pairing this build's own rule forbids, and it
 * shipped. No test caught it because every test on this section asserts that an
 * image widget exists and that its attachment id resolves; none can assert
 * whose face is in the photograph. The rule existed, in prose, in three design
 * documents, and prose does not fail a build.
 *
 * The second sentence is the fix, and it is better than swapping the one
 * photograph: when the picture, the words and the attribution all come from ONE
 * post, they cannot disagree. The defect class is gone rather than this
 * instance of it.
 *
 * WHAT IT COSTS, stated rather than discovered later:
 *
 * 1. JODI BERRY'S QUOTE LEAVES THE HOMEPAGE. It was real, approved copy. Paolo
 *    confirmed on 2026-09-04 that Empower is asking for the card's CONTENT to
 *    be swapped, not for the card to be deleted, which is what this does.
 *
 * 2. THE <blockquote> IS GONE, and that is a semantic change, not a cosmetic
 *    one. The card was drawn around a QUOTATION and there is no quotation in
 *    the data: the 27 Community Stories carry no pull-quote field and no manual
 *    excerpt, so the only per-post text available is narrative prose written
 *    ABOUT the subject ("Originally from Utah, Amanda came to Mississippi
 *    through Teach for America and began her journey in education as an art
 *    teacher in Greenville."). Setting that inside <blockquote> with the
 *    design's curly quotes would present a writer's sentence as the subject's
 *    own words, which is a worse version of the defect being fixed. So the slot
 *    keeps its visual weight and drops the quotation semantics it can no longer
 *    honour. bridge.css gives .em-stories__lead-excerpt what
 *    `.em-stories__lead-body blockquote p` used to give it.
 *
 * 3. THE ATTRIBUTION IS THE POST TITLE, not a name and a town. There is no
 *    name field and no town field on these posts; the title is the only thing
 *    that names the person ("Kyle Jackson: A Father's Footsteps"). The nested
 *    <span> the design put the town in has nothing to fill it, so it is not
 *    emitted rather than emitted empty.
 *
 * 4. THE FEATURED IMAGES CARRY NO ALT TEXT. Checked on the install: attachment
 *    20521 (the newest story's photograph) has an empty _wp_attachment_image_alt,
 *    and it is a photograph of a named person, so alt="" is wrong for it. That
 *    is a media-library data gap across the Community Stories, NOT something
 *    this template can fix: the image widget has no alt control and reads the
 *    attachment. Recorded here because this template is what puts those
 *    photographs on the homepage. It needs an approved pass over the
 *    attachments, like the photography import did.
 *
 * _element_cache: 'yes' for the same reason loopItem() carries it: the
 * container holds no dynamic setting of its own, so without it Elementor serves
 * the first iteration's wrapper markup for every iteration. Harmless here while
 * the grid renders one item, and kept so it stays correct if the count changes.
 */
export function leadLoopItem() {
  return [
    container(
      {
        tag: 'article',
        cssClass: 'em-stories__lead-card',
        content_width: 'full',
        _attributes: 'data-reveal|slide-l',
        _element_cache: 'yes',
      },
      [
        image({
          id: '',
          url: '',
          __dynamic__: { image: dynamicTag('post-featured-image') },
        }),
        container({ cssClass: 'em-stories__lead-body', content_width: 'full' }, [
          text({ markup: '<p class="em-eyebrow">Featured story</p>' }),
          /* The title, in the display-face slot the quote used to occupy. It is
             the whole of the card's text: there is no second line under it,
             because the only other per-post field available is the excerpt and
             the note above records why that is gone. */
          text({
            markup: '',
            cssClass: 'em-stories__lead-headline',
            __dynamic__: { editor: dynamicTag('post-title') },
          }),
        ]),
      ],
    ),
  ];
}

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'em-section em-stories',
      content_width: 'full',
      _attributes: 'aria-labelledby|stories-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'em-stories__head', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            container({ content_width: 'full', _attributes: 'data-reveal|rise' }, [
              text({ markup: `<p class="em-eyebrow">${EYEBROW}</p>` }),
              text({ markup: `<h2 id="stories-title">${HEADLINE}</h2>` }),
              /* A decorative 56x4 rule, the build's own section motif. A <span>
                 with no content: an empty container carries it fine, and it must
                 keep aria-hidden so it is never announced. */
              container({ cssClass: 'em-rule', content_width: 'full', _attributes: 'aria-hidden|true' }),
              text({ markup: `<p class="em-lead">${LEAD}</p>` }),
            ]),
            link({
              label: 'Read Community Stories',
              href: '/community-stories',
              cssClass: 'em-btn em-btn--inverse-outline em-btn--md',
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
        container(
          { cssClass: 'em-stories__feature', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            /* The lead card. cssClass names the widget so bridge.css can take
               it, its widget container and its loop container out of the box
               tree with display:contents, which is what makes
               .em-stories__lead-card the real grid child of
               .em-stories__feature again. The same repair the mini column
               already needed, scoped to its own class rather than to
               .em-stories__feature, so it cannot reach into the sibling
               column's grid. */
            loopGrid({
              templateId: LEAD_LOOP_ITEM_POST_ID,
              cssClass: 'em-stories__lead-loop',
              columns: 1,
              columns_tablet: 1,
              columns_mobile: 1,
              posts_per_page: LEAD_POSTS_PER_PAGE,
              post_query_post_type: 'post',
              post_query_include: 'terms',
              post_query_include_term_ids: [String(STORIES_CATEGORY_ID)],
              post_query_orderby: 'post_date',
              post_query_order: 'desc',
            }),
            container({ cssClass: 'em-stories__col', content_width: 'full' }, [
              loopGrid({
                templateId: STORIES_LOOP_ITEM_POST_ID,
                columns: 1,
                columns_tablet: 1,
                columns_mobile: 1,
                posts_per_page: STORIES_POSTS_PER_PAGE,
                post_query_offset: LEAD_POSTS_PER_PAGE,
                post_query_post_type: 'post',
                post_query_include: 'terms',
                post_query_include_term_ids: [String(STORIES_CATEGORY_ID)],
                post_query_orderby: 'post_date',
                post_query_order: 'desc',
              }),
            ]),
          ],
        ),
      ]),
    ],
  );
}
