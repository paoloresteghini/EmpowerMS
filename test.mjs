import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

execFileSync('node', ['build.mjs'], { stdio: 'inherit' });
const html = readFileSync('dist/index.html', 'utf8');

test('build resolves every include marker', () => {
  assert.ok(!html.includes('@include'), 'unresolved @include marker in output');
});

test('build inlines section content', () => {
  assert.match(html, /data-section="header"/);
});
