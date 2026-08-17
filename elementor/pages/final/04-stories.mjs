import { container, text, image, link, html, loopGrid, elementId } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: src/sections/04-stories.html.

   THIS SECTION IS HALF AUTHORED AND HALF QUERY, and the split is the point.
   The lead card is a real Mississippian's real words, with her name and town:
   Jodi Berry, Sumrall. It is content, not a placeholder, and it is NOT part of
   the loop. The two mini cards beside it are placeholders whose own copy says
   so ("Community story pull-quote, auto-populated from the latest Community
   Stories"), and they are what becomes a Loop Grid.

   Getting that split wrong in the other direction would be the expensive
   mistake: a Loop Grid over the whole feature block would replace a named
   person's quote with whatever is newest, which is the class of failure Empower
   already flagged once on this build when a name led somewhere it should not.

   THE QUERY IS REAL AND CHECKED. Community Stories is category 9 on the
   install (27 posts), read with `wp term list category` rather than assumed,
   and the loop takes 2 to match the two cards it replaces. Newest first, stated
   explicitly rather than left to Elementor's defaults, for the reason
   podcast-a's library records: a reader should see the requirement, not have to
   read Elementor's source to find that the default happens to match.

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
const QUOTE = '“I have felt devastated more times than I should have when it comes to my son’s education. We just want him to succeed.”';

export const STORIES_CATEGORY_ID = 9;
export const STORIES_LOOP_ITEM_POST_ID = 20589;
const STORIES_POSTS_PER_PAGE = 2;

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
            __dynamic__: { editor: dynamicTag('post-excerpt') },
          }),
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
            container(
              {
                tag: 'article',
                cssClass: 'em-stories__lead-card',
                content_width: 'full',
                _attributes: 'data-reveal|slide-l',
              },
              [
                image({ ...photo('girl-writing-bw') }),
                container({ cssClass: 'em-stories__lead-body', content_width: 'full' }, [
                  text({ markup: '<p class="em-eyebrow">Featured story</p>' }),
                  /* <blockquote><p>…</p></blockquote>. Elementor's container
                     html_tag offers no blockquote, and a quotation that stops
                     being a quotation is a semantic loss rather than a styling
                     one, so this is an html() widget for the same reason the
                     solutions model's <ol> is. */
                  html({ markup: `<blockquote>\n            <p>${QUOTE}</p>\n          </blockquote>` }),
                  /* "Jodi Berry<span>Sumrall, MS</span>": a name with the town
                     as a nested span the CSS sets on its own line. text()'s
                     markup passes through, so this needs no exception. */
                  text({
                    markup: '<p class="em-stories__attr">Jodi Berry<span>Sumrall, MS</span></p>',
                  }),
                ]),
              ],
            ),
            container({ cssClass: 'em-stories__col', content_width: 'full' }, [
              loopGrid({
                templateId: STORIES_LOOP_ITEM_POST_ID,
                columns: 1,
                columns_tablet: 1,
                columns_mobile: 1,
                posts_per_page: STORIES_POSTS_PER_PAGE,
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
