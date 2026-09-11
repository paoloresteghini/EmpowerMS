/* Switches on dynamic population for the two fields the /donate/ tiles fill.
 *
 * WHAT THIS IS FOR. The gift panel at the top of /donate/ carries the donor's
 * two answers into Empower's own form in the query string, and the panel says
 * so out loud: "Nothing to fill in twice." Gravity Forms only reads a field
 * from the URL when that field has "Allow field to be populated dynamically"
 * ticked AND a parameter name set. On 2026-08-12 six plausible names were
 * tested against the live form and none of them populated anything, because
 * the setting has never been on. This turns it on.
 *
 * TWO FIELDS, AND ONLY TWO:
 *
 *     field 7  radio    Select Gift Type    <- gift_type
 *     field 4  product  One Time Gift       <- amount   (free-entry price)
 *
 * Fields 5 and 6 are the MONTHLY and ANNUAL ladders. They are radios with
 * their own figures ($15/$25/$50/$100 and $100/$250/$500/$1,000), so a typed
 * amount cannot select one of their choices. Giving them a parameter name
 * would populate nothing while looking as though it should, which is why this
 * script asserts they have none rather than ignoring them.
 *
 * IT DOES NOT TOUCH THE CHOICE VALUES. "One Time Gift" and friends are what 96
 * entries already store and what three active Stripe feeds condition on.
 * Translating our URL slugs into those exact strings is the child theme's job:
 * wp/empowerms-child/inc/donate-prepopulate.php. This script writes two
 * properties and nothing else.
 *
 * WHY IT IS A SCRIPT AND NOT A NOTE SAYING "TICK TWO BOXES". The setting lives
 * in the database, in form 4's display_meta, so it does not travel with this
 * repository and it does not survive being pointed at a different install. At
 * production cutover it has to run again, against production, or every tile on
 * /donate/ silently stops working. It is listed in
 * docs/staging-to-prod-database.md with the other scripts that have to.
 *
 * IDEMPOTENT, and re-running is the way to verify: a second run reports every
 * field as `already`.
 *
 *   node elementor/apply-donate-prepopulate.mjs           # report, change nothing
 *   node elementor/apply-donate-prepopulate.mjs --apply   # write the two properties
 *   node elementor/apply-donate-prepopulate.mjs --remove  # undo exactly this
 */
import { pathToFileURL } from 'node:url';
import { wpe, stripNotices } from '../wpe.mjs';

export const FORM_ID = 4;

/* THE SUBMIT BUTTON'S LABEL, which is a form property like the two below and is
   here for the same reason: it lives in the database and does not travel with
   this repository.

   Gravity Forms ships "Submit" and form 4 still had it. That was survivable
   while give-c's hero carried a Donate Today button of its own; on 2026-09-11
   the gift panel was removed and this became the only action on the page, and
   "Submit" is the weakest word available for the moment someone gives money.

   IT IS ALSO WHAT KEEPS THE ROADMAP'S TWO BUTTONS. The roadmap gives this page
   two "Donate Today" buttons: the hero's and the closing plate's. The hero's
   went with the panel, and this is what replaces it, on the element that
   actually takes the gift rather than on a link to it. bridge.css already
   fills it orange, so it is also the page's one orange action. */
export const BUTTON_TEXT = 'Donate Today';

/* Field id -> the parameter name it should answer to. The comment beside each
   is the field's own label on the form, so a mismatch is visible in the report
   rather than only in the diff. */
export const WANTED = {
  7: 'gift_type', // Select Gift Type (radio)
  4: 'amount',    // One Time Gift (price, free entry)
};

/* Fields that must NOT gain a parameter name, with the reason, asserted on
   every run. The monthly and annual ladders are the two places where a
   well-meaning "make amount work everywhere" edit does nothing visible. */
export const FORBIDDEN = {
  5: 'the monthly ladder is a radio ($15/$25/$50/$100); a typed amount cannot select a choice',
  6: 'the annual ladder is a radio ($100/$250/$500/$1,000); a typed amount cannot select a choice',
};

/* One call, because this install charges tens of seconds for any wp-cli
   invocation. Pipe-separated rather than JSON: a field label can carry a
   comma or a quote, and none of them can carry a pipe. */
export async function readFields(run = wpe) {
  const raw = stripNotices(await run(`wp eval '
    $f = GFAPI::get_form(${FORM_ID});
    if (!$f) { echo "NOFORM"; exit; }
    echo "BUTTON|".(isset($f["button"]["text"]) ? $f["button"]["text"] : "")."\\n";
    foreach ($f["fields"] as $fl) {
      echo $fl->id."|".$fl->type."|".(!empty($fl->allowsPrepopulate) ? "1" : "0")
        ."|".(isset($fl->inputName) ? $fl->inputName : "")."|".$fl->label."\\n";
    }
  '`));
  if (raw.includes('NOFORM')) {
    throw new Error(`form ${FORM_ID} does not exist on this install. Check you are pointed at the right one.`);
  }
  const fields = new Map();
  for (const line of raw.split('\n').map((s) => s.trim()).filter(Boolean)) {
    const [id, type, prepop, name, ...rest] = line.split('|');
    /* The button rides in on the same read rather than costing a second call:
       this install charges tens of seconds for any wp-cli invocation. */
    if (id === 'BUTTON') { fields.set('button', { text: type ?? '' }); continue; }
    fields.set(Number(id), { type, prepop: prepop === '1', name: name ?? '', label: rest.join('|') });
  }
  return fields;
}

/* What each wanted field needs, as one of three verdicts. Exported so a test
   can drive it with a plain object instead of an install. */
export function planFor(fields) {
  const steps = [];
  for (const [id, name] of Object.entries(WANTED)) {
    const field = fields.get(Number(id));
    if (!field) {
      steps.push({ id: Number(id), name, kind: 'missing' });
      continue;
    }
    const done = field.prepop && field.name === name;
    steps.push({ id: Number(id), name, kind: done ? 'already' : 'set', field });
  }
  return steps;
}

/* The write. GFAPI::update_form replaces the whole form, so the object is read,
   two properties on two fields are changed, and it goes back: nothing else in
   display_meta is retyped or reordered by us.

   DOUBLE QUOTES INSIDE THE PHP, NOT SINGLE. wpe() pipes this over stdin as a
   shell script and the whole `wp eval` body is inside single quotes, so a
   single quote in the PHP closes it and the remote shell fails with a bare
   "SSH failed with exit code 1" that says nothing about quoting. The parameter
   names are our own literals, so there is nothing here to interpolate. */
function writeScript(pairs, buttonText) {
  const assignments = pairs.map(([id, name]) => `
      if ($fl->id == ${id}) {
        $fl->allowsPrepopulate = ${name === null ? 'false' : 'true'};
        $fl->inputName = ${name === null ? '""' : `"${name}"`};
        $touched++;
      }`).join('');
  /* The button is set on the form rather than on a field, so it sits outside
     the loop. `null` leaves it alone, which is what --remove wants: undoing our
     parameter names should not also hand the page back a button reading
     "Submit" unless that is asked for separately. */
  const button = buttonText === null ? '' : `
    $f["button"]["type"] = "text";
    $f["button"]["text"] = "${buttonText}";
    $touched++;`;
  return `wp eval '
    $f = GFAPI::get_form(${FORM_ID});
    if (!$f) { echo "NOFORM"; exit; }
    $touched = 0;
    foreach ($f["fields"] as $fl) {${assignments}
    }${button}
    $r = GFAPI::update_form($f);
    echo is_wp_error($r) ? ("ERROR: ".$r->get_error_message()) : ("OK ".$touched);
  '`;
}

export async function main(argv = process.argv.slice(2), run = wpe) {
  const fields = await readFields(run);

  /* The guard runs first and on every invocation, including the dry run: if
     fields 5 or 6 have acquired a parameter name since, that is worth knowing
     before anything else is written. */
  const wrong = [];
  for (const [id, why] of Object.entries(FORBIDDEN)) {
    const field = fields.get(Number(id));
    if (field && field.name) wrong.push(`  field ${id} (${field.label}) answers to "${field.name}": ${why}`);
  }
  if (wrong.length) {
    throw new Error(`form ${FORM_ID} has parameter names on fields that cannot use them:\n${wrong.join('\n')}`);
  }

  const steps = planFor(fields);
  const button = fields.get('button');
  const buttonWrong = !button || button.text !== BUTTON_TEXT;
  const missing = steps.filter((s) => s.kind === 'missing');
  if (missing.length) {
    throw new Error(`form ${FORM_ID} is missing field(s) ${missing.map((s) => s.id).join(', ')}. `
      + 'The form has been restructured and this script no longer knows it.');
  }

  console.log(`Form ${FORM_ID} on this install:`);
  for (const s of steps) {
    const state = s.field.prepop ? `prepopulate on, name "${s.field.name || '(none)'}"` : 'prepopulate off';
    console.log(`  field ${String(s.id).padEnd(2)} ${s.field.label.padEnd(18)} ${state}`);
  }
  console.log(`  submit button    reads "${button ? button.text : '(unreadable)'}"`);

  if (argv.includes('--remove')) {
    const out = stripNotices(await run(writeScript(Object.keys(WANTED).map((id) => [id, null]), null)));
    console.log(`\n${out}`);
    console.log('Both fields are back to not being populated from the URL. Every tile on /donate/ now');
    console.log('lands on an empty form, which is the state this script exists to end.');
    return;
  }

  const todo = steps.filter((s) => s.kind === 'set');
  if (!argv.includes('--apply')) {
    console.log(`\n${todo.length + (buttonWrong ? 1 : 0)} change(s) would be made. Nothing is written without --apply.`);
    for (const s of todo) console.log(`  field ${s.id} -> ${s.name}`);
    if (buttonWrong) console.log(`  submit button -> "${BUTTON_TEXT}"`);
    return;
  }
  if (!todo.length && !buttonWrong) {
    console.log('\nNothing to do: both fields carry their parameter name and the button reads correctly.');
    return;
  }

  const out = stripNotices(await run(writeScript(todo.map((s) => [s.id, s.name]), buttonWrong ? BUTTON_TEXT : null)));
  if (!out.startsWith('OK')) throw new Error(`the write did not report success: ${out}`);
  console.log(`\n${out}. Re-run without --apply to confirm; both fields should read "prepopulate on".`);
  console.log('This lives in the DATABASE. It must be run against production at cutover, or every');
  console.log('tile on /donate/ silently stops filling the form in. See docs/staging-to-prod-database.md.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
