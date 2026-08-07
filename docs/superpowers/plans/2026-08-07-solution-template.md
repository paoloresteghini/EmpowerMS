# One Solution Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Public Safety B "The Streetlight" into a single solution-page template used by Quality Education, Meaningful Work and Public Safety, with its numbered section redrawn as capped columns, and drop the Topic filter from The Studio and The Dome.

**Architecture:** There is no templating engine. `build.mjs` resolves `<!--@include path-->` against static files only. A "template" here therefore means one shared stylesheet (`css/solution.css`) and one shared namespace (`sol-`), with three page directories whose seven section files use identical classes and differ only in copy.

**Tech Stack:** Plain HTML, CSS and ES modules. No dependencies. `build.mjs` assembles `dist/`, `pages.mjs` assembles `_site/` for GitHub Pages, `test.mjs` is a `node:test` suite of string assertions over built output.

## Global Constraints

- **No em dashes in anything you write:** code, comments, copy, commit messages. Use commas, colons, parentheses or separate sentences. Hyphens in compound words and ranges are fine. The one exception is the `<title>` of a new page, which keeps the em dash the other 30 page titles already use.
- **Roadmap copy is verbatim.** Source is `docs/Empower Mississippi Design System/uploads/Empower Mississippi Website Refresh Roadmap.pdf`. Extract with `pdftotext -layout`. The "Current Content" block that follows each tab is the live site's existing copy and is NOT the source.
- **Roadmap section titles are not printed.** "The Vision", "The Problem - Why This Work Matters" and similar are document scaffolding, not page copy.
- **Work-area labels are typed in sentence case and uppercased in CSS**, so the copy assertions match the roadmap string.
- **One orange filled button per page.** Everything else is outlined or tertiary. Enforced by an existing sweep in `test.mjs`.
- **Small orange text on light uses `--em-orange-ink`; orange on navy uses `--orange-300`; white-on-orange uses `--orange-700`.** The raw brand orange fails contrast at label sizes.
- **Nothing carrying `data-reveal` may declare its own `transition`.** `css/motion.css` sets `transition` on `[data-reveal]` at specificity (0,2,0) and would silently replace it. Put any element with its own timing INSIDE the revealed element.
- **No new scripts.** Reveals and filters use the existing layer.
- **Every feed headline is an `<a>` whose href is the post it names.** This is what makes an invented headline impossible to ship.
- Run the suite with `node --test test.mjs`. A single test: `node --test --test-name-pattern="<name>" test.mjs`.
- Rebuild with `node build.mjs` before asserting on anything in `dist/`.

---

### Task 1: Rename the Streetlight namespace to `sol-`

Mechanical rename with no visual change. Doing it first means every later task edits one namespace instead of two.

**Files:**
- Create: `css/solution.css` (from `css/safety-b.css`)
- Create: `src/safety/index.html`, `src/safety/sections/01-hero.html` through `07-latest.html` (from `src/safety-b/`)
- Delete: `css/safety-b.css`, `src/safety-b/`
- Modify: `build.mjs:89` (the safety-b registry line)
- Modify: `test.mjs` (every `psb-` occurrence, `SIGNATURE` maps, `DETAILPAGES`)
- Test: `test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: the `sol-` namespace and `dist/safety.html`. Every later task uses these class names: `sol-hero`, `sol-vision`, `sol-problem`, `sol-steps` (renamed in Task 2), `sol-grid`, `sol-lit`, `sol-stories`, `sol-latest`, plus `sol-eyebrow`, `sol-lede`, `sol-turn`, `sol-feed`, `sol-stub`.

- [ ] **Step 1: Copy the directory and stylesheet under their new names**

```bash
cd /Users/paolo/Code/EmpowerMS
git mv src/safety-b src/safety
git mv css/safety-b.css css/solution.css
```

- [ ] **Step 2: Rewrite the namespace across the moved files**

```bash
# psb- is unique to these files, so a blind replace is safe here.
perl -pi -e 's/\bpsb-/sol-/g' css/solution.css src/safety/index.html src/safety/sections/*.html
# The stylesheet link inside the page shell.
perl -pi -e 's{css/safety-b\.css}{css/solution.css}' src/safety/index.html
# The include paths inside the page shell.
perl -pi -e 's{safety-b/sections/}{safety/sections/}g' src/safety/index.html
grep -rc 'psb-' css/solution.css src/safety/ || echo "no psb- left"
```

- [ ] **Step 3: Point the build registry at the new page**

In `build.mjs`, replace the `safety-b` line:

```js
  { src: 'safety-b/index.html', out: 'dist/safety-b.html', title: 'Public Safety B — The Streetlight', kind: 'about' },
```

with:

```js
  /* Public Safety, built on the shared solution template. Empower chose "The
     Streetlight" on 2026-08-07 and asked for one template across all three
     solution pages, so this page, work and education are the same blocks in
     the same order with different copy. They share css/solution.css; the
     unpicked readings keep their own stylesheets. */
  { src: 'safety/index.html', out: 'dist/safety.html', title: 'Public Safety', kind: 'about' },
```

- [ ] **Step 4: Update the tests that name the old page or namespace**

```bash
perl -pi -e "s/\bpsb-/sol-/g; s{dist/safety-b\.html}{dist/safety.html}g; s{'safety-b'}{'safety'}g; s{safety-b\.css}{solution.css}g" test.mjs
grep -n 'safety-b\|psb-' test.mjs || echo "no safety-b or psb- left in test.mjs"
```

- [ ] **Step 5: Build and run the suite**

Run: `node build.mjs && node --test test.mjs`
Expected: PASS, and `dist/safety.html` exists while `dist/safety-b.html` does not.

If a `SIGNATURE` assertion fails because it expects `dist/safety-b.html`, fix the key rather than deleting the assertion: the page still has a signature at this point, it has only been renamed.

- [ ] **Step 6: Confirm the page is visually unchanged**

Run: `node dev.mjs` in one shell, then load `http://localhost:8000/dist/safety.html`.
Expected: identical to the old `safety-b.html`. This step is a rename with no design change, so any visual difference is a missed selector.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: rename the Streetlight namespace to sol- ahead of the template

Empower chose Streetlight as the single template for all three solution
pages, so its namespace stops being page-specific. Pure rename: no markup,
copy or design changes."
```

---

### Task 2: Redraw section 4 as capped columns

**Files:**
- Modify: `src/safety/sections/04-solutions.html`
- Modify: `css/solution.css`
- Test: `test.mjs`

**Interfaces:**
- Consumes: the `sol-` namespace from Task 1.
- Produces: the `sol-caps` block, used verbatim by Tasks 3 and 4. Its markup contract is: `section.sol-caps` > `div.em-container` > `h2.sol-caps__head` and `ol.sol-caps__grid` > `li.sol-cap` > `p.sol-cap__title` + `div.sol-cap__body` > `p`.

- [ ] **Step 1: Write the failing test**

Add to `test.mjs`, immediately after the existing solution-detail tests:

```js
test('the solutions section is capped columns, not numbered rows', () => {
  /* Empower asked on 2026-08-07 for the numbered section to be drawn with the
     capped-column layout from Public Safety A. The numerals go entirely: a
     digit kept in the cap reads as not having made the change. The cap carries
     the solution title, because Practical Solutions has no eyebrow label and
     no "What We're Working Toward" line, so the four-part column from section
     5 collapses to two parts here. */
  for (const out of ['dist/safety.html']) {
    const html = readFileSync(out, 'utf8');
    const markup = html.replace(/<!--[\s\S]*?-->/g, '');

    assert.match(markup, /<section class="sol-caps"/, `${out} has no capped-column solutions section`);
    assert.doesNotMatch(markup, /sol-steps|sol-step__disc/,
      `${out} still carries the numbered-row solutions block`);

    const caps = [...markup.matchAll(/<p class="sol-cap__title">([^<]+)<\/p>/g)].map(m => m[1]);
    assert.equal(caps.length, 4, `${out} has ${caps.length} solution caps, expected four`);
    for (const c of caps) {
      assert.doesNotMatch(c, /^\s*\d/, `${out} has a numeral in a cap: "${c}"`);
    }

    /* Every cap needs a body, or a column is a heading over nothing. */
    const bodies = (markup.match(/<div class="sol-cap__body">/g) || []).length;
    assert.equal(bodies, 4, `${out} has ${bodies} cap bodies for ${caps.length} caps`);
  }

  /* The caps must share a row so their bottoms line up. A column each would
     let the four rag against one another, which is the fault the layout
     exists to avoid. */
  const css = readFileSync('css/solution.css', 'utf8');
  assert.match(css, /\.sol-caps__grid\{[^}]*grid-template-columns:repeat\(4,/,
    'css/solution.css does not lay the caps out as four columns');
  assert.match(css, /\.sol-cap\{[^}]*display:flex[^}]*flex-direction:column/,
    'css/solution.css does not stretch the cap bodies to a common height');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test --test-name-pattern="capped columns, not numbered rows" test.mjs`
Expected: FAIL with "has no capped-column solutions section".

- [ ] **Step 3: Replace the section markup**

Overwrite `src/safety/sections/04-solutions.html`:

```html
<!-- Four capped columns, the layout Empower picked out of Public Safety A on
     2026-08-07. It replaces four numbered rows that left half of every row
     empty.

     The cap carries the SOLUTION TITLE, not a numeral and not a label: this
     copy has neither an eyebrow nor a "What We're Working Toward" line, so the
     four-part column from section 5 collapses to two parts. The numerals are
     gone from the build; Empower asked to move away from that treatment. -->
<section class="sol-caps" aria-labelledby="solutions-title">
  <div class="em-container">
    <h2 class="sol-caps__head" id="solutions-title" data-reveal="rise">Practical Solutions for a Safer Mississippi</h2>

    <ol class="sol-caps__grid" data-reveal-group>
      <li class="sol-cap" data-reveal="rise">
        <p class="sol-cap__title">Understand What Drives Crime</p>
        <div class="sol-cap__body">
          <p>Use research and real-world data to better understand crime and identify solutions that improve public safety.</p>
        </div>
      </li>
      <li class="sol-cap" data-reveal="rise">
        <p class="sol-cap__title">Support Effective Public Safety</p>
        <div class="sol-cap__body">
          <p>Work alongside law enforcement and community leaders to advance strategies that prevent crime and keep communities safe.</p>
        </div>
      </li>
      <li class="sol-cap" data-reveal="rise">
        <p class="sol-cap__title">Strengthen Justice and Accountability</p>
        <div class="sol-cap__body">
          <p>Promote a justice system that protects the public, ensures fairness, and holds people accountable.</p>
        </div>
      </li>
      <li class="sol-cap" data-reveal="rise">
        <p class="sol-cap__title">Create Pathways to a Better Future</p>
        <div class="sol-cap__body">
          <p>Help people successfully reenter their communities, find meaningful work, and build stable lives after serving their sentence.</p>
        </div>
      </li>
    </ol>
  </div>
</section>
```

- [ ] **Step 4: Replace the section CSS**

In `css/solution.css`, find the block beginning `.sol-steps{` and ending at the last `.sol-step` rule (including any media queries that name `.sol-steps` or `.sol-step`) and replace the whole run with:

```css
/* ====================== 4 · Practical solutions ========================== */

/* Four capped columns. The 1px grid gap over a tinted background draws the
   hairlines between posts as the gap itself, so there is no double rule to
   undo at the wrap points. */
.sol-caps{padding:clamp(var(--space-12),7vw,var(--space-14)) 0;
  background:var(--surface-page)}

.sol-caps__head{margin:0 0 clamp(var(--space-9),5vw,var(--space-11));
  max-width:24ch;
  font-family:var(--font-display);font-weight:var(--fw-black);
  font-size:clamp(1.75rem,1.1rem + 2vw,2.75rem);line-height:1.05;
  letter-spacing:-.03em;color:var(--text-strong)}

.sol-caps__grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));
  gap:1px;background:var(--border-subtle);
  list-style:none;margin:0;padding:0}

/* Equal height whatever the copy length: the cap is a fixed block at the top
   and the body stretches, so the four bottoms line up. */
.sol-cap{display:flex;flex-direction:column;background:var(--surface-page)}

.sol-cap__title{margin:0;padding:var(--space-5) var(--space-6);
  background:var(--surface-navy);color:var(--white);
  font-family:var(--font-display);font-weight:var(--fw-bold);
  font-size:var(--fs-caption);letter-spacing:var(--ls-caps);
  text-transform:uppercase;line-height:1.3}

.sol-cap__body{display:flex;flex-direction:column;flex:1;
  gap:var(--space-5);padding:clamp(var(--space-6),2.4vw,var(--space-7))}
.sol-cap__body p{margin:0;font-size:var(--fs-small);line-height:var(--lh-body);
  color:var(--text-body)}

@media (max-width:1100px){
  .sol-caps__grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:620px){
  .sol-caps__grid{grid-template-columns:minmax(0,1fr)}
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node build.mjs && node --test --test-name-pattern="capped columns, not numbered rows" test.mjs`
Expected: PASS.

- [ ] **Step 6: Run the whole suite**

Run: `node --test test.mjs`
Expected: PASS. If a copy assertion fails, the four solution sentences must still be present verbatim; the wrapper changed, the words did not.

- [ ] **Step 7: Look at it**

Load `http://localhost:8000/dist/safety.html`. Check at 1440px and 390px:
- The four caps are the same height as each other and the four bodies line up along the bottom.
- The caps read as caps, not as four separate headings.
- The light 4-across block sits above the dark 2x2 work areas without the two reading as the same grid twice.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: draw the solutions section as capped columns

Empower asked for the numbered rows to use the capped-column layout from
Public Safety A. The cap carries the solution title, because this copy has no
eyebrow label and no commitment line. The numerals are gone from the build."
```

---

### Task 3: Build the Meaningful Work page from the template

**Files:**
- Create: `src/work/index.html`, `src/work/sections/01-hero.html` through `07-latest.html`
- Modify: `build.mjs` (add the registry line)
- Test: `test.mjs`

**Interfaces:**
- Consumes: `css/solution.css` and every `sol-` class from Tasks 1 and 2.
- Produces: `dist/work.html`. Adds no new classes.

Copy source: roadmap PDF lines 942 to 1100. Meaningful Work has **five** work areas in section 5, against Safety's four.

- [ ] **Step 1: Write the failing test**

Add to `test.mjs`:

```js
test('all three solution pages are the same template', () => {
  /* The point of the 2026-08-07 decision: one set of blocks, three sets of
     copy. Asserted as shared structure, which is the opposite of the
     SIGNATURE check the six independent readings used to carry. */
  const PAGES = ['dist/education.html', 'dist/work.html', 'dist/safety.html'];
  const BLOCKS = ['sol-hero', 'sol-vision', 'sol-problem', 'sol-caps',
                  'sol-grid', 'sol-stories', 'sol-latest'];

  for (const out of PAGES) {
    const html = readFileSync(out, 'utf8');
    for (const b of BLOCKS) {
      assert.match(html, new RegExp(`class="${b}[ "]`), `${out} is missing the ${b} block`);
    }
    assert.match(html, /href="\.\.\/css\/solution\.css"/,
      `${out} does not link the shared solution stylesheet`);
    /* No page may carry a rejected reading's namespace. */
    assert.doesNotMatch(html, /class="(psa|psb|wra|wrb|wkc|sfc)-/,
      `${out} still carries a namespace from a reading Empower did not choose`);
  }
});

test('each solution page carries the right number of work areas', () => {
  /* The one axis the template flexes on. Safety and Education have four work
     areas, Meaningful Work has five, and Education alone closes the section
     with a statement. Counted so a copy-paste between pages cannot silently
     give a page the wrong set. */
  const EXPECTED = {
    'dist/education.html': 4,
    'dist/work.html': 5,
    'dist/safety.html': 4,
  };
  for (const [out, n] of Object.entries(EXPECTED)) {
    const html = readFileSync(out, 'utf8');
    const areas = (html.match(/<li class="sol-lit"/g) || []).length;
    assert.equal(areas, n, `${out} has ${areas} work areas, expected ${n}`);
    const toward = (html.match(/What We’re Working Toward:/g) || []).length;
    assert.equal(toward, n, `${out} has ${toward} commitment lines for ${areas} work areas`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test --test-name-pattern="same template" test.mjs`
Expected: FAIL, `dist/education.html` and `dist/work.html` do not exist.

- [ ] **Step 3: Extract the Meaningful Work copy**

```bash
pdftotext -layout "docs/Empower Mississippi Design System/uploads/Empower Mississippi Website Refresh Roadmap.pdf" /tmp/roadmap.txt
sed -n '942,1100p' /tmp/roadmap.txt
```

Read it before writing any markup. The five work-area labels are Understanding Barriers to Work, Pathways to Work, Occupational Licensing, Public Assistance and Work, and Employer Engagement; confirm against the extract rather than trusting this list.

- [ ] **Step 4: Create the page shell**

Create `src/work/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Meaningful Work — Empower Mississippi</title>
<meta name="description" content="Every Mississippian deserves the opportunity to build a career. How Empower Mississippi is opening more pathways to meaningful work.">
<link rel="preload" as="font" type="font/woff2" crossorigin href="../assets/fonts/figtree-800.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="../assets/fonts/source-sans-3-400.woff2">
<link rel="stylesheet" href="../tokens/fonts.css">
<link rel="stylesheet" href="../tokens/colors.css">
<link rel="stylesheet" href="../tokens/typography.css">
<link rel="stylesheet" href="../tokens/spacing.css">
<link rel="stylesheet" href="../tokens/radius.css">
<link rel="stylesheet" href="../tokens/elevation.css">
<link rel="stylesheet" href="../tokens/motion.css">
<link rel="stylesheet" href="../tokens/base.css">
<link rel="stylesheet" href="../components/components.css">
<link rel="stylesheet" href="../css/site.css">
<link rel="stylesheet" href="../css/header-2.css">
<link rel="stylesheet" href="../css/motion.css">
<link rel="stylesheet" href="../css/solution.css">
</head>
<body>

<!--@include _shared/header-2.html-->
<main id="main">
<!--@include work/sections/01-hero.html-->
<!--@include work/sections/02-vision.html-->
<!--@include work/sections/03-problem.html-->
<!--@include work/sections/04-solutions.html-->
<!--@include work/sections/05-work.html-->
<!--@include work/sections/06-stories.html-->
<!--@include work/sections/07-latest.html-->
</main>
<!--@include _shared/footer.html-->

<script type="module" src="../js/nav.js"></script>
<script type="module" src="../js/reveal.js"></script>
<script type="module" src="../js/dropdown.js"></script>
</body>
</html>
```

- [ ] **Step 5: Create the seven section files**

Copy each file from `src/safety/sections/` and replace the copy with Meaningful Work's, keeping every class name identical:

```bash
mkdir -p src/work/sections
cp src/safety/sections/*.html src/work/sections/
```

Then edit each one. Rules that must hold:
- Section 4 keeps exactly four `sol-cap` items.
- Section 5 grows to **five** `sol-lit` items.
- Section 6 uses the three Work community stories already live on `dist/work-b.html`: "State removes regulation. Entrepreneur follows her dreams." (August 22, 2022), "Serving their local communities" (August 9, 2022), "Home-based business provides new career for entrepreneur" (February 21, 2022). Copy the `<a href>` values across so every headline still links to its post.
- Section 7 uses the four workforce articles already live on `dist/work-b.html`, with their hrefs and dates.
- The `id` on each section heading stays the same as on the safety page, because `aria-labelledby` points at it.

- [ ] **Step 6: Register the page**

Add to `build.mjs`, directly above the safety line:

```js
  { src: 'work/index.html', out: 'dist/work.html', title: 'Meaningful Work', kind: 'about' },
```

- [ ] **Step 7: Run the work-area count test**

Run: `node build.mjs && node --test --test-name-pattern="right number of work areas" test.mjs`
Expected: still FAIL on `dist/education.html` (Task 4 builds it), PASS on the `dist/work.html` line. Confirm the failure names education and not work.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: build Meaningful Work on the shared solution template

Same seven blocks as Public Safety, same stylesheet, the roadmap's Meaningful
Work copy. Five work areas against Safety's four, which is the one axis the
template flexes on."
```

---

### Task 4: Build the Quality Education page

The only page whose copy has never been through review, and the only one with a closing statement after the work areas.

**Files:**
- Create: `src/education/index.html`, `src/education/sections/01-hero.html` through `07-latest.html`
- Modify: `build.mjs`, `css/solution.css`
- Test: `test.mjs`

**Interfaces:**
- Consumes: everything from Tasks 1 to 3.
- Produces: `dist/education.html` and one new class, `sol-grid__closer`, used only by this page.

Copy source: roadmap PDF lines 625 to 800. Stop at the line "Current Content"; everything after it is the live site's existing copy, not the source.

- [ ] **Step 1: Write the failing test**

Add to `test.mjs`:

```js
test('Quality Education closes its work areas with the roadmap’s statement', () => {
  /* Education's section 5 ends with a statement the other two tabs do not
     have. It is a trailing block, not a fifth work area, so it must not be
     counted as one by the work-area sweep. */
  const html = readFileSync('dist/education.html', 'utf8');
  assert.match(html, /class="sol-grid__closer"/,
    'dist/education.html has no closing block after its work areas');
  assert.ok(html.includes('Real Choice for Every Family'),
    'dist/education.html has lost the closing block’s heading');
  assert.ok(html.includes('We don’t tell families which school to choose. We work to make sure they have a choice.'),
    'dist/education.html has lost the closing block’s final line');

  for (const out of ['dist/work.html', 'dist/safety.html']) {
    assert.doesNotMatch(readFileSync(out, 'utf8'), /class="sol-grid__closer"/,
      `${out} has a closing block, which only Quality Education has`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test --test-name-pattern="closes its work areas" test.mjs`
Expected: FAIL, `dist/education.html` does not exist.

- [ ] **Step 3: Extract and read the Education copy**

```bash
sed -n '625,800p' /tmp/roadmap.txt
```

The four work-area labels are Public School Choice, Private Education & Education Scholarship Accounts, Options for Unique Learning Needs, and Homeschooling & Innovative Education. Each has a subhead the other two tabs do not have ("Limited by Where You Live", "Limited by Cost and Eligibility", "Available to Eligible Students", "Available, but Access Varies"). Map the subhead onto the `<h3>` that Safety uses for its work-area heading.

- [ ] **Step 4: Create the shell and sections**

Create `src/education/index.html` exactly as in Task 3 Step 4, with these substitutions:
- `<title>Quality Education — Empower Mississippi</title>`
- description: `Every child deserves the opportunity to succeed. How Empower Mississippi is expanding education freedom across the state.`
- seven includes pointing at `education/sections/`

Then `mkdir -p src/education/sections && cp src/safety/sections/*.html src/education/sections/` and replace the copy. Section 4's four caps are Expand Educational Options, Empower Parents, Support Educators and Innovation, Prepare Students for Life.

- [ ] **Step 5: Add the closing block markup**

At the end of `src/education/sections/05-work.html`, inside `.em-container` and after the `</ol>`:

```html
      <div class="sol-grid__closer" data-reveal="rise">
        <h3>Real Choice for Every Family</h3>
        <p>Education freedom should mean more than having options on paper.</p>
        <p>A family’s choices shouldn’t be determined by their ZIP code, income, or eligibility for a limited program. We’re working to ensure more Mississippi families have meaningful access to an education that works for their child.</p>
        <p class="sol-grid__closer-line">We don’t tell families which school to choose. We work to make sure they have a choice.</p>
      </div>
```

- [ ] **Step 6: Add the closing block CSS**

Append to the section 5 block in `css/solution.css`:

```css
/* Quality Education alone closes its work areas with a statement. A trailing
   block on the same dark field, not a fifth card: it answers the four above it
   rather than standing beside them. */
.sol-grid__closer{max-width:64ch;
  margin:clamp(var(--space-9),5vw,var(--space-11)) 0 0}
.sol-grid__closer h3{margin:0 0 var(--space-5);
  font-family:var(--font-display);font-weight:var(--fw-black);
  font-size:clamp(1.4rem,1.05rem + 1.2vw,2rem);line-height:1.1;
  letter-spacing:-.02em;color:var(--white)}
.sol-grid__closer p{margin:0 0 var(--space-4);font-size:var(--fs-body);
  line-height:var(--lh-body);color:var(--text-inverse-muted)}
.sol-grid__closer-line{margin-bottom:0;
  font-family:var(--font-display);font-weight:var(--fw-semibold);
  font-size:var(--fs-lead);line-height:1.4;color:var(--orange-300)}
```

- [ ] **Step 7: Find Education's feed content**

Section 6 needs three Education community stories and section 7 needs education-tagged articles, from category 7. Use `curl`, not Python urllib, which gets a 403:

```bash
curl -s "https://empowerms.org/wp-json/wp/v2/posts?categories=9&per_page=40&_fields=title,link,date,categories,excerpt" -o /tmp/stories.json
curl -s "https://empowerms.org/wp-json/wp/v2/posts?categories=7&per_page=40&_fields=title,link,date,excerpt" -o /tmp/edu.json
```

Pick the three most recent Community Stories that also carry category 7, and four education articles and research pieces. Every headline is an `<a>` with the post's own `link` as its href, and carries its published date formatted as "August 22, 2022".

- [ ] **Step 8: Register the page**

Add to `build.mjs`, above the work line:

```js
  { src: 'education/index.html', out: 'dist/education.html', title: 'Quality Education', kind: 'about' },
```

- [ ] **Step 9: Run the tests**

Run: `node build.mjs && node --test test.mjs`
Expected: PASS, including the three tests added in Tasks 2 and 3.

- [ ] **Step 10: Look at all three pages side by side**

Load `dist/education.html`, `dist/work.html` and `dist/safety.html` at 1440px. They must read as one template: same rhythm, same block order, differing only in copy and in the work-area count. Check that Education's closing block reads as an answer to the four cards and not as a fifth one.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: build Quality Education, the third solution page

Completes the set the Solutions landing page routes to. Roadmap copy from the
Quality Education tab, four work areas, and the closing statement that tab
alone carries."
```

---

### Task 5: Record the decisions on the chooser and in the tests

**Files:**
- Modify: `src/chooser.html`
- Modify: `test.mjs` (`UNDECIDED` at :1294, both `SIGNATURE` maps at :1721 and :1951, `DETAILPAGES`)
- Test: `test.mjs`

**Interfaces:**
- Consumes: the three built pages.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing test**

Replace the body of the `UNDECIDED` test at `test.mjs:1289` with:

```js
  /* Empower chose every remaining set on 2026-08-07: Streetlight as the single
     solution template, The Studio for the podcast, The Dome for Capitol Chat.
     Nothing is awaiting a decision, so every set on the chooser carries a pick. */
  const UNDECIDED = [];
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test --test-name-pattern="pick" test.mjs`
Expected: FAIL, the work, safety, podcast and capitol sets have zero picks.

- [ ] **Step 3: Mark the picks on the chooser**

In `src/chooser.html`, add the chosen styling to the cards Empower picked, matching how already-decided sets are marked. Per `empowerms-review-site`, orange rule and ring means Empower chose it, blue means it was in the running, grey means reference.

- The three template pages replace the work and safety variation cards as the decided outcome.
- `podcast-a` and `capitol-a` take the orange treatment; `podcast-b` and `capitol-b` drop to blue.

Update the group notes that still describe these sets as undecided. Search for "Nothing is chosen yet" and rewrite each occurrence to record what was chosen and when.

- [ ] **Step 4: Turn the SIGNATURE assertions around**

Both `SIGNATURE` maps assert that each reading owns a composition the others lack. For the three template pages that is now backwards. Remove `dist/work.html`, `dist/safety.html` and `dist/education.html` from the maps and let the "same template" test from Task 3 cover them. Leave the entries for the unpicked readings alone: they still each have their own signature and that is still worth protecting.

- [ ] **Step 5: Run the whole suite**

Run: `node build.mjs && node --test test.mjs`
Expected: PASS.

- [ ] **Step 6: Check the chooser renders**

Load `dist/index.html`. Every set shows exactly one pick. The filter rail still works with no JavaScript, and Clear still resets it.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: record Empower's 2026-08-07 picks on the review index

Every set now carries a decision, so UNDECIDED empties. The three solution
pages share a template, so the per-reading SIGNATURE assertions no longer
apply to them and the shared-structure test covers them instead."
```

---

### Task 6: Drop the Topic facet from The Studio

**Files:**
- Modify: `src/podcast-a/sections/03-library.html`
- Modify: `css/podcast-a.css`
- Test: `test.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing test**

```js
test('the podcast library filters by guest only', () => {
  /* Empower removed Filter by Topic on 2026-08-07. Guest stays, and more guest
     categories are coming, so the facet has to remain a list of values rather
     than three hard-coded rules. */
  const html = readFileSync('dist/podcast-a.html', 'utf8');
  const css = readFileSync('css/podcast-a.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  assert.doesNotMatch(html, /pca-topic/, 'dist/podcast-a.html still has the topic facet');
  assert.doesNotMatch(css, /pca-topic/, 'css/podcast-a.css still has topic hide rules');
  assert.ok(!/<legend>Topic<\/legend>/.test(html), 'dist/podcast-a.html still shows a Topic legend');

  /* Guest survives intact, and every guest value still hides only its own. */
  for (const g of ['lawmaker', 'expert', 'leader']) {
    assert.ok(css.includes(
      `body:has(.pca-guest:checked):not(:has(#pa-g-${g}:checked)) .pca-ep[data-guest="${g}"]`),
      `css/podcast-a.css has no hide rule for the ${g} guest facet`);
  }

  /* No combination of ticks may empty the grid. */
  const guests = [...html.matchAll(/data-guest="([a-z]+)"/g)].map(m => m[1]);
  for (const g of ['lawmaker', 'expert', 'leader']) {
    assert.ok(guests.filter(x => x === g).length >= 1,
      `dist/podcast-a.html has no ${g} episode, so that filter returns nothing`);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test --test-name-pattern="filters by guest only" test.mjs`
Expected: FAIL with "still has the topic facet".

- [ ] **Step 3: Remove the markup**

In `src/podcast-a/sections/03-library.html`, delete the whole `<fieldset class="pca-facet">` containing `<legend>Topic</legend>` and its three `pca-check` blocks. Leave the Guest fieldset and the `<button type="reset">` untouched.

Leave `data-topic` on the `<li>` elements: it is harmless, and it is what the episodes are actually about if Empower ever want the facet back.

- [ ] **Step 4: Remove the CSS rules**

In `css/podcast-a.css`, delete the three selectors naming `.pca-topic` from the hide-rule group, keeping the three `.pca-guest` ones and the `@supports` gate.

- [ ] **Step 5: Run the test**

Run: `node build.mjs && node --test --test-name-pattern="filters by guest only" test.mjs`
Expected: PASS.

- [ ] **Step 6: Run the whole suite**

Run: `node --test test.mjs`
Expected: PASS. The existing "cannot filter itself empty" test asserts a topic-and-guest matrix and will need its topic half removed; keep the guest half.

- [ ] **Step 7: Exercise the filter in a browser**

Load `dist/podcast-a.html`, tick each guest box in turn and then all three. Every state shows episodes; none shows an empty grid. Clear resets.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: drop the topic facet from The Empower Podcast

Empower asked for Filter by Topic to go and Guest to stay. More guest
categories are coming, so the facet stays a list of values."
```

---

### Task 7: Drop the Topic facet and the topic chip from The Dome

**Files:**
- Modify: `src/capitol-a/sections/03-library.html`
- Modify: `css/capitol-a.css`
- Test: `test.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing.

The chip goes as well as the facet here, and only here. Those topic labels were ours: Capitol Chat carries no topic taxonomy upstream, so with the filter gone they are unsourced decoration. The podcast keeps its guest chip because guests are real.

- [ ] **Step 1: Write the failing test**

```js
test('Capitol Chat filters by session only, and shows no invented topic', () => {
  /* The topic labels on these rows were ours: Capitol Chat has no topic
     taxonomy on the live site. With the filter gone they would be unsourced
     decoration on a client's page, so they go too. */
  const html = readFileSync('dist/capitol-a.html', 'utf8');
  const css = readFileSync('css/capitol-a.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  assert.doesNotMatch(html, /cca-topic/, 'dist/capitol-a.html still has the topic facet');
  assert.doesNotMatch(css, /cca-topic/, 'css/capitol-a.css still has topic hide rules');
  assert.doesNotMatch(html, /cca-ep__tag/, 'dist/capitol-a.html still shows a topic chip');
  for (const t of ['Quality Education', 'Meaningful Work', 'Public Safety']) {
    assert.ok(!html.includes(`>${t}<`),
      `dist/capitol-a.html still labels a row "${t}", which Empower never tagged`);
  }

  for (const s of ['2026', '2025']) {
    assert.ok(css.includes(
      `body:has(.cca-session:checked):not(:has(#ca-s-${s}:checked)) .cca-ep[data-session="${s}"]`),
      `css/capitol-a.css has no hide rule for the ${s} session`);
    const rows = (html.match(new RegExp(`data-session="${s}"`, 'g')) || []).length;
    assert.ok(rows >= 1, `dist/capitol-a.html has no ${s} row, so that filter returns nothing`);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test --test-name-pattern="Capitol Chat filters by session only" test.mjs`
Expected: FAIL with "still has the topic facet".

- [ ] **Step 3: Remove the markup**

In `src/capitol-a/sections/03-library.html`:
- Delete the `<fieldset class="cca-filter__group">` containing `<legend>Topic</legend>`.
- Delete the `<span class="cca-ep__tag">…</span>` from all six rows.
- Delete `data-topic="…"` from all six `<li>` elements. Unlike the podcast, this attribute asserts a classification Empower never made, so it does not stay.

- [ ] **Step 4: Remove the CSS**

In `css/capitol-a.css`, delete the three `.cca-topic` hide rules and the `.cca-ep__tag` rule. The row is a five-column grid; with the tag column gone it becomes four, so update `grid-template-columns` on `.cca-ep` and the `grid-column` assignments in its `@media (max-width:860px)` block.

- [ ] **Step 5: Run the test**

Run: `node build.mjs && node --test --test-name-pattern="Capitol Chat filters by session only" test.mjs`
Expected: PASS.

- [ ] **Step 6: Run the whole suite**

Run: `node --test test.mjs`
Expected: PASS. The existing Capitol Chat test asserts a topic-and-session matrix; remove its topic half and keep the session half.

- [ ] **Step 7: Check the row layout**

Load `dist/capitol-a.html` at 1440px and 390px. With a column removed the play affordance, title, date and session must still line up, and the date must not collide with the session label.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: drop the topic facet and chip from Capitol Chat

Empower asked for Filter by Topic to go and Legislative Session to stay. The
topic labels went with it: Capitol Chat carries no topic taxonomy upstream, so
those three labels were ours and would be unsourced decoration without the
filter."
```

---

## Self-review

**Spec coverage.** Every section of the spec maps to a task: the `sol-` namespace and shared stylesheet (Task 1), the section 4 swap (Task 2), the per-page differences in work-area count (Task 3) and the Education closer (Task 4), the test inversion and chooser (Task 5), and the two filter changes (Tasks 6 and 7). The out-of-scope items are absent from the plan by design: no task touches the unpicked variations, changes a URL, or adds guest categories.

**Placeholders.** None. Every code step carries the code. The two places that say "read the extract before writing" are deliberate: the copy is long, it is verbatim from a PDF, and transcribing it into this document would create a second source of truth that could drift from the roadmap.

**Type consistency.** Class names are consistent across tasks: `sol-caps` / `sol-caps__grid` / `sol-cap` / `sol-cap__title` / `sol-cap__body` defined in Task 2 and asserted unchanged in Tasks 3 and 4; `sol-lit` used by the work-area count test in Task 3 and by the Education page in Task 4; `sol-grid__closer` defined and asserted only in Task 4.

**Known ordering constraint.** The test added in Task 3 asserts all three pages, so it fails until Task 4 lands. Task 3 Step 7 says so explicitly and tells the implementer which failure is expected.
