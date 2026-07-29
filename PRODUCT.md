# Product

## Register

brand

## Users

Mississippians deciding whether opportunity is reachable where they live — parents choosing
a school, workers trying to get ahead, people re-entering after incarceration, and the
neighbours and community leaders around them. Alongside them, a smaller but decisive
audience arrives to check credibility: legislators and staff, press, donors, and potential
ambassadors.

Most arrive on a phone, from social media or a news mention, and give the page seconds
before deciding whether this organisation is about their life or about itself. The job to
be done is the same for both audiences: work out fast what Empower actually does, whether
it is credible, and what the next step is.

## Product Purpose

The public face of a brand shared by three legal entities — Empower Mississippi Foundation
(501(c)(3), educates), Empower Mississippi (501(c)(4), engages), and Empower PAC (supports
candidates). empowerms.org is the only digital product.

The homepage turns "policy organisation" into something a non-policy person recognises as
being about their own life, then routes them onward: into a Foundation of Opportunity
(Quality Education, Meaningful Work, Public Safety), into a community story or research
piece, or into a way in (newsletter, ambassador programme, donation).

Success is a site that looks current and holds attention — engagement and credibility,
not a single conversion metric.

## Brand Personality

**Empowering above all** — the brand guide states the goal outright. Bold, simple, clear.

Audience-centred voice: write to **"you"** about the reader's life, and use **"we"** for
Empower's actions. Never the institution-centred construction ("Empower Mississippi believes
that stakeholders…") the website roadmap explicitly rejects.

Emotionally the page should read as confident and possible — the American Dream is reachable
here at home — never anxious, never pleading.

## Anti-references

Not supplied by the client. Two are implied by the brand rules and recorded here so the
constraint is explicit rather than assumed:

- **Institution-centred think-tank voice.** The "we believe stakeholders…" register, org-first
  section openings, and a wall of PDFs. The roadmap's audience-centred rewrite exists
  specifically to move away from this.
- **Pity-driven charity appeal.** Crisis framing, sad imagery, guilt as a donation lever.
  Directly contradicts "empowering".

Design inspirations named in the roadmap (the positive side of this axis): Georgia Center for
Opportunity, Archbridge Institute, Texas Public Charter Schools Association, Opportunity
Arkansas, Pelican Institute.

## Design Principles

1. **You, not we.** Every section opens on the reader's life, not the organisation's activity.
   A section that begins by describing Empower has been written backwards.
2. **Real people, real problems, real solutions.** Named Mississippians and concrete outcomes
   carry the argument; abstraction is the fallback, not the default.
3. **Empowering, never pitying.** Show agency and possibility. No crisis framing, no guilt.
4. **One action per view.** A single orange filled button per page; everything else is
   secondary or tertiary. Enforced by test in this build.
5. **Bold and simple beats comprehensive.** The brief is to inspire involvement, not to cover
   the full policy surface. Depth lives on the solution pages.

## Accessibility & Inclusion

Target: **WCAG 2.2 AA.**

Two failures originate in the supplied brand palette, are open with the client, and are to be
reported alongside everything else rather than treated as exempt:

- `--em-orange` (#E65A28) on white = 3.59:1 — fails AA 4.5:1 for normal-size text. Affects
  `em-eyebrow`, `em-heading__eyebrow`, `em-article__more`, `em-solution__more`, `em-podcast__show`.
- `--border-inverse` (rgba(255,255,255,.28)) on navy = 2.28:1 — fails SC 1.4.11's 3:1 for UI
  component borders. Affects the footer newsletter input border, social buttons, and divider.

Reduced motion is honoured in both the reveal layer and the mega menus, and is not optional
for future work. Mobile-first: most visitors arrive on a phone.
