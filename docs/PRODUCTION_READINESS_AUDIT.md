# Production Readiness Audit

## Audit Findings

### UX/UI Polish
- The original MVP led with recipe browsing, which creates decision fatigue. The app now opens around Tonight mode and a single best recommendation.
- Recipe cards lacked active time, effort, and a clear quality hierarchy. Cards now show active time, cost, protein, fit reasons, and an effort meter.
- Empty states were missing. Search/filter and shopping now have recovery actions.
- The app had limited error resilience. It now has an error boundary, offline banner, and local state recovery messaging.

### Mobile Readiness
- The app now includes PWA manifest metadata, safe-area viewport handling, a service worker shell cache, bottom navigation safe-area spacing, and one-handed mode cards.
- Cooking mode keeps prep, current step, visual cue, timer prompt, and panic help in a single mobile-friendly flow.
- Horizontal overflow is covered by the smoke test.

### Performance
- Search input uses deferred filtering.
- Recommendation and grocery calculations are memoized by profile/context/plan.
- Recipe images use lazy loading and async decoding.
- State persistence avoids backend dependency for the MVP and supports offline demo use.

### Data Quality
- Ingredients now carry canonical names.
- Grocery merging uses canonical ingredient names and normalized units where safe.
- Product mappings were filled for all current seed recipe product keys.
- Recipe metadata now includes active time, effort score, visual cues, skill tips, and leftover ideas.

### Recommendation Quality
- Scoring now accounts for Tonight mode, energy level, time of day, pantry overlap, prior cooked/repeat feedback, too-hard feedback, budget, appliances, cleanup, and effort.
- The home screen always offers an easier fallback when available.

### Beginner Experience
- Cooking mode now includes "what should this look like?" cues and a "too hard" escape path.
- Recipe detail highlights a beginner-safe tip before ingredients.
- Onboarding asks for blockers, energy, and schedule reality.

### Retention
- Local interaction history tracks saves, cooking completion, too-hard feedback, and repeat behaviour.
- Repeated recipes are rewarded in scoring without cringe gamification.
- Weekly plan surface shows cooked count, ingredient overlap, and leftovers.

### Error Handling and Resilience
- Error boundary protects the entire app.
- Offline state is visible and non-blocking.
- Woolworths matching remains search-link only with clear price/availability uncertainty.
- Smoke test exercises onboarding, Tonight mode, cooking, grocery, console errors, and mobile overflow.

## Improvements Made
- Added persisted app state with versioned local storage keys.
- Added local analytics event queue.
- Added PWA manifest, service worker, app metadata, mobile viewport fit.
- Added canonical ingredient normalization and safer grocery deduplication.
- Added recommendation context and interaction-aware scoring.
- Added richer recipe metadata for beginner guidance and retention.
- Added mobile-first UI polish, transitions, search, empty states, offline banner, and safe-area handling.
- Added `npm run qa:smoke`.

## Remaining Risks
- No real backend auth or Supabase persistence is wired into the runtime MVP yet.
- Service worker is intentionally simple and should be replaced by a Workbox-style strategy before launch.
- Nutrition and prices remain estimates.
- Woolworths product matching is manual/search-link only.
- Recipe catalogue is still small and manually curated.
- No automated unit test suite yet.
- No native iOS/Android wrapper yet.

## Prioritized TODO

1. Migrate runtime app to Next.js + Supabase auth and persistence.
2. Add unit tests for recommendation scoring, grocery dedupe, ingredient normalization, and event tracking.
3. Build admin review tooling for recipe ingestion and product matching.
4. Add backend event ingestion with consent-aware analytics.
5. Add real offline cooking-session storage and update prompts.
6. Expand recipe catalogue with licensed/original NZ-friendly recipes.
7. Add accessibility testing with screen reader and large text settings.
8. Add TestFlight/internal beta feedback loops.

## Scores

- Production readiness score: 64/100.
- Launch readiness score: 48/100.

The app is now a much stronger beta-quality prototype, but launch readiness still depends on backend persistence, content scale, legal review, app-store assets, and privacy/terms publication.
