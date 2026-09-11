/* Writes the roadmap's Team tab into the `person` CPT on empv2.

   SOURCE. "Empower Mississippi Website Refresh Roadmap", Team tab, exported
   2026-08-23. Paolo: "use the team names, titles and bios from here". It is the
   only document that states a role for every member of staff, which matters
   because `position_title` is what the /team/ cards and the bio pages render,
   and two people have had it EMPTY since the CPT conversion.

   WHY THIS IS NOT sync-person.mjs. That script pulls a person whole from
   empowerms.org, which is right when Empower have edited the live site. Here
   the roadmap is AHEAD of the live site: Kienna Horn's bio in the document has
   a sentence ("She is also an alumna of the Koch Associate Program in
   Washington, D.C.") that empowerms.org does not have, and two other edits with
   it. So this one writes what the document says.

   WHY THE BIOS ARE NOT COPIED WHOLESALE FROM THE DOCUMENT. A .docx export is a
   lossy rendering of the CPT's stored HTML. Grant Callen's bio italicises the
   publication name in "the Top 50 Most Influential Mississippians list by
   <em>Y'all Politics</em>", and Kienna Horn's italicises <em>Blue & Gold
   Media</em>; a text extraction of the document loses both. Diffed sentence by
   sentence, eight of the nine staff bios are already identical to what the CPT
   holds, so pasting the document over them would change nothing except to strip
   the markup. Only Kienna Horn's differs in words, and hers is written out below
   by hand with the italics kept.

   WHAT IS DELIBERATELY NOT HERE.

   1. NO NAME IS CHANGED. The document's name column says "Joanna Pevey" while
      the document's own bio for her, in the next cell, says "Joanna Polk is the
      Executive Assistant and Development Manager" - and Empower's approved
      search listing, returned 2026-08-21, also says "Joanna Polk, Development
      Manager". Two of Empower's documents and one half of this one say Polk.
      A person's name is not something to change on a majority vote, so it is a
      question for Empower rather than a write. "Dr Kristin Vance Richards" in
      the same column is a missing full stop in a table that writes "Dr. Patrick
      Miller" two rows above it; the CPT's "Dr." stays.

   2. NO STATUS IS CHANGED, so no fellow is published or drafted here. The
      document's Contributing Fellows table and Empower's own approved SEO sheet
      disagree about three of the five, in both directions, and the disagreement
      is set out in seo.mjs. Publishing somebody is how this build puts a person
      back on the roster, and it is not a side effect of a title fix. */

import { wpe } from '../wpe.mjs';

/* Kienna Horn's bio, from the roadmap's Team tab, with the <em> the document's
   text extraction dropped, and without the data-start/data-end attributes a
   previous paste left on the stored copy. */
const KIENNA_BIO = [
  '<p>Kienna serves as Director of Communications for Empower Mississippi, where she leads the organization’s strategic communications efforts. She oversees media relations, issue-based campaigns, internal messaging, and content execution across platforms to advance Empower’s mission and connect with key audiences.</p>',
  '<p>Kienna received her Bachelor’s Degree in Journalism from Mississippi College in 2023, where she served as Editor-in-Chief of <em>Blue &amp; Gold Media</em> and gained extensive training in multimedia journalism, social media communications, and public relations. She is also an alumna of the Koch Associate Program in Washington, D.C. Kienna joined Empower Mississippi as a communications intern in 2022.</p>',
  '<p>Originally from Alberta, Canada, Kienna moved to Mississippi in 2019 and now lives in Ridgeland with her husband and is a member of Grace Community Church.</p>',
].join('\n');

/* Each entry names what it is correcting and what the CPT held before, so a
   reader can tell a fix from a preference without diffing the install. */
export const ROSTER = [
  { id: 19867, slug: 'ashley-green',
    role: 'Director of Outreach',
    was: '(empty) - her card and bio page rendered no role line at all' },

  { id: 19838, slug: 'dr-kristin-vance-richards',
    role: 'Director of Research',
    was: '(empty) - same, and her own bio names the role in its first sentence' },

  { id: 16927, slug: 'kienna-horn',
    role: 'Director of Communications',
    content: KIENNA_BIO,
    was: 'Communications Manager, which her own bio already contradicted' },

  { id: 17873, slug: 'joanna-polk-2',
    role: 'Executive Assistant & Development Manager',
    was: '"...Assistant and Development Manager"; the roadmap and the static build both use the ampersand' },

  { id: 14269, slug: 'matt-ladner',
    role: 'Fellow on Education',
    was: '"Fellow on Education " with a trailing space, which the fellow/staff split does a prefix test on' },
];

export async function applyRoster(rows = ROSTER) {
  const payload = Buffer.from(JSON.stringify(rows)).toString('base64');
  const php = [
    '$rows = json_decode( base64_decode( "' + payload + '" ), true );',
    'foreach ( $rows as $r ) {',
    '  $id = (int) $r["id"];',
    '  $before_role = get_post_meta( $id, "position_title", true );',
    '  update_post_meta( $id, "position_title", $r["role"] );',
    '  $len = "";',
    '  if ( isset( $r["content"] ) ) {',
    '    $len = " content " . strlen( get_post( $id )->post_content ) . "->" . strlen( $r["content"] );',
    '    wp_update_post( [ "ID" => $id, "post_content" => $r["content"] ] );',
    '  }',
    '  echo $id, " ", $r["slug"], " role ", ( $before_role === "" ? "(empty)" : $before_role ),',
    '       " -> ", $r["role"], $len, "\\n";',
    '}',
  ].join(' ');
  return wpe(`wp eval '${php}'`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  applyRoster()
    .then((out) => console.log(out))
    .catch((err) => { console.error(err.message); process.exit(1); });
}
