import { readFileSync } from 'node:fs';
import { container, text, image, html } from '../factory.mjs';
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
          text({ markup: '<p class="em-footer__mission">Empower Mississippi works to Educate, Engage, and Elect Mississippians dedicated to removing barriers to opportunity.</p>' }),
          html({ markup: socialMarkup() }),
        ]),
        container({ content_width: 'full', _attributes: 'data-reveal|fade' }, [
          text({ markup: '<h3>Follow</h3>' }),
          text({
            markup: [
              '<ul class="em-footer__links">',
              /* EMPOWER'S OWN URLS, SUPPLIED 2026-09-16 after Grant's review
                 found that four of the five were guesses. The icon row above
                 is read out of the partial by socialMarkup(), so it picked
                 these up with the file; this list is typed here and had to be
                 changed with it. LinkedIn is new to both. */
              '<li><a href="https://www.facebook.com/EmpowerMississippi/">Facebook</a></li>',
              '<li><a href="https://www.instagram.com/empower_ms/">Instagram</a></li>',
              '<li><a href="https://x.com/empowerms">X</a></li>',
              '<li><a href="https://www.youtube.com/user/empowerms">YouTube</a></li>',
              '<li><a href="https://www.linkedin.com/company/empower-mississippi">LinkedIn</a></li>',
              '</ul>',
            ].join(''),
          }),
        ]),
        container({ content_width: 'full', _attributes: 'data-reveal|fade' }, [
          text({ markup: '<h3>More</h3>' }),
          text({
            markup: [
              '<ul class="em-footer__links">',
              '<li><a href="/contact">Contact Us</a></li>',
              /* TWO LINKS, since 2026-09-02, matching src/_shared/footer.html.
                 This was one link labelled "Privacy Policy & Terms of Service"
                 pointing at /privacy, which is the privacy document alone: the
                 label named two documents and landed on one. Both now exist as
                 converted pages, so each link lands on the document it names.

                 THIS PART RENDERS ON EVERY PAGE OF THE INSTALL, so this edit
                 reaches all fourteen signed-off pages the moment it deploys.
                 That is why it was held back when the legal pages themselves
                 went live, and why it ships on its own. */
              '<li><a href="/privacy">Privacy Policy</a></li>',
              '<li><a href="/terms">Terms of Service</a></li>',
              '</ul>',
            ].join(''),
          }),
        ]),
      ]),
      container({ cssClass: 'em-footer__bottom', content_width: 'full' }, [
        text({ markup: '<p class="em-footer__legal">© Empower Mississippi</p>' }),
        /* THE NORTHPARK ADDRESS, CONFIRMED BY EMPOWER 2026-09-16. This closes
           the question the 2026-09-02 contact page build left open: that page
           found a different street on Empower's own live site, took the
           footer's on Paolo's call, and recorded that Empower had to settle
           which was current. Grant's review settled it, and both are now the
           new one. The superseded address is deliberately not repeated here. */
        text({ markup: '<p>1000 Northpark Drive &nbsp;|&nbsp; Ridgeland, MS 39157</p>' }),
      ]),
    ]),
  ]),
];
