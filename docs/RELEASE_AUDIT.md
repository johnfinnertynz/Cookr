# Cookr Release Candidate Audit

Date: 2026-05-24
Scope: production-readiness pass for a public beta candidate. The app is no longer in MVP expansion mode, so this audit prioritises trust, completion, reliability, mobile usability, and app-store readiness over new functionality.

## Executive Summary

Cookr has a strong product spine: onboarding, recommendation modes, weekly planning, grocery list generation, cooking mode, local-first persistence, offline support, and Woolworths NZ search links. The main release-candidate risks were not missing features. They were trust leaks: technical wording in consumer UI, a starter-style app icon, overconfident "fakeaway" labels, a few generated recipe combinations that sounded less credible, large cooking-mode typography, and supermarket-list touch targets that felt less practical on a phone.

## Critical Issues

1. Recipe catalogue trust risk
   - Status: Fixed.
   - Finding: The growth recipe generator allowed all flavour boosts on every template, creating a few combinations that sounded less like a real cooking app.
   - Fix: Added template-level flavour gates for formats where some boosts are not credible.
   - Risk remaining: Full recipe editorial QA is still needed before wide launch.

2. Consumer UI leaked implementation language
   - Status: Fixed.
   - Finding: Account copy referenced Supabase and env vars, which reads as prototype plumbing to real users.
   - Fix: Reworded account and sync states around private beta backup, local device saving, and sign-in links.
   - Risk remaining: Production privacy policy and support copy must match the actual analytics and sync configuration.

3. Cooking mode readability and action access
   - Status: Fixed.
   - Finding: Step text was oversized on desktop and could push actions below the fold on small phones.
   - Fix: Reduced type scale, added clearer step labels, improved timer and clean-as-you-go cue, and made mobile step actions sticky above bottom nav.
   - Risk remaining: Needs testing on physical iPhone Safari and Android Chrome.

4. App identity felt template-like
   - Status: Fixed.
   - Finding: The favicon/PWA icon was a generic purple mark unrelated to Cookr.
   - Fix: Replaced with a simple Cookr-specific cooking icon and updated web metadata.
   - Risk remaining: App Store and Play Store will need PNG icons at required sizes.

## Important Issues

1. Onboarding cognitive load
   - Status: Fixed.
   - Finding: The first-use form was useful but a little intimidating for low-energy users.
   - Fix: Added default-friendly setup guidance, no-account reassurance, and "change later" copy near the CTA.
   - Risk remaining: A true progressive onboarding flow should be A/B tested later.

2. Recipe card labels overpromised "fakeaway"
   - Status: Fixed.
   - Finding: Non-fakeaway recipes could still display a "fakeaway" label.
   - Fix: Added contextual labels: takeaway swap, low-effort dinner, meal prep, 15-minute dinner, or weeknight dinner.

3. Feedback strip could become a nag
   - Status: Fixed.
   - Finding: After cooking, the feedback prompt stayed until acted on.
   - Fix: Added dismiss and auto-dismiss after feedback.

4. Grocery list supermarket usability
   - Status: Fixed.
   - Finding: Checkbox and Woolworths-link targets were usable but not supermarket-friendly on phones.
   - Fix: Increased grocery row touch targets, made links look tappable, and used safer state updates for checked items.

5. Accessibility polish
   - Status: Fixed.
   - Finding: Favourite buttons did not distinguish save vs unsave for screen readers, and focus styles were basic.
   - Fix: Added state-aware aria labels and stronger focus-visible styling.

6. Store metadata and installability
   - Status: Fixed.
   - Finding: Metadata was present but incomplete for social preview, dark-mode theme colour, manifest id/scope, and iOS install polish.
   - Fix: Added OpenGraph/Twitter metadata, apple touch icon link, dark-mode theme colour, manifest id/scope, and service worker cache version bump.

7. Recommendation results felt too repetitive
   - Status: Fixed.
   - Finding: The ranked grid could show too many flavour variants from the same recipe family in a row.
   - Fix: Added a display-level diversity pass so first-screen results show broader meal choices before alternates.

## Nice To Have

1. Replace remote recipe imagery with owned or licensed app assets for launch marketing consistency.
2. Add production analytics consent and server-side event ingestion.
3. Add server-backed account deletion/export flows before public account launch.
4. Add full editorial QA workflow for generated original recipes.
5. Add real-device QA matrix with iPhone Safari, Android Chrome, slow network, offline, and installed PWA paths.

## Human Realism Pass

- Tired office worker: Needs one visible action, low effort copy, and a no-shame fallback. Cooking mode and mode selector now support this better.
- Broke student: Needs price caveats, cheap filters, and grocery reuse. Existing weekly and grocery logic works, but price estimates must stay clearly labelled.
- Parent: Needs family-friendly weekly planning and fewer dead ends. Weekly plan remains the right entry point.
- ADHD user: Needs fewer decisions and sticky next actions. Onboarding guidance and sticky cooking controls reduce drop-off.
- Anxious beginner: Needs visual cues, panic help, and non-overconfident safety wording. Safety note and cooking mode are clearer now.
- Low-energy user: Needs Cookr to make cooking easier than ordering. Tonight modes, starter recommendations, and low-effort labels are the strongest differentiator.
- Weight-loss or gym user: Needs protein signals without medical claims. Protein remains estimated and displayed as guidance.

## Remaining Release Risks

1. Recipe and nutrition estimates need editorial review before broad marketing claims.
2. Woolworths product links are search-assistant links, not product availability guarantees.
3. Local-first beta mode needs production privacy wording before app-store review.
4. Physical-device QA is still required; browser automation cannot fully verify keyboard, install banners, or OS-level safe areas.
5. The current app is frontend-heavy; production scale will require moving search, sync, and analytics behind durable APIs.

## Readiness Scores

- Production readiness: 82/100.
- App Store beta readiness: 78/100.
- Public launch readiness: 68/100.

The app is credible for an internal or TestFlight-style beta after real-device QA and policy document finalisation. It should not be marketed broadly until recipe editorial QA, production analytics consent, and account data controls are complete.
