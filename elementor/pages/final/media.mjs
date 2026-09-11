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

/* 2026-09-03: Empower's own photography replaced the design-system placeholders.
 * The attachments below were imported by elementor/import-photography.mjs, which
 * is the only thing that has ever written their alt text, and it wrote it with
 * `wp media import --alt` at the moment each attachment was created. Sentences
 * were drafted in docs/elementor/phase2b/2026-09-03-photography-selection.md and
 * approved before the import ran; no `wp post meta update` was run on any
 * attachment, here or anywhere in this change.
 * The 2026-08 placeholders below are KEPT, not replaced: `safety` and `landing`
 * still use them, and they are re-exported through this map.
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
  'advocate-capitol-portrait': {
    id: 20650,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/advocate-capitol-portrait.jpg',
  },
  'advocate-outdoors': {
    id: 20651,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/advocate-outdoors.jpg',
  },
  'advocate-portrait-blue': {
    id: 20652,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/advocate-portrait-blue.jpg',
  },
  'advocates-capitol-hall': {
    id: 20653,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/advocates-capitol-hall.jpg',
  },
  'advocates-capitol-hall-54': {
    id: 20654,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/advocates-capitol-hall-54.jpg',
  },
  'advocates-capitol-rail': {
    id: 20655,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/advocates-capitol-rail.jpg',
  },
  'advocates-in-conversation-wide': {
    id: 20656,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/advocates-in-conversation-wide.jpg',
  },
  'advocates-outside-capitol': {
    id: 20657,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/advocates-outside-capitol.jpg',
  },
  'classroom-small-group': {
    id: 20658,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/classroom-small-group.jpg',
  },
  'classroom-small-group-54': {
    id: 20659,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/classroom-small-group-54.jpg',
  },
  /* Imported 2026-09-07 for Empower round 1 row 4, from the "Team General"
     folder Kienna linked. Ids and urls read back off the install by
     import-photography.mjs, not composed from the filenames. Unlike everything
     else in this map these are EVENT CANDIDS of identifiable Empower people,
     and who-we-are-a uses them as content with real alt rather than as
     decoration; 04-people.mjs records why the aria-hidden came off. */
  'event-conversation-anniversary': {
    id: 20707,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/event-conversation-anniversary.jpg',
  },
  'event-conversation-atrium': {
    id: 20708,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/event-conversation-atrium.jpg',
  },
  'event-conversation-banners': {
    id: 20709,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/event-conversation-banners.jpg',
  },
  'gift-boxes-detail': {
    id: 20660,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/gift-boxes-detail.jpg',
  },
  'hands-with-product': {
    id: 20661,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/hands-with-product.jpg',
  },
  'hands-with-product-sq': {
    id: 20662,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/hands-with-product-sq.jpg',
  },
  'maker-with-laptop': {
    id: 20663,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/maker-with-laptop.jpg',
  },
  'maker-with-laptop-sq': {
    id: 20664,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/maker-with-laptop-sq.jpg',
  },
  'school-leader-crest': {
    id: 20665,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/school-leader-crest.jpg',
  },
  'school-leader-outside': {
    id: 20666,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/school-leader-outside.jpg',
  },
  'shop-owner-counter': {
    id: 20667,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/shop-owner-counter.jpg',
  },
  'shop-owner-portrait': {
    id: 20668,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/shop-owner-portrait.jpg',
  },
  'shop-owner-standing': {
    id: 20669,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/shop-owner-standing.jpg',
  },
  'student-hand-raised': {
    id: 20670,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/student-hand-raised.jpg',
  },
  'student-writing-overhead': {
    id: 20671,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/student-writing-overhead.jpg',
  },
  'students-working-quietly': {
    id: 20672,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/students-working-quietly.jpg',
  },
  'teacher-at-whiteboard': {
    id: 20673,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/teacher-at-whiteboard.jpg',
  },
  'teacher-small-group-wide': {
    id: 20674,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/teacher-small-group-wide.jpg',
  },
  'teacher-smartboard': {
    id: 20675,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/teacher-smartboard.jpg',
  },
  'teacher-student-desk': {
    id: 20676,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/teacher-student-desk.jpg',
  },
  'teacher-with-student': {
    id: 20677,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/teacher-with-student.jpg',
  },
  'teacher-with-student-45': {
    id: 20678,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/teacher-with-student-45.jpg',
  },
  'teacher-yellow-portrait': {
    id: 20679,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/teacher-yellow-portrait.jpg',
  },
  'two-advocates-portrait': {
    id: 20680,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/two-advocates-portrait.jpg',
  },
  'warehouse-worker-aisle': {
    id: 20681,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/warehouse-worker-aisle.jpg',
  },
  'warehouse-worker-aisle-43': {
    id: 20682,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/warehouse-worker-aisle-43.jpg',
  },
  'warehouse-worker-pallet': {
    id: 20683,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/warehouse-worker-pallet.jpg',
  },
  'worker-at-bench': {
    id: 20684,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/worker-at-bench.jpg',
  },
  'worker-at-bench-54': {
    id: 20685,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/worker-at-bench-54.jpg',
  },
  'worker-labelling-sq': {
    id: 20686,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/worker-labelling-sq.jpg',
  },
  'worker-labelling-wide': {
    id: 20687,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/worker-labelling-wide.jpg',
  },
  'worker-packing-smiling': {
    id: 20688,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/worker-packing-smiling.jpg',
  },
  'worker-sorting-table': {
    id: 20689,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/worker-sorting-table.jpg',
  },
  'worksheet-overhead': {
    id: 20690,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/worksheet-overhead.jpg',
  },
  'capitol-chat-desk': {
    id: 20691,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/capitol-chat-desk.jpg',
  },
  'capitol-chat-flags': {
    id: 20692,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/capitol-chat-flags.jpg',
  },
  'capitol-chat-interview': {
    id: 20693,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/capitol-chat-interview.jpg',
  },
  'podcast-camera-setup': {
    id: 20694,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/podcast-camera-setup.jpg',
  },
  'podcast-recording-lights': {
    id: 20695,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/podcast-recording-lights.jpg',
  },
  'podcast-studio-portrait': {
    id: 20696,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/podcast-studio-portrait.jpg',
  },
  'podcast-studio-camera': {
    id: 20697,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/podcast-studio-camera.jpg',
  },
  'podcast-studio-interview': {
    id: 20698,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/podcast-studio-interview.jpg',
  },
  'apprentice-at-the-machine-wide': {
    id: 20701,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/apprentice-at-the-machine-wide.jpg',
  },
  'classroom-group-wide': {
    id: 20702,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/classroom-group-wide.jpg',
  },
  'ms-capitol-first-light-wide': {
    id: 20703,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/ms-capitol-first-light-wide.jpg',
  },
  'ms-river-bridge-sunrise': {
    id: 20699,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/ms-river-bridge-sunrise.jpg',
  },
  'police-lights': {
    id: 20700,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/police-lights.jpg',
  },
  /* Empower's round-1 row 1, imported 2026-09-07 by
     elementor/import-photography.mjs with alt written at creation time from
     sentences Paolo approved that day. The hero's two photographs: the family
     picture is the main image and the LCP element, the bridge is the one that
     moved from a tucked-in square to a full-width picture below it.
     css/final.css's hero block is sized to these two files specifically
     (1376x726 and 1400x786) and breaks if either is swapped without it. */
  'family-three-generations': {
    id: 20705,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/family-three-generations.jpg',
  },
  'vicksburg-bridge-sunrise': {
    id: 20706,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/vicksburg-bridge-sunrise.jpg',
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
