/* Builds elementor/approval/post-descriptions.json: one proposed meta
   description per published post, for review.

   READS BOTH SURFACES, and that is the point rather than belt and braces. The
   post's content comes from the install over SSH; the description a visitor
   is actually served comes from fetching the page. Those two disagree
   completely here - AIOSEO's own storage holds nothing for 473 of the 490
   posts while every one of them serves 291 to 374 characters - and a harvest
   that had read only the storage would have concluded there was nothing to
   fix. The `before` figure on every row is the served length, because that is
   the number the task is about.

   THE FETCHES ARE THE SLOW HALF, 490 of them, so they run a few at a time and
   the whole thing takes a couple of minutes. Deliberately NOT routed through
   fetchConverted(): a cached copy is exactly what we want here, since we are
   measuring what visitors are being handed rather than verifying a change we
   just made. The x-cache guard exists for the opposite situation.

   NOT RUN AUTOMATICALLY BY ANYTHING. The output is committed, so the proposal
   Empower is shown is in version control rather than in somebody's downloads
   folder, and regenerating it invalidates any approval that names its digest.
   That is the intended friction: see elementor/deploy-post-seo.mjs. */

import fs from 'node:fs';
import { wpe } from '../wpe.mjs';
import { shorten } from './post-seo.mjs';

const OUT = 'elementor/approval/post-descriptions.json';

/* 900 characters of body is far more than any 160-character proposal can use,
   and enough that a long opening sentence plus its successor both survive the
   trip. Pulled as one base64 blob for the reason wpe.mjs documents: the copy
   is full of apostrophes and em rules, and four layers of shell sit between
   here and the database. */
const HARVEST_PHP = [
  '$q = new WP_Query(array("post_type"=>"post","post_status"=>"publish","posts_per_page"=>-1,"fields"=>"ids"));',
  '$out = array();',
  'foreach ($q->posts as $id) {',
  '  $body = wp_strip_all_tags( strip_shortcodes( get_post_field("post_content", $id) ) );',
  '  $body = html_entity_decode( preg_replace("/\\s+/u", " ", $body), ENT_QUOTES );',
  '  $out[] = array(',
  '    "id" => (int) $id,',
  '    "url" => get_permalink($id),',
  '    "post_title" => get_the_title($id),',
  '    "date" => get_the_date("Y-m-d", $id),',
  '    "body" => mb_substr( trim($body), 0, 900 ),',
  '  );',
  '}',
  'echo base64_encode( json_encode($out) );',
].join(' ');

export async function harvestPosts() {
  const raw = await wpe(`wp eval '${HARVEST_PHP}'`);
  /* stripNotices() cleans the PHP deprecation notices this install emits on
     every WP-CLI call, but a notice glued mid-value survives it, so the blob
     is filtered down to the base64 alphabet before decoding. */
  const b64 = raw.replace(/[^A-Za-z0-9+/=]/g, '');
  return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
}

/* The description a visitor is served right now. `length` is -1 when the page
   could not be read, which is distinguishable from 0 (a page that genuinely
   serves no description) and is what keeps a network blip from being recorded
   as a finding.

   THE TEXT IS KEPT, NOT JUST THE LENGTH, and one post is the reason. A post
   whose entire body is a single short sentence already serves that sentence
   as its description, so the proposal comes back byte-identical to what is
   live. Comparing lengths alone cannot tell that apart from a proposal that
   failed to shorten anything, and writing it would achieve precisely nothing.
   Entity-decoded because AIOSEO escapes for output ("&#039;") and the
   proposal is built from decoded post content; without this every post
   carrying an apostrophe would compare as different for no reason. */
const decodeEntities = (s) => s
  .replace(/&#0?39;|&apos;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/&#8217;/g, '\u2019')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* RETRIED, AND THE FIRST VERSION OF THIS WAS NOT, which produced a proposal
   that looked complete and was three-quarters guesswork. Fetching 490 pages
   at eight at a time got 362 of them refused, every refusal was recorded as
   -1, and the summary line went from "76,110 characters removed" to "18,511"
   between two runs of the same script over the same corpus. Nothing errored.
   A caller reading either number would have had no way to tell it was the
   count of pages that answered rather than the size of the problem. */
async function servedDescription(url, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok) {
        const html = await res.text();
        const m = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
        if (!m) return { text: '', length: 0 };
        const text = decodeEntities(m[1]);
        return { text, length: text.length };
      }
    } catch {
      /* falls through to the backoff below */
    }
    if (attempt < attempts) await sleep(400 * attempt * attempt);
  }
  return { text: '', length: -1 };
}

async function pooled(items, size, worker) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    for (;;) {
      const i = next; next += 1;
      if (i >= items.length) return;
      out[i] = await worker(items[i], i);
    }
  }));
  return out;
}

/* FOUR AT A TIME, not eight, and the number is measured rather than chosen.
   Eight was refused by the install for 74% of the corpus; four with the
   backoff above reads it. This is a one-off script and the difference is a
   couple of minutes. */
export async function buildProposal({ concurrency = 4, tolerance = 0.02 } = {}) {
  const posts = await harvestPosts();
  const before = await pooled(posts, concurrency, (p) => servedDescription(p.url));

  /* LOUD, NOT RECORDED. An unread page contributes -1, which every summary
     below silently treats as "nothing to save", so a half-failed harvest
     produces a plausible, smaller, wrong proposal rather than an error. The
     tolerance is small on purpose: a handful of genuine 404s is survivable, a
     rate limit is not. */
  const unread = before.filter((b) => b.length < 0);
  if (unread.length > posts.length * tolerance) {
    throw new Error(
      `${unread.length} of ${posts.length} pages could not be read, which is over the ${Math.round(tolerance * 100)}% `
      + 'tolerance. The install refuses concurrent requests under load; lower the concurrency and run it again. '
      + 'Writing the proposal anyway would record every unread page as having nothing to save.',
    );
  }

  return posts.map((p, i) => {
    const { description, tier } = shorten(p);
    /* A FOURTH TIER THAT NOTHING GENERATES, only observation produces: the
       proposal is exactly what the page already serves, so writing it would
       change no character anybody reads. Labelled rather than dropped, so the
       proposal still accounts for all 490 posts and the reviewer can see that
       this one needs nothing. */
    const unchanged = description && description === before[i].text;
    return {
      id: p.id,
      url: new URL(p.url).pathname,
      date: p.date,
      post_title: p.post_title,
      tier: unchanged ? 'unchanged' : tier,
      description,
      length: description.length,
      /* BOTH SIDES OF THE COMPARISON ARE THE RECORD, not just the lengths. A
         reviewer is being asked whether a shorter description is better than
         the one being served, and that question cannot be answered from two
         numbers. It roughly doubles the file and is worth it. Excluded from
         the approval digest in deploy-post-seo.mjs, which fingerprints the
         proposed wording only: `now` is an observation of the install at
         harvest time, not something anybody is approving. */
      now: before[i].text,
      before: before[i].length,
    };
  }).sort((a, b) => (a.date < b.date ? 1 : -1));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildProposal()
    .then((rows) => {
      fs.writeFileSync(OUT, JSON.stringify(rows, null, 1) + '\n');
      const tiers = {};
      for (const r of rows) tiers[r.tier] = (tiers[r.tier] ?? 0) + 1;
      const proposed = rows.filter((r) => r.description);
      const saved = proposed.reduce((n, r) => n + Math.max(0, r.before - r.length), 0);
      console.log(`${rows.length} posts -> ${OUT}`);
      console.log(`tiers: ${Object.entries(tiers).map(([k, v]) => `${k} ${v}`).join(', ')}`);
      console.log(`${proposed.length} proposals, ${saved} characters removed in total`);
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
