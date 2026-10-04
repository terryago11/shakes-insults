# Design notes

The look is an early-printing broadside, deliberately *not* tidy. The goal is to avoid modern
graphic-design habits (even spacing, centred symmetry, airy margins, clean borders) and lean on
how early printed sheets were actually put together.

## Principles

1. **Dense, not airy.** Narrow margins, tight leading, type packed to the edges. Generous
   margins and line-spacing are the Neoclassical ideal (Bodoni); that is the style to avoid.
2. **Unequal and slightly off.** Columns have different widths and different rule weights. Red
   sits a little off-register from the black, like colour applied by hand over a printed block.
3. **Hand-coloured accents.** Red for the drop cap, the kicker line and the button shadow (and
   the first column's words; see Column colours). Red is an accent, not a second printing colour.
4. **Drop cap.** Each lede paragraph starts with a large red initial in a printed box, with the
   black plate ghosted off-register. Built with `::first-letter`, so the text stays whole for
   screen readers.
5. **Title-page structure.** A long descriptive title, who it is for, and a printer's imprint
   in the footer.
6. **Repeated ornament.** A strip of printers' marks (¶ § † ‡) rather than a clean divider.
7. **Picked words** get a hand-drawn-style underline in their column's colour and a pointing
   hand (☞), not a modern focus ring.

8. **Old-style copy.** Explanatory text capitalises Nouns and uses period spellings ("Slaunder",
   "Columne", "Chuse", "Shew", "eare"). Kept light so a phone player can still read
   it. The i/j and u/v swaps of the period ("Iudge", "vntil", "giue") are deliberately not used:
   they are too far for a modern eye (owner's decision). These are the author's choices from general knowledge of the period, not claims taken from
   the Britannica article, which does not discuss orthography. Pack names and the credit lines
   are left in plain modern English on purpose (attribution should be unambiguous).

## Column colours

Each column has its own hand colour: **red** (`--c1`, #a63020), **blue** (`--c2`, #26469a) and
**green** (`--c3`, #2a6336). They colour the column heading, the tab, the picked word and the words
of the insult on the preview and reveal screens. The colours are plain CSS variables at the top of
`style.css`; a pack with more than three columns cycles through them.

- All three are kept at 4.5:1 contrast or better on the paper colour, for legibility.
- The palette is **not** designed to be colour-blind-safe (the owner's decision). The same
  information is carried without colour by the order of the words and the numerals I, II, III.
- The Britannica article supports red and blue as the hand-applied colours (the 42-line Bible's
  headers, initials and sentence markers). It does not mention green; green is a design choice.

## Awkward is allowed

Untidiness is part of the look: a one-line paragraph beside a tall drop cap, a column heading that
wraps, unequal columns. Only fix real defects (overlap, unreadable text, broken tap targets), not
things that are merely awkward.

## Mobile first (the real constraint)

Most play will be on phones, so the "cramped" feel comes from type and rules, never from
shrinking tap targets. Rows are at least 44px tall (ruled like a printed table), columns stack on
a phone with sticky headings, the page (not an inner box) scrolls, and the live insult, column
tabs and the imprint button live in a fixed bottom bar. Wide screens get three unequal columns.

## Sources, and their limits

The principles above were checked against one source the project owner supplied:

- Philip B. Meggs and the Britannica Editors, "Early printing and graphic design", in *graphic
  design* (Encyclopaedia Britannica, article dated 19 Sep 2026). A general reference work, not
  a peer-reviewed source. It supports: the compositor acting as designer; spaces left for
  hand-added initials; red and blue added by hand to printed pages (the 42-line Bible);
  hand-coloured initials inside woodblock borders (Regiomontanus, *Calendarium*, 1476); the
  first complete title page (1476); modular woodblock borders framing columns (Tory, 1531);
  the 17th century reusing the existing stock of types, woodcuts and ornaments; and Neoclassical
  printers preferring sparse pages with generous margins (Bodoni).
- It does **not** cover English broadsides specifically, so the following are the author's own
  choices, not sourced claims: the pseudo-archaic spellings in the flavour copy ("signe",
  "Columnes"), the particular ornament characters, and the exact amount of off-register.
- It does not say that red-and-black *two-colour press printing* was typical; it describes
  colour applied by hand. The red here is therefore described as hand-applied.

The IM Fell fonts are digital revivals of types in the style of the period. How closely they
match what a given Elizabethan printer used has not been verified.
