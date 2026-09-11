import { container, text, image, link, html, heading, loopGrid, elementId } from '../../factory.mjs';
import { TERMS } from '../../terms.mjs';
import { TEMPLATE_IDS } from '../../loop-templates.mjs';
import { photo } from './media.mjs';

/* Source of truth: src/sections/05-insights.html.

   THIS SECTION IS THE ONE PLACE ON THE HOMEPAGE WHERE README'S CONVERSION
   TABLE SAYS "Loop Grid" AND THE ANSWER IS "NOT YET", so the reason is the
   first thing in this file rather than a footnote.

   The three rows are one blog article, one research report and one community
   story, in that order, each with its own badge. That is three different
   sources, not three of one, so it is not one query; and the middle one has no
   query available at all. The install's categories were read directly rather
   than assumed (`wp term list category`): Bill Summaries, Capitol Chat,
   Community Stories, Education, Empower News, Justice, Podcast, Press
   Releases, Work. **There is no Research & Reports category.** That is not a
   surprise, it is the open item already recorded against Empower on both All
   Content readings, and it lands here too.

   So the rows are built as the static build authors them: real containers,
   real images, and the placeholder copy that says out loud it is
   auto-populated. Building a Loop Grid anyway would mean choosing a query for
   the research row, and any choice would be a guess that renders plausible
   wrong content on the homepage with nothing reporting it. A placeholder that
   says "auto-populated from EPIC" is honest and obviously unfinished; a loop
   quietly serving Education posts under a "Research" badge is neither.

   WHAT UNBLOCKS IT: Empower deciding how research is filed. When that lands,
   this section becomes three Loop Grids of one post each (or one grid plus two,
   depending on the answer), and 04-stories already carries the working pattern
   including the _element_cache finding. Nothing else about the section changes.

   THE PODCAST TEASER IS AN html() WIDGET. Source is an <a class="em-podcast">
   wrapping a play icon (inline SVG) and three nested <span> carrying the show,
   the title and the meta line. Inline SVG is the original html() exception, and
   an anchor containing four nested spans is not something link()'s button
   widget can express at all: it takes plain text.

   .em-article__meta IS ALSO html(), for the nested <span class="em-badge">
   inside the paragraph. text() would carry the markup through happily, and the
   reason to use html() instead is narrower: nothing here needs an editor.

   KNOWN BREAKAGE, same as 04 and handled the same way: css/homepage.css:307 is
   `.em-insights__row>img`, a child combinator carrying the row image's width,
   height and object-fit. image() puts the img inside a widget wrapper, so it
   breaks. Bridge repair after measurement, not before. */

const EYEBROW = 'Insights';
const HEADLINE = 'Latest insights and research';
const LEDE = 'Stay connected with the latest research, conversations, and stories driving opportunity across Mississippi.';

const PLAY_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

const PODCAST_MARKUP = `<a class="em-podcast em-insights__podcast" href="/podcast" data-reveal="rise">
        <span class="em-podcast__play" aria-hidden="true">
          ${PLAY_SVG}
        </span>
        <span>
          <span class="em-podcast__show">The Empower Podcast</span>
          <span class="em-podcast__title">Capitol Chat</span>
          <span class="em-podcast__meta">New episodes on the ideas, people, and policy shaping opportunity in Mississippi.</span>
        </span>
      </a>`;

/* Same helper and same trap as final/04-stories.mjs, whose comment carries the
   full story: the `id` attribute must be a FRESH id per tag, not the tag name.
   Two tags sharing an id in one template means one of them silently renders
   nothing, which reads as "dynamic tags do not work here". */
const dynamicTag = (name, tagSettings = {}) =>
  `[elementor-tag id="${elementId()}" name="${name}" settings="${encodeURIComponent(JSON.stringify(tagSettings))}"]`;

/* THE THREE ROWS ARE LOOP GRIDS NOW, 2026-09-09, and this is Empower's round-1
   row 3: "auto-populating from the actual reports and releases".
 *
 * WHAT SHIPPED BEFORE. Three authored <article> rows whose titles read "Article
 * headline — auto-populated from the blog", "Research title — auto-populated
 * from EPIC" and "Community story title — auto-populated". That copy was a
 * placeholder describing an intention, and it was live on Empower's homepage.
 * The middle row's photograph was a LOREM IPSUM report mockup.
 *
 * WHAT THE CARD LOST, and neither loss is cosmetic:
 *
 *   THE EXCERPT. Banned on this install, proved twice on 04-stories: all these
 *   posts have an empty post_excerpt so the tag renders nothing, and with
 *   apply_to_post_content on, the generated excerpt arrives carrying a BYLINE.
 *   That is how "Written by Ashley Green" ended up beside a photograph of
 *   Amanda. 04-stories.mjs carries the full account and the route back.
 *
 *   THE READ TIME. "4 min read" was invented. Nothing on this install computes
 *   one, so a hard-coded number sitting beside a queried title is the same
 *   defect class Empower reported in round 1: an authored value next to content
 *   that changes underneath it. The post's real DATE takes its place, which
 *   keeps the meta line's weight and is a fact rather than a guess.
 *
 * WHY THREE TEMPLATES RATHER THAN ONE. The badge is the row's own label and
 * differs per row, and a Loop Item template renders one shape. content-a set
 * the precedent with four (one per band). The ids are read from
 * loop-templates.mjs, never typed: an elementor_library id belongs to one
 * install, and a Loop Grid pointing at the wrong template renders the wrong
 * card with no error at all.
 *
 * ARTICLES IS EMPOWER NEWS, matching content-a's Articles band rather than
 * inventing a second definition of "article" for the same site. That band's
 * own comment carries the measurement, including that Bill Summaries is a
 * CHILD of Empower News and so arrives with it.
 *
 * THE STORY ROW IS OFFSET BY ONE. The stories band above this section already
 * shows the newest Community Story, so without the offset the same post and the
 * same photograph appear twice on one page. Offset rather than an explicit
 * exclusion, so the two loops stay independent: coupling them would mean both
 * had to agree at deploy time about which post the other was showing.
 *
 * NO ignore_sticky_posts. Checked rather than assumed: post 15691 is sticky and
 * from 2022, and content-a's Articles band renders July 2026 first, so
 * Elementor's own post query already ignores sticky. */
const ROWS = [
  {
    key: 'insightsArticle',
    badge: 'Article',
    modifier: 'em-insights__row--first',
    query: () => ({
      post_query_include: 'terms',
      post_query_include_term_ids: [String(TERMS.empower)],
    }),
  },
  {
    key: 'insightsResearch',
    badge: 'Research',
    modifier: '',
    query: () => ({
      post_query_include: 'terms',
      post_query_include_term_ids: [String(TERMS['research-reports'])],
    }),
  },
  {
    key: 'insightsStory',
    badge: 'Community Story',
    modifier: 'em-insights__row--last',
    query: () => ({
      post_query_include: 'terms',
      post_query_include_term_ids: [String(TERMS['community-stories'])],
      post_query_offset: 1,
    }),
  },
];

/* One row's Loop Item template. `_element_cache: 'yes'` for 04-stories' reason:
   the container itself carries no dynamic setting, so without it Elementor
   serves the same cached markup for every iteration.

   THE TITLE IS A heading() WIDGET, which is an exception to this build's
   "text() carrying a bare element, never heading()" rule and earns it. That
   rule exists so authored markup travels intact; there is no authored markup
   here, the title comes from the query. A text() widget with a dynamic editor
   renders the title in a bare div, which would drop the <h3> and with it the
   document outline. heading() keeps the real element and the class. */
export function loopItem(key) {
  const spec = ROWS.find(r => r.key === key);
  if (!spec) throw new Error(`loopItem: no insights row called '${key}'`);
  return [
    container(
      {
        tag: 'article',
        cssClass: `em-insights__row ${spec.modifier}`.trim(),
        content_width: 'full',
        _attributes: 'data-reveal|rise',
        _element_cache: 'yes',
      },
      [
        image({ id: '', url: '', __dynamic__: { image: dynamicTag('post-featured-image') } }),
        container({ content_width: 'full' }, [
          /* The meta line is a CONTAINER now rather than one html() widget,
             because half of it is authored (the badge names the row's own
             query) and half comes from the post. Elementor replaces a whole
             setting through __dynamic__, so the two cannot share a widget.
             components.css:159 already makes .em-article__meta a flex row, so
             the two widget wrappers lay out as the span and the text did. */
          container({ cssClass: 'em-article__meta', content_width: 'full' }, [
            html({ markup: `<span class="em-badge em-badge--outline em-badge--sm">${spec.badge}</span>` }),
            text({ markup: '', __dynamic__: { editor: dynamicTag('post-date') } }),
          ]),
          heading({
            text: '',
            tag: 'h3',
            cssClass: 'em-article__title',
            __dynamic__: { title: dynamicTag('post-title') },
          }),
          link({
            label: 'Read more',
            href: '',
            cssClass: 'em-article__more',
            __dynamic__: { link: dynamicTag('post-url') },
          }),
        ]),
      ],
    ),
  ];
}

export const LOOP_ITEM_KEYS = ROWS.map(r => r.key);

const row = (r) =>
  loopGrid({
    templateId: TEMPLATE_IDS[r.key],
    cssClass: 'em-insights__loop',
    columns: 1,
    columns_tablet: 1,
    columns_mobile: 1,
    posts_per_page: 1,
    post_query_post_type: 'post',
    ...r.query(),
    post_query_orderby: 'post_date',
    post_query_order: 'desc',
    _attributes: 'data-cms|loop\ndata-reveal-group|',
  });

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'em-section em-insights-wrap',
      content_width: 'full',
      _attributes: 'aria-labelledby|insights-title',
    },
    [
      container({ cssClass: 'em-container em-insights', content_width: 'full' }, [
        container(
          { cssClass: 'em-insights__aside', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({ markup: `<p class="em-eyebrow">${EYEBROW}</p>`, _attributes: 'data-reveal|rise' }),
            text({
              markup: `<h2 id="insights-title">${HEADLINE}</h2>`,
              _attributes: 'data-reveal|rise',
            }),
            container({ cssClass: 'em-rule', content_width: 'full', _attributes: 'aria-hidden|true' }),
            text({
              markup: `<p class="em-insights__lede">${LEDE}</p>`,
              _attributes: 'data-reveal|rise',
            }),
            link({
              label: 'See all',
              href: '/all-content',
              cssClass: 'em-btn em-btn--outline em-btn--sm',
              _attributes: 'data-reveal|rise',
            }),
            html({ markup: PODCAST_MARKUP }),
          ],
        ),
        container(
          { cssClass: 'em-insights__rows', content_width: 'full', _attributes: 'data-reveal-group|' },
          ROWS.map(row),
        ),
      ]),
    ],
  );
}
