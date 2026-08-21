/* The legacy pages that compete with the converted ones, and where they go.

   WHY THIS FILE EXISTS. Sixteen converted pages got approved titles and
   descriptions on 2026-08-21. Twelve legacy pages sat beside them, every one
   indexable, every one SELF-canonical, every one in page-sitemap.xml, several
   answering the same query with an older and better-established URL. A search
   listing cannot win a query the site is competing with itself for, so the
   listings and these redirects are two halves of one job.

   WHY THE LIST IS NINE AND NOT TWELVE. Three of the twelve were checked and
   turned out not to be duplicates at all, and the checking is the point:

     /educationroadmap/  a distinct 565-word resource ("The Education
                         Roadmap"), not an old copy of /quality-education/.
     /commentary/        a LIVE paginated archive, 38 pages deep.
     /empower-commentary/ the same, 40 pages deep.

   Redirecting a paginated archive throws away every /page/N/ under it, which
   is a content decision about what replaces those listings (/all-content/
   presumably) and not a de-duplication. They stay.

   THREE MORE ARE DELIBERATELY ABSENT AND MUST STAY ABSENT until Empower say
   otherwise, because a 301 would look successful and quietly break something:

     /become-an-ambassador/          serves live Gravity Form 37
     /become-an-advocate-for-change/ serves live Gravity Form 41
     /learn-more/                    the target of five campaign rules, one of
                                     them utm_medium=qr; printed codes cannot
                                     be un-printed.

   The converted /ambassadors/, /newsletter/ and /donate/ carry NO form at all.
   They are form-SHAPED designs with nothing wired to them, so redirecting the
   working signup onto the design would end ambassador signups and report
   success while doing it. That is the single most expensive mistake available
   in this file. */

/* Source path -> destination path. Every source was measured on 2026-08-21:
   indexable, self-canonical, in the sitemap, carrying a 314-402 character
   auto-generated description, and linked from NOWHERE in the converted build,
   so no internal link changes meaning. Every destination returns 200. */
export const REDIRECTS = [
  { from: '/home/', to: '/', why: 'a second home page, h1 "Helping every Mississippian rise"' },
  { from: '/team-old/', to: '/team/', why: 'h1 identical to /board/, superseded by the CPT-driven roster' },
  { from: '/board/', to: '/team/', why: '/team/ renders the board roll; its title is "Meet Our Team, Board and Fellows"' },
  { from: '/donate-old/', to: '/donate/', why: 'superseded by the converted give page' },
  { from: '/about/', to: '/who-we-are/', why: 'same subject, and /who-we-are/ is the one in the nav' },
  { from: '/work/', to: '/meaningful-work/', why: 'h1 "Work provides purpose."; the converted solution page replaces it' },
  { from: '/justice/', to: '/public-safety/', why: 'h1 "Every Person Deserves a Fair Shake"; same' },
  { from: '/education-3/', to: '/quality-education/', why: 'h1 "Every child deserves a great education"; same' },
  { from: '/the-empower-podcast/', to: '/podcast/', why: 'superseded by the converted podcast page' },
];

/* EXISTING RULES THAT WOULD BECOME CHAINS the moment the list above applies,
   because they currently land on a page that would then redirect again. Google
   follows a chain and this repository can simply not create one: each of these
   is repointed at the final destination in the same pass. Keyed by the rule id
   in wp_redirection_items, with the source recorded so a renumbered table is
   caught rather than silently repointing the wrong rule. */
export const REPOINT = [
  { id: 14, from: '/education-copy/', was: '/education-3/', to: '/quality-education/' },
  { id: 15, from: '/justice-copy/', was: '/justice/', to: '/public-safety/' },
  { id: 16, from: '/work-copy/', was: '/work/', to: '/meaningful-work/' },
  { id: 24, from: '/tune-in/', was: 'https://empv2.wpenginepowered.com/the-empower-podcast/', to: '/podcast/' },
];

/* LOADED GUNS. Three rules already in the table are the EXACT REVERSE of
   redirects created above. All three are `disabled` today, and all three
   become an infinite redirect loop the moment somebody re-enables them in
   wp-admin, which is a thing that looks entirely harmless from the plugin's
   own list screen: the rule reads "/team/ -> /team-old/", it does not read
   "this will make both pages unreachable".

   They are NOT deleted here. They are Empower's table, deleting is not
   reversible from this side, and a gate is the mechanism this repository uses
   everywhere else for exactly this shape of risk. `the legacy redirects
   resolve in one hop and no reverse rule is live` in test-elementor.mjs fails
   if any of them is enabled. */
export const MUST_STAY_DISABLED = [
  { id: 38, rule: '/donate/ -> /donate-old/', loopsWith: '/donate-old/ -> /donate/' },
  { id: 39, rule: '/team/ -> /team-old/', loopsWith: '/team-old/ -> /team/' },
  { id: 25, rule: '/podcast -> /the-empower-podcast/', loopsWith: '/the-empower-podcast/ -> /podcast/' },
];

/* Left alone on purpose, and listed so the next person does not have to work
   out whether they were missed. */
export const DELIBERATELY_NOT_REDIRECTED = [
  { path: '/become-an-ambassador/', why: 'live Gravity Form 37; /ambassadors/ has no form' },
  { path: '/become-an-advocate-for-change/', why: 'live Gravity Form 41; same' },
  { path: '/learn-more/', why: 'target of five campaign rules including a printed QR code' },
  { path: '/educationroadmap/', why: 'a distinct resource, not a duplicate' },
  { path: '/commentary/', why: 'a live archive 38 pages deep' },
  { path: '/empower-commentary/', why: 'a live archive 40 pages deep' },
];
