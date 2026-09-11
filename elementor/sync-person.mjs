/* Pulls a `person` entry's title, role and bio from empowerms.org into empv2.

   WHY THIS EXISTS. The `person` CPT on the install is a migration copy taken
   once. Empower keep editing the originals on the live site, and when they do,
   the conversion's /team/ cards and bio pages go quietly stale: the Loop Grid
   is reading data nobody told it had changed. Kienna Horn, 2026-08-21:
   "Patrick and Gina have both had title and position updates, so I updated
   their titles and bios on the Team page." Nothing in this repo would have
   noticed.

   WHY NOT A HAND-EDIT. Because a hand-edit is a guess about how much changed.
   Dr. Patrick Miller's bio was assumed to differ in its opening sentence, the
   one the new title lives in. Diffed against the live copy it differs in FOUR
   places: the title sentence, three straight apostrophes turned curly, the town
   he lives in (Ocean Springs to Madison) and his church (St. Alphonsus to St.
   Richard in Jackson). Two of those are facts about a person, and none of them
   is in the email. Take the whole field or take none of it.

   WHAT IT WRITES. post_content, post_title, and the ACF `position_title` meta.
   Nothing else: not the slug, not the featured image, not the status. Status
   in particular is ours to decide, since drafting a person is how this build
   removes them from the roster.

   TRANSPORT. Base64, one payload, one call, for the reason wpe.mjs documents at
   length: bios contain apostrophes, ampersands and em dashes, and a value that
   crosses node, ssh, bash and PHP unencoded gets mangled by one of the four.

   THE ROLE IS NOT IN THE REST RESPONSE. `position_title` is an ACF field and
   the live site does not expose it (`acf` comes back `{}` on a public read), so
   the role cannot be pulled the way the bio can. It is passed in by the caller,
   read from Empower's own roadmap table, and the script refuses to invent one:
   omit it and the meta is left alone rather than blanked. */

import { wpe } from '../wpe.mjs';

const LIVE = 'https://www.empowerms.org/wp-json/wp/v2/person';

async function livePerson(id) {
  /* curl, not fetch/urllib: empowerms.org 403s a request without a browser's
     user agent, and has done since this repo first read it. */
  const raw = await new Promise((resolve, reject) => {
    import('node:child_process').then(({ execFile }) => {
      execFile('curl', ['-sS', '-A', 'Mozilla/5.0', `${LIVE}/${id}`], { maxBuffer: 8e6 },
        (err, stdout) => (err ? reject(err) : resolve(stdout)));
    });
  });
  const data = JSON.parse(raw);
  if (!data?.content?.rendered) {
    throw new Error(`person ${id}: live site returned no content (${JSON.stringify(data).slice(0, 160)})`);
  }
  return {
    id,
    title: data.title.rendered,
    content: data.content.rendered.trim(),
  };
}

export async function syncPeople(entries) {
  const rows = [];
  for (const { id, role } of entries) {
    const live = await livePerson(id);
    rows.push({ ...live, role: role ?? null });
  }

  const payload = Buffer.from(JSON.stringify(rows)).toString('base64');
  const php = [
    '$rows = json_decode( base64_decode( "' + payload + '" ), true );',
    'foreach ( $rows as $r ) {',
    '  $before = get_post( (int) $r["id"] );',
    '  wp_update_post( [ "ID" => (int) $r["id"], "post_title" => $r["title"], "post_content" => $r["content"] ] );',
    '  if ( ! is_null( $r["role"] ) ) { update_post_meta( (int) $r["id"], "position_title", $r["role"] ); }',
    '  echo $r["id"], " ", $before->post_name, " content ", strlen( $before->post_content ), "->", strlen( $r["content"] ),',
    '       " role ", ( is_null( $r["role"] ) ? "(unchanged)" : $r["role"] ), "\\n";',
    '}',
  ].join(' ');

  return wpe(`wp eval '${php}'`);
}

/* The 2026-08-21 set, from Kienna Horn's email and Empower's own roadmap table.
   Wil Ervin is NOT here: he leaves at the end of the month and is already
   draft on the install, which is how this build takes somebody off the roster. */
const AUGUST_21 = [
  { id: 16880, role: 'Executive Vice President' },      // Dr. Patrick Miller, was Vice President of Development
  { id: 11374, role: 'Chief Administrative Officer' },  // Gina Metzger, was Executive Vice President
];

if (import.meta.url === `file://${process.argv[1]}`) {
  syncPeople(AUGUST_21)
    .then((out) => console.log(out))
    .catch((err) => { console.error(err.message); process.exit(1); });
}
