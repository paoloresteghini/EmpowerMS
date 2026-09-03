import { section as doc } from './01-doc.mjs';

/* The page's composition contract, same shape and same reasoning as every
   other page.mjs: deployPage() overwrites _elementor_data wholesale, so a
   hand-typed section array at the call site is one dropped import away from
   silently publishing a page missing part of itself.

   ONE SECTION, because the page is one document. No media.mjs: there is no
   photograph on a privacy policy and that is a fact about the page rather than
   an omission.

   POST_ID 3 IS NOT A PAGE CREATED FOR THIS CONVERSION, unlike every other
   entry in this directory. It is WordPress's own privacy policy page, the one
   `wp option get wp_page_for_privacy_policy` returns, carrying slug
   `privacy-policy` since 2019. Converting in place keeps that registration,
   keeps the URL every existing inbound link uses, and keeps the /privacy
   redirect that already points at it. Creating a second page would have left
   WordPress pointing at the old one. */

export const POST_ID = 3;

export const sections = () => [doc()];
