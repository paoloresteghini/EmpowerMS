/* DEPLOY THE "PUBLIC SAFETY" -> "SAFE COMMUNITIES" RENAME TO empv2.
 *
 * Kienna Horn, Communications Director, 2026-09-10, on a decision taken above
 * her: the issue area is called Safe Communities now. Two emails three minutes
 * apart, the first saying "Safer Communities" and the second correcting it;
 * the second one is the wording. Scope in her words: "the major titles and
 * headings where Public Safety is being used as the name of that issue area.
 * We don't need to go through and change references to 'public safety' within
 * body copy, articles, or other content where the phrase is used naturally."
 *
 * THE SLUG MOVED TOO, on Kienna's confirmation 2026-09-11, and the first run of
 * this script argued the opposite. Recorded rather than quietly edited, because
 * the reasoning that changed is the useful part: the case against moving it was
 * search equity, and there was none to lose. This page has NEVER been public at
 * `/public-safety/`. Production still serves the old design at `/justice/`, and
 * `/public-safety/` existed only on this staging install behind a review link.
 * So `/safe-communities/` cost 51 references and two redirect rules instead of
 * a permanent redirect hop, and it stops the URL contradicting the page's own
 * title in every link anybody pastes into print or social.
 *
 * The Redirection plugin has `monitor_post: 1`, so renaming post 20608's slug
 * auto-creates `/public-safety/` -> `/safe-communities/` and every empv2 link
 * already shared with Empower keeps resolving. Verified after the rename rather
 * than trusted: the setting is what the 2026-08-20 slug rename relied on for
 * twelve pages, and it is a setting, not luck.
 *
 * `/justice/` redirects to the new slug directly rather than through
 * `/public-safety/`. One hop, not two: redirects.mjs entry 48 and REPOINT 15
 * were retargeted, not stacked.
 *
 * THE CATEGORY STILL DOES NOT MOVE. Term 29 is named "Justice" on the install,
 * a third name again, and inc/content-loop.php's topic map is what turns it
 * into a display label. That map is what this run changes.
 *
 * WHAT IS BEING RENAMED, counted off the live pages rather than off the repo,
 * because a grep of the source cannot tell a heading from a comment. Every
 * converted page carries two instances in the header (the mega-menu link and
 * its mobile twin) and those are one fix, not twenty. On top of that:
 *
 *   /                  1  the foundations panel's <h3>
 *   /what-we-do/       1  the solutions <h3>
 *   /solutions/        1  the track's <h3>
 *   /epic/             2  the hero area list and the research area's name
 *   /public-safety/    4  the hero eyebrow, the page <title>, the WP post
 *                         title, and "The Latest on Public Safety"
 *   /all-content/     30  topic labels on the cards, all from one PHP map
 *
 * TWO HEADINGS ON /public-safety/ ARE DELIBERATELY NOT CHANGED, and Empower
 * have been asked about them rather than guessed at:
 *
 *   "Support Effective Public Safety"     one of four approach titles
 *   "Crime Prevention & Public Safety"    a work-area label
 *
 * Both use the phrase inside a sentence rather than as the name of the issue
 * area, which is the carve-out Kienna made herself; their siblings are
 * "Understand What Drives Crime" and "Effective Justice". "Support Effective
 * Safe Communities" is not English. Both are also roadmap copy verbatim, which
 * test.mjs enforces. If Empower want them changed it is one more edit to
 * 04-caps.mjs, 05-grid.mjs, the two static sections and the two test fixtures.
 *
 * WHAT IS LEFT ALONE ON PURPOSE, so the next sweep does not read it as a miss:
 *
 *   - Lowercase "public safety" in body copy, per Kienna. Including
 *     "See all public safety research", which is a census key the register
 *     depends on (pages/register.mjs, safety's entry).
 *   - The HTML comments the build ships on /meaningful-work/ and
 *     /quality-education/ ("the layout Empower picked out of Public Safety A").
 *     They name a rejected design variant from 2026-08-07, not the issue area,
 *     and no visitor reads them.
 *   - Podcast episode titles, e.g. "Alesha Judkins: Public Safety, Crime, and
 *     Second Chances". Empower's own published post titles; not ours to edit.
 *   - The chooser's four archive tags (Public Safety A, Public Safety C) and
 *     dist/safety-a.html, dist/safety-c.html. Historical names of designs that
 *     were not chosen. NOTE that src/chooser.html is HALF renamed and that is
 *     deliberate: the SIX entries naming the page or the issue area moved (the set
 *     filter, the group heading, the "Chosen:" tag, two descriptions, and
 *     content-b's shelf list), the three archive entries did not. A grep of
 *     that file returns THREE hits: "Solutions — Public Safety" and the tags
 *     "Public Safety A" and "Public Safety C", all naming variants rejected on
 *     2026-08-07.
 *
 *     THE SIXTH ENTRY WAS FOUND LATE, 2026-09-11, and only because a second
 *     agent refused to accept a verified COUNT as evidence about the count's
 *     MEMBERS. The sentence "Subject is the page: Quality Education, Meaningful
 *     Work, Public Safety, then Bill Summaries" is prose, which is the usual
 *     reason to leave a phrase alone, but it is prose LISTING THE THREE ISSUE
 *     AREAS, its two siblings are current names, and it describes
 *     dist/content-b.html, whose shelves now read "Safe Communities". A
 *     description that contradicts the page it describes is a miss, not a
 *     survivor. The test for a borderline instance is not "is it a sentence"
 *     but "is it naming the area, and does it still agree with what it points
 *     at".
 *
 *   - BOTH ENCODINGS OF THE TWO HEADINGS. "Crime Prevention &amp; Public
 *     Safety" is 5 in the corpus and "Crime Prevention & Public Safety" is 2,
 *     because test.mjs's roadmap fixture compares extracted TEXT and the pages
 *     carry markup. A sweep keyed on one spelling reports the other population
 *     as absent, which is how two agents checking each other both undercounted
 *     it on 2026-09-11.
 *
 * THE SEO TITLE GOES OUT WITH IT. seo.mjs's entry for /public-safety/ is now
 * "Safe Communities in Mississippi". deploy-seo.mjs overwrites AIOSEO's own
 * storage, so it is run here rather than left for the next SEO pass, where it
 * would arrive weeks after the page it describes.
 *
 * AND IT THREW ON THE FIRST RUN, 2026-09-11, FOR A REASON THAT IS NOT THIS
 * RENAME. deploy-seo.mjs resolves every path with `url_to_postid()`, which
 * returns 0 for a draft, and `/person/donald-nielsen/` (14920) and
 * `/person/joe-bishop-henchman/` (14281) are both `draft` on empv2. It refuses
 * to write any of the 30-odd entries when one path resolves to 0, which is the
 * right call and is documented there. Two consequences worth knowing before
 * the next run:
 *
 *   - IT ABORTS THIS SCRIPT AT STEP 5, so the flush at step 6 never runs and
 *     the pages deployed at step 4 keep serving from cache. That reads as a
 *     failed deploy and is not one. Flush by hand before concluding anything:
 *     `wp elementor flush_css && wp cache flush && wp page-cache flush`.
 *   - The one title this rename needed was written directly through the same
 *     AIOSEO model, for post 20608 alone, and both caches flushed after.
 *
 * Every SEO deploy stays blocked until somebody decides whether those two
 * people are meant to be drafts. That is a content question for Empower, not
 * something to route around by teaching the resolver to accept drafts: a path
 * that resolves to 0 is exactly the signal that script exists to raise.
 *
 * VERIFY THE RENDER, NOT THE DEPLOY. The last step re-sweeps all twenty
 * converted pages for the old string and prints what is left, which should be
 * exactly the four kinds of survivor listed above. */

import { deployPage } from './deploy.mjs';
import { deployThemePart } from './deploy.mjs';
import { headerPart, HEADER_POST_ID } from './theme-parts/header.mjs';
import { POST_ID as SAFETY_ID, sections as safetySections } from './pages/safety/page.mjs';
import { POST_ID as FINAL_ID, sections as finalSections } from './pages/final/page.mjs';
import { POST_ID as EPIC_ID, sections as epicSections } from './pages/epic-a/page.mjs';
import { POST_ID as SOLUTIONS_ID, sections as solutionsSections } from './pages/solutions-b/page.mjs';
import { POST_ID as WWD_ID, sections as wwdSections } from './pages/what-we-do-a/page.mjs';
import { syncTheme } from '../wp/sync.mjs';
import { wpe } from '../wpe.mjs';
import { pathToFileURL } from 'node:url';

const OLD = 'Public Safety';
const NEW = 'Safe Communities';

/* The page trees that carry the name. Not every converted page: the other
   fifteen carry it only in the header, which is one deploy of its own. */
const PAGES = [
  ['safety', SAFETY_ID, safetySections, 'the hero eyebrow and "The Latest on ..."'],
  ['final', FINAL_ID, finalSections, 'the foundations panel'],
  ['epic-a', EPIC_ID, epicSections, 'the hero area list and the research area'],
  ['solutions-b', SOLUTIONS_ID, solutionsSections, 'the track'],
  ['what-we-do-a', WWD_ID, wwdSections, 'the solutions panel'],
];

/* Every converted page, swept afterwards. Read off the register rather than
   written out here, because a hand-written page list in this repository has
   already let a sweep pass green while missing pages (the side-stripe test,
   2026-08-11). */
async function convertedUrls() {
  const { PAGE_REGISTER, EXCLUDED_PAGES } = await import('./pages/register.mjs');
  return [...new Set([...PAGE_REGISTER, ...EXCLUDED_PAGES]
    .map(p => p.exampleUrl)
    .filter(Boolean))].sort();
}

/* Cache-busted with a query var that is not reserved. `?s=` and `?w=` return a
   200-shaped 404 on this install and a sweep keyed on them reads "0 found"
   everywhere, which is indistinguishable from success. */
async function sweep(urls) {
  const rows = [];
  for (const url of urls) {
    const res = await fetch(`${url}?cb=${Date.now()}${Math.random().toString(36).slice(2)}`);
    const html = await res.text();
    const hits = html.split(OLD).length - 1;
    rows.push({ url, hits, status: res.status });
  }
  return rows;
}

async function main() {
  console.error(`Renaming "${OLD}" to "${NEW}" on empv2.\n`);

  console.error('1/6 the WordPress post title...');
  /* The title is what a human sees in the admin list and what the browser tab
     shows. Read back rather than trusted: `wp post update` reports success on
     a value it did not write often enough that this repository reads every
     write back (see the note at the top of wpe.mjs). */
  await wpe(`wp post update ${SAFETY_ID} --post_title=${JSON.stringify(NEW)}`);
  const title = (await wpe(`wp post get ${SAFETY_ID} --field=post_title`)).trim();
  if (title !== NEW) throw new Error(`post ${SAFETY_ID} title is "${title}", expected "${NEW}"`);
  console.error(`  post ${SAFETY_ID} is now "${title}"`);

  console.error('2/6 the child theme (inc/content-loop.php: the topic map behind /all-content/)...');
  await syncTheme();
  /* syncTheme() is silent on failure, so the file is read back off the install
     rather than assumed to have arrived. */
  const loop = await wpe('grep -c "Safe Communities" wp-content/themes/empowerms-child/inc/content-loop.php || true');
  if (loop.trim() === '0' || loop.trim() === '') {
    throw new Error('content-loop.php on the install still has no "Safe Communities": the theme sync did not land');
  }
  console.error(`  content-loop.php on the install carries the new label`);

  console.error('3/6 the header part (the mega-menu link and its mobile twin, on every page)...');
  await deployThemePart(HEADER_POST_ID, headerPart(), 'header');

  for (const [name, id, build, what] of PAGES) {
    console.error(`4/6 ${name} into ${id} (${what})...`);
    await deployPage(id, build());
  }

  console.error('5/6 the AIOSEO title for /public-safety/...');
  const { deploySeo } = await import('./deploy-seo.mjs');
  await deploySeo();

  console.error('6/6 flushing...');
  await wpe('wp elementor flush_css && wp cache flush && wp page-cache flush');

  console.error('\nSweeping every converted page for the old string...');
  const rows = await sweep(await convertedUrls());
  let total = 0;
  for (const { url, hits, status } of rows) {
    total += hits;
    if (status !== 200) console.error(`  ${status}  ${url}  <- not 200`);
    else if (hits) console.error(`  ${String(hits).padStart(3)}  ${url}`);
  }
  console.error(`\n${total} instances of "${OLD}" left across ${rows.length} pages.`);
  console.error('Expected survivors, and nothing else:');
  console.error('  /public-safety/  the two headings Empower have been asked about,');
  console.error('                   plus the build comment naming the Public Safety A layout');
  console.error('  /meaningful-work/, /quality-education/  that same build comment');
  console.error('  /podcast/, /all-content/  Empower\'s own episode and post titles');
  return 0;
}

/* IMPORTING THIS FILE MUST DO NOTHING. Only direct execution runs main(). */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main());
}
