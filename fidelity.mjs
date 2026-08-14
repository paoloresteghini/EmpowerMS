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

/* robots.txt is the whole basis of the publish-during-conversion policy:
   pages under conversion are published, linked from nothing, and covered
   only by this. Fetched and asserted rather than trusted, because the day
   it changes, nothing else would tell us. Not routed through
   fetchConverted(): robots.txt is not a per-page conversion target and is
   never served from WP Engine's page cache the way a post or page is, so
   the x-cache staleness check that function exists for does not apply
   here; a plain fetch is the right instrument for a file that is the same
   for every request regardless of cache state. */
export async function checkRobots(baseUrl) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/robots.txt`);
  if (!res.ok) throw new Error(`robots.txt returned ${res.status}`);
  return res.text();
}

/* Shared by segments() (checkCopy's helper) and checkSections(), so the two
   can never drift on what counts as "not really on the page" the way they
   already did once: checkSections searched raw liveHtml while checkCopy
   moved to a comment-aware segments(), and a section deleted during
   conversion but left behind commented out read as present. That is the
   single most likely way a whole section disappears while its markup still
   mentions it, which makes it more damaging than the copy-level version of
   the same gap. One strip function, used everywhere HTML is searched for
   real content, makes the drift structurally impossible rather than merely
   fixed for now. */
const stripComments = html => html.replace(/<!--[\s\S]*?-->/g, ' ');

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
   break, and does interrupt a sentence, including <br>.
   Comments go through stripComments() before the tag pass, the same way
   script and style content already is stripped: an HTML comment opens with
   "<!--", so the tag regex below (which requires a letter right after "<"
   or "</") never matches it, and a comment body would otherwise survive as
   literal text glued onto whichever segment it sits in. dist/ carries
   prose comments on eight or more pages, and Elementor/WordPress output is
   comment-heavy by nature, so copy that was pulled from the visible page
   during conversion but left behind as a note would silently read as
   present without this. A doctype ("<!DOCTYPE html>") is a different
   construct (no "--"), so this pattern does not remove it; confirmed
   harmless instead, since it never matches a real tag either and so lands
   in a segment of its own that no real deck string would ever equal. */
const INLINE_TAGS = new Set(['a', 'b', 'em', 'i', 'mark', 'small', 'span', 'strong', 'sub', 'sup', 'time']);
/* A control character, not whitespace or punctuation, so it can never
   collide with anything a deck string could legitimately contain. Written
   as the explicit escape rather than an embedded byte so the source stays
   readable. */
const BREAK = '\u0000';

const segments = html => stripComments(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' '))
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
   sections were assembled in the wrong sequence.
   Searches stripComments(liveHtml), not liveHtml: a section deleted during
   conversion but left behind commented out still carries its class inside
   the comment, and raw liveHtml would find it there and report the section
   present. That is the single most likely way a whole section disappears
   from a page while the markup still mentions it. All indices in this
   function (both `at` and `last`) are taken from the one stripped string,
   so order comparisons stay internally consistent. */
export function checkSections(liveHtml, slugs) {
  const html = stripComments(liveHtml);
  const problems = [];
  let last = -1;
  for (const slug of slugs) {
    const at = html.search(new RegExp(`class="[^"]*\\b${slug}\\b`));
    if (at === -1) { problems.push(slug); continue; }
    if (at < last) problems.push(`${slug} is out of order`);
    else last = at;
  }
  return problems;
}
