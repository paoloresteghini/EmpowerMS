/* Shortening the 490 blog posts' meta descriptions, without writing a word.

   WHAT IS WRONG. Every published post serves a meta description of 291 to 374
   characters against the roughly 160 Google displays. Nobody wrote them: All
   in One SEO generates them at request time from post_content, so the
   description is the opening of the article, cut wherever the character
   budget runs out, mid-word and mid-thought.

   NOTHING IS PERSISTED, and finding that out took a wrong reading first. Read
   through AIOSEO's own model, 473 of the 490 posts have an EMPTY description
   and the remaining 17 hold thirteen characters or fewer. Read off the
   delivered page, all 490 carry 291 to 374. Storage and output are two
   different documents here, and the audit had measured the output. Two
   consequences follow and both are good: a write cannot overwrite anything a
   person typed into wp-admin, and the rollback record for the whole corpus is
   "they were all empty".

   THE FIRST 40 TO 60 CHARACTERS ARE OFTEN THE HEADLINE AGAIN. The article
   body begins with its own title as a heading, so the generated description
   opens by restating the line printed immediately above it in the search
   result. stripTitleEcho() removes that and it is the single biggest gain in
   the set.

   THE RULE THIS MUST NOT BREAK is Empower's, and it is the same rule that
   governs every heading in this build: nothing invented. So nothing here
   composes a sentence or paraphrases one. Every proposal is a literal run of
   the post's own words, cut at a boundary. A generator that rewrote would
   read better and would be the wrong instrument for copy somebody else owns
   and has to stand behind.

   THREE TIERS, AND THE TIER TRAVELS WITH THE PROPOSAL, because it tells a
   reviewer how much attention each row needs:
     sentence  ends on a full stop. Reads as finished. Needs a glance.
     clause    cut at a comma, colon, semicolon or dash because the opening
               sentence overruns the budget. Reads as unfinished. Needs a
               reader.
     manual    proposes NOTHING. The opening sentence is longer than the whole
               budget and has no interior boundary, so every mechanical cut
               lands mid-thought. An empty proposal is the honest output; a
               bad one would be reviewed as if it were a suggestion.
   Measured over the corpus on 2026-08-27: 281 sentence, 72 clause, 137
   manual.

   PURE, and taking the post rather than fetching it, so every rule above can
   be exercised against a fixture. elementor/harvest-post-seo.mjs is what
   brings the corpus down from the install and applies this. */

/* Google shows around 155 to 160 characters on a desktop result and fewer on
   a phone. 160 is the ceiling rather than the target: a proposal at the
   ceiling still beats one at 374 by a wide margin, and the alternative -
   padding a short one - would mean writing. */
export const MAX = 160;

/* Below this a description is too thin to earn the slot, and a mechanical cut
   that short is usually a sentence-splitting failure rather than a genuinely
   brief opening ("Forget industrial parks." at 24 characters is a real
   example from the corpus). Anything under it falls through to the next tier
   rather than being proposed. */
export const MIN = 70;

/* The floor for a clause cut. A comma inside the first 110 characters usually
   sits mid-subject ("Senate Bill 2035, ...") and cutting there produces a
   fragment naming a bill and nothing about it. */
export const CLAUSE_MIN = 110;

/* A private-use code point, so it can never occur in Mississippi political
   prose or in anything else the corpus contains. Used to hide a full stop
   from the sentence splitter and put it back afterwards. */
const DOT = '\uE000';

/* Abbreviations that end in a full stop and are followed by a capitalised
   word, which is exactly the shape of a sentence boundary. Mississippi
   politics supplies Rep., Sen., Gov. and Lt. in quantity, so on this corpus
   this is not an edge case, it is most of it: "On this episode of the Empower
   Podcast, State Rep. Otis Anthony joins Grant..." was being cut after "State
   Rep." and proposed as a 50-character description.

   CASE-SENSITIVE ON PURPOSE. "He is a state rep. Nobody disputes that." is a
   real sentence boundary and must still split; only the capitalised, titular
   form is masked. */
const ABBREVIATIONS = [
  'Rep', 'Sen', 'Gov', 'Lt', 'Dr', 'Mr', 'Mrs', 'Ms', 'St', 'Jr', 'Sr',
  'Prof', 'Hon', 'Col', 'Gen', 'Capt', 'Sgt', 'Inc', 'Co', 'Corp', 'No',
];
const RE_ABBREVIATION = new RegExp('\\b(' + ABBREVIATIONS.join('|') + ')\\.', 'g');

/* A single capital followed by a full stop, i.e. an initial: "J. Robertson".
   Separate from the list above because it cannot be enumerated. */
const RE_INITIAL = /\b([A-Z])\./g;

/* Splits prose into sentences without breaking on an abbreviation or an
   initial. The full stops that must not count as boundaries are swapped for
   DOT, the split runs, and DOT is swapped back, so the returned sentences are
   character-for-character the input's own text. */
export function splitSentences(text) {
  const masked = String(text)
    .replace(RE_ABBREVIATION, (m) => m.replace('.', DOT))
    .replace(RE_INITIAL, '$1' + DOT)
    .replace(/([ap])\.m\./gi, '$1' + DOT + 'm' + DOT);
  const parts = masked.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? [];
  return parts.map((s) => s.split(DOT).join('.').trim()).filter(Boolean);
}

const normalise = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/* Removes a headline the body repeats back at the top of itself.

   MATCHED ON A CONTIGUOUS RUN OF THE TITLE'S WORDS rather than on the whole
   title, because the echo is often not verbatim: a post titled "2026 Capitol
   Chat: Sine Die" opens "Capitol Chat: Sine Die Lawmakers returned...". A
   whole-title prefix test misses every one of those.

   THREE WORDS MINIMUM, and that floor is what makes this safe to run over 490
   posts unattended. A one or two word overlap happens constantly by accident
   ("Mississippi lawmakers passed..." under a title beginning "Mississippi"),
   and eating the opening clause of a real sentence would be silent, would read
   fine, and would ship. Below three words this returns the body untouched. */
export function stripTitleEcho(body, title) {
  const titleWords = normalise(title).split(' ').filter(Boolean);
  const bodyWords = String(body).split(/\s+/).filter(Boolean);
  const haystack = ' ' + titleWords.join(' ') + ' ';

  for (let k = Math.min(bodyWords.length, titleWords.length); k >= 3; k -= 1) {
    const run = normalise(bodyWords.slice(0, k).join(' '));
    if (run && haystack.includes(' ' + run + ' ')) {
      return bodyWords.slice(k).join(' ').replace(/^[\s\-–—:.,]+/, '');
    }
  }
  return String(body);
}

/* The longest run of whole sentences that fits the budget. */
function sentenceRun(body) {
  let out = '';
  for (const sentence of splitSentences(body)) {
    const next = out ? out + ' ' + sentence : sentence;
    if (next.length > MAX) break;
    out = next;
  }
  return out;
}

/* The longest prefix of one over-long sentence ending at an interior
   punctuation boundary inside the budget. Returns '' when there is no such
   boundary, which is the manual tier: a cut placed anywhere else would land
   mid-phrase. */
function clauseRun(sentence) {
  if (sentence.length <= MAX) return '';
  const head = sentence.slice(0, MAX + 1);
  const boundaries = [...head.matchAll(/[,;:—–]\s/g)].map((m) => m.index);
  const cut = boundaries.filter((i) => i >= CLAUSE_MIN).pop();
  return cut === undefined ? '' : sentence.slice(0, cut).trim();
}

/* One post in, one proposal out. `body` is the post's plain-text content.

   The tiers are tried in order of how finished the result reads, and the
   first one that produces something acceptable wins. There is deliberately no
   fourth tier that truncates on a word boundary and appends an ellipsis: that
   is what the thing being replaced already does. */
export function shorten({ post_title: postTitle = '', body = '' } = {}) {
  const text = stripTitleEcho(String(body).trim(), postTitle);

  const run = sentenceRun(text);
  if (run.length >= MIN) return { description: run, tier: 'sentence', length: run.length };

  const clause = clauseRun(splitSentences(text)[0] ?? '');
  if (clause.length >= MIN) return { description: clause, tier: 'clause', length: clause.length };

  return { description: '', tier: 'manual', length: 0 };
}
