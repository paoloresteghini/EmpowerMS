import { wpe } from './wpe.mjs';

/* The converted DOM is NOT class-for-class identical to dist/. Approach A
   rebuilds each section as native Elementor containers and widgets, so the
   markup differs by design. These checks therefore compare content, structure
   and order, never exact markup. */

/* WP Engine's page cache sits in front of this install and will hand back a
   stale, pre-conversion copy of a page while still reporting HTTP 200. This
   happened for real during Task 4: a check ran right after a theme
   activation, got a 200, and saw none of the new stylesheets, because the
   cache served a pre-activation copy (x-cache: HIT: 3). A harness that
   validates a cached copy of the previous build is worse than no harness,
   because it reports success.
   fetchConverted() therefore never trusts a 200 alone; it reads x-cache on
   the actual response and refuses to return a HIT. flushPageCache() is the
   other half of the defence, but it is deliberately NOT called from inside
   fetchConverted(): the flush is an SSH round trip (30 to 60 seconds), and a
   harness run checks many pages. Paying that cost on every fetch would make
   the harness itself impractically slow. One flush at the start of a run
   is enough to put the cache in a known-fresh state; the per-fetch header
   check is what makes staleness impossible to miss even if that flush was
   skipped, raced a re-warm, or the cache re-populated mid-run. Callers (the
   Task 6/7 harness) call flushPageCache() once, then fetchConverted() per
   page. */
export async function flushPageCache() {
  const out = await wpe('wp page-cache flush');
  if (!/Success/i.test(out)) {
    throw new Error(`page cache flush did not report success:\n${out}`);
  }
  return out;
}

export async function fetchConverted(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  /* Absent is not the same as HIT: a local file or a host with nothing
     caching in front of it sends no x-cache header at all, and treating
     that as stale would make the harness refuse to work off-install. Only
     an explicit HIT is rejected. */
  const cacheStatus = res.headers.get('x-cache');
  if (cacheStatus && /^HIT/i.test(cacheStatus)) {
    throw new Error(`${url} served from cache (x-cache: ${cacheStatus}); flush the page cache and retry`);
  }
  return res.text();
}

/* Elementor wraps and splits text far more than the static build does, so a
   raw indexOf reports false failures the moment a heading gains a wrapper
   mid-sentence. Comparing against one flattened string is not safe either
   way, though: replacing every tag with a plain space collapses "<h1>Real
   </h1><p>Solutions</p>" into "Real Solutions", so a deck string can be
   satisfied by two unrelated block elements happening to sit next to each
   other, which is exactly the failure this check exists to catch (a dropped
   heading passing because its words survive split across its neighbours).
   Block tags therefore cut the page into separate segments and a deck
   string only counts as present if ONE segment contains it whole; inline
   tags collapse to a plain space and never cut a segment, so a heading that
   legitimately gains a mid-sentence wrapper (Elementor's own habit) still
   reads as one continuous string.
   The split comes from what the build actually emits, read off src/ and
   dist/ (grep for tag names), not from memory: a, b, em, i, mark, small,
   span, strong, sub, sup and time all wrap short runs inside a sentence
   in this codebase and never appear as a wrapper around unrelated content;
   every other tag it emits is a container, a heading, a list item or a line
   break, and does interrupt a sentence, including <br>. */
const INLINE_TAGS = new Set(['a', 'b', 'em', 'i', 'mark', 'small', 'span', 'strong', 'sub', 'sup', 'time']);
/* A control character, not whitespace or punctuation, so it can never
   collide with anything a deck string could legitimately contain. Written
   as the explicit escape rather than an embedded byte so the source stays
   readable. */
const BREAK = '\u0000';

const segments = html => html
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (m, tag) => (INLINE_TAGS.has(tag.toLowerCase()) ? ' ' : BREAK))
  .replace(/&nbsp;/g, ' ')
  .split(BREAK)
  .map(s => s.replace(/\s+/g, ' ').trim())
  .filter(Boolean);

export function checkCopy(liveHtml, deck) {
  const segs = segments(liveHtml);
  return deck.filter(s => {
    const needle = s.replace(/\s+/g, ' ').trim();
    return !segs.some(seg => seg.includes(needle));
  });
}

/* Sections are found by the build's OWN class, which every converted container
   carries. Absence and order are reported separately because they have
   different causes: absence means a section was not built, order means the
   sections were assembled in the wrong sequence. */
export function checkSections(liveHtml, slugs) {
  const problems = [];
  let last = -1;
  for (const slug of slugs) {
    const at = liveHtml.search(new RegExp(`class="[^"]*\\b${slug}\\b`));
    if (at === -1) { problems.push(slug); continue; }
    if (at < last) problems.push(`${slug} is out of order`);
    else last = at;
  }
  return problems;
}
