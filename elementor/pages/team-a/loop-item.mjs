import { container, image, text, elementId } from '../../factory.mjs';

/* THE TWO LOOP ITEM TEMPLATES /team/ RENDERS ITS ROSTER THROUGH.
 *
 * Source of truth for both is dist/team-a.html: the <li class="ta-person">
 * card in the <section class="ta-staff"> block and the
 * <li class="ta-ledger__row"> row in the <section class="ta-fellows"> block.
 * Every class, string and attribute below is read from that file. What is NOT
 * read from it is WHO appears in either list: that is the `person` post type
 * on the install, per Paolo's 2026-08-20 decision, and
 * wp/empowerms-child/inc/person-loop.php carries the whole of that argument.
 *
 * WHY THIS PAGE CHANGED SHAPE AT ALL, when 02-staff.mjs argued at length for
 * building the roster as one html() widget. That file's own note names the
 * exit: "the headshot swap this page is already waiting on is the natural
 * point to reconsider the whole section's construction, not before". The
 * headshots turned out to already exist. Every one of the 22 `person` entries
 * on empv2 carries a featured image, so the swap that section was waiting for
 * is available now, and it arrives with the names, the titles and the bio
 * pages attached to it.
 *
 * WHAT IT COSTS, stated up front rather than discovered later:
 *
 * 1. LIST SEMANTICS. `<ul class="ta-roster">` of ten `<li>` becomes a Loop
 *    Grid whose items are `<div class="e-loop-item">`. Elementor's own loop
 *    container carries `role="list"`, which recovers part of it; the "list, 10
 *    items" a screen reader announces over a real <ul> is not fully recovered.
 *    Identical to content-a/loop-item.mjs note 1 and podcast-a/03-library.mjs
 *    note 8, and there is no container html_tag option that restores it (the
 *    control offers div, header, footer, main, article, section, aside, nav
 *    and a; no li and no ul).
 *
 * 2. PANEL EDITABILITY MOVES, it does not disappear. 02-staff.mjs's note lists
 *    "a staff change means editing this file and redeploying" as the cost of
 *    the html() blob. After this change a staff change means editing a Person
 *    in wp-admin, which is strictly better and is the point. What is no longer
 *    editable in Elementor's panel is the CARD's structure, which is correct:
 *    it is one design rendered N times.
 *
 * 3. TWO BRIDGE BLOCKS, both predicted here and both measured live before they
 *    were written. `.ta-roster` and `.ta-ledger` land on a loop-grid widget's
 *    OUTER wrapper with exactly one child, and `.ta-roster` is an explicit
 *    `repeat(3,minmax(0,280px))` grid, so it is content-a's block 48 shape
 *    rather than podcast-a's harmless one: three tracks really are created and
 *    the single wrapper takes the first. And `.ta-ledger__row:last-child`
 *    (css/team-a.css:227) matches EVERY row once each row is the only child of
 *    its own `.e-loop-item`, which is the loud half of the recipe's asymmetry
 *    and exactly what 03-fellows.mjs's own note 1 warned a container tree
 *    would do. Both are repaired in wp/empowerms-child/css/bridge.css, named
 *    to this page's own classes.
 *
 * 4. THE PORTRAIT'S CLASS MOVES TO A WRAPPER. `image()` puts cssClass on the
 *    widget wrapper (factory.mjs, WIDGET_CSS_CLASS_KEY) and the design puts
 *    `.ta-portrait` / `.ta-disc` on the tile itself. Same second cost category
 *    as `.cad-card__photo` (bridge block 49) and `.lnd-pair__photo` (block
 *    43), repaired the same way, with the additional work that the tiles were
 *    PLACEHOLDERS and their dashed edge, hex-lattice mask and monogram type
 *    have to come off now that a real photograph sits in the box.
 *
 * WHAT IT DOES NOT COST: no media import and nothing added to the alt-text
 * queue's blockers. All 22 headshots are already in the library and already
 * attached as featured images. 21 of the 22 have EMPTY alt text, which the
 * Image widget renders as alt="" — decorative, which is the correct reading
 * for a portrait sitting immediately beside the person's own name as text.
 * Recorded in the task report rather than fixed here.
 *
 * THE LINK IS post-url ON EVERY CARD. In the static build nine of the ten
 * cards are a <div> and only Grant Callen's is an <a>, and dist/team-a.html's
 * own comment records Empower's 2026-08-05 reason: "only the person whose bio
 * page EXISTS links to one... a card that opens somebody else's bio is worse
 * than a card that opens nothing". That condition is now met for everybody —
 * every `person` post has a real single of its own — so the card is an <a> for
 * everybody and `.ta-person__more` ("Read bio") rides along with it. This is
 * the one place the converted page is deliberately MORE than the static build
 * rather than equal to it, and it is downstream of the same decision that put
 * the roster in the CPT. */

/* Elementor's Custom Attributes control always quotes every value
   (Utils::render_html_attributes()), so a valueless HTML attribute is written
   "key|" and reaches the markup as key="". Same convention every section
   module in this build uses. */
const dynamicTag = (name, tagSettings = {}) =>
  `[elementor-tag id="${elementId()}" name="${name}" settings="${encodeURIComponent(JSON.stringify(tagSettings))}"]`;

/* The two elementor_library posts created on empv2 on 2026-08-20 to hold these
   templates, created and termed with:

     wp post create --post_type=elementor_library --post_status=publish \
       --post_title='Team A card: staff' --porcelain
     wp post term set <ID> elementor_library_type loop-item

   The term is what Elementor's own Loop document class reads to know which
   editor to open; it is not something the deploy path writes. Both ids were
   read back off the install rather than trusted from the create's output,
   which is the same check the slug rename established. */
export const LOOP_ITEM_POST_IDS = {
  staff: 20634,
  fellow: 20636,
};

/* The shortcodes registered by wp/empowerms-child/inc/person-loop.php. Each is
   the ENTIRE content of its text() widget, on its own line and wrapped in
   nothing, so shortcode_unautop() strips the <p> wpautop may have put round it
   before do_shortcode() expands it. They emit their own classed elements. */
const CARD_TEXT_SHORTCODE = '[empower_person_card_text]';
const ROW_TEXT_SHORTCODE = '[empower_person_row_text]';

/* One staff card.
 *
 * Source shape, from dist/team-a.html:
 *
 *     <li class="ta-person" data-reveal="rise">
 *       <a class="ta-person__link" href="team-bio.html">
 *         <span class="ta-portrait" ...><span class="ta-portrait__mono">GC</span></span>
 *         <h3 class="ta-person__name">Grant Callen</h3>
 *         <span class="ta-person__title">Founder &amp; CEO</span>
 *         <span class="ta-person__more">Read bio</span>
 *       </a>
 *     </li>
 *
 * THE <a> IS A CONTAINER WITH html_tag 'a', which is one of the nine tags
 * Elementor's Container control does offer, and it is the reason this card can
 * be built as a tree at all: `.ta-person__link`'s own rules and every one of
 * the `a.ta-person__link:hover ...` interaction states (css/team-a.css:164-185)
 * key on a real anchor element carrying that class, and a container puts
 * cssClass on the element itself rather than on a wrapper. The href is a
 * dynamic post-url tag on the container's own `link` control.
 *
 * `.ta-person` IS THE OUTER CONTAINER AND CARRIES data-reveal, matching the
 * source, where both sit on the <li>. Nothing inside the card animates on
 * hover AND carries data-reveal, which css/team-a.css's own header treats as
 * deliberate for the same reason css/content-a.css's does: motion.css replaces
 * an element's own `transition`, and the portrait's hover transition is its
 * own.
 *
 * `_element_cache: 'yes'` IS NOT OPTIONAL, for the reason
 * inc/loop-attributes.php's docblock and content-a/loop-item.mjs note 2 carry
 * in full: Elementor renders a loop item ONCE per page load and reuses that
 * HTML for every later iteration unless the element is deferred, which happens
 * automatically only for elements already carrying a __dynamic__ setting of
 * their own. This container carries none (the link tag is on the <a> inside
 * it), so without the control every card would serve the first person's name.
 * Its children need nothing extra: the cache is built over the template's
 * TOP-LEVEL elements only, so the whole subtree renders fresh per request. */
export function staffCard() {
  return [
    container(
      {
        cssClass: 'ta-person',
        content_width: 'full',
        _attributes: 'data-reveal|rise',
        _element_cache: 'yes',
      },
      [
        container(
          {
            tag: 'a',
            cssClass: 'ta-person__link',
            content_width: 'full',
            link: { url: '' },
            __dynamic__: { link: dynamicTag('post-url') },
          },
          [
            image({
              id: '',
              url: '',
              cssClass: 'ta-portrait',
              __dynamic__: { image: dynamicTag('post-featured-image') },
            }),
            text({ markup: CARD_TEXT_SHORTCODE }),
          ],
        ),
      ],
    ),
  ];
}

/* One fellow row.
 *
 * Source shape, from dist/team-a.html:
 *
 *     <li class="ta-ledger__row" data-reveal="rise">
 *       <span class="ta-disc" data-placeholder="headshot" aria-hidden="true">JR</span>
 *       <span class="ta-ledger__name">J. Robertson</span>
 *       <span class="ta-ledger__field">Fellow on Regulation &amp; Innovation</span>
 *     </li>
 *
 * THE ROW IS NOT A LINK, and that is the one place this template deliberately
 * differs from the staff card. `.ta-ledger__row` is a three-column grid whose
 * columns are sized `auto minmax(0,1fr) auto` (css/team-a.css:221-226), and
 * every one of its rules keys on that element being the grid. Wrapping it in
 * an anchor container would put the anchor between `.ta-ledger` and the row,
 * which changes nothing visually but adds an element the design does not have;
 * making the ROW the anchor would work, and was not done, because the ledger's
 * design carries no "read bio" affordance of any kind and a whole row that is
 * silently clickable is worse than one that is not. The fellows' singles are
 * reachable from /team/ only through the staff-card treatment they do not
 * have. Recorded as a difference from the static build in the task report, and
 * left as Empower's call.
 *
 * THREE ELEMENTS, TWO WIDGETS. The disc is an image() so the headshot comes
 * from the media library; the name and the field are one text() widget holding
 * one shortcode, for the reason inc/person-loop.php's docblock gives (a bare
 * inline <span> carrying a meta value has no widget that can produce it, and
 * a fellow with no `position_title` must render no `.ta-ledger__field` box
 * rather than an empty one). Two children of the row rather than three, which
 * costs nothing: `grid-template-columns:auto minmax(0,1fr) auto` places
 * whatever children exist into the first tracks in order, and the shortcode's
 * two spans are real siblings inside one rendered string, so they land in
 * tracks 2 and 3 exactly as the source's do.
 *
 * `aria-hidden` COMES OFF THE DISC. In the static build the disc is a monogram
 * standing in for a photograph, so it is decorative by construction and the
 * markup says so. Here it is a real photograph of a real person, rendered by
 * an image widget that carries the attachment's own alt text; hiding it from
 * assistive technology would be asserting something about it that is no longer
 * true. The alt is empty on 21 of the 22 attachments, so in practice it is
 * still announced as nothing, which is the correct reading for a portrait
 * beside the person's own name. The difference is that it is now the media
 * library's decision to change rather than this file's. */
export function fellowRow() {
  return [
    container(
      {
        cssClass: 'ta-ledger__row',
        content_width: 'full',
        _attributes: 'data-reveal|rise',
        _element_cache: 'yes',
      },
      [
        image({
          id: '',
          url: '',
          cssClass: 'ta-disc',
          __dynamic__: { image: dynamicTag('post-featured-image') },
        }),
        text({ markup: ROW_TEXT_SHORTCODE }),
      ],
    ),
  ];
}
