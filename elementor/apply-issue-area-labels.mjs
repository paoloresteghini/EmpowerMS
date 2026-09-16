/* Gravity Form 37, field 8: the three issue-area labels.
 *
 * WHY THIS IS A SCRIPT AND NOT A CLICK IN WP-ADMIN. Gravity Forms data does
 * not live in this repository and does not travel with a deploy: forms are
 * rows in wp_gf_form_meta on whichever install you are pointed at. So this
 * edit has to be made TWICE, once on empv2 now and once on production at
 * cutover, and the second time will be months later by someone who was not
 * here. A script is the only form of this change that can be re-run then, and
 * read then. docs and the vault both record the same thing; this is the
 * executable copy.
 *
 * WHAT IT CHANGES, and what it very deliberately does not. Grant's review,
 * 2026-09-16: "Update the checkboxes in the form at the bottom to use our new
 * labels: Quality Education, Meaningful Work, Safe Communities". So the
 * choice TEXT changes. The choice VALUE does not.
 *
 * THE VALUE IS WHAT THE ENTRIES ARE KEYED ON. Form 37 held 25 entries when
 * this was written, each storing the literal string a visitor ticked. Change
 * the value from "Education" to "Quality Education" and every one of those 25
 * entries now stores a string that matches none of the form's current choices:
 * Gravity Forms' own entry list renders it, but any export, filter or feed
 * that maps entries back to choices stops matching. The text is what a person
 * reads; the value is what the data is. Only the first was asked for.
 *
 * IDEMPOTENT, and it reports rather than assumes: a second run finds the three
 * labels already correct and writes nothing. It also refuses to run if the
 * values have drifted from the three it expects, because that would mean
 * somebody has already changed the thing this script is careful not to.
 *
 *   node elementor/apply-issue-area-labels.mjs           # read the form, change nothing
 *   node elementor/apply-issue-area-labels.mjs --apply
 */
import { pathToFileURL } from 'node:url';
import { wpe } from '../wpe.mjs';

const FORM_ID = 37;
const FIELD_ID = 8;

/* Keyed by the STORED VALUE, which is the part that must not move. The label
   is the part that may. */
export const LABELS = {
  Education: 'Quality Education',
  Work: 'Meaningful Work',
  Justice: 'Safe Communities',
};

/* wp eval, not wp db query: GFAPI::update_form() maintains whatever Gravity
   Forms keeps alongside display_meta, and a hand-written UPDATE against the
   serialised column would not. */
const readChoices = () =>
  `wp eval 'if(!class_exists("GFAPI")){echo "NO_GFAPI";return;} $f=GFAPI::get_form(${FORM_ID}); if(!$f){echo "NO_FORM";return;} foreach($f["fields"] as $fl){ if($fl->id==${FIELD_ID}){ echo json_encode($fl->choices); return; } } echo "NO_FIELD";'`;

/* BASE64, AND THE FIRST DRAFT PROVED WHY. The map is JSON, JSON is full of
   double quotes, and the PHP that reads it is already inside single quotes
   inside a remote bash command. Interpolating the JSON there produced

       bash: line 2: syntax error near unexpected token `)'

   and wrote nothing, which at least failed safely. deploy-seo.mjs solved the
   same problem for the same reason and its note says it plainly: a base64 blob
   is [A-Za-z0-9+/=] and cannot be mangled by node, ssh, bash or PHP. It is
   decoded once, inside PHP, where the quotes are harmless.

   The labels themselves are ordinary words today, but "Mississippi's" is one
   client edit away and this repository has lost time to quoting twice already. */
const writeLabels = () => {
  const map = Buffer.from(JSON.stringify(LABELS), 'utf8').toString('base64');
  const php = [
    `$map=json_decode(base64_decode("${map}"), true);`,
    `$f=GFAPI::get_form(${FORM_ID}); $n=0;`,
    `foreach($f["fields"] as $fl){ if($fl->id==${FIELD_ID}){`,
    `$cs=$fl->choices;`,
    `foreach($cs as $i=>$c){ if(isset($map[$c["value"]]) && $c["text"]!==$map[$c["value"]]){ $cs[$i]["text"]=$map[$c["value"]]; $n++; } }`,
    `$fl->choices=$cs; } }`,
    `$r=GFAPI::update_form($f);`,
    `echo is_wp_error($r) ? "ERROR: ".$r->get_error_message() : "updated ".$n;`,
  ].join(' ');
  return `wp eval '${php}'`;
};

export function parseArgs(argv) {
  return argv.includes('--apply') ? { mode: 'apply' } : { mode: 'explain' };
}

export async function main(argv = process.argv.slice(2), run = wpe) {
  const raw = (await run(readChoices())).trim();
  if (!raw.startsWith('[')) {
    throw new Error(`form ${FORM_ID} field ${FIELD_ID}: expected choices, got ${JSON.stringify(raw)}`);
  }
  const choices = JSON.parse(raw);

  const values = choices.map((c) => c.value);
  const expected = Object.keys(LABELS);
  if (values.length !== expected.length || values.some((v) => !(v in LABELS))) {
    throw new Error(
      `form ${FORM_ID} field ${FIELD_ID} stores ${JSON.stringify(values)}, not ${JSON.stringify(expected)}. `
      + 'The stored values are what the existing entries are keyed on; this script will not write over a '
      + 'form whose values somebody has already changed.'
    );
  }

  const stale = choices.filter((c) => c.text !== LABELS[c.value]);
  for (const c of choices) {
    console.log(`  ${c.value.padEnd(10)} label "${c.text}"${c.text === LABELS[c.value] ? '' : ` -> "${LABELS[c.value]}"`}`);
  }

  if (!stale.length) {
    console.log(`\nAll ${choices.length} labels are already current. Nothing written.`);
    return 0;
  }
  if (parseArgs(argv).mode !== 'apply') {
    console.log(`\n${stale.length} label(s) to change. Nothing is written without --apply.`);
    return 1;
  }

  console.log(`\nwriting ${stale.length} label(s)...`);
  console.log((await run(writeLabels())).trim());

  /* Read back rather than trust the write. GFAPI::update_form() returns true
     for a form it saved, which is not the same claim as "the three labels on
     the page a visitor loads are now these three". */
  const after = JSON.parse((await run(readChoices())).trim());
  const wrong = after.filter((c) => c.text !== LABELS[c.value]);
  if (wrong.length) {
    throw new Error(`after the write, ${wrong.length} label(s) still read ${JSON.stringify(wrong.map((c) => c.text))}`);
  }
  const moved = after.filter((c) => !(c.value in LABELS));
  if (moved.length) {
    throw new Error(`the write moved a stored VALUE, which it must never do: ${JSON.stringify(moved)}`);
  }
  console.log('Read back: three labels current, three values unchanged.');
  console.log('\nVERIFY ON THE PAGE, not in the API:');
  console.log('  curl -s https://empv2.wpenginepowered.com/ambassadors/ | grep -o \'id="choice_37_8_[0-9]"[^>]*\' ');
  console.log('  curl -s https://empv2.wpenginepowered.com/ambassadors/ | grep -o \'>Quality Education<\\|>Meaningful Work<\\|>Safe Communities<\'');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => process.exit(code ?? 0));
}
