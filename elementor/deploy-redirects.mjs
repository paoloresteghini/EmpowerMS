/* Writes elementor/redirects.mjs into the Redirection plugin's own table.

   THROUGH Red_Item::create(), NOT an INSERT. redirection_items has fifteen
   columns, two of which (match_url, match_data) the plugin derives from the
   url and the match type, and a hand-written INSERT is a guess about a schema
   that is not ours. Same reasoning as deploy-seo.mjs going through AIOSEO's
   model: the plugin knows how to make its own row.

   IDEMPOTENT. Re-running does not create a second copy of anything. Sources
   are matched on the exact `url` column, and an existing rule with the same
   source is UPDATED rather than duplicated, because two rules with the same
   source is a coin toss about which one wins.

   Base64 for the payload, one call, for the reason wpe.mjs gives at length:
   the values contain slashes and the repository has lost time twice to
   WP-CLI values mangled between node, ssh, bash and PHP.

   action_data IS AN ARRAY, ["url" => ...], never the bare string. Red_Item
   passes everything through Red_Item_Sanitize, and the sanitizer's line 172
   reads `isset( $details['action_data'] ) && is_array( $details['action_data'] )`.
   A string does not fail: the branch is skipped, the row saves, and the
   redirect has no destination. Written as a string first and caught by
   reading the sanitizer rather than by the result, which would have been a
   set of live rules pointing nowhere. */

import { wpe, stripNotices } from '../wpe.mjs';
import { REDIRECTS, REPOINT, MUST_STAY_DISABLED } from './redirects.mjs';

const php = (body) => `wp eval '${body}'`;

/* Read the table first. Nothing is written before the plan is checked against
   what is actually there, because REPOINT is keyed by row id and a renumbered
   table would otherwise repoint whatever now sits at id 14. */
export async function readRules() {
  const out = stripNotices(await wpe(php(
    'global $wpdb; foreach ( $wpdb->get_results( "SELECT id, url, action_data, action_code, status '
    + 'FROM {$wpdb->prefix}redirection_items ORDER BY id" ) as $r ) '
    + '{ echo $r->id, "\\t", $r->url, "\\t", $r->action_data, "\\t", $r->action_code, "\\t", $r->status, "\\n"; }',
  )));
  return out.split('\n').filter((l) => l.includes('\t')).map((l) => {
    const [id, url, target, code, status] = l.split('\t');
    return { id: Number(id), url, target, code: Number(code), status };
  });
}

export async function deployRedirects() {
  const before = await readRules();
  const byId = new Map(before.map((r) => [r.id, r]));
  const byUrl = new Map(before.map((r) => [r.url, r]));

  /* Guard 1: every REPOINT id must still be the rule it was written for. */
  const moved = REPOINT.filter((r) => byId.get(r.id)?.url !== r.from);
  if (moved.length) {
    throw new Error(
      'redirection_items has been renumbered or edited; these REPOINT entries no longer match:\n  '
      + moved.map((r) => `id ${r.id} should be "${r.from}" and is "${byId.get(r.id)?.url ?? 'MISSING'}"`).join('\n  ')
      + '\nFix elementor/redirects.mjs against the live table before running this again.',
    );
  }

  /* Guard 2: refuse to run at all while a reverse rule is live, because the
     redirects below would complete the loop. */
  const armed = MUST_STAY_DISABLED.filter((r) => byId.get(r.id)?.status === 'enabled');
  if (armed.length) {
    throw new Error(
      'these rules are the REVERSE of redirects this script creates and are currently ENABLED:\n  '
      + armed.map((r) => `id ${r.id}: ${r.rule}  (loops with ${r.loopsWith})`).join('\n  ')
      + '\nCreating the redirects now would make both pages unreachable. Disable them first.',
    );
  }

  const rows = REDIRECTS.map((r) => ({
    from: r.from, to: r.to, existing: byUrl.get(r.from)?.id ?? 0,
  }));
  const payload = Buffer.from(JSON.stringify({ rows, repoint: REPOINT })).toString('base64');

  const body = [
    '$plan = json_decode( base64_decode( "' + payload + '" ), true );',
    'foreach ( $plan["rows"] as $row ) {',
    '  if ( $row["existing"] ) {',
    '    $item = Red_Item::get_by_id( (int) $row["existing"] );',
    '    $item->update( [ "action_data" => [ "url" => $row["to"] ], "action_code" => 301, "action_type" => "url",',
    '      "match_type" => "url", "group_id" => 1, "status" => "enabled", "url" => $row["from"] ] );',
    '    echo "updated\\t", $row["from"], "\\t", $row["to"], "\\n";',
    '  } else {',
    '    $created = Red_Item::create( [ "url" => $row["from"], "action_data" => [ "url" => $row["to"] ],',
    '      "action_code" => 301, "action_type" => "url", "match_type" => "url", "group_id" => 1,',
    '      "status" => "enabled" ] );',
    '    echo ( is_wp_error( $created ) ? "FAILED\\t" . $created->get_error_message() : "created" ),',
    '      "\\t", $row["from"], "\\t", $row["to"], "\\n";',
    '  }',
    '}',
    'foreach ( $plan["repoint"] as $r ) {',
    '  $item = Red_Item::get_by_id( (int) $r["id"] );',
    '  $item->update( [ "action_data" => [ "url" => $r["to"] ], "action_code" => 301, "action_type" => "url",',
    '    "match_type" => "url", "group_id" => $item->get_group_id(), "status" => "enabled", "url" => $r["from"] ] );',
    '  echo "repointed\\t", $r["from"], "\\t", $r["was"], " -> ", $r["to"], "\\n";',
    '}',
  ].join(' ');

  const written = stripNotices(await wpe(php(body)));

  /* Same lesson deploy-seo.mjs learned the hard way on its first run: the rule
     lands in the database at once and the page keeps serving from WP Engine's
     page cache, so a verification against the live URLs reads as a partial
     failure with no pattern in it. Flush both, always, as part of the deploy. */
  const flushed = stripNotices(await wpe('wp page-cache flush && wp cdn-cache flush'));

  return { count: REDIRECTS.length, repointed: REPOINT.length, written, flushed };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  deployRedirects()
    .then(({ count, repointed, written, flushed }) => {
      console.log(written);
      console.log(flushed);
      console.log(`${count} redirect(s) live, ${repointed} existing rule(s) repointed`);
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
