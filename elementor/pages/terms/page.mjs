import { section as doc } from './01-doc.mjs';

/* One section, because the page is one document. Same contract as
   elementor/pages/privacy/page.mjs; that module's notes apply.

   POST_ID 20649 is a page created on the install on 2026-09-02 specifically to
   receive this conversion:

     wp post create --post_type=page --post_status=publish \
       --post_title='Terms of Service' --post_name=terms --porcelain

   The slug was read back off the install afterwards rather than assumed,
   because WordPress silently appends a suffix when a slug is already taken. It
   is `terms`, unsuffixed. Checked before creating: no post of ANY type and ANY
   status held `terms`, `terms-of-service` or `terms-and-conditions`.

   A PAGE HAD TO BE CREATED, unlike the privacy policy, which converts in place
   on WordPress's own page 3. The terms document is not a page at all: it is
   `wpautoterms_page` 19170, a custom post type owned by the plugin
   `auto-terms-of-service-and-privacy-policy`. That is also why its old URL
   carries the plugin's prefix. The old URL still resolves and still serves the
   plugin's copy; redirecting it to /terms/ is a separate step, and retiring the
   plugin is a decision for Empower rather than a deploy. Both are written up in
   docs/legal/plugin-proposal.md. */

export const POST_ID = 20649;

export const sections = () => [doc()];
