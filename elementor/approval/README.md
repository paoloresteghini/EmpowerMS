# The client approval artefacts

Three generators, all reading `elementor/seo.mjs`, because the strings a
client approves have to be the strings that deploy. A hand-typed table is a
second copy of the copy, and it drifts silently.

    node elementor/approval/build-seo-email.mjs   -> seo-email.txt
    node elementor/approval/build-seo-sheet.mjs   -> seo-sheet.html
    python3 elementor/approval/build-seo-doc.py   -> empower-search-listings.docx

`current.json` is what each URL carried on the install on 2026-08-21, measured
rather than typed: the point of the bios table is that their descriptions are
359-416 characters, and a number that came off the install is the only version
of that claim worth showing a client.

`build-seo-doc.py` still reads a `doc-data.json` that nothing here writes. It
was produced inline by the session that wrote these and did not survive it, so
the .docx generator is the one artefact that cannot currently be rebuilt from
seo.mjs alone. The already-sent .docx is archived at
`docs/empower-search-listings.docx`.

WHY THESE ARE IN THE REPOSITORY AT ALL. They spent their first day in a
session scratchpad, which is a temporary directory that gets collected. When
Empower returned the approval sheet on 2026-08-21 with five rows emptied, the
generators were still only in the dead session's temp dir, so the committed
`docs/seo-email-draft.txt` could not be regenerated and would have been
hand-edited into agreement. That is the drift these scripts exist to prevent,
about to happen to the scripts themselves.

## Reading a returned sheet

Do not read it. Diff it. The document that came back on 2026-08-21 had 3
edited entries out of 29 and 5 rows emptied in place, and the emptied rows are
the class a human reading misses, because a blank table row looks like
whitespace. Key the comparison on the URL, never the human label, and report
three things separately: changed fields, entries the source has and the return
does not, and entries the return has that the source does not know about.
