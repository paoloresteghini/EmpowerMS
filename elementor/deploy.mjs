import { wpe } from '../wpe.mjs';

/* The version Task 2 actually captured on empv2: core moved to 4.2.2 by the
   time Pro was installed, so this is the re-pinned value, not the plan's
   original 4.2.1. See docs/elementor/schema-4.2.2.md. */
const ELEMENTOR_VERSION = '4.2.2';

/* A shell-safe-enough suffix for both the heredoc delimiter and the temp
   file name: timestamp plus a random component, so two deploys of the same
   post inside the same millisecond do not collide on either. */
const uniqueSuffix = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

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
   json_decode($meta_value) call cannot read back.

   `set -e` on the assembled script is load-bearing, not decorative. Without
   it, a failed `wp post meta update ... _elementor_data` does not stop the
   script: bash carries on to the later commands, and the script's own exit
   status becomes that of `wp elementor flush_css`, its last line, not of the
   line that actually failed. wpe() only rejects on the overall exit code, so
   a page whose data write silently failed would still report success and
   still get its CSS flushed, over data that was never written (or over
   whatever `_elementor_data` the post already had). This was caught by
   review, reproduced with a fake `wp` that fails only the data-update line
   and succeeds on everything else; deployPage() resolved anyway before this
   fix. `set -e` composes with wpe()'s own `cd ${ROOT} || exit 1` prefix
   without needing anything extra here: that line already exits on its own
   failure regardless of `set -e`, and everything after it is this script,
   where every line is meant to fail loudly. `rm -f` is deliberately the one
   command that tolerates a missing file (that is what `-f` is for), not a
   command whose failure this script should ignore. */
export async function deployPage(postId, sections) {
  if (!Number.isInteger(postId)) {
    throw new Error(`deployPage: postId must be an integer, got ${JSON.stringify(postId)}`);
  }

  const json = JSON.stringify(sections);
  const suffix = uniqueSuffix();
  const heredoc = `ELEMENTOR_DATA_${suffix}`;
  const tmpFile = `/tmp/elementor-data-${postId}-${suffix}.json`;

  const script = [
    'set -e',
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
