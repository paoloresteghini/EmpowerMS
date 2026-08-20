import { readFileSync } from 'node:fs';
import { container, text, image, link, html } from '../factory.mjs';
import { extractBlock } from './extract.mjs';

/* The header's post id on empv2, created in Task 3. Its Theme Builder
   condition is already set (Task 3's setConditions('include/general'),
   later regenerated against the conditions cache); this module only needs
   to overwrite the data deployThemePart() writes. */
export const HEADER_POST_ID = 20573;

/* No `logo-primary` attachment existed on the install (checked against
   every logo-titled attachment before importing anything, same discipline
   Task 4 used for the reversed logo). wp/sync.mjs already syncs assets/
   into the child theme, so the file was already on the server at
   wp-content/themes/empowerms-child/assets/logo-primary.png and was
   imported from there with:
     wp media import wp-content/themes/empowerms-child/assets/logo-primary.png \
       --title='Empower Mississippi logo' --porcelain
   Result: attachment id 20578. Unlike Task 4's reversed logo, the filename
   was not already taken in that month's uploads directory, so no "-1" got
   appended; the guid below is what the import actually returned, read back
   with `wp post get 20578 --field=guid`, not a guessed path. No alt text
   here: the image widget has no alt control at all and a parameter for it
   would be silently discarded (see factory.mjs's own comment on image()).
   Alt text is a go-live editorial task. */
const LOGO = { id: 20578, url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/08/logo-primary.png' };

const PARTIAL = readFileSync(new URL('../../src/_shared/header-2.html', import.meta.url), 'utf8');

/* THE ONE PLACE THE ELEMENTOR HEADER DELIBERATELY DIVERGES FROM THE STATIC
   BUILD, 2026-08-20, on Paolo's decision.
 *
 * src/_shared/header-2.html:80 carries a search button with an aria-label, an
 * SVG and nothing else: no form, no handler, no panel. It has been decoration
 * since Phase 2A. Making it work needs markup and a script, and js/ and src/
 * are the protected static build (see functions.php:479, which records what
 * happened the last time js/ was edited). So the working search lives here
 * and in wp/empowerms-child/, and the static hand-off keeps an inert icon.
 *
 * That is a divergence, and the only thing that makes it safe rather than a
 * defect is that it is written down: here, in todo.md, and in
 * docs/superpowers/specs/2026-08-20-header-search-design.md. Anyone comparing
 * the two headers will find this difference; this comment is what tells them
 * it was chosen.
 *
 * The patch is a literal single replacement rather than a regex rewrite of
 * the button, because extractBlock() hands back the static markup verbatim
 * and the useful property of that is that it is verbatim. A targeted
 * replace that throws when its target is absent keeps the failure loud: if
 * the static partial ever changes shape, this stops rather than silently
 * emitting a button with no aria-expanded.
 *
 * aria-expanded="true" here, not "false": every other trigger in
 * header-2.html ships expanded (lines 21, 39, 49, 59, 67, 75, 95...) with
 * its panel in normal flow, and js/nav.js:12-13 is what sets aria-expanded
 * to false and panel.hidden to true at load, the same way js/dropdown.js
 * does for the desktop menus. Shipping this button closed instead would be
 * the one trigger in the whole header that renders unusable without
 * theme-js/search.js, which contradicts this task's own goal of a search
 * form that works with JavaScript off. */
const withSearchControl = (actions) => {
  const target = '<button class="em-header__search" type="button" aria-label="Search">';
  if (!actions.includes(target)) {
    throw new Error('header.mjs: the actions block no longer contains the search button this patch targets');
  }
  return actions.replace(
    target,
    '<button class="em-header__search" type="button" aria-label="Search" aria-expanded="true" aria-controls="site-search">'
  );
};

/* The panel. Authored in this file, not lifted from the static partial,
   because the static partial does not have one and cannot be given one.
 *
 * It is a plain GET form to the site root. /?s= is what the install already
 * answers correctly (measured 2026-08-20: /?s=education returns 200 and
 * twelve results), which means this markup works with JavaScript off. That
 * is the same contract js/nav.js and js/dropdown.js state for themselves:
 * the markup ships usable and the script adds the closed-by-default
 * behaviour. Without theme-js/search.js the panel is simply an open search
 * form under the header, which is worse-looking and still works.
 *
 * data-swplive="false" opts the input out of SearchWP Live Ajax Search,
 * which is active and enabled on this install and would otherwise attach a
 * typeahead pane of its own markup and CSS to it.
 *
 * The label is real and visible to screen readers. It is visually hidden by
 * bridge.css block 61 rather than by a placeholder attribute standing in for
 * it, because a placeholder is not an accessible name.
 *
 * No `hidden` attribute on the panel, matching every other panel in
 * header-2.html (drop-about, drop-solutions, mobile-nav and its subpanels):
 * they all ship in normal flow, and their triggers' own JS is what hides
 * them at load (js/nav.js:12-13, js/dropdown.js's equivalent). A `hidden`
 * baked into this markup would leave the panel permanently unreachable on
 * any visit where theme-js/search.js does not load, which is the opposite
 * of "without theme-js/search.js the panel is simply an open search form
 * under the header" below. */
const SEARCH_PANEL = `<div class="em-search" id="site-search">
  <div class="em-container">
    <form class="em-search__form" role="search" method="get" action="/">
      <label class="em-search__label" for="site-search-input">Search this site</label>
      <input class="em-search__input" id="site-search-input" type="search" name="s" data-swplive="false" autocomplete="off">
      <button class="em-search__submit em-btn em-btn--primary em-btn--sm" type="submit">Search</button>
    </form>
  </div>
</div>`;

export const headerPart = () => [
  /* The skip link sits before the header element in the partial and is the
     target every page's <main id="main"> serves. Kept native per the spec;
     the accessibility break this costs (a div, not the focusable <a>,
     carries .em-skip) is recorded in the Task 5 report's defect list,
     first, for Task 7 to repair with a bridge rule. */
  link({ label: 'Skip to content', href: '#main', cssClass: 'em-skip' }),

  container({ cssClass: 'em-header em-header--flat', tag: 'header', content_width: 'full' }, [
    container({ cssClass: 'em-utility', content_width: 'full' }, [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container({ cssClass: 'em-utility__bar', content_width: 'full' }, [
          text({ markup: '<p class="em-utility__note">A non-profit working to expand opportunity in Mississippi</p>' }),
          text({ markup: '<a class="em-utility__link" href="mailto:info@empowerms.org">Email: info@empowerms.org</a>' }),
        ]),
      ]),
    ]),

    container({ cssClass: 'em-container', content_width: 'full' }, [
      container({ cssClass: 'em-header__bar', content_width: 'full' }, [
        /* The logo is the one genuinely native, genuinely editable element
           in this part: an image with a link. Two costs, recorded rather
           than fixed (Ruling D): the static .em-header__logo class sat on
           the <a>; here it lands on the widget's wrapper div instead, and
           the anchor's own aria-label="Empower Mississippi home" has no
           equivalent control on the image widget. Ruling D expected the
           accessible name to fall back to the image's own alt text, but
           that is not true today: measured against the live install as
           deployed, attachment 20578 carries no alt text
           (<img alt="">), so the anchor has no text content, no
           aria-label and no alt text to fall back to, and the logo link
           is unlabelled. It stays unlabelled until the go-live editorial
           task sets real alt text on the attachment, e.g.
           `wp post meta update 20578 _wp_attachment_image_alt
           'Empower Mississippi'`, at which point Ruling D's prediction
           becomes true. See the Task 5 report, defect #6. */
        image({
          ...LOGO,
          cssClass: 'em-header__logo',
          link_to: 'custom',
          link: { url: '/' },
        }),
        html({ markup: extractBlock(PARTIAL, 'nav', 'em-header__nav') }),
        /* The actions block stays whole, Donate button included. The
           button could be a native link() widget, but lifting it out
           leaves .em-header__actions styling a wrapper div around two
           buttons and one Elementor widget, and that row's flex alignment
           is exactly the shape the bridge stylesheet exists to repair.
           The spec left this to measurement; the measurement is that one
           markup block costs nothing and one native button costs a bridge
           rule, so it stays. Recorded rather than assumed. */
        html({ markup: withSearchControl(extractBlock(PARTIAL, 'div', 'em-header__actions')) }),
      ]),
    ]),

    html({ markup: SEARCH_PANEL }),

    html({ markup: extractBlock(PARTIAL, 'nav', 'em-mobilenav') }),
  ]),
];
