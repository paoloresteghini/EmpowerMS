/* Returns the complete element whose opening tag carries `className`,
   including its own closing tag, by counting nested opening and closing
   tags of the same name. A regex cannot do this: .em-footer__social sits
   inside a partial that has other elements of the same tag name after it
   (the earlier bug this module replaces sliced all the way to the
   partial's last </a>, twenty lines past the intended block, and swallowed
   the Follow and More columns whole), and a lazy match stops at the first
   closing tag it meets, silently truncating or over-capturing.

   Written once here, in Task 4, because footer.mjs needs it before header.mjs
   does; Task 5 imports this rather than defining its own copy.

   Three real boundaries, none of which trigger on this codebase's current
   inputs, recorded here so the next extension does not have to rediscover
   them by failing:

   1. The depth counter increments on `<tag` and decrements on `</tag>` with
      no awareness of self-closing or void syntax. A self-closing element
      sharing the target tag name inside the block (`<div />` where tagName
      is "div") would desync the count; nothing here produces that.
   2. This is a pure text scan with no awareness of comment or attribute-value
      context. A literal `<div` or `</nav>` sitting inside an HTML comment or
      a quoted attribute value would desync it the same way, silently,
      with no error. Verified by hand that no target block in
      src/_shared/footer.html or src/_shared/header-2.html contains one.
   3. The class regex's `\b` treats `-` as a word boundary but `_` as a word
      character, so `\bem-mobilenav\b` would falsely match a class like
      `em-mobilenav-foo` while correctly failing to match
      `em-mobilenav__list`. This codebase's double-underscore BEM convention
      (`__element`, `--modifier`-free) is safe against this; a single-hyphen
      modifier class sharing a prefix with the target name would not be. */
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
