import { container, heading, text, html, loopGrid, elementId } from '../../factory.mjs';

/* Source of truth: src/podcast-a/sections/03-library.html. Every class,
   string and attribute below is read from that partial, not typed from
   memory. This is the hard section: a Loop Grid, nine inline SVGs and a
   <form> in one section, and it carries the loop item attribute contract
   (data-cms-item-attrs="data-topic,data-guest").

   Read the task-7b report for the full evidence trail (dynamic-tag probes
   run live against the install, the loop-grid DOM structure captured from a
   real render, the guest taxonomy and the nine posts termed). This file's
   comments record the decisions; the report records the proof.

   Structural decisions this module makes and why:

   1. Every container is content_width: 'full', for the reason 01-hero.mjs's
      own note 1 gives. .pca-catalogue depends on this directly: its CSS
      (`display:grid;grid-template-columns:minmax(0,240px) minmax(0,1fr)`)
      needs its two children (the facets form and the loop grid) to be its
      DIRECT children. A boxed container would insert div.e-con-inner
      between them and collapse the two-column layout to one column with
      everything stacked inside the inner div.

   2. The filter bar (form.pca-facets and its Guest fieldset) is exception 2
      of the spec's three named HTML-widget exceptions, reproduced verbatim
      inside one html() widget below (FACETS_FORM). The ids pa-g-lawmaker,
      pa-g-expert, pa-g-leader are preserved exactly, because
      css/podcast-a.css selects on them by id in the :has() filter rule
      (body:has(.pca-guest:checked):not(:has(#pa-g-lawmaker:checked))
      .pca-ep[data-guest="lawmaker"], and so on). The checkbox counts ("3")
      are copied verbatim too, per the dispatch's own instruction
      ("reproduce ... verbatim"): they are static markup inside a sanctioned
      HTML-widget exception, not a live query, so they read the CURRENT
      state of the nine posts termed for this spike, not the 66-post
      archive. They will drift the moment Empower back-fills more guest
      terms. Recomputing them would mean moving code out of the verbatim
      html() widget, which is outside what was authorized here; flagged in
      the task report as a known limitation, not fixed.

   3. The nine inline SVG play icons are the spec's "inline SVG: native
      containers, SVG stays as markup" treatment (per the dispatch), not a
      fourth HTML-widget exception: .pca-ep__art becomes a native container
      (a <span> is not one of the container html_tag options, same
      substitution 01-hero.mjs's note 3 makes for .pca-frame) with one
      html() widget inside carrying the raw <svg>. All nine cards use the
      identical icon, so it is written once (ICON) and reused, matching
      source exactly rather than inventing per-card variation.

   4. data-topic is NOT built. The source partial's own data-cms-note says
      so plainly: "ONLY data-guest converts ... data-topic is NOT a filter
      ... it is scaffolding for this static sample ... dropped at
      conversion." A test in test.mjs already enforces this against
      dist/podcast-a.html and css/podcast-a.css (Topic was removed
      2026-08-07), so building data-topic here would resurrect a facet the
      static build itself no longer has.

   5. The visible guest pill (.pca-ep__tags) drops the topic pill entirely
      rather than inventing one. Source shows two pills per card (topic,
      guest); real podcast posts on this install carry category 133 and
      NOTHING else (no topic taxonomy exists, and building one is Empower's
      back-fill work, not this spike's). Showing an invented topic label
      would be exactly the kind of invented-content the source partial's own
      comment warns against for episode titles ("an invented episode title
      is the one kind of placeholder that reads as finished work"): the same
      rule applies to an invented topic tag. The one guest pill that remains
      is real, dynamic, per-post data: a post-terms dynamic tag against
      guest_type, rendered by Elementor itself as <span>Lawmaker</span> (its
      own markup shape, proved live in docs/elementor/schema-4.2.2.md), so
      no manual <span> wrapping is written here for it.

   6. .pca-ep__title is a Heading widget with header_size: 'span' (not a
      button, and not left as a heading tag): the Heading widget's `link`
      control IS dynamic-capable and DOES wrap its title in a real <a>
      (Widget_Heading::render(), read from wp-content/plugins/elementor/
      includes/widgets/heading.php on empv2: `sprintf('<a %1$s>%2$s</a>',
      ..., $title)` nested inside the header_size tag). header_size offers
      div/span/p alongside h1-h6, so 'span' avoids inventing a spurious
      <h3> heading level on every one of 66 cards, which an h1-h6 choice
      would have (the source markup has no heading element here at all,
      just a plain link). Both title and link were proved live to resolve
      correctly through __dynamic__ (a scratch page probe: __dynamic__.title
      = post-title, __dynamic__.link = post-url, rendered as a real <a
      href="the post's own permalink">the post's own title</a>). The class
      pca-ep__title lands on the widget's WRAPPER div, not the <a> itself,
      the same wrapper-vs-semantic-element trade-off already accepted
      throughout this build (01-hero.mjs note 4, 02-about.mjs note 6):
      typography survives by inheritance, text-decoration on the actual <a>
      (browsers set that on the element itself, not by inheritance) does
      not, so the hover underline may not render pixel-identical to
      dist/podcast-a.html. Reported, not fixed here.

   7. .pca-ep__date carries no literal markup, only a __dynamic__ override
      (post-date, format 'default'). Confirmed against fixtures/elementor/
      loop-item.json: when a text-editor widget's editor field is fully
      dynamic, Elementor does not persist a literal value for it at all (no
      "editor" key survives alongside "__dynamic__"), and the rendered
      output is the tag's own resolved text with no wrapper of any kind, so
      writing a literal <span> placeholder here would be pure dead weight
      that never reaches the page. WordPress's date_format option on this
      install is "F j, Y" (confirmed via `wp option get date_format`), which
      already produces "August 5, 2025"-style dates matching the source
      partial's own copy without any extra formatting work.

   8. The <li> list semantics are lost: the Container element's html_tag
      control has no 'li' option (the same enumerated set 01-hero.mjs's note
      2 already lists: div, header, footer, main, article, section, aside,
      nav, a). Renders as a div. .pca-eps's own list-style:none/margin:0/
      padding:0 rules are harmless no-ops on a div, so nothing visually
      breaks, but the page loses the semantic list structure a screen
      reader would otherwise announce ("list of 66 items"). Reported, not
      fixed: no container html_tag option restores it.

   9. The Loop Grid's own grid layout wins over .pca-eps's CSS grid rule,
      and this is the most consequential finding in this file. Confirmed by
      deploying a real loop-grid widget to a scratch page and reading its
      rendered DOM: the outer wrapper div DOES carry the pca-eps class (as
      expected, on the widget's own wrapper), but the actual grid container
      is TWO levels deeper, Elementor's own
      `<div class="elementor-loop-container elementor-grid" role="list">`,
      driven by the widget's `columns` / `columns_tablet` / `columns_mobile`
      controls and an inline <style> block Elementor generates per template,
      not by css/podcast-a.css at all. .pca-eps's
      `display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))`
      rule still applies to the OUTER wrapper, but that wrapper has exactly
      one child (`.elementor-widget-container`), so the rule is a no-op:
      Elementor's fixed 3/2/1 column grid is what actually lays the cards
      out, not the source's responsive auto-fit sizing. Visually similar at
      most widths, not identical, and the `gap` set on .pca-eps (the
      responsive `clamp()` value) likely does not apply either, for the same
      reason. columns/columns_tablet/columns_mobile are set below to 3/2/1,
      matching the widget's own defaults and roughly what auto-fit would
      choose at this build's card width, as the closest available
      approximation without editing css/podcast-a.css (protected) or adding
      a bridge stylesheet (out of this task's authorized scope; the spec
      itself names an additive bridge stylesheet as the intended fix for
      exactly this shape of problem, so that is the natural next step if
      pixel-fidelity here is required later).

   10. posts_per_page is set to LIBRARY_POSTS_PER_PAGE (100) rather than left
       at the widget's own default (6): the section is titled "Explore More
       Episodes" and its filter is meant to work over the show's real
       library. This install has 66 published Podcast-category posts today;
       100 renders all of them with no pagination control needed, and stays
       correct if a handful more publish before this is revisited. The
       alternative (a small default page size) would have made this file's
       own filter behavior depend on which few episodes happened to be
       newest, an arbitrary and fragile thing to pin a test to. */

const LOOP_ITEM_POST_ID = 20572;
const PODCAST_CATEGORY_ID = 133;
const LIBRARY_POSTS_PER_PAGE = 100;

const ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

/* Verbatim from src/podcast-a/sections/03-library.html, lines 24-63: the
   <form class="pca-facets"> and its Guest fieldset. See note 2 above. */
const FACETS_FORM = `<form class="pca-facets">
  <details class="pca-facets__panel" open>
    <summary class="pca-facets__summary">
      <span>Filter episodes</span>
      <span class="pca-facets__caret" aria-hidden="true"></span>
    </summary>

    <div class="pca-facets__body">
      <fieldset class="pca-facet">
        <legend>Guest</legend>
        <div class="pca-check">
          <input class="pca-check__input pca-guest" type="checkbox" id="pa-g-lawmaker">
          <label class="pca-check__label" for="pa-g-lawmaker">
            <span class="pca-check__box" aria-hidden="true"></span>
            Lawmakers
            <span class="pca-check__n">3</span>
          </label>
        </div>
        <div class="pca-check">
          <input class="pca-check__input pca-guest" type="checkbox" id="pa-g-expert">
          <label class="pca-check__label" for="pa-g-expert">
            <span class="pca-check__box" aria-hidden="true"></span>
            Policy experts
            <span class="pca-check__n">3</span>
          </label>
        </div>
        <div class="pca-check">
          <input class="pca-check__input pca-guest" type="checkbox" id="pa-g-leader">
          <label class="pca-check__label" for="pa-g-leader">
            <span class="pca-check__box" aria-hidden="true"></span>
            Community leaders
            <span class="pca-check__n">3</span>
          </label>
        </div>
      </fieldset>

      <button class="pca-facets__clear" type="reset">Clear filters</button>
    </div>
  </details>
</form>`;

/* Elementor's Custom Attributes control always quotes every value
   (Utils::render_html_attributes()), so "key|" (empty value) is how a
   boolean-shaped HTML attribute (aria-hidden="true" is real-valued so it is
   written "aria-hidden|true"; data-reveal-group is written "key|" the same
   way 01-hero.mjs's note 6 documents) reaches the markup either way. */
const dynamicTag = (name, tagSettings = {}) =>
  `[elementor-tag id="${elementId()}" name="${name}" settings="${encodeURIComponent(JSON.stringify(tagSettings))}"]`;

/* The Loop Item template, deployed separately to LOOP_ITEM_POST_ID (an
   elementor_library post, template type loop-item), not merged into the
   page's own _elementor_data. See elementor/deploy.mjs's deployLoopItem()
   and the task report for the wp-cli steps that created that post.

   data-guest is deliberately NOT written here as a static or dynamic
   _attributes value: see wp/empowerms-child/inc/loop-attributes.php, whose
   own header comment carries the full proof for why a PHP filter is the
   route (post-terms is the only dynamic tag that can read a taxonomy term,
   and it always wraps the value in <span>, which a CSS attribute selector
   can never match). */
export function loopItem() {
  return [
    container(
      { cssClass: 'pca-ep', content_width: 'full', _attributes: 'data-reveal|rise' },
      [
        container(
          { cssClass: 'pca-ep__art', content_width: 'full', _attributes: 'aria-hidden|true' },
          [html({ markup: ICON })],
        ),
        container({ cssClass: 'pca-ep__tags', content_width: 'full' }, [
          text({
            markup: '',
            __dynamic__: {
              editor: dynamicTag('post-terms', {
                taxonomy: 'guest_type', link: '', before: '', after: '', separator: ' ',
              }),
            },
          }),
        ]),
        heading({
          text: 'Add Your Heading Text Here',
          tag: 'span',
          cssClass: 'pca-ep__title',
          link: { url: '' },
          __dynamic__: {
            title: dynamicTag('post-title'),
            link: dynamicTag('post-url'),
          },
        }),
        text({
          cssClass: 'pca-ep__date',
          markup: '',
          __dynamic__: { editor: dynamicTag('post-date', { format: 'default' }) },
        }),
      ],
    ),
  ];
}

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'pca-library',
      content_width: 'full',
      _attributes: 'aria-labelledby|library-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'pca-library__head', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            heading({
              text: 'Explore More Episodes',
              tag: 'h2',
              _element_id: 'library-title',
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: '<p>Discover more conversations about the people, ideas, and solutions shaping Mississippi’s future.</p>',
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
        container({ cssClass: 'pca-catalogue', content_width: 'full' }, [
          html({ markup: FACETS_FORM }),
          loopGrid({
            templateId: LOOP_ITEM_POST_ID,
            cssClass: 'pca-eps',
            columns: 3,
            columns_tablet: 2,
            columns_mobile: 1,
            posts_per_page: LIBRARY_POSTS_PER_PAGE,
            post_query_post_type: 'post',
            post_query_include: 'terms',
            post_query_include_term_ids: [String(PODCAST_CATEGORY_ID)],
            _attributes: 'data-reveal-group|',
          }),
        ]),
      ]),
    ],
  );
}

export { LOOP_ITEM_POST_ID, PODCAST_CATEGORY_ID };
