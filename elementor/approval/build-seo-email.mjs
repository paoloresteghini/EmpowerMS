/* The same entries as the approval sheet, as an email body that survives a
   paste into Google Docs: no tables, no markdown that Docs will not render, no
   characters that a mail client rewrites. Generated from seo.mjs for the same
   reason the sheet is: the client must approve the strings that deploy. */
import fs from 'node:fs';
import { PAGE_SEO, PERSON_SEO, BRAND_SUFFIX } from '../seo.mjs';

const CURRENT = JSON.parse(
  fs.readFileSync(new URL('./current.json', import.meta.url), 'utf8'),
);

const SITE = 'empowerms.org';

/* A readable name for each URL, for people who do not think in paths. */
const LABEL = {
  '/': 'Home',
  '/what-we-do/': 'What We Do',
  '/solutions/': 'Solutions',
  '/capitol-chat/': 'Capitol Chat',
  '/who-we-are/': 'Who We Are',
  '/newsletter/': 'Email Sign Up',
  '/ambassadors/': 'Ambassador Program',
  '/epic/': 'EPIC',
  '/donate/': 'Donate',
  '/public-safety/': 'Public Safety',
  '/meaningful-work/': 'Meaningful Work',
  '/quality-education/': 'Quality Education',
  '/podcast/': 'The Empower Podcast',
  '/all-content/': 'All Content',
  '/team/': 'Team, Board and Fellows',
  '/grant-callen/': 'Grant Callen (bio template page)',
};

function block(path, entry, showToday) {
  const title = entry.title + BRAND_SUFFIX;
  const name = LABEL[path] || path.replace('/person/', '').replace(/\//g, '').replace(/-/g, ' ');
  const lines = [
    `${name}   ${SITE}${path}`,
    `   Title: ${title}`,
    `   Description: ${entry.description}`,
  ];
  if (showToday) {
    const cur = CURRENT[path];
    lines.push(
      cur.desc === 0
        ? '   Today: no description at all'
        : `   Today: ${cur.desc} characters, cut off by Google mid-sentence`,
    );
  }
  return lines.join('\n');
}

const N_PAGES = Object.keys(PAGE_SEO).length;
const N_PEOPLE = Object.keys(PERSON_SEO).length;
const N_ALL = N_PAGES + N_PEOPLE;

/* Spelled out because the prose says "the sixteen main pages", and a numeral
   mid-sentence reads like a form field. Typed once here rather than in six
   places in the template, which is where the count drifted the first time:
   the file said "eighteen biographies" for a week after five of them left. */
const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen', 'twenty'];
const word = (n) => WORD[n] ?? String(n);

const pages = Object.entries(PAGE_SEO)
  .map(([p, e]) => block(p, e, true))
  .join('\n\n');

/* Bios list the person's name from the title, so LABEL is not needed and the
   "today" line would repeat "350 to 419 characters" eighteen times: said once
   in the section's own paragraph instead. */
const people = Object.entries(PERSON_SEO)
  .map(([p, e]) => {
    const title = e.title + BRAND_SUFFIX;
    return [
      `${e.title.split(',')[0]}   ${SITE}${p}`,
      `   Title: ${title}`,
      `   Description: ${e.description}`,
    ].join('\n');
  })
  .join('\n\n');

const email = `Subject: Search listings for empowerms.org, ready for your approval

Hi [name],

Before the new site goes live we need to settle one piece of copy that is easy
to overlook: the short text that appears under each page's name in Google.

Right now none of the ${word(N_PAGES)} main pages has one. Google fills the gap with
whatever text it can scrape off the page, which for these pages is usually the
navigation. The ${word(N_PEOPLE)} staff and fellow biographies do have one, but each is
the opening 350 to 420 characters of the biography, so Google cuts it off
mid-sentence.

Below are the proposed replacements: a title and a one-line description for
each of the ${N_ALL} addresses. Every line is drawn from the page's own approved
copy, or from the person's own biography. Nothing is invented, and no figure
appears that is not already on the page it describes.

There is also a visual version showing each one exactly as a Google result
renders it, including what a phone cuts off: [paste artifact link]

Please reply with any wording you want changed. Anything you do not mention, we
will take as approved.


===========================================================
PART ONE: THE ${word(N_PAGES).toUpperCase()} SITE PAGES
===========================================================

Titles here are a little longer than the current ones. The current titles are
short enough that Google leaves part of the result space unused.

${pages}


===========================================================
PART TWO: THE ${word(N_PEOPLE).toUpperCase()} BIOGRAPHIES
===========================================================

Each of these replaces a 350 to 420 character extract that Google truncates.
The replacement leads with the person's role, then one line of background,
taken from their own biography. Full biographies on the pages are unchanged.

${people}


===========================================================
TWO DECISIONS TO CONFIRM ALONGSIDE THE WORDING
===========================================================

1. The home page is currently titled "Homepage (Elementor conversion)". That is
   a label from the build process, and it is what a browser tab and a Google
   result both say today. The title above replaces it. Please confirm you are
   happy with the replacement wording.

2. Grant Callen's biography currently exists at two web addresses:
   ${SITE}/grant-callen/ and ${SITE}/person/grant-callen/
   Both work, both are titled "Grant Callen", and Google has no way to tell
   which is the real one, so the two compete with each other. We propose
   treating ${SITE}/person/grant-callen/ as the real one, which is the address
   the staff page already links to. The other stays reachable and simply points
   Google at it. No content is deleted either way.


===========================================================
NOT INCLUDED, AND WHY
===========================================================

Blog posts and the older pages are not in this list. They already carry
descriptions, and while most are longer than Google will show, they are far
better handled in one bulk pass than written out one by one. Happy to quote
that separately if you want it done before launch.

Best,
[your name]
`;

fs.writeFileSync(new URL('./seo-email.txt', import.meta.url), email);
console.log(email);
