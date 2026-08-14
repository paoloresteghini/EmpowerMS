/* Returns the complete element whose opening tag carries `className`,
   including its own closing tag, by counting nested opening and closing
   tags of the same name. A regex cannot do this: .em-footer__social sits
   inside a partial that has other elements of the same tag name after it
   (the earlier bug this module replaces sliced all the way to the
   partial's last </a>, twenty lines past the intended block, and swallowed
   the Follow and More columns whole), and a lazy match stops at the first
   closing tag it meets, silently truncating or over-capturing.

   Written once here, in Task 4, because footer.mjs needs it before header.mjs
   does; Task 5 imports this rather than defining its own copy. */
export function extractBlock(source, tagName, className) {
  const open = new RegExp(`<${tagName}[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`);
  const match = open.exec(source);
  if (!match) throw new Error(`extractBlock: no <${tagName}> carrying .${className}`);
  const start = match.index;
  const step = new RegExp(`<${tagName}\\b|</${tagName}>`, 'g');
  step.lastIndex = start;
  let depth = 0;
  let hit;
  while ((hit = step.exec(source)) !== null) {
    depth += hit[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return source.slice(start, hit.index + hit[0].length);
  }
  throw new Error(`extractBlock: <${tagName}> carrying .${className} is never closed`);
}
