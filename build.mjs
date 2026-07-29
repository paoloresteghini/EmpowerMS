import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SRC = 'src';
const MARKER = /<!--@include\s+([^\s>]+?)\s*-->/g;

/* Every page this build produces. `src` is relative to src/, `out` is the
   path written. Include markers inside a page are ALSO resolved relative to
   src/, not to the page's own directory, so a section and a shared partial
   are referenced the same way from anywhere.

   dist/ stays flat and one level deep, because every partial references
   assets as ../assets/… — nesting a page would break those paths. */
export const PAGES = [
  { src: 'chooser.html', out: 'dist/index.html', title: 'Compare the options' },
  { src: 'index.html', out: 'dist/current.html', title: 'Current reference build' },
  { src: 'option-a/index.html', out: 'dist/option-a.html', title: 'Option A — Front Porch' },
  { src: 'option-b/index.html', out: 'dist/option-b.html', title: 'Option B — The Index' },
  { src: 'option-c/index.html', out: 'dist/option-c.html', title: 'Option C — Bold Blocks' },
  { src: 'option-d/index.html', out: 'dist/option-d.html', title: 'Option D — The Throughline' },
];

function resolve(html, depth = 0) {
  if (depth > 5) throw new Error('include nesting too deep — cycle?');
  return html.replace(MARKER, (_, path) => {
    const file = join(SRC, path);
    let part;
    try {
      part = readFileSync(file, 'utf8');
    } catch {
      throw new Error(`include not found: ${file}`);
    }
    return resolve(part.trimEnd(), depth + 1);
  });
}

let total = 0;
for (const page of PAGES) {
  // A page still being written is skipped rather than crashing the build, so
  // the dev server keeps serving the pages that do exist. test.mjs asserts
  // that every entry in PAGES actually produced a file, so a page that never
  // arrives fails the suite rather than disappearing quietly.
  if (!existsSync(join(SRC, page.src))) {
    console.warn(`skipped ${page.out} — src/${page.src} does not exist yet`);
    continue;
  }
  const out = resolve(readFileSync(join(SRC, page.src), 'utf8'));
  mkdirSync(dirname(page.out), { recursive: true });
  writeFileSync(page.out, out);
  total += out.length;
  console.log(`built ${page.out} (${out.length} bytes)`);
}
console.log(`${PAGES.length} pages, ${total} bytes`);
