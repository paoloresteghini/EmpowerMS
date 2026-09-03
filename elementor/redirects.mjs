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
  /* Added 2026-09-02, when /terms/ went live. This is the ONLY entry in this
     list whose source is not a `page`: it is `wpautoterms_page` 19170, a custom
     post type the plugin `auto-terms-of-service-and-privacy-policy` maintains,
     which is why the URL carries the plugin's own prefix rather than a path
     anybody chose. /terms/ carries the same document word for word, checked by
     test.mjs against a capture of this one.

     SAFE TO REDIRECT, and checked against the two hazards this file records
     rather than assumed. It serves no form, so nothing stops working; and it is
     not a paginated archive, so nothing under it is thrown away. The plugin's
     own footer strip links here, so after this rule that link lands on the
     converted page, which is the outcome we want either way.

     IT DOES NOT RETIRE THE PLUGIN and must not be read as doing so. The plugin
     stays active and keeps rendering its compliance strip in the footer, which
     was a deliberate decision on 2026-08-20. docs/legal/plugin-proposal.md is
     the separate question. */
  { from: '/wpautoterms/terms-and-conditions/', to: '/terms/', why: 'the plugin CPT this build replaced with a converted page at /terms/' },
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
  /* THE REASON CHANGED ON 2026-09-02 AND THE VERDICT DID NOT, so both entries
     are rewritten rather than deleted. /ambassadors/ and /newsletter/ now carry
     the live forms themselves: form 37 and form 2 respectively, by shortcode,
     verified rendering on both pages. So "the converted page has no form" is no
     longer true of either, and this list would be wrong if it still said so.

     WHAT STILL BLOCKS THE REDIRECT IS A DIFFERENT THING: nobody has proved a
     submission ARRIVES from the converted pages. A page that renders proves the
     shortcode expanded and nothing more, and the failure this whole list exists
     to prevent is a redirect that reports success while quietly ending
     signups. One test submission through each converted page, checked against
     the entry counts (form 2 at 836, form 37 at 25 when this was written), is
     what turns these two into redirects. Nobody has sent one, because doing so
     emails Empower's own staff.

     The other two legacy signup pages are NOT in that position and are not
     waiting on anything: they serve forms 41 and 43, which exist on no
     converted page, so redirecting them would lose those routes outright. */
  { path: '/become-an-ambassador/', why: 'live Gravity Form 37. /ambassadors/ now carries the same form; redirect once one test submission is proved to arrive' },
  { path: '/join/', why: 'live Gravity Form 2, 836 entries. /newsletter/ now carries the same form; same gate' },
  { path: '/become-an-advocate-for-change/', why: 'live Gravity Form 41, which no converted page carries; redirecting it would lose the route' },
  { path: '/join-the-movement/', why: 'live Gravity Form 43, which no converted page carries; same' },
  { path: '/learn-more/', why: 'target of five campaign rules including a printed QR code' },
  { path: '/educationroadmap/', why: 'a distinct resource, not a duplicate' },
  { path: '/commentary/', why: 'a live archive 38 pages deep' },
  { path: '/empower-commentary/', why: 'a live archive 40 pages deep' },
];
