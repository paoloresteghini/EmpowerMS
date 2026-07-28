import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';

execFileSync('node', ['build.mjs'], { stdio: 'inherit' });
const html = readFileSync('dist/index.html', 'utf8');

test('build resolves every include marker', () => {
  assert.ok(!html.includes('@include'), 'unresolved @include marker in output');
});

test('build inlines section content', () => {
  assert.match(html, /<header class="em-header">/);
});

test('design system files imported at root level', () => {
  for (const f of [
    'tokens/base.css', 'tokens/colors.css', 'tokens/fonts.css',
    'components/components.css',
  ]) assert.ok(existsSync(f), `missing ${f}`);
});

test('asset paths referenced by tokens actually resolve', () => {
  // tokens/*.css use url('../assets/...') — only correct if tokens/ is a
  // sibling of assets/. Guard the layout constraint.
  for (const f of [
    'assets/fonts/figtree-700.woff2',
    'assets/pattern-blue.png',
    'assets/logo-primary.png',
    'assets/logo-primary-reversed.png',
  ]) assert.ok(existsSync(f), `missing ${f}`);
});

test('imported binaries are not empty or HTML error pages', () => {
  for (const f of ['assets/fonts/figtree-700.woff2', 'assets/logo-primary.png']) {
    assert.ok(statSync(f).size > 1000, `${f} looks truncated`);
  }
});

test('shell declares default skin and variant state', () => {
  assert.match(html, /<html lang="en"[^>]*data-skin="brand"/);
  assert.match(html, /data-annotations="off"/);
  assert.match(html, /data-foundations="bento"/);
  assert.match(html, /data-stories="feature"/);
});

test('shell links stylesheets in cascade order', () => {
  const order = ['tokens/fonts.css', 'tokens/colors.css', 'tokens/base.css',
                 'components/components.css', 'css/homepage.css', 'css/wireframe.css'];
  let cursor = -1;
  for (const href of order) {
    const at = html.indexOf(href);
    assert.ok(at > cursor, `${href} out of cascade order`);
    cursor = at;
  }
});

test('control bar exists in the shell only', () => {
  assert.match(html, /id="controls"/);
  const partial = readFileSync('src/sections/00-header.html', 'utf8');
  assert.ok(!partial.includes('id="controls"'), 'control bar leaked into a partial');
});

test('header is a landmark with a nav and six links', () => {
  assert.match(html, /<header class="em-header">/);
  assert.match(html, /<nav class="em-header__nav" aria-label="Primary">/);
  for (const label of ['Home', 'About', 'Solutions', 'All Content', 'Podcast', 'Join Us']) {
    assert.ok(html.includes(`>${label}<`) || html.includes(`>${label} `), `nav missing ${label}`);
  }
});

test('header Donate is navy, not the orange primary', () => {
  assert.match(html, /class="em-btn em-btn--secondary em-btn--sm"[^>]*>[\s\S]{0,40}Donate/);
});
