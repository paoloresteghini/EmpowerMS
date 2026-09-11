import { container, text, html, image, elementId } from '../factory.mjs';

/* THE BIO PAGE, ONCE, FOR EVERY PERSON.
 *
 * Source of truth: dist/team-bio.html, the same file elementor/pages/team-bio/
 * built page 20607 from. Every class, string and attribute below is read from
 * it. What changes is who it is about: this is an Elementor Theme Builder
 * SINGLE template (`single-post`, conditioned `include/singular/person`), so
 * one tree serves all eighteen published people rather than one page serving
 * Grant Callen.
 *
 * WHY, AND WHAT IT REPLACES. Paolo's 2026-08-20 instruction, after the /team/
 * roster became a Loop Grid over the `person` post type, was to wire the detail
 * page up for the people. Before this, /team/'s thirteen cards linked to
 * /person/<slug>/, which resolved and rendered real bio copy through the
 * theme's default single template: a working page, but not this design. The one
 * page that WAS this design was Grant's, and it was hand-filled.
 *
 * dist/team-bio.html's own comment predicted the shape of this exactly:
 *
 *     "One bio page exists. The other nine staff cards point here too, so this
 *      strip is the way back out of it; when the remaining nine are built each
 *      card gets its own destination and this section stays as it is."
 *
 * The remaining seventeen are built here, as one template rather than as
 * seventeen pages, and the closing strip does stay as it is.
 *
 * WHAT IS DYNAMIC AND WHAT IS NOT. Four things vary per person: the portrait,
 * the name, the role and the bio. The portrait is an image() with a
 * post-featured-image tag; the bio is Elementor's own theme-post-content
 * widget; the name and the role are shortcodes from
 * wp/empowerms-child/inc/person-loop.php, and that file's second docblock gives
 * the reason for each (the <h1> needs a real id the section's aria-labelledby
 * points at, and the role must render NOTHING rather than an empty box for the
 * two published people who have no `position_title`).
 *
 * Everything else is fixed copy and reaches the page as authored markup, in the
 * three html() blobs the page-based conversion already used and for the same
 * reasons its note 10 records at length.
 *
 * THE FIVE DIFFERENCES FROM dist/team-bio.html, all of them consequences of
 * one design serving eighteen people rather than one:
 *
 * 1. THE CONTACT BLOCK IS THE EMAIL ROW ONLY, and it comes from the person's
 *    own `email` field rather than from Empower's organisation inbox. That is
 *    the static build's own instruction, in Empower's words dated 2026-08-05:
 *    "Grant keeps email, LinkedIn and X. Every OTHER staff bio gets the email
 *    row only". A template IS every other staff bio. Ten of the eighteen carry
 *    an email and get the block; eight carry none and get no block at all,
 *    rather than an empty one. `.tp-contact__pending` is gone with the
 *    placeholder it explained.
 *
 * 2. THE BACK LINKS POINT AT /team/. Source has `href="team-a.html"` twice and
 *    its own comment says why ("the back links point at team-a.html so the
 *    review site works when a card is clicked. At hand-off they become
 *    /about/team"). The hand-off happened: /team/ is the converted roster's
 *    real slug as of 2026-08-20, so these are written as the real path.
 *
 *    THE REMAP DOES REACH THIS FILE, which was checked on the live render
 *    rather than reasoned about. elementor/links.mjs runs inside
 *    deployElements(), and deployThemePart() goes through deployElements()
 *    exactly as deployPage() does, so a theme-builder template's authored
 *    hrefs are remapped just like a page's. The proof is the CTA below: it is
 *    authored `/donate` here and reaches the install as `/donate/`, the remap
 *    normalising it to the slug the donate page actually has. Writing /team/
 *    here is therefore belt and braces rather than a necessity, and it is
 *    worth keeping: the map is keyed on (href, label) PAIRS, and
 *    `team-a.html` with the label "Team, Board & Fellows" is a pair that
 *    exists only because this design once linked to a review-site filename.
 *
 * 3. `data-reveal="rise"` SITS ON THE BIO AS A WHOLE, not on each paragraph.
 *    Source marks both `<p>`s inside `.tp-bio` individually, which gives them a
 *    two-step stagger; the paragraphs here are the person's own post content and
 *    no widget can put an attribute inside it. One reveal on the bio block is
 *    the honest version of the same gesture. Nothing else about the motion
 *    changes: `data-reveal-entrance` is still on the section,
 *    `data-reveal-group` on both columns, and every other `[data-reveal]` sits
 *    exactly where source puts it.
 *
 * 4. THE PORTRAIT IS A REAL PHOTOGRAPH, and `.tp-frame` is a <div> rather than
 *    a <figure>. Elementor's Container html_tag control offers div, header,
 *    footer, main, article, section, aside, nav and a; there is no figure. The
 *    class carries the only rule the element has (css/team-bio.css:39 is
 *    `.tp-frame{margin:0}`, which is a <figure> margin reset and a no-op on a
 *    div), so nothing moves. `.tp-portrait` costs the same wrapper repair its
 *    roster sibling does, in bridge.css.
 *
 * 5. NO `fetchpriority="high"`. Source's comment asks for it on the swapped-in
 *    headshot because it is the page's main image. Elementor's Image widget
 *    emits `loading="lazy"` and offers no fetchpriority control, and this
 *    portrait is above the fold on every one of these pages. Reported in the
 *    task report as a real, measurable LCP cost rather than repaired here:
 *    there is no CSS fix for it, and the honest options are a filter on
 *    wp_get_attachment_image_attributes or leaving it, which is Empower's
 *    performance call rather than this file's.
 *
 * THIS TEMPLATE IS NOT IN elementor/pages/. It is not a page: it has no
 * POST_ID of its own in the converted set, no slug, and no static counterpart
 * to be gated against, because dist/team-bio.html is ONE person and this is
 * eighteen. It sits beside header.mjs and footer.mjs, which are the build's
 * other two Theme Builder documents, and it deploys the same way. */

/* Elementor's Custom Attributes control always quotes every value
   (Utils::render_html_attributes()), so a valueless HTML attribute is written
   "key|" and reaches the markup as key="". */
const dynamicTag = (name, tagSettings = {}) =>
  `[elementor-tag id="${elementId()}" name="${name}" settings="${encodeURIComponent(JSON.stringify(tagSettings))}"]`;

/* The elementor_library post created on empv2 on 2026-08-20 to hold this
   template, read back off the install rather than trusted from the create:

     wp post create --post_type=elementor_library --post_status=publish \
       --post_title='Person single' --porcelain

   Its `_elementor_template_type` is written by deployThemePart() as
   'single-post' (Single_Post::get_type(), read from wp-content/plugins/
   elementor-pro/modules/theme-builder/documents/single-post.php on empv2), and
   its condition is set separately by setConditions(), because a template with
   correct data and no location is resolved from a CACHED option at render time
   and would simply never appear. That gap cost an hour once already and
   docs/elementor/theme-part-mechanism.md records it. */
export const PERSON_SINGLE_POST_ID = 20637;

/* The Theme Builder condition. `singular` is the condition group
   (conditions/singular.php:17,21) and `person` is the post type's own
   sub-condition name (conditions/post.php:34-39), so this string means "every
   single Person". Not 'include/general': that is Entire Site, which the header
   and footer use and which would put a bio page's chrome on every page of the
   install. */
export const PERSON_SINGLE_CONDITIONS = ['include/singular/person'];

/* The back link out of a bio, at the top of the aside. Verbatim from
   dist/team-bio.html apart from its href, per difference 2 above. The SVG, the
   class and the `data-reveal` attribute are the source's own bytes. */
const BACK = '<a class="tp-back" href="/team/" data-reveal="rise">\n'
  + '  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H6M11 6l-6 6 6 6"/></svg>\n'
  + '  Team, Board &amp; Fellows\n'
  + '</a>';

/* The shortcodes registered by wp/empowerms-child/inc/person-loop.php. Each is
   the ENTIRE content of its text() widget, alone on its own line and wrapped in
   nothing, which is what lets Elementor's parse_text_editor() run
   shortcode_unautop() over it before do_shortcode() expands it. */
const NAME_SHORTCODE = '[empower_person_name]';
const ROLE_SHORTCODE = '[empower_person_role]';
const CONTACT_SHORTCODE = '[empower_person_contact]';

/* Verbatim from dist/team-bio.html, with the href resolved per difference 2. */
const ACTIONS = '<div class="tp-profile__actions" data-reveal="rise">\n'
  + '  <a class="em-btn em-btn--primary em-btn--lg" href="/donate">Support Our Work</a>\n'
  + '</div>';

/* The closing strip's heading and link. Built as a container tree with one
   html() blob for the anchor, which is exactly elementor/pages/team-bio/
   02-more.mjs's construction and its note 4's reason: the anchor holds an
   inline <svg> and link() cannot put an element inside a button widget. Kept
   as a tree rather than as one markup string because the document's top level
   must be containers: a bare widget there has no section to render into. */
const MORE_HEAD = 'Meet the rest of the team';
const MORE_LINK = '<a class="tp-more__link" href="/team/" data-reveal="rise">Team, Board &amp; Fellows\n'
  + '  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>\n'
  + '</a>';

/* The template's element tree: the array a Theme Builder document's
   _elementor_data is, which is the shape deployThemePart() expects. */
export function personSingle() {
  return [
    container(
      {
        tag: 'section',
        cssClass: 'tp-profile',
        content_width: 'full',
        _attributes: 'aria-labelledby|bio-title\ndata-reveal-entrance|',
      },
      [
        container({ cssClass: 'tp-profile__grid em-container', content_width: 'full' }, [
          container(
            { cssClass: 'tp-profile__aside', content_width: 'full', _attributes: 'data-reveal-group|' },
            [
              html({ markup: BACK }),
              container(
                { cssClass: 'tp-frame', content_width: 'full', _attributes: 'data-reveal|clip' },
                [
                  image({
                    id: '',
                    url: '',
                    cssClass: 'tp-portrait',
                    __dynamic__: { image: dynamicTag('post-featured-image') },
                  }),
                ],
              ),
              text({ markup: CONTACT_SHORTCODE }),
            ],
          ),
          container(
            { cssClass: 'tp-profile__copy', content_width: 'full', _attributes: 'data-reveal-group|' },
            [
              text({ markup: NAME_SHORTCODE, _attributes: 'data-reveal|rise' }),
              text({ markup: ROLE_SHORTCODE, _attributes: 'data-reveal|rise' }),
              /* Elementor's own Post Content widget, which is the widget the
                 Single document type is built around (Single_Base::
                 get_remote_library_config() names 'theme-post-content' as the
                 document's depended widget). `.tp-bio` lands on its wrapper,
                 which is where the class's only own rule wants to be anyway
                 (css/team-bio.css:111 is a margin-top), and the paragraph rules
                 beneath it (:112-116, including `p:first-child` and
                 `p:last-child`) are DESCENDANT selectors that reach the real
                 <p> elements through the wrapper, so they cost nothing. */
              {
                id: elementId(),
                elType: 'widget',
                widgetType: 'theme-post-content',
                settings: { _css_classes: 'tp-bio', _attributes: 'data-reveal|rise' },
                elements: [],
                isInner: false,
              },
              html({ markup: ACTIONS }),
            ],
          ),
        ]),
      ],
    ),
    container(
      {
        tag: 'section',
        cssClass: 'tp-more',
        content_width: 'full',
        _attributes: 'aria-labelledby|more-title',
      },
      [
        container({ cssClass: 'em-container', content_width: 'full' }, [
          container(
            { cssClass: 'tp-more__slab', content_width: 'full', _attributes: 'data-reveal-group|' },
            [
              text({ markup: `<h2 id="more-title">${MORE_HEAD}</h2>`, _attributes: 'data-reveal|rise' }),
              html({ markup: MORE_LINK }),
            ],
          ),
        ]),
      ],
    ),
  ];
}
