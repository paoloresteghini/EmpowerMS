import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SRC = 'src';
const MARKER = /<!--@include\s+([^\s>]+?)\s*-->/g;

/* Every page this build produces. `src` is relative to src/, `out` is the
   path written. Include markers inside a page are ALSO resolved relative to
   src/, not to the page's own directory, so a section and a shared partial
   are referenced the same way from anywhere.

   dist/ stays flat and one level deep, because every partial references
   assets as ../assets/… — nesting a page would break those paths.

   `kind` exists because the test suite runs two different contracts. Every
   homepage is a presentation of ONE approved copy deck, so they are checked
   against each other — same headline, same seventeen roadmap strings, one
   orange action, one email field. An About page shares the chrome and the
   design language but none of that copy, so sweeping it into the homepage
   contract would assert nonsense. Kinds:

     homepage  the five homepage builds
     about     the Who We Are / What We Do variations
     chooser   the review index, which is not a client-facing page at all

   The four homepage-[a-d] pages were the options Empower chose between. They
   are no longer options — Empower picked, and dist/final.html is the build —
   but they still build and still show on the chooser as the reference set the
   decision was made from, so they are named for what they are rather than for
   a choice that has already happened. */
export const PAGES = [
  { src: 'chooser.html', out: 'dist/index.html', title: 'Compare the builds', kind: 'chooser' },
  { src: 'final/index.html', out: 'dist/final.html', title: 'The agreed build', kind: 'homepage' },
  { src: 'index.html', out: 'dist/current.html', title: 'Current reference build', kind: 'homepage' },
  { src: 'current-2/index.html', out: 'dist/current-2.html', title: 'Current build — new header and banner', kind: 'homepage' },
  { src: 'option-a/index.html', out: 'dist/homepage-a.html', title: 'Homepage A — Front Porch', kind: 'homepage' },
  { src: 'option-b/index.html', out: 'dist/homepage-b.html', title: 'Homepage B — The Index', kind: 'homepage' },
  { src: 'option-c/index.html', out: 'dist/homepage-c.html', title: 'Homepage C — The Atlas', kind: 'homepage' },
  { src: 'option-d/index.html', out: 'dist/homepage-d.html', title: 'Homepage D — The Throughline', kind: 'homepage' },

  { src: 'who-we-are-a/index.html', out: 'dist/who-we-are-a.html', title: 'Who We Are A — The Table', kind: 'about' },
  { src: 'who-we-are-b/index.html', out: 'dist/who-we-are-b.html', title: 'Who We Are B — The Record', kind: 'about' },
  { src: 'who-we-are-c/index.html', out: 'dist/who-we-are-c.html', title: 'Who We Are C — The Ground', kind: 'about' },
  { src: 'what-we-do-a/index.html', out: 'dist/what-we-do-a.html', title: 'What We Do A — Three Doors', kind: 'about' },
  { src: 'what-we-do-b/index.html', out: 'dist/what-we-do-b.html', title: 'What We Do B — The Ledger', kind: 'about' },
  { src: 'what-we-do-c/index.html', out: 'dist/what-we-do-c.html', title: 'What We Do C — The Field', kind: 'about' },

  /* The page every About build links to, in the same three-variation shape as
     the rest of the About set. All three carry the roadmap's Team tab copy
     whole and differ only in composition; TEAM_COPY in test.mjs asserts that
     against each of them. */
  { src: 'team-a/index.html', out: 'dist/team-a.html', title: 'Team A — The Roster', kind: 'about' },
  { src: 'team-b/index.html', out: 'dist/team-b.html', title: 'Team B — The Directory', kind: 'about' },
  { src: 'team-c/index.html', out: 'dist/team-c.html', title: 'Team C — The Frame', kind: 'about' },

  /* One staff detail screen, the CEO's, built as the template the other nine
     bios are cut from. Every staff card on all three variations links to it
     until those exist. Not a variation of anything, so it is excluded from the
     three-way team contract in test.mjs by name. */
  { src: 'team-bio/index.html', out: 'dist/team-bio.html', title: 'Staff bio — Grant Callen', kind: 'about' },

  /* The Solutions landing page, three readings of it. Same contract as the
     rest of the About set: shared chrome, own stylesheet, roadmap copy
     verbatim, checked by SOLUTIONS_COPY in test.mjs. */
  { src: 'solutions-a/index.html', out: 'dist/solutions-a.html', title: 'Solutions A — The Commons', kind: 'about' },
  { src: 'solutions-b/index.html', out: 'dist/solutions-b.html', title: 'Solutions B — The Throughline Down', kind: 'about' },
  { src: 'solutions-c/index.html', out: 'dist/solutions-c.html', title: 'Solutions C — The Lattice', kind: 'about' },
];

function resolve(html, depth = 0) {
  if (depth > 5) throw new Error('include nesting too deep — cycle?');
  return html.replace(MARKER, (_, path) => {
    const file = join(SRC, path);
    let part;
    try {
      part = readFileSync(file, 'utf8');
    } catch {
      throw new Error(`include not found: ${file}`);
    }
    return resolve(part.trimEnd(), depth + 1);
  });
}

let total = 0;
for (const page of PAGES) {
  // A page still being written is skipped rather than crashing the build, so
  // the dev server keeps serving the pages that do exist. test.mjs asserts
  // that every entry in PAGES actually produced a file, so a page that never
  // arrives fails the suite rather than disappearing quietly.
  if (!existsSync(join(SRC, page.src))) {
    console.warn(`skipped ${page.out} — src/${page.src} does not exist yet`);
    continue;
  }
  const out = resolve(readFileSync(join(SRC, page.src), 'utf8'));
  mkdirSync(dirname(page.out), { recursive: true });
  writeFileSync(page.out, out);
  total += out.length;
  console.log(`built ${page.out} (${out.length} bytes)`);
}
console.log(`${PAGES.length} pages, ${total} bytes`);
