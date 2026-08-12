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

  /* Two of the three solution DETAIL pages. Content is the roadmap's Meaningful
     Work and Public Safety tabs — its "Standard Solution Page Flow", all seven
     sections, in the order the document states them — checked by WORK_COPY and
     SAFETY_COPY in test.mjs.

     Unlike the Solutions landing set, these are NOT fillings of one template:
     every reading is composed independently, so each has its own stylesheet and
     its own signature composition. That means there is no single solution-page
     template to hand off yet, and Quality Education (the third destination the
     landing page routes to) is still unbuilt.

     The two sets are no longer the same size: Meaningful Work has B and C,
     Public Safety has all three. */
  /* work-a (The Open Door) was withdrawn on 2026-08-05 before Empower saw it.
     src/work-a/ and css/work-a.css are still on disk; re-adding the line here,
     its chooser card and its test.mjs SIGNATURE/PREFIX entries is all it takes
     to bring it back. */
  { src: 'work-b/index.html', out: 'dist/work-b.html', title: 'Meaningful Work B — The Sidelines', kind: 'about' },
  { src: 'safety-a/index.html', out: 'dist/safety-a.html', title: 'Public Safety A — The Neighbourhood', kind: 'about' },
  /* Meaningful Work and Public Safety, built on the shared solution template.
     Empower chose "The Streetlight" on 2026-08-07 and asked for one template
     across all three solution pages, so this page, safety and education are
     the same blocks in the same order with different copy. They share
     css/solution.css; the unpicked readings keep their own stylesheets. */
  { src: 'education/index.html', out: 'dist/education.html', title: 'Quality Education', kind: 'about' },
  { src: 'work/index.html', out: 'dist/work.html', title: 'Meaningful Work', kind: 'about' },
  { src: 'safety/index.html', out: 'dist/safety.html', title: 'Public Safety', kind: 'about' },

  /* A third reading of each, built with the impeccable craft flow on 2026-08-05.
     These two keep three sections of work-b that Paolo picked out — the work-area
     mosaic, the story columns, the article stubs — and replace everything above
     them. They are the only two with a rail to the work areas.

     Still not a shared template: Paolo chose six distinct pages. work-c is white
     plates on a navy field, safety-c is one navy plate on a white field, and
     test.mjs asserts each of the six keeps its own signature. */
  { src: 'work-c/index.html', out: 'dist/work-c.html', title: 'Meaningful Work C — The Plate', kind: 'about' },
  { src: 'safety-c/index.html', out: 'dist/safety-c.html', title: 'Public Safety C — The Watch', kind: 'about' },

  /* The Empower Podcast, two readings. The roadmap's Podcast tab has three
     sections and both pages carry all three verbatim; what differs is where the
     weight sits and how the episode library is filtered.

     These are the first pages in the build with a working FILTER. It is the
     roadmap's own suggestion ("have Paolo create a database where people can
     search or filter for previous podcasts based on tags") and it runs on
     :has() over real checkboxes with no script, the same way the review index
     does. */
  { src: 'podcast-a/index.html', out: 'dist/podcast-a.html', title: 'The Empower Podcast A — The Studio', kind: 'about' },
  { src: 'podcast-b/index.html', out: 'dist/podcast-b.html', title: 'The Empower Podcast B — On the Record', kind: 'about' },

  /* Capitol Chat, the sibling tab in the same dropdown, two readings. Its roadmap
     copy differs from The Empower Podcast's in ways that drive the design rather
     than decorate it: ONE button (it is an audio show, where the podcast leads on
     YouTube), a five-minute weekly format, and a host — Wil Ervin — whose bio page
     does not exist, so his name is deliberately not a link.

     Paolo chose unrelated readings on 2026-08-05 rather than a pair matched to the
     two podcast readings, so these are two more distinct compositions. Both carry
     the filter, with topic and SESSION facets: there are no guests to filter by. */
  { src: 'capitol-a/index.html', out: 'dist/capitol-a.html', title: 'Capitol Chat A — The Dome', kind: 'about' },
  { src: 'capitol-b/index.html', out: 'dist/capitol-b.html', title: 'Capitol Chat B — The Session', kind: 'about' },

  /* EPIC, the research arm, three readings. The roadmap tab is short — a hero,
     one passage, a three-step method and a research index — so the readings are
     held apart by STRUCTURE rather than by how much they say: A pins the method
     and moves it sideways, B breaks the grid and draws its own plotted field, C
     drenches the whole page in navy and runs one continuous line down it.

     All three are the first pages in the build to use CSS scroll-driven
     animation. Every use is wrapped in @supports and in
     prefers-reduced-motion:no-preference, and the layout underneath each one is
     a plain static composition, so nothing on these pages depends on the
     animation running. */
  { src: 'epic-a/index.html', out: 'dist/epic-a.html', title: 'EPIC A — The Pinned Method', kind: 'about' },
  { src: 'epic-b/index.html', out: 'dist/epic-b.html', title: 'EPIC B — The Plotted Field', kind: 'about' },
  { src: 'epic-c/index.html', out: 'dist/epic-c.html', title: 'EPIC C — The Instrument', kind: 'about' },

  /* The two Join Us destinations, two readings each. Both roadmap tabs end on
     an instruction rather than a paragraph — "Insert signup form on webpage",
     "Include interest form for joining the ambassador program" — so unlike
     every other page in this build these two are built around a real <form>,
     with real labels, autocomplete tokens and native validation, and no script
     behind any of it. The readings differ on where the form sits: A puts it
     first because the page has one job, B makes it the destination. */
  { src: 'mail-a/index.html', out: 'dist/mail-a.html', title: 'Email Sign Up A — Five Minutes', kind: 'about' },
  { src: 'mail-b/index.html', out: 'dist/mail-b.html', title: 'Email Sign Up B — The Issue', kind: 'about' },
  { src: 'amb-a/index.html', out: 'dist/amb-a.html', title: 'Ambassador A — The Network', kind: 'about' },
  { src: 'amb-b/index.html', out: 'dist/amb-b.html', title: 'Ambassador B — The First Step', kind: 'about' },

  /* Donate, the last tab in the roadmap, now three readings. The one page in the
     build that asks for money, and the one place a design decision is also a
     safety decision: NOTHING here collects payment details. The amount choices
     are links that carry a figure to /donate/give, where the processor's own
     page or embed lives, and a test fails any of them for a card, CVV, expiry
     or bank field.

     C was built on 2026-08-11, after Empower said neither A nor B landed and
     asked for something simpler with the giving form high on the page. It is the
     only one of the three where the ask shares the first screen with the hero,
     and the only one that draws the processor's form as a marked slot rather
     than sending the visitor away to it. */
  { src: 'give-a/index.html', out: 'dist/give-a.html', title: 'Donate A — Generational', kind: 'about' },
  { src: 'give-b/index.html', out: 'dist/give-b.html', title: 'Donate B — Next Chapter', kind: 'about' },
  { src: 'give-c/index.html', out: 'dist/give-c.html', title: 'Donate C: One Screen', kind: 'about' },
  /* D is the second answer to the same note, built 2026-08-12. Where C redesigns
     the giving decision and slabs the processor's part, D copies Empower's own
     form field for field and gives it somewhere to sit: a navy banner carrying
     the EM pattern, and a card lifting out of it into the white body. Its form
     is a facsimile, drawn in divs, for exactly the reason the rest of the set
     hands off rather than collects. */
  { src: 'give-d/index.html', out: 'dist/give-d.html', title: 'Donate D: The Card', kind: 'about' },

  /* All Content, two readings, added 2026-08-12 after Kienna asked for a page
     like the Georgia Center for Opportunity's and pointed at foropportunity.org
     /content. The roadmap's own All Content tab gives four content types with a
     sentence each and a topic list, and nothing else — no hero, no headline —
     so every word above the filter on both pages is ours and marked as such.

     The two readings answer the same page in opposite ways. A keeps the four
     types as the structure of the page and filters within them; B dissolves
     them into one dated stream and makes type a facet. Both run on :has() over
     real inputs with no script, and both are populated with live empowerms.org
     posts rather than invented headlines.

     The roadmap also names this page "Empower Mississippi Commentary" at
     /empower-commentary while heading the tab "ALL CONTENT" — and the header
     nav shipped on every page in this build says All Content. Both readings use
     All Content; the disagreement is a question for Empower, not a decision for
     us. */
  { src: 'content-a/index.html', out: 'dist/content-a.html', title: 'All Content A — The Four Doors', kind: 'about' },
  { src: 'content-b/index.html', out: 'dist/content-b.html', title: 'All Content B — What It’s About', kind: 'about' },

  /* The flexible landing page. Kienna asked only for "the ability to start with
     a blank page in Elementor and build something as needed" — which is what
     Elementor already does — so what is built here is the other half of that
     ask: a page whose blocks are the ones a campaign actually needs, in this
     design language, ready to duplicate and cut down.

     It is a TEMPLATE, and the sample it is dressed in is a real Empower
     campaign (the Special Needs ESA waitlist) with real posts linked from it,
     so nothing on it reads as an invented programme or an approved headline. */
  { src: 'landing/index.html', out: 'dist/landing.html', title: 'Flexible landing page A — the campaign kit', kind: 'about' },
  { src: 'landing-b/index.html', out: 'dist/landing-b.html', title: 'Flexible landing page B — the held ask', kind: 'about' },
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
