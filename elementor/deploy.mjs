import { wpe } from '../wpe.mjs';

/* The version Task 2 actually captured on empv2: core moved to 4.2.2 by the
   time Pro was installed, so this is the re-pinned value, not the plan's
   original 4.2.1. See docs/elementor/schema-4.2.2.md. */
const ELEMENTOR_VERSION = '4.2.2';

/* A shell-safe-enough marker for the heredoc that carries the JSON payload.
   Timestamp plus a random suffix so two deploys running close together on
   the same install cannot collide on the same temp file or delimiter. */
const marker = () => `ELEMENTOR_DATA_${Date.now()}_${Math.random().toString(16).slice(2)}`;

/* Writes an assembled Elementor element tree to a draft page and puts
   Elementor's own bookkeeping meta in place around it.

   The JSON payload is large and contains quotes, so it is written through a
   temporary file on the install via a quoted heredoc (no variable expansion
   inside it, so nothing in the JSON is reinterpreted by the remote shell),
   then `wp post meta update` reads the value from that file rather than
   taking it as a shell argument, per the brief's own caution. WP-CLI reads
   the value from STDIN when the value argument is omitted (`wp help post
   meta update` on empv2: "[<value>] The new value. If omitted, the value is
   read from STDIN."). The temp file is removed after the read.

   _elementor_data is stored as a plain string, not a serialized array:
   confirmed on empv2 by reading post 20551's meta with `wp eval` and
   `gettype()`, which reports "string". So the write uses WP-CLI's default
   plaintext format; --format=json here would json_decode the payload and
   store a PHP-serialized array instead, which Elementor's own
   json_decode($meta_value) call cannot read back. */
export async function deployPage(postId, sections) {
  if (!Number.isInteger(postId)) {
    throw new Error(`deployPage: postId must be an integer, got ${JSON.stringify(postId)}`);
  }

  const json = JSON.stringify(sections);
  const heredoc = marker();
  const tmpFile = `/tmp/elementor-data-${postId}-${Date.now()}.json`;

  const script = [
    `cat > ${tmpFile} <<'${heredoc}'`,
    json,
    heredoc,
    `wp post meta update ${postId} _elementor_data < ${tmpFile}`,
    `rm -f ${tmpFile}`,
    `wp post meta update ${postId} _elementor_edit_mode builder`,
    `wp post meta update ${postId} _elementor_template_type wp-page`,
    `wp post meta update ${postId} _elementor_version ${ELEMENTOR_VERSION}`,
    /* The brief names this `wp elementor flush-css`. `wp help elementor` on
       empv2 lists the subcommand as `flush_css` (underscore); `flush-css`
       is not registered and would fail. Corrected here with that evidence. */
    'wp elementor flush_css',
  ].join('\n');

  return wpe(script);
}
