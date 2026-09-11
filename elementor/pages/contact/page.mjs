import { section as head } from './01-head.mjs';
import { section as form } from './02-form.mjs';

/* Two sections. Same contract as every other page.mjs: deployPage() overwrites
   _elementor_data wholesale, so a hand-typed array at the call site is one
   dropped import away from silently publishing a page missing part of itself.

   POST_ID 11345 is Empower's own Contact page, slug `contact`, built in Beaver
   Builder and carrying Gravity Form 3. It converts IN PLACE for the same reason
   the privacy policy does: the slug is what the footer links from all fourteen
   converted pages, and creating a second page would leave the working URL on
   the old build. Read off the install on 2026-09-02, not assumed. */

export const POST_ID = 11345;

export const sections = () => [head(), form()];
