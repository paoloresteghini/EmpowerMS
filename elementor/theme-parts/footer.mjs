import { readFileSync } from 'node:fs';
import { container, heading, text, image, html } from '../factory.mjs';
import { extractBlock } from './extract.mjs';

/* The footer's post id on empv2, created in Task 3. Exported so the
   harness and the deploy call name it once rather than each carrying a
   literal that can drift from the other. */
export const FOOTER_POST_ID = 20574;

/* The reversed logo Empower supplied on 2026-08-03. No `logo-primary` or
   `logo-reversed-300x136` attachment existed on the install (checked
   against all 2,527 attachments before importing anything); wp/sync.mjs
   already syncs assets/ into the child theme, so the file was already on
   the server at wp-content/themes/empowerms-child/assets/logo-reversed-300x136.png
   and was imported from there with `wp media import`, landing as
   attachment 20577. WordPress appended "-1" to the stored filename because
   the exact name was already taken in that month's uploads directory; the
   guid below is what the import actually returned, not a guessed path.
   Alt text lives on the attachment, never here: the image widget has no
   alt control at all and a parameter for it would be silently discarded.
   Alt text is a go-live editorial task. */
const LOGO = { id: 20577, url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/08/logo-reversed-300x136-1.png' };

/* The four social links are inline SVG lifted verbatim from the partial.
   Elementor has no widget that emits them and an icon widget would
   substitute its own library, changing the mark. Read from the file rather
   than retyped, so the two cannot drift.

   Extracted with extractBlock() rather than a start/end string slice: the
   partial's last </a> is the Privacy Policy link, twenty lines past the
   social block, so a slice from <div class="em-footer__social"> to
   "</div> after the last </a>" swallows the entire Follow and More columns
   into this one HTML widget. extractBlock() counts nested div opens and
   closes from the social block's own opening tag, so it stops at that
   div's own matching close. */
const socialMarkup = () => {
  const partial = readFileSync(new URL('../../src/_shared/footer.html', import.meta.url), 'utf8');
  return extractBlock(partial, 'div', 'em-footer__social');
};

export const footerPart = () => [
  container({ cssClass: 'em-footer', tag: 'footer', content_width: 'full' }, [
    container({ cssClass: 'em-container', content_width: 'full' }, [
      container({ cssClass: 'em-footer__top', content_width: 'full', _attributes: 'data-reveal-group|' }, [
        container({ content_width: 'full', _attributes: 'data-reveal|fade' }, [
          container({ cssClass: 'em-footer__logo', content_width: 'full' }, [
            image({ ...LOGO }),
          ]),
          text({ markup: '<p>Empower Mississippi works to Educate, Engage, and Elect Mississippians dedicated to removing barriers to opportunity.</p>', cssClass: 'em-footer__mission' }),
          html({ markup: socialMarkup() }),
        ]),
        container({ content_width: 'full', _attributes: 'data-reveal|fade' }, [
          heading({ text: 'Follow', tag: 'h3' }),
          text({
            markup: [
              '<ul class="em-footer__links">',
              '<li><a href="https://facebook.com/empowerms">Facebook</a></li>',
              '<li><a href="https://instagram.com/empowerms">Instagram</a></li>',
              '<li><a href="https://x.com/empowerms">X</a></li>',
              '<li><a href="https://youtube.com/@empowerms">YouTube</a></li>',
              '</ul>',
            ].join(''),
          }),
        ]),
        container({ content_width: 'full', _attributes: 'data-reveal|fade' }, [
          heading({ text: 'More', tag: 'h3' }),
          text({
            markup: [
              '<ul class="em-footer__links">',
              '<li><a href="/contact">Contact Us</a></li>',
              '<li><a href="/privacy">Privacy Policy &amp; Terms of Service</a></li>',
              '</ul>',
            ].join(''),
          }),
        ]),
      ]),
      container({ cssClass: 'em-footer__bottom', content_width: 'full' }, [
        text({ markup: '<p>© Empower Mississippi</p>', cssClass: 'em-footer__legal' }),
        text({ markup: '<p>741 Avignon Dr., Suite C &nbsp;|&nbsp; Ridgeland, MS 39157</p>' }),
        /* The build credit, carrying the same class the static partial uses so
           css/site.css styles it identically on the converted footer. */
        text({ markup: '<p><a href="https://paor.co/thinktank">Created by PaoloR</a></p>', cssClass: 'em-footer__credit' }),
      ]),
    ]),
  ]),
];
