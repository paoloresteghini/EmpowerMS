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
          text({ markup: '<p>A non-profit working to expand opportunity in Mississippi</p>', cssClass: 'em-utility__note' }),
          text({ markup: '<a href="mailto:info@empowerms.org">Email: info@empowerms.org</a>', cssClass: 'em-utility__link' }),
        ]),
      ]),
    ]),

    container({ cssClass: 'em-container', content_width: 'full' }, [
      container({ cssClass: 'em-header__bar', content_width: 'full' }, [
        /* The logo is the one genuinely native, genuinely editable element
           in this part: an image with a link and an accessible name. Two
           costs, recorded rather than fixed (Ruling D): the static
           .em-header__logo class sat on the <a>; here it lands on the
           widget's wrapper div instead, and the anchor's own
           aria-label="Empower Mississippi home" has no equivalent control
           on the image widget, so the accessible name falls back to the
           image's own alt text ("Empower Mississippi"), which reads the
           same to a screen reader user even though the source differs. */
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
        html({ markup: extractBlock(PARTIAL, 'div', 'em-header__actions') }),
      ]),
    ]),

    html({ markup: extractBlock(PARTIAL, 'nav', 'em-mobilenav') }),
  ]),
];
