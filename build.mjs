import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SRC = 'src';
const OUT = 'dist/index.html';
const MARKER = /<!--@include\s+([^\s>]+?)\s*-->/g;

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

const out = resolve(readFileSync(join(SRC, 'index.html'), 'utf8'));
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, out);
console.log(`built ${OUT} (${out.length} bytes)`);
