import { container, text, html, loopGrid } from '../../factory.mjs';
import { BAND_TYPES, LOOP_ITEM_POST_IDS } from './loop-item.mjs';

/* Source of truth: src/content-a/sections/02-browse.html and its built form at
   dist/content-a.html:182-521. Every class, string and attribute below is read
   from those files, not typed from memory.

   THE WHOLE PAGE BELOW THE HERO: one sticky filter bar and four bands, and the
   filter is fourteen CSS selectors over the bar's ten radio ids and the bands'
   and cards' data attributes. css/content-a.css's own header (:33-36) predicted
   this section would not survive conversion. It does; podcast-a proved the
   shape first and that note is out of date.

   THE FOUR BANDS SHIP AS LOOP GRIDS. Paolo's decision, 2026-08-19, on
   measurement rather than preference: the page's subject IS the live archive,
   every post the four queries return already carries a featured image so the
   loop costs no media imports and adds nothing to the alt-text queue, and the
   filter is CSS over attributes the loop item template can emit. The
   consequence is that this page's content is not dist/content-a.html's, so it
   is NOT gated in PAGE_REGISTER and is listed in EXCLUDED_PAGES instead,
   exactly as podcast-a is. The task report carries every visible difference
   that decision causes.

   THE FOUR QUERIES, read off the install on 2026-08-19 and recorded here
   because the numbers are the decision:

     article   category term 48, Empower News          141 posts
     story     category term 9, Community Stories       27 posts
     research  MANUAL SELECTION of four post ids         4 posts
     press     category term 22, Press Releases         33 posts

   ARTICLE IS EMPOWER NEWS, AND THE 141 IS THE FINDING. `wp term list category`
   reports 78 for that term; a real query returns 141, and the difference is
   Bill Summaries (term 124), which is a CHILD of Empower News on this install.
   WP_Tax_Query::clean_query() expands a hierarchical taxonomy's children before
   it runs, whatever field the query names, so Elementor's own
   `field => 'term_taxonomy_id'` (read from
   modules/query-control/classes/elementor-post-query.php) still picks them up.
   That is not an accident to work around: it is Empower's own taxonomy
   agreeing with the design. css/content-a.css:324-325 says "bill summaries are
   written as articles, so no story, report or press release carries that
   topic", and the install says the same thing by making Bill Summaries a
   subcategory of Empower News. All 74 bill summaries are in the Articles band,
   and the three dead-end pairs the empty state exists for are genuinely empty.

   All nine of the static build's Articles cards carry Empower News, checked
   post by post rather than inferred, which is what makes this the band's query
   rather than a plausible guess.

   THE ALTERNATIVE WAS "EVERYTHING NOT IN THE OTHER THREE" and it was measured
   and rejected. Elementor's query control does offer `exclude_term_ids`, so it
   is expressible; it returns 430 of the install's 490 published posts, because
   the archive also holds 66 Podcast and 28 Capitol Chat posts that have their
   own destinations in the nav, plus everything never given a section category
   at all. An Articles band holding 430 items would not be the roadmap's
   "Articles" column, it would be the archive with three things taken out.

   RESEARCH & REPORTS HAS NOTHING TO QUERY, AND THAT IS EMPOWER'S TO ANSWER.
   The band's own data-cms-note says so in the static build: "Empower's
   WordPress has no Research & Reports category yet - that band needs one
   creating, or the query narrowing by hand." No category was invented here and
   the band was not silently repointed at something else. It ships the SECOND
   option the note names: a manual selection of the four posts the signed-off
   page already shows, which are real, are Empower's, and were gathered by hand
   by the static build for exactly this reason (its own comment says so). The
   four carry no common category: two are Education/Empower News/Justice/Work,
   one is Press Releases/Work, one is Empower News/Justice/Press Releases. That
   is the evidence that no query over today's taxonomy can produce this band.

   Elementor expresses it as `post_type: 'by_id'` with `posts_ids`, which sets
   WP_Query's `post__in` and still applies the orderby (read from the same
   file's set_post_include_args() and get_query_args()), so the four stay newest
   first. It is one control change away from a category query the day the
   category exists.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, per 01-hero.mjs note 1.

   2. THE FILTER BAR IS ONE VERBATIM html() WIDGET, which is podcast-a's
      exception 2 and the reason the filter survives at all. FOURTEEN selectors
      at css/content-a.css:330-352 reach the ten radios BY ID from `body`
      through `:has()`, and depend on nothing else about the bar, so the ids
      `ca-t-all`, `ca-t-article`, `ca-t-story`, `ca-t-research`, `ca-t-press`,
      `ca-p-all`, `ca-p-education`, `ca-p-work`, `ca-p-safety` and `ca-p-bills`
      are reproduced exactly.

      THREE THINGS INSIDE THE BLOB COST NOTHING, each for the same reason and
      each worth naming because each would have cost a rule anywhere else:

        - `.cad-group{display:contents}` (:123) is on a real `<fieldset>`.
          `fieldset` is not in Elementor's ALLOWED_HTML_WRAPPER_TAGS and a
          container could never carry it, but markup inside an html() widget is
          never passed through Utils::validate_html_tag, so it stays a real
          fieldset with a real legend, and the aria-labelledby wiring the
          source comment argues for survives with it.
        - `.cad-tabs` and `.cad-chips` (:136) declare `display:flex` with no
          `flex-direction`, which is the sixth cost category everywhere else in
          this build. Inside the blob they are real divs in a real flow and
          Elementor's `.e-con-full.e-flex` rule cannot reach them.
        - `.cad-radio:checked + .cad-tab` and its four siblings (:150-152,
          :164-166) are ADJACENT SIBLING selectors, the shape recipe section 6's
          two greps do not cover. Five of the six in this stylesheet are here,
          inside one authored string, so the widget boundary that breaks that
          shape never falls between the radio and its label.

      THE TEN RADIOS ARE NATIVE CONTROLS INSIDE <main>, which is the third cost
      category. Elementor's kit styles `button`, `input[type=button]`,
      `input[type=submit]` and `.elementor-button` and none of those matches
      `input[type=radio]`; predicted zero, verified against the live kit rather
      than assumed.

   3. THE FORM'S `position:sticky` IS THE ONE NEW SHAPE ON THIS PAGE.
      css/content-a.css:93 makes `.cad-controls` sticky at `top:113px`, and
      sticky resolves against the element's PARENT box. In the static build that
      parent is `.cad-browse`, a tall section, so the bar has the whole browse
      to travel through. Converted, the form's parent is
      `.elementor-widget-container` inside `.elementor-widget-html`, and that
      wrapper shrink-wraps to the form's own height, leaving sticky exactly zero
      room to move. Predicted before deploying, measured after, and repaired
      with `display:contents` on the two wrappers, named to `.cad-browse`, which
      is the same instrument bridge blocks 22 and 44 use for a different symptom
      of the same cause. The task report carries the before and after.

   4. THE BAND HEADS ARE text() WIDGETS CARRYING REAL TAGS, so
      `.cad-band__title`'s `position:relative` and its 56x4 `::before` mark
      (:192-197) land on the real <h2> and cost nothing, and the `id` each band
      is `aria-labelledby`'d by sits on that <h2> rather than on a widget
      wrapper. Same move 01-hero.mjs note 3 makes for the <h1>.

   5. `.cad-cards` IS THE LOOP GRID WIDGET, AND ELEMENTOR'S OWN GRID WINS.
      podcast-a/03-library.mjs note 9 measured this on a real render and it is
      unchanged here: the class lands on the widget's outer wrapper, that
      wrapper has exactly one child, and the actual grid is Elementor's
      `div.elementor-loop-container.elementor-grid` two levels deeper, driven by
      the widget's `columns` controls and a generated inline <style>. So
      `.cad-cards`'s `repeat(auto-fill,minmax(min(100%,300px),1fr))` and its
      `clamp()` gap are no-ops, and the cards lay out 3/2/1 instead of filling
      by width. Set to 3/2/1 as the closest approximation of what auto-fill
      chooses at this build's card width.

      `data-cms`, `data-cms-item-attrs` and `data-cms-note` ride on the widget
      through `_attributes`, kept verbatim including the source's em dash and
      curly apostrophe, because they are the CMS contract this whole page is
      about and the brief requires them preserved. They land on the widget
      wrapper rather than on a <ul>, which is the only element there is.

   6. THE LEAD CARD IS RESTORED BY POSITION, and this is the decision the task
      report is required to state. `.cad-card--lead` (css/content-a.css:225-229,
      :244-245, :248-249) turns the first card of each band sideways across the
      full row: `grid-column:1/-1`, a two-column internal grid, a bounded
      photograph height and a larger title. A Loop Grid renders every item from
      one template, so no per-item modifier can exist. Three options were on the
      table and the first was taken:

        1. CSS BY POSITION. Give the first item of each loop the lead treatment
           through the loop container's first child. Nearest to the design, and
           it is the structural-pseudo-class shape this phase has repaired
           eleven times, used deliberately this time rather than repaired.
        2. Drop the lead treatment entirely. Cheapest, and it loses the shape
           the band is built around: four bands of identical plates with no
           entry point.
        3. Author the first card of each band and loop the rest. NOT taken, and
           not takeable without asking: it reintroduces per-card media and
           per-card alt text, which is the whole cost the Loop Grid decision
           removed.

      The rule goes in bridge.css named to `.cad-cards`, because the element
      that must take `grid-column:1/-1` is Elementor's own `.e-loop-item`, not
      `.cad-card`: the loop item div is the grid item, and the fourth cost
      category is about exactly that. `.cad-card__photo--whole`, the second
      per-card variant, follows the same logic and is DROPPED, which is a
      visible difference from the static build and is in the report rather than
      buried in a comment.

   7. `.cad-empty` IS A text() WIDGET AND IS HIDDEN BY DEFAULT. Its `display:none`
      (:305) and the three `:has()` pairs that reveal it (:342-344) both act on
      the real <p>, which the class travels on, so the widget wrapper stays in
      the flow either way holding a hidden paragraph. That is a box the static
      build does not have; it contributes nothing but Elementor's own container
      gap, which this build's kit sets to zero (no gap repair exists anywhere in
      bridge.css after sixteen pages). Measured rather than assumed.

   8. `.cad-band + .cad-band` (:187) IS THE SIXTH ADJACENT-SIBLING SELECTOR and
      the only one outside the html() blob. Both subjects are containers and
      containers are the elements themselves, so nothing is inserted between two
      sibling bands and the rule keeps matching. That is recipe section 6's
      "container target: no rule" applied to a combinator rather than to a
      pseudo-class. Predicted zero; measured.

      The `.cad-empty` widget sitting FIRST inside `.cad-results` cannot break
      it either: the selector only ever pairs a band with a band. */

/* Copied verbatim from src/content-a/sections/02-browse.html:40-79, comment
   included, indentation included. This is podcast-a's exception 2. */
const CONTROLS_FORM = `<form class="cad-controls">
    <div class="em-container cad-controls__inner">
      <!-- role="group" and aria-labelledby alongside the fieldset and its legend,
           not instead of them. The stylesheet dissolves these fieldsets with
           display:contents so that both legends can share one column track, and
           display:contents has dropped implicit semantics in shipped browsers;
           an explicit role and an explicit name survive it. -->
      <fieldset class="cad-group" role="group" aria-labelledby="cad-type-label">
        <legend class="cad-group__label" id="cad-type-label">Browse</legend>
        <div class="cad-tabs">
          <input class="cad-radio cad-type" type="radio" name="cad-type" id="ca-t-all" checked>
          <label class="cad-tab" for="ca-t-all">All</label>
          <input class="cad-radio cad-type" type="radio" name="cad-type" id="ca-t-article">
          <label class="cad-tab" for="ca-t-article">Articles</label>
          <input class="cad-radio cad-type" type="radio" name="cad-type" id="ca-t-story">
          <label class="cad-tab" for="ca-t-story">Stories</label>
          <input class="cad-radio cad-type" type="radio" name="cad-type" id="ca-t-research">
          <label class="cad-tab" for="ca-t-research">Research</label>
          <input class="cad-radio cad-type" type="radio" name="cad-type" id="ca-t-press">
          <label class="cad-tab" for="ca-t-press">Press</label>
        </div>
      </fieldset>

      <fieldset class="cad-group cad-group--topics" role="group" aria-labelledby="cad-topic-label">
        <legend class="cad-group__label" id="cad-topic-label">Filter by Topic:</legend>
        <div class="cad-chips">
          <input class="cad-radio cad-topic" type="radio" name="cad-topic" id="ca-p-all" checked>
          <label class="cad-chip" for="ca-p-all">All topics</label>
          <input class="cad-radio cad-topic" type="radio" name="cad-topic" id="ca-p-education">
          <label class="cad-chip" for="ca-p-education">Education</label>
          <input class="cad-radio cad-topic" type="radio" name="cad-topic" id="ca-p-work">
          <label class="cad-chip" for="ca-p-work">Work</label>
          <input class="cad-radio cad-topic" type="radio" name="cad-topic" id="ca-p-safety">
          <label class="cad-chip" for="ca-p-safety">Safety</label>
          <input class="cad-radio cad-topic" type="radio" name="cad-topic" id="ca-p-bills">
          <label class="cad-chip" for="ca-p-bills">Bills</label>
        </div>
      </fieldset>
    </div>
  </form>`;

/* Copied from src/content-a/sections/02-browse.html:82-88, its comment
   included. The two source lines of the paragraph are joined with one space,
   which is what census()'s whitespace normalisation reduces them to. */
const EMPTY_NOTE = '<!-- Shown by CSS for the three type-and-topic pairs that hold nothing:\n'
  + '         bill summaries are written as articles, so no community story, report\n'
  + '         or press release carries that topic. A filter that can return nothing\n'
  + '         needs to say so in words. -->';

const EMPTY_STATE = '<p class="cad-empty" role="status">Nothing here yet. Bill summaries are published as articles, so try '
  + '<span class="cad-empty__hint">Articles</span> above, or set the topic back to All.</p>';

/* Verbatim from the four <ul class="cad-cards"> elements, which all carry the
   identical note. The em dash and the curly apostrophe are the source's, and
   the `&amp;` is written here as a bare `&` because Elementor's
   Utils::render_html_attributes() escapes the value on output. */
const CMS_NOTE = 'One band per content type, newest first. In WordPress each band is a Loop Grid '
  + 'filtered to its own type; the loop item template MUST emit data-type and data-topic from the '
  + 'post’s terms, because the filter bar above is CSS over those attributes. Empower’s '
  + 'WordPress has no Research & Reports category yet — that band needs one creating, or the '
  + 'query narrowing by hand.';

/* The four bands, in the source's own order, each with the copy read off its
   own <section class="cad-band"> and the query decided above.

   `templateId` is filled in from LOOP_ITEM_POST_IDS below rather than written
   per band, so the four elementor_library posts and the four bands cannot drift
   apart silently. */
const BANDS = [
  {
    type: 'article',
    id: 'band-article',
    title: 'Articles',
    blurb: 'Explore the latest ideas, insights, and updates on the issues shaping opportunity in Mississippi.',
    query: { post_query_include: 'terms', post_query_include_term_ids: ['48'] },
  },
  {
    type: 'story',
    id: 'band-story',
    title: 'Community Stories',
    blurb: 'Meet the people behind the issues and see how policy and opportunity impact real lives across Mississippi.',
    query: { post_query_include: 'terms', post_query_include_term_ids: ['9'] },
  },
  {
    type: 'research',
    id: 'band-research',
    title: 'Research &amp; Reports',
    blurb: 'Explore Mississippi-specific research, data, and policy solutions designed to turn ideas into action.',
    /* Manual selection, the second option the band's own data-cms-note names.
       The four ids are the four posts dist/content-a.html already shows in this
       band, resolved off the install by slug on 2026-08-19:
         20396  empower-ms-releases-2025-impact-report
         19392  2024-impact-report-celebrating-10-years-of-service-in-mississippi
         19110  new-empower-mississippi-report-highlights-growth-in-labor-force...
         16545  empower-releases-report-on-violent-crime-in-mississippi
       Written newest first for a reader's benefit; the order that reaches the
       page is the orderby's, which still applies under by_id. */
    query: { post_query_post_type: 'by_id', post_query_posts_ids: ['20396', '19392', '19110', '16545'] },
  },
  {
    type: 'press',
    id: 'band-press',
    title: 'Press Releases',
    blurb: 'Get the latest news, announcements, and updates from Empower Mississippi.',
    query: { post_query_include: 'terms', post_query_include_term_ids: ['22'] },
  },
];

/* One number for every band, above every band's current count (141, 27, 4, 33),
   for podcast-a's reason: the filter is CSS over what is RENDERED, so anything
   a page size left off the page cannot be filtered to. A cap of, say, 50 would
   silently make the Bill Summaries chip lie, showing only the bill summaries
   that happen to fall inside the newest 50 articles rather than all 74.

   IT IS ALSO THE PAGE'S LARGEST COST, and it is stated here rather than
   discovered: 205 cards render where dist/content-a.html has 23. The task
   report carries the page weight this produces. Pagination is the obvious
   alternative and it is not available: Elementor's own pagination reloads the
   page with a query argument, and a CSS filter cannot reach a card on another
   page. */
const BAND_POSTS_PER_PAGE = 200;

function band({ type, id, title, blurb, query }) {
  return container(
    {
      tag: 'section',
      cssClass: 'cad-band',
      content_width: 'full',
      _attributes: `data-type|${type}\naria-labelledby|${id}`,
    },
    [
      container(
        { cssClass: 'cad-band__head', content_width: 'full', _attributes: 'data-reveal-group|' },
        [
          text({
            markup: `<h2 class="cad-band__title" id="${id}">${title}</h2>`,
            _attributes: 'data-reveal|rise',
          }),
          text({
            markup: `<p class="cad-band__blurb">${blurb}</p>`,
            _attributes: 'data-reveal|rise',
          }),
        ],
      ),
      loopGrid({
        templateId: LOOP_ITEM_POST_IDS[type],
        cssClass: 'cad-cards',
        columns: 3,
        columns_tablet: 2,
        columns_mobile: 1,
        posts_per_page: BAND_POSTS_PER_PAGE,
        post_query_post_type: 'post',
        ...query,
        /* "newest first" is the band's own data-cms-note, stated rather than
           left to fall through to Group_Control_Query's defaults, which happen
           to be the same two values today. */
        post_query_orderby: 'post_date',
        post_query_order: 'desc',
        _attributes: 'data-cms|loop\ndata-cms-item-attrs|data-type,data-topic\n'
          + `data-cms-note|${CMS_NOTE}\ndata-reveal-group|`,
      }),
    ],
  );
}

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'cad-browse',
      content_width: 'full',
      _attributes: 'aria-labelledby|browse-title',
    },
    [
      text({ markup: '<h2 class="em-visually-hidden" id="browse-title">Browse all content</h2>' }),
      html({ markup: CONTROLS_FORM }),
      container({ cssClass: 'em-container cad-results', content_width: 'full' }, [
        text({ markup: `${EMPTY_NOTE}\n${EMPTY_STATE}` }),
        ...BANDS.map(band),
      ]),
    ],
  );
}

export { BANDS, BAND_TYPES };
