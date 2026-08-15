import { container, heading, text, image, link, html } from '../../factory.mjs';
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

const ROWS = [
  {
    photo: 'child-classroom-tablet',
    badge: 'Article',
    readTime: '4 min read',
    title: 'Article headline — auto-populated from the blog',
    excerpt: 'Excerpt pulled from the article. Tagged by issue area so it can feed the solution pages too.',
    href: '/all-content',
  },
  {
    photo: 'esa-email-mockup',
    badge: 'Research',
    readTime: '6 min read',
    title: 'Research title — auto-populated from EPIC',
    excerpt: 'Summary of the report, with a link through to the full research page.',
    href: '/research',
  },
  {
    photo: 'classroom-students',
    badge: 'Community Story',
    readTime: '3 min read',
    title: 'Community story title — auto-populated',
    excerpt: 'A Mississippian in their own words, tagged to the solution their story speaks to.',
    href: '/community-stories',
  },
];

const row = (r) =>
  container(
    { tag: 'article', cssClass: 'em-insights__row', content_width: 'full', _attributes: 'data-reveal|rise' },
    [
      image({ ...photo(r.photo) }),
      container({ content_width: 'full' }, [
        html({
          cssClass: 'em-article__meta',
          markup: `<span class="em-badge em-badge--outline em-badge--sm">${r.badge}</span> ${r.readTime}`,
        }),
        heading({ text: r.title, tag: 'h3', cssClass: 'em-article__title' }),
        text({ markup: `<p>${r.excerpt}</p>`, cssClass: 'em-article__excerpt' }),
        html({ markup: `<a class="em-article__more" href="${r.href}">Read more →</a>` }),
      ]),
    ],
  );

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
            text({ markup: `<p>${EYEBROW}</p>`, cssClass: 'em-eyebrow', _attributes: 'data-reveal|rise' }),
            heading({
              text: HEADLINE,
              tag: 'h2',
              _element_id: 'insights-title',
              _attributes: 'data-reveal|rise',
            }),
            container({ cssClass: 'em-rule', content_width: 'full', _attributes: 'aria-hidden|true' }),
            text({
              markup: `<p>${LEDE}</p>`,
              cssClass: 'em-insights__lede',
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
