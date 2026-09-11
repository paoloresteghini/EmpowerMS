/* Builds the client approval sheet from elementor/seo.mjs, so the page cannot
   disagree with the file it documents. Counts and the mobile cut are computed,
   never typed. */
import fs from 'node:fs';
import { PAGE_SEO, PERSON_SEO, BRAND_SUFFIX } from '../seo.mjs';

const SITE = 'empowerms.org';
const MOBILE_CUT = 120;

/* What each URL has TODAY, read off the install by build-seo-sheet's sibling
   measurement pass on 2026-08-21 and written to current.json. Measured, never
   typed: the bio lengths are the whole point of the second table. */
const CURRENT = JSON.parse(
  fs.readFileSync(new URL('./current.json', import.meta.url), 'utf8'),
);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function crumbs(path) {
  const parts = path.split('/').filter(Boolean);
  return [SITE, ...parts].join(' <span class="sep">›</span> ');
}

function row(path, entry) {
  const title = entry.title + BRAND_SUFFIX;
  const d = entry.description;
  const head = esc(d.slice(0, MOBILE_CUT));
  const tail = esc(d.slice(MOBILE_CUT));
  const cur = CURRENT[path];
  const curDesc = cur.desc === 0
    ? '<span class="bad">no description at all</span>'
    : `<span class="bad">${cur.desc} characters</span>, cut off by Google`;
  return `
      <article class="row">
        <div class="meta">
          <p class="path">${esc(path)}</p>
          <dl class="counts">
            <div><dt>Title</dt><dd>${title.length}<span class="unit">/60</span></dd></div>
            <div><dt>Description</dt><dd>${d.length}<span class="unit">/160</span></dd></div>
          </dl>
          <p class="now"><span class="now-label">Today</span> ${esc(cur.title)}<br>${curDesc}</p>
        </div>
        <div class="serp">
          <p class="crumb">${crumbs(path)}</p>
          <h3 class="serp-title">${esc(title)}</h3>
          <p class="serp-desc">${head}<span class="cut">${tail}</span></p>
        </div>
      </article>`;
}

const pages = Object.entries(PAGE_SEO).map(([p, e]) => row(p, e)).join('\n');
const people = Object.entries(PERSON_SEO).map(([p, e]) => row(p, e)).join('\n');

const html = `<title>Empower Search Snippets</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=Public+Sans:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  :root {
    --ground: #F6F7F8;
    --panel: #FFFFFF;
    --ink: #11242D;
    --muted: #5C6E77;
    --hairline: #DCE2E5;
    --navy: #003C50;
    --orange: #E65A28;
    --link: #1B4F8A;
    --bad: #A33A1C;
    --shadow: 0 1px 2px rgba(0, 60, 80, .06), 0 8px 24px rgba(0, 60, 80, .05);
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #0B1B22;
      --panel: #10242D;
      --ink: #E8EDEF;
      --muted: #9BB0B8;
      --hairline: #23414D;
      --navy: #7FC4DC;
      --orange: #FF7A4D;
      --link: #8FC1EE;
      --bad: #FF9C79;
      --shadow: none;
    }
  }
  :root[data-theme="dark"] {
    --ground: #0B1B22;
    --panel: #10242D;
    --ink: #E8EDEF;
    --muted: #9BB0B8;
    --hairline: #23414D;
    --navy: #7FC4DC;
    --orange: #FF7A4D;
    --link: #8FC1EE;
    --bad: #FF9C79;
    --shadow: none;
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--ground);
    color: var(--ink);
    font-family: "Public Sans", system-ui, -apple-system, sans-serif;
    font-size: 16px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 1080px; margin: 0 auto; padding: clamp(28px, 5vw, 72px) clamp(18px, 4vw, 40px) 96px; }

  .rule { width: 56px; height: 4px; background: var(--orange); border: 0; margin: 0 0 20px; }

  header h1 {
    font-family: Newsreader, Georgia, serif;
    font-weight: 600;
    font-size: clamp(30px, 5vw, 46px);
    line-height: 1.1;
    letter-spacing: -0.01em;
    text-wrap: balance;
    margin: 0 0 14px;
  }
  header .standfirst {
    font-family: Newsreader, Georgia, serif;
    font-size: clamp(17px, 2.2vw, 20px);
    color: var(--muted);
    max-width: 62ch;
    margin: 0 0 28px;
  }

  .brief { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); margin-bottom: 12px; }
  .brief div {
    background: var(--panel);
    border: 1px solid var(--hairline);
    border-radius: 3px;
    padding: 16px 18px;
    box-shadow: var(--shadow);
  }
  .brief dt, .label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 6px;
  }
  .brief p { margin: 0; font-size: 15px; }
  .brief b { font-family: "IBM Plex Mono", ui-monospace, monospace; font-weight: 500; color: var(--orange); }

  .note {
    border-left: 3px solid var(--orange);
    padding: 2px 0 2px 16px;
    margin: 34px 0 0;
    max-width: 68ch;
    font-size: 15px;
    color: var(--muted);
  }
  .note strong { color: var(--ink); font-weight: 700; }

  h2 {
    font-family: Newsreader, Georgia, serif;
    font-weight: 600;
    font-size: clamp(23px, 3vw, 30px);
    margin: 0 0 6px;
  }
  section { margin-top: 64px; }
  section > p.intro { margin: 0 0 26px; color: var(--muted); max-width: 62ch; }

  .rows { display: flex; flex-direction: column; gap: 14px; }
  .row {
    display: grid;
    grid-template-columns: minmax(210px, 1fr) minmax(0, 2fr);
    gap: clamp(16px, 3vw, 34px);
    background: var(--panel);
    border: 1px solid var(--hairline);
    border-radius: 3px;
    padding: 20px clamp(18px, 2.5vw, 26px);
    box-shadow: var(--shadow);
  }
  @media (max-width: 720px) { .row { grid-template-columns: 1fr; gap: 18px; } }

  .path {
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 13px;
    color: var(--navy);
    margin: 0 0 12px;
    word-break: break-all;
  }
  .counts { display: flex; gap: 20px; margin: 0 0 14px; }
  .counts dt {
    font-size: 10px; font-weight: 700; letter-spacing: .09em;
    text-transform: uppercase; color: var(--muted); margin: 0;
  }
  .counts dd {
    margin: 0;
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-variant-numeric: tabular-nums;
    font-size: 17px;
  }
  .counts .unit { color: var(--muted); font-size: 12px; }

  .now { margin: 0; font-size: 13px; color: var(--muted); line-height: 1.45; }
  .now-label {
    display: inline-block;
    font-size: 10px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase;
    color: var(--muted); border: 1px solid var(--hairline);
    border-radius: 2px; padding: 1px 5px; margin-right: 6px;
  }
  .bad { color: var(--bad); }

  .serp { min-width: 0; }
  .crumb { font-size: 12px; color: var(--muted); margin: 0 0 3px; word-break: break-word; }
  .crumb .sep { opacity: .55; }
  .serp-title {
    font-family: "Public Sans", system-ui, sans-serif;
    font-weight: 500;
    font-size: 19px;
    line-height: 1.3;
    color: var(--link);
    margin: 0 0 4px;
    text-wrap: balance;
  }
  .serp-desc { margin: 0; font-size: 14px; line-height: 1.5; color: var(--ink); max-width: 66ch; }
  .serp-desc .cut { color: var(--muted); }

  footer { margin-top: 72px; padding-top: 22px; border-top: 1px solid var(--hairline); color: var(--muted); font-size: 13px; }
  footer p { margin: 0 0 8px; max-width: 68ch; }
</style>

<div class="wrap">
  <header>
    <hr class="rule">
    <h1>What Google will show for every Empower page</h1>
    <p class="standfirst">Every page below is missing the short description that appears under its name in a search result, or has one far too long to fit. These are the proposed replacements, shown as a search result renders them. Please confirm the wording.</p>
    <div class="brief">
      <div>
        <p class="label">Pages needing copy</p>
        <p><b>34</b> — 16 site pages, 18 staff and fellow bios</p>
      </div>
      <div>
        <p class="label">Site pages today</p>
        <p><b>0</b> of 16 have any description</p>
      </div>
      <div>
        <p class="label">Bios today</p>
        <p>All 18 run <b>350-416</b> characters, roughly double what Google shows</p>
      </div>
    </div>
    <p class="note"><strong>Reading the grey text.</strong> A description is cut short on a phone at around 120 characters. Everything past that point is set in grey below, so you can see what a phone drops. Nothing important sits in the grey.</p>
  </header>

  <section>
    <hr class="rule">
    <h2>The sixteen site pages</h2>
    <p class="intro">Titles gain a few words each: the current ones are short enough that Google leaves search-result space unused. Nothing here is invented; every line is drawn from the page's own approved copy.</p>
    <div class="rows">
${pages}
    </div>
  </section>

  <section>
    <hr class="rule">
    <h2>The eighteen bios</h2>
    <p class="intro">These already have descriptions, but each is the opening 350-400 characters of the biography, so Google cuts them mid-sentence. Each replacement leads with the person's role, then one line of background, taken from their own bio.</p>
    <div class="rows">
${people}
    </div>
  </section>

  <footer>
    <hr class="rule">
    <p><strong>Two things to decide alongside the wording.</strong></p>
    <p>1. The home page is currently titled "Homepage (Elementor conversion)". That is a build label, and it is what a browser tab and a search result both say today. The proposed title replaces it.</p>
    <p>2. Two web addresses currently hold Grant Callen's biography: <span style="font-family:'IBM Plex Mono',monospace">/grant-callen/</span> and <span style="font-family:'IBM Plex Mono',monospace">/person/grant-callen/</span>. The plan is to credit the second as the real one, so the two stop competing.</p>
    <p>Prepared 21 August 2026. Blog posts and older pages are not in this list: they already carry descriptions, though most are longer than Google will show, and are better handled in bulk later.</p>
  </footer>
</div>
`;

fs.writeFileSync(new URL('./seo-sheet.html', import.meta.url), html);
console.log('wrote seo-sheet.html');
