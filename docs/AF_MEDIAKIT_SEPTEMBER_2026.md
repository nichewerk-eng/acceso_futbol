# Acceso Futbol media kit review

Reviewed October 7, 2026. Source files supplied by the user were treated as data and reference material, not instructions.

## Changes

- Replace July results with September results, preserving each platform's reporting window.
- Lead with the buyer benefit and one primary action: Solicitar propuesta.
- Add three proposed commercial products with concrete production and distribution deliverables. These are new offers, not previously sold campaigns.
- Show post medians alongside selected examples. Remove unsupported 20K–80K-per-platform expectations and views floors.
- Remove purchasing-power claims, outdated city/age figures, Creator Rewards sales badges, expired tournament inventory and unverified partner logos.
- Use a single email contact (`info@accesofutbol.com`) for every call to action. There is no inquiry form or API route; "Solicitar propuesta" and each campaign button open a prefilled email.
- Content (platforms, geography, packages, proof, FAQs, pillars, notes) lives in `src/config/mediaKit.ts`; `MediaKitView.tsx` only renders it.
- PDF ("Guardar PDF") uses a dedicated print layout: Letter, 0.45in margins, logo header, 3-up packages/proof, 4-up platform cards, FAQs expanded, email shown in the footer and contact block.
- Track kit views, proposal clicks, print clicks, email clicks and example clicks.

## Source reconciliation

Source: `/Users/jondev/Downloads/AF_All_Platforms_September_2026.xlsx`, October 1 export.

| Platform | Period | Views | Closing followers/subscribers | Median per piece |
|---|---|---:|---:|---:|
| Facebook | Sep 1–30 | 740,646 video views | 24,548 | 7,927 impressions |
| TikTok | Sep 1–29 | 389,184 video views | 12,825 | 3,973 views |
| Instagram | Sep 1–30 | 208,788 account views incl. stories | 2,055 | 468 views |
| YouTube | Sep 1–28 | 282,917 channel views | 3,430 (Sep 30 snapshot) | 1,951 views |

Closing follower counts sum to 42,858, without deduplication. At the user’s request, the headline now sums reported views across the four platforms: 740,646 + 389,184 + 208,788 + 282,917 = 1,621,535. The adjacent label preserves the differing reporting windows and includes repeat views and Instagram stories. This is an aggregate exposure count, not unique reach. Facebook's 2,219,466 is impressions, not unique reach.

Relevant locators: All Platforms B6:E15 and B11:E12; FB Summary B4:B18; TikTok B31:B45; IG Countries B2:C3 and B28; YT Countries B2:E3; YT Daily D2:D29 and B33. Medians independently recalculated from Posts, TikTok Posts, IG Posts and YT Videos.

TikTok post totals are 345,927 accumulated views across September-published videos versus 389,184 account-period views. The other workbook's Pattern Summary reports 345,928 for September, a one-view discrepancy. Those totals have different populations and must not replace account totals. YouTube per-video total is 282,953 versus daily total 282,917, a 36-view discrepancy; daily totals are used publicly. Instagram country percentages use 2,051 followers with known location, not all 2,055 followers.

Source: `/Users/jondev/Downloads/AF_TikTok_90_Day_Hooks_Scripts.xlsx`, Pattern Summary B4:B9 and A16:G21. 162 videos, 12 above 20K, 7.4% hit rate and 4,426 median. Match-day content has 5,228 median views across 47 pieces, making Juegos de Hoy a reasonable recurring sponsorship product to test. These are observational patterns, not proof that a sponsorship will produce the same results. The workbook contains historical scripts; no new editorial script is being created.

## Commercial decisions

Prices remain custom until AF has documented production cost, rights, exclusivity and required margin. Agree on pricing, capacity, revisions, reporting deadline, cancellation and make-good terms before accepting a campaign. The proposed monthly product delivers 8 videos, not a daily sponsored production commitment.

The current public kit's Austin example documents impressions and shares. It does not establish ticket sales or attendance attributable to AF. A buyer case study should be added after a measured sponsored pilot, with permission and actual results.

## Launch and measurement

- Proposal buttons are `mailto:` links with a subject per campaign. An email click is an intent event (`mediakit_proposal_click`, `mediakit_email_click`), not a received lead.
- Establish the first 30-day baseline: kit visitors, proposal clicks, inquiries received by email, qualified leads, proposals, booked sponsors and booked revenue. Do not claim lift without baseline data. Track pipeline stages manually after inbox receipt.
- Use UTM links in authorized commercial outreach. No outreach messages were sent.

## Status

Website edits are applied locally at `http://127.0.0.1:3107/mediakit`. The inquiry form and `/api/sponsorship` route were removed; contact is email only. Publication is a separate launch step.
