import { container, text, html } from '../../factory.mjs';

/* Source of truth: dist/team-a.html, the <section class="ta-fellows"> block
   (lines 292-328). Every class, string and attribute below is read from
   that file, not typed from memory.

   Structural decisions:

   1. `.ta-ledger` (a <ul> of five <li>, each carrying three plain <span>s)
      IS ONE html() WIDGET, the task brief's own explicit instruction for
      this exact list: `css/team-a.css:227`'s
      `.ta-ledger__row:last-child{border-bottom:1px solid var(--border
      -inverse)}` needs the real `<ul>`/`<li>` tree to keep working, and
      nothing inside any row needs to be a widget (no images, no dynamic
      content, just three spans: a placeholder `.ta-disc` monogram, a
      name, a field). Built this way, no widget wrapper falls between
      `.ta-ledger` and its rows, so `:last-child` matches the fifth row
      exactly as it does in the static build and needs no bridge rule.

      Checked before choosing, per the brief's own warning about the
      alternative: built as a container tree instead, each `<li>` would
      become the only child of its own wrapper, so EVERY row would be
      `:last-child`, not only the fifth, and every row would take the
      bottom border. That is the LOUD half of the recipe's own asymmetry
      (over-matching, a visible defect), unlike solutions-b's
      `.sb-hero__lede` or capitol-a's `.cca-about__claim`, which were the
      silent half. Avoided entirely by building the list correctly rather
      than by writing a rule to repair it afterwards.

      No cssClass passed to html(): the real class sits on the `<ul>` tag
      directly in the markup string, matching the same choice this page's
      own roster (02-staff.mjs) and every earlier `.da-years`/`.tl-line`
      -shaped html() call makes.

   2. THE HEADING IS A text() WIDGET CARRYING A BARE <h2>, never heading().
      No `heading()` import above.

   3. `.ta-fellows__slab` HOLDS THE HEADING'S OWN WRAPPER
      (`.ta-fellows__head`) AND THE LEDGER AS TWO DIRECT CHILDREN, matching
      source exactly: `<div class="ta-fellows__slab" data-reveal-group>`
      contains `<div class="ta-fellows__head">` (the h2 alone, no note or
      pending paragraph in this section, unlike the staff section) and
      `<ul class="ta-ledger">` as siblings. */

const HEADLINE = 'Contributing Fellows';

const FELLOWS = [
  { initials: 'JR', name: 'J. Robertson', field: 'Fellow on Criminal Justice Reform' },
  { initials: 'CK', name: 'Christopher Koopman', field: 'Fellow on Regulation &amp; Innovation' },
  { initials: 'CN', name: 'Conor Norris', field: 'Fellow on Entrepreneurship' },
  { initials: 'ML', name: 'Matt Ladner', field: 'Fellow on Education' },
  { initials: 'RS', name: 'Rebekah Staples', field: 'Fellow on Work' },
];

const ledgerRow = (f) => `        <li class="ta-ledger__row" data-reveal="rise">
          <span class="ta-disc" data-placeholder="headshot" aria-hidden="true">${f.initials}</span>
          <span class="ta-ledger__name">${f.name}</span>
          <span class="ta-ledger__field">${f.field}</span>
        </li>`;

const LEDGER = `<ul class="ta-ledger">
${FELLOWS.map(ledgerRow).join('\n')}
      </ul>`;

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'ta-fellows',
      content_width: 'full',
      _attributes: 'aria-labelledby|fellows-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'ta-fellows__slab', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            container({ cssClass: 'ta-fellows__head', content_width: 'full' }, [
              text({
                markup: `<h2 id="fellows-title">${HEADLINE}</h2>`,
                _attributes: 'data-reveal|rise',
              }),
            ]),
            html({ markup: LEDGER }),
          ],
        ),
      ]),
    ],
  );
}
