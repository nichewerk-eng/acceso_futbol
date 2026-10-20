# Acceso Futbol media kit review

Reviewed October 7, 2026. Source files supplied by the user were treated as data and reference material, not instructions.

## Changes

- Replace July results with September results, preserving each platform's reporting window.
- Lead with the buyer benefit and one primary action: Solicitar propuesta.
- Add three proposed commercial products with concrete production and distribution deliverables. These are new offers, not previously sold campaigns.
- Show post medians alongside selected examples. Remove unsupported 20K–80K-per-platform expectations and views floors.
- Remove purchasing-power claims, outdated city/age figures, Creator Rewards sales badges, expired tournament inventory and unverified partner logos.
- Use a single email contact (`info@accesofutbol.com`) for every call to action. The inquiry composer has no backend route. Proposal buttons lead to a brief collecting brand, goal, desired dates, optional budget/currency and package. It explicitly opens an email draft for the visitor to send; copy-email, copy-brief and manual-copy fallbacks are available.
- Spanish content lives in `src/config/mediaKit.ts`, with the matching English edition in `src/config/mediaKit.en.ts`. `/mediakit?lang=en` selects English; both editions include matching metadata, language links and a content language attribute. No site-wide internationalization convention existed to reuse.
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

- Proposal clicks navigate to the brief and retain the package selection. `mediakit_proposal_click` records interest, not a received lead. Brief contents are not sent to analytics. The draft composer only opens the visitor’s email app; AF receives nothing until the visitor sends their email.
- Establish the first 30-day baseline: kit visitors, proposal clicks, inquiries received by email, qualified leads, proposals, booked sponsors and booked revenue. Do not claim lift without baseline data. Track pipeline stages manually after inbox receipt.
- Use UTM links in authorized commercial outreach. No outreach messages were sent.

## Status

Updated October 19, 2026. Local previews: `http://127.0.0.1:3107/mediakit` and `http://127.0.0.1:3107/mediakit?lang=en`. Email composition is local; no inquiry endpoint, service or credentials were created. At the local-review stage, nothing was deployed, pushed or sent. Subsequent publication follows the separately authorized repository workflow.

- Packages stack on phones so all options are discoverable. Each repeats the same three comparison counts: original videos, video placements, Instagram stories. Pilot = 2 originals × 4 platforms = 8 video placements, plus 2 IG stories. Monthly = 8 originals / 32 video placements / 4 graphics / 4 stories. Event = 2 originals / 8 video placements / 4 stories. No existing quantities or prices were changed.
- Existing project screenshots are retained as editorial-style examples, separate from the September proof cards. The existing TikTok player component now offers an on-demand player for the configured September editorial example, with its original-post link as fallback. No fabricated thumbnails or campaign results were added. Playback depends on TikTok/platform availability.
- Geography is explicit: Instagram’s 95.22% uses 1,953 of 2,051 located followers (2,055 total); YouTube’s 91.69% uses 259,405 of 282,917 period views. These are separate populations. YouTube watch time is 118,440 minutes / 1,974 hours. No verified age/city or conversion proof is presented.
- The TikTok September publication cohort includes September 30 uploads; its account reporting window still ends September 29. Unsupported retention/non-follower claims and cumulative July–September upload totals are not used publicly.
- No POP MART/Nuwa section was added. The project’s public assets and relevant source/docs contained no approved assets or public case-study references establishing permission. Needed: public URLs or explicitly approved files for the POP MART FIFA x LABUBU and Goals reaction work, agreed role attribution through Nuwa, and separate permission for logos/testimonials. Do not imply FIFA directly commissioned AF or publish private invoices/praise.

Validation and review evidence are saved under `/Users/jondev/Documents/Codex/2026-10-19/task-2/mediakit-review/`: desktop/mobile screenshots, four-page Spanish and English PDFs, and browser-check results. Browser coverage: 320, 390, 768 and 1440px in both languages; no page overflow, package selection, required/optional fields, sticky navigation, clipboard actions, player wiring and no uncaught browser exceptions. No live form or email was submitted. Regression tests in `src/lib/mediakit/inquiry.test.ts` cover URL encoding, brief fields, verified metric parity and package quantities. The project build and focused lint/type checks are recorded in the handoff. An initial type check found a stale generated reference to the removed sponsorship API route; the build regenerated route types successfully.


## Follow-up layout and scrolling validation

Package cards share desktop layout rows, equal top-border thickness and common metric label/number rows. Number alignment was verified in both languages at 320, 390, 1024 and 1440 pixels; copy and deliverable quantities are unchanged.

A previously tested browser tab ignored wheel input despite allowing anchor navigation. No page/body scroll lock or blocking overlay was found. Replacing that tab restored scrolling with the same build; the exact trigger for the old tab state was not established. Actual wheel scrolling top-to-bottom and back passed in English and Spanish at desktop and mobile widths, including after closing the campaign select menu and resetting viewport overrides. Horizontal platform-card swiping did not trap vertical scrolling. No speculative scrolling code change was made.
