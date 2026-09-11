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
import { shorten, MAX, MIN } from './post-seo.mjs';

const OUT = 'elementor/approval/post-descriptions.json';

/* THE 137 THE SHORTENER CANNOT DO, written by hand and kept separately.
   post-seo.mjs proposes only literal runs of a post's own words, which is
   right for a machine and has a hard ceiling: 137 posts open with a single
   sentence longer than the whole 160-character budget and with no interior
   break, so every mechanical cut lands mid-thought. Those rows proposed
   nothing at all, which was honest and, as Paolo put it, not helpful.
   So they are written, and the writing lives in its own file rather than
   being pasted into the generated one: re-running this script regenerates
   every mechanical row and must not touch a hand-written one. */
const WRITTEN = 'elementor/approval/post-descriptions-written.json';

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
  /* DECODE FIRST, THEN COLLAPSE, and the other order is a real bug this had.
     Collapsing whitespace before decoding leaves every &nbsp; untouched,
     because at that point it is still six ordinary characters; decoding then
     turns it into U+00A0, which is whitespace that the collapse has already
     been and gone past. It surfaced as a proposal reading "greatly
     exaggerated" followed by three spaces, where a pull-quote had been glued
     onto the body text. */
  '  $body = preg_replace("/\\s+/u", " ", html_entity_decode( $body, ENT_QUOTES ) );',
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
/* Every number in a string, commas and trailing punctuation removed so that
   "1,500 hours." and "1500" compare equal. */
const numbersIn = (s) => (String(s).match(/[0-9][0-9,.]*/g) ?? []).map((n) => n.replace(/,/g, '').replace(/\.$/, ''));

/* EMPOWER'S RULE, TURNED INTO A CHECK. No figure may appear in a search
   snippet that does not appear on the page it describes: the same rule that
   governs every heading in this build, and it binds harder here because a
   hand-written description is not constrained to the post's own words the way
   a mechanical one is. Anything a person writes can drift, and a plausible
   wrong number in a search result is worse than a long right one.
   Checked against the post's own text at generation time and refused, rather
   than being left to review: a reviewer reading 137 descriptions will catch a
   clumsy sentence long before they catch a transposed figure. The committed
   proposal carries the body prefix for these rows so the same check can run as
   a test without going back to the install. */
export function writtenProblems({ id, description, body, title }) {
  const problems = [];
  if (description.length > MAX) problems.push(`post ${id}: ${description.length} characters, over ${MAX}`);
  if (description.length < MIN) problems.push(`post ${id}: only ${description.length} characters`);
  const hay = `${title} ${body}`.replace(/,/g, '');
  for (const n of numbersIn(description)) {
    if (!hay.includes(n)) {
      problems.push(`post ${id}: the figure "${n}" is not in the post -- "${description.slice(0, 70)}..."`);
    }
  }
  return problems;
}

export async function buildProposal({ concurrency = 4, tolerance = 0.02 } = {}) {
  const posts = await harvestPosts();
  const written = JSON.parse(fs.readFileSync(WRITTEN, 'utf8'));
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

  /* Loud and all at once, before a single row is emitted. A partial refusal
     would leave a proposal that is mostly hand-written and quietly missing the
     rows that failed. */
  const failures = [];
  const rows = posts.map((p, i) => {
    let { description, tier } = shorten(p);
    let body;
    let replaced;

    /* THE OVERLAY WINS WHEREVER IT NAMES A POST, and that is wider than it
       first was. It began covering only the `manual` rows, which propose
       nothing; it now also covers `clause`, because a clause cut is
       grammatical rather than meaningful. The worked example: a post headlined
       "Charter Schools Outperform Districts on 3rd Grade Reading" was cut at
       the comma, which landed immediately BEFORE the result the headline
       promises. Accurate, in band, and useless.
       `replaced` keeps what the shortener had made of the row, so the gate
       below can assert the overlay never overrides a cut that already read as
       a finished sentence. */
    if (written[String(p.id)]) {
      replaced = tier;
      description = written[String(p.id)];
      tier = 'written';
      body = p.body;
      failures.push(...writtenProblems({ id: p.id, description, body, title: p.post_title }));
    }

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
      /* Only on the written rows, and only so the figure check above can run
         as a repo test rather than needing the install. Adds about 120 KB.
         PRESENT EVEN WHEN EMPTY, because one post has no prose at all: post
         17962 is a gallery of 67 photographs and nothing else. An absent key
         and an empty string mean different things there -- "not a written row"
         against "written, and there was nothing to write from" -- and the test
         over this file needs to tell them apart rather than treating a
         checkable row as missing. */
      ...(tier === 'written' ? { body: body ?? '', replaced } : {}),
    };
  });

  if (failures.length) {
    throw new Error(
      `${failures.length} hand-written description(s) break the rules:\n${failures.map((f) => `  - ${f}`).join('\n')}`,
    );
  }

  return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
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
