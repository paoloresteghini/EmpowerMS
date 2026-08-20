import { wpe } from '../wpe.mjs';
import { remapLinks } from './links.mjs';

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
   command whose failure this script should ignore.

   Factored out of deployPage() so deployLoopItem() (below) can share every
   line of this without duplicating the set -e / heredoc / temp-file caution
   above: the only thing that differs between a page and a Loop Item template
   is the value written to _elementor_template_type. Both are elements of the
   SAME underlying operation ("write this JSON tree into this post's
   _elementor_data and flush"), just against different post types
   (page vs elementor_library), which is why this stays one function with a
   parameter rather than two independent copies that could drift. */
function deployElements(postId, elements, templateType) {
  if (!Number.isInteger(postId)) {
    throw new Error(`deployElements: postId must be an integer, got ${JSON.stringify(postId)}`);
  }

  /* THE LINK REMAP, applied here and nowhere else. The static build's routes do
     not exist on this install, so every tree on its way to the install is
     rewritten to point at the converted pages. This is the only place all three
     producers meet (the 17 page modules, the header and footer extracted
     verbatim from the frozen src/_shared/*.html, and content-a's loop item), so
     it is the only place where a page converted later cannot miss the remap.
     elementor/links.mjs carries the map and the reasoning; it returns a new tree
     and never mutates this one. */
  const json = JSON.stringify(remapLinks(elements));
  const suffix = uniqueSuffix();
  const heredoc = `ELEMENTOR_DATA_${suffix}`;
  const tmpFile = `/tmp/elementor-data-${postId}-${suffix}.json`;

  const script = [
    'set -e',
    /* Registered before the heredoc that creates the file, so an abort during
       the write itself is covered too, and left as the ONLY cleanup path
       rather than sitting alongside the `rm -f` that used to follow the meta
       update: two cleanup lines for one file can drift apart, and it was
       exactly the mid-script one that `set -e` never reached. EXIT fires on
       the abort path as well as the normal one, so the file goes either way.
       Unquoted expansion is safe here: postId is an integer (asserted above)
       and uniqueSuffix() is digits and hex, so the path holds no whitespace
       or shell metacharacter. */
    `trap 'rm -f ${tmpFile}' EXIT`,
    `cat > ${tmpFile} <<'${heredoc}'`,
    json,
    heredoc,
    `wp post meta update ${postId} _elementor_data < ${tmpFile}`,
    `wp post meta update ${postId} _elementor_edit_mode builder`,
    `wp post meta update ${postId} _elementor_template_type ${templateType}`,
    `wp post meta update ${postId} _elementor_version ${ELEMENTOR_VERSION}`,
    /* The brief names this `wp elementor flush-css`. `wp help elementor` on
       empv2 lists the subcommand as `flush_css` (underscore); `flush-css`
       is not registered and would fail. Corrected here with that evidence. */
    'wp elementor flush_css',
  ].join('\n');

  return wpe(script);
}

export async function deployPage(postId, sections) {
  return deployElements(postId, sections, 'wp-page');
}

/* Writes a Loop Item template's element tree to its elementor_library post.
   The post itself (and its elementor_library_type: loop-item taxonomy term,
   which Elementor's own Loop document class reads to know which panel/editor
   to open, not something this write path touches) is one-time setup done via
   wp-cli; see the task report for the exact commands. Everything after that
   is identical to deployPage(), templateType 'loop-item' instead of
   'wp-page' (Loop::DOCUMENT_TYPE, read from wp-content/plugins/elementor-pro/
   modules/loop-builder/documents/loop.php on empv2, and confirmed against the
   probe template Task 2 already built: post 20555 carries
   _elementor_template_type loop-item). */
export async function deployLoopItem(postId, elements) {
  return deployElements(postId, elements, 'loop-item');
}

/* The two Theme Builder document types, read from Elementor Pro's own
   documents on the install: modules/theme-builder/documents/header.php
   returns 'header' from get_type(), footer.php returns 'footer'. Any other
   value here would be a real template type belonging to a different deploy
   path (wp-page, loop-item), written onto a library post that Elementor
   then never renders in a location, with nothing reporting it.

   'archive' is the third, added 2026-08-20 for the search results template.
   Unlike header and footer it is the RENDER LOCATION rather than the
   document type: Elementor Pro's Search_Results document
   (modules/theme-builder/documents/search-results.php) returns
   'search-results' from get_type() and 'search' from get_sub_type(), and
   inherits its location from Archive. wp/empowerms-child/search.php:12 asks
   for the 'archive' location, so that is the string this validation gate is
   about. search-archive.mjs writes the document type separately. */
export const THEME_PART_LOCATIONS = ['header', 'footer', 'archive'];

/* deployElements() overwrites _elementor_data and _elementor_template_type
   wholesale, with no check of its own that postId names a document of the
   type it is about to write. Task 3 proved setConditions() rejects a
   non-library post (docs/elementor/theme-part-mechanism.md:112-117), but
   that check runs on the SECOND write, after this function's own call to
   deployElements() has already clobbered whatever the post held; a wrong id
   here silently overwrites an unrelated post's Elementor data before
   anything has a chance to object. So this checks the target's post_type on
   the install BEFORE deployElements() runs, and fails loudly, naming the id
   and what it actually found, rather than writing first and letting a later
   step discover the damage. */
export async function deployThemePart(postId, elements, location) {
  if (!THEME_PART_LOCATIONS.includes(location)) {
    throw new Error(
      `deployThemePart: location must be one of ${THEME_PART_LOCATIONS.join(', ')}, got ${JSON.stringify(location)}`
    );
  }
  if (!Number.isInteger(postId)) {
    throw new Error(`deployThemePart: postId must be an integer, got ${JSON.stringify(postId)}`);
  }
  const postType = (await wpe(`wp post get ${postId} --field=post_type`)).trim();
  if (postType !== 'elementor_library') {
    throw new Error(
      `deployThemePart: post ${postId} is not an elementor_library post (post_type is '${postType}'); refusing to overwrite its Elementor data`
    );
  }
  return deployElements(postId, elements, location);
}

/* Turns off UiCore's own page-title banner on a converted page.
 *
 * Found by measuring the first converted homepage section on the live install,
 * and it was true of podcast-a too, all the way back to Phase 1: UiCore prints
 * <h1 class="uicore-title uicore-animate ..."> above the page's own content, so
 * every converted page shipped TWO h1 elements and a title bar the design does
 * not have. Nothing reported it. The fidelity checks look for the build's own
 * copy and computed styles, and all of that was present and correct; the extra
 * chrome sat above it, and a screenshot comparison read it as a header
 * difference rather than as a duplicate heading.
 *
 * The gate is UiCore's own, read from the plugin rather than guessed:
 * should_render_page_title() (uicore-framework/includes/templates/page-title.php
 * :605) asks Helper::po('pagetitle', 'pagetitle', 'true', $post_id), and po()
 * (includes/extra/helper.php:20, the branch at :81) reads the post's
 * `page_options` meta, requires it to be JSON via Helper::isJson(), and maps the
 * value 'disable' to 'false'. So all three of these matter and none is a
 * preference: the key is `page_options`, the setting is `pagetitle`, and the
 * value is the literal string 'disable'.
 *
 * Written as plaintext JSON, NOT with --format=json. WP-CLI's --format=json
 * json_decodes the value and stores a PHP-serialized array, which
 * Helper::isJson() then rejects, so the setting would be silently ignored while
 * reading back as perfectly correct in the admin. This is the same trap
 * deployElements() documents for _elementor_data, in the opposite direction.
 *
 * Its own function rather than a step folded into deployPage(), for the same
 * reason setConditions() is separate from deployThemePart(): they are two
 * writes with two independent failure modes. A page with content and a title
 * banner is wrong in a way that is visible; a page with a suppressed banner and
 * no content is wrong in a different way. Callers do both.
 */
export async function disableThemePageTitle(postId) {
  if (!Number.isInteger(postId)) {
    throw new Error(`disableThemePageTitle: postId must be an integer, got ${JSON.stringify(postId)}`);
  }
  const value = JSON.stringify({ pagetitle: 'disable' });
  return wpe(`set -e\nwp post meta update ${postId} page_options '${value}'`);
}

/* Elementor Pro's Conditions_Manager expects _elementor_conditions on the
   document to be an array of condition strings, 'include/general' being the
   whole site. Written with --format=json so WP-CLI stores an array rather
   than the literal text of one: a part whose conditions are a string is
   assigned to nothing, renders nowhere, and reports no error.

   The postmeta write alone is NOT what Elementor Pro reads at render time,
   and this was wrong in an earlier version of this comment (it cited
   conditions-manager.php:53, which is only the meta read used when the
   editor loads a document for editing, not the render-time resolution
   path). Task 3 proved this the hard way: both posts had correct
   _elementor_template_type, _elementor_edit_mode and a correctly-shaped
   _elementor_conditions array, and UiCore's own chrome still rendered,
   because Conditions_Manager::get_location_templates()
   (conditions-manager.php:328, called from :518) resolves a location's
   documents from a CACHED option, elementor_pro_theme_builder_conditions
   (conditions-cache.php:15), via $this->cache->get_by_location()
   (conditions-manager.php:331). Writing postmeta directly through WP-CLI
   never touches that option, so it stays stale (empty, in Task 3's case),
   no document is registered to either location, and Elementor Pro never
   hooks get_header()/get_footer(). A part in this state looks perfectly
   configured and renders nowhere, with nothing reporting it.

   So the postmeta write is followed by a call to
   Conditions_Cache::regenerate() (conditions-cache.php:94), reached through
   the Theme Builder module instance. This is Elementor's own mechanism, not
   a workaround: it is the same call Conditions_Manager::save_conditions()
   makes internally (conditions-manager.php:323) when the editor itself
   saves a document's conditions, so this function now does in one remote
   call what the editor does in two (save the meta, then regenerate the
   cache that render time actually reads).

   The PHP goes through `wp eval-file` with a heredoc-and-temp-file, not
   `wp eval` with the PHP inline: inline PHP passed as a CLI argument goes
   through two levels of shell quoting (this shell's, then wp-cli's own
   argument handling), which is exactly the class of problem the heredoc
   pattern above (and deployElements() at :13-30) already exists to avoid.

   Calling regenerate() and stopping is not enough, and this was caught by
   review before it could repeat Task 3's own mistake one level down.
   regenerate() returning without throwing is not evidence THIS post ended
   up registered to a location: if the post is not published, or its
   _elementor_template_type is wrong, or the condition string is not one
   Elementor recognises, regenerate() completes happily and writes a cache
   that still does not list the document. That is a write that is correct,
   verifiable and inert, the exact failure mode this whole function exists
   to close. So the PHP reads elementor_pro_theme_builder_conditions back
   after regenerating and checks $postId actually appears under some
   location; if it does not, it writes to STDERR and calls exit(1), which
   ends the wp eval-file process (and, since PHP's exit() terminates the
   process wp-cli itself is running in, wp-cli exits non-zero with it), so
   set -e turns a silent no-op into a rejected promise instead of a resolved
   one.

   Separate from deployThemePart() deliberately. A part with data and no
   condition renders nowhere; a part with a condition and no data renders an
   empty location. Two failure modes, two writes, asserted independently. */
export async function setConditions(postId, conditions) {
  if (!Number.isInteger(postId)) {
    throw new Error(`setConditions: postId must be an integer, got ${JSON.stringify(postId)}`);
  }
  if (!Array.isArray(conditions) || conditions.length === 0) {
    throw new Error('setConditions: pass at least one condition, e.g. ["include/general"]');
  }
  const json = JSON.stringify(conditions);
  const suffix = uniqueSuffix();
  const heredoc = `ELEMENTOR_CONDITIONS_${suffix}`;
  const tmpFile = `/tmp/elementor-conditions-${postId}-${suffix}.json`;
  const phpHeredoc = `ELEMENTOR_CONDITIONS_CACHE_REGEN_${suffix}`;
  const phpFile = `/tmp/elementor-conditions-cache-regen-${postId}-${suffix}.php`;
  const regenPhp = [
    '<?php',
    `$post_id = ${postId};`,
    '$cm = \\ElementorPro\\Modules\\ThemeBuilder\\Module::instance()->get_conditions_manager();',
    '$cm->get_cache()->regenerate();',
    "$cache = get_option( 'elementor_pro_theme_builder_conditions', array() );",
    '$found = false;',
    'foreach ( (array) $cache as $location => $documents ) {',
    '\tif ( array_key_exists( (string) $post_id, (array) $documents ) ) {',
    '\t\t$found = true;',
    '\t\tbreak;',
    '\t}',
    '}',
    'if ( ! $found ) {',
    "\tfwrite( STDERR, \"setConditions: post $post_id was not found under any location in elementor_pro_theme_builder_conditions after regenerate(); the conditions cache regeneration ran but left this post unassigned\\n\" );",
    '\texit( 1 );',
    '}',
  ].join('\n');
  const script = [
    'set -e',
    /* Both files in one trap, registered before either exists, for the reason
       deployElements() documents above. This function is the one that proved
       the need: its whole purpose is to fail loudly when the regeneration
       leaves the post unassigned, and every one of those deliberate failures
       used to abort at `wp eval-file` with the PHP script still sitting in the
       install's /tmp, one file per failed attempt. */
    `trap 'rm -f ${tmpFile} ${phpFile}' EXIT`,
    `cat > ${tmpFile} <<'${heredoc}'`,
    json,
    heredoc,
    `wp post meta update ${postId} _elementor_conditions --format=json < ${tmpFile}`,
    `cat > ${phpFile} <<'${phpHeredoc}'`,
    regenPhp,
    phpHeredoc,
    `wp eval-file ${phpFile}`,
  ].join('\n');
  return wpe(script);
}
