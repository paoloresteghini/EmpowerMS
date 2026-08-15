/* The homepage's photography, as it exists in the install's media library.
 *
 * Nine files, imported on 2026-08-14 from the synced theme
 * (wp-content/themes/empowerms-child/assets/photography/) with
 * `wp media import ... --porcelain`, which is where these ids come from. They
 * are install state, not design, exactly like POST_ID in page.mjs.
 *
 * WHY A MAP RATHER THAN IDS AT THE POINT OF USE. Four of the homepage's six
 * sections use these, and several use the same file twice: father-children-field
 * is the hero photograph AND a stories mini, children-running-parent is the hero
 * aside AND a Join Us wash, child-classroom-tablet and worker-workshop-bw each
 * appear in two sections. An id typed at each point of use is the same install
 * fact written five times, and when one copy is wrong the page renders somebody
 * else's photograph while every structural test still passes, because a wrong
 * id is a perfectly valid id.
 *
 * ALT TEXT IS NOT HERE, AND CANNOT BE. Elementor's image widget has no alt
 * control: it reads _wp_attachment_image_alt off the attachment, and a
 * settings.image.alt key is accepted and silently discarded (factory.mjs
 * documents the two-widget experiment that proved it). So the alt text was
 * written onto the attachments at import time, taken from the static build's
 * own markup, which already carries alt written by looking at each photograph.
 *
 * Four of the nine were imported with EMPTY alt on purpose, because every use
 * of them in this build is decorative and carries alt="" aria-hidden="true":
 * children-running-parent, worker-workshop-bw, grandparents-grandchild, and
 * (in its foundations use) child-classroom-tablet. The last of those is the
 * case to watch: it is decorative in 03-foundations and meaningful in
 * 05-insights, so it was given the meaningful alt, and the foundations use has
 * to suppress it at the point of use rather than relying on the attachment.
 * There is no per-instance alt in the image widget, so that suppression is an
 * aria-hidden on the widget wrapper, which hides the whole subtree.
 *
 * The filenames are NOT descriptions. Several were misnamed at extraction time
 * from the brand guide PDF, and the alt text is what was written by looking at
 * the image. Do not infer content from a name here.
 */

export const PHOTOS = {
  'father-children-field': {
    id: 20579,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/08/father-children-field.jpg',
  },
  'children-running-parent': {
    id: 20580,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/08/children-running-parent.jpg',
  },
  'child-classroom-tablet': {
    id: 20581,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/08/child-classroom-tablet.jpg',
  },
  'worker-workshop-bw': {
    id: 20582,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/08/worker-workshop-bw.jpg',
  },
  'grandparents-grandchild': {
    id: 20583,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/08/grandparents-grandchild.jpg',
  },
  'girl-writing-bw': {
    id: 20584,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/08/girl-writing-bw.jpg',
  },
  'young-man-portrait-bw': {
    id: 20585,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/08/young-man-portrait-bw.jpg',
  },
  'esa-email-mockup': {
    id: 20586,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/08/esa-email-mockup.jpg',
  },
  'classroom-students': {
    id: 20587,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/08/classroom-students.jpg',
  },
};

/* Reads like `photo('father-children-field')` at the point of use, and throws
 * on a name that is not in the map rather than returning undefined and letting
 * `image({ id: undefined, url: undefined })` deploy a widget with no source at
 * all, which renders as nothing and reports nothing.
 */
export function photo(name) {
  const entry = PHOTOS[name];
  if (!entry) {
    throw new Error(`photo: no attachment mapped for '${name}'. Known: ${Object.keys(PHOTOS).join(', ')}`);
  }
  return entry;
}
