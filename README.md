# Cookr

Cookr is an MVP cooking assistant for New Zealand users who want to reduce takeaways and cook simple, affordable meals with guided support.

Built by [John Finnerty](https://johnfinnerty.co.nz), a software developer and tech consultant based in Christchurch, New Zealand. More project and contact context is available at [finnerty.me](https://finnerty.me).

Project case study: [Cookr Case Study](https://www.johnfinnerty.co.nz/projects/cookr.html)

## Live Beta

Open Cookr here:

[https://johnfinnertynz.github.io/Cookr/](https://johnfinnertynz.github.io/Cookr/)

Install on a phone:
- iPhone: open the link in Safari, tap Share, then Add to Home Screen.
- Android: open the link in Chrome, open the menu, then Add to Home screen or Install app.

## Stack
- React 19
- TypeScript
- Vite
- CSS custom properties
- Supabase-ready PostgreSQL schema in `docs/schema.sql`

## Features
- First-use onboarding for confidence, goals, dietaries, time, budget, dislikes, appliances, and pantry items.
- Recipe recommendation scoring based on user profile.
- Recipe discovery filters for fast, cheap, high protein, beginner, one-pot, vegetarian, meal prep, and NZ supermarket-friendly meals.
- Weekly plan preview, favourites, repeat meals, leftovers prompts, and beginner lessons.
- Weekly planner that proposes a rotation, ingredient-overlap meals, and a starter pantry bundle.
- Recipe variants for easier, cheaper, higher-protein, vegetarian, and no-chop swaps.
- Grocery list generator that merges ingredients and marks pantry staples.
- Woolworths NZ shopping assistant using compliant search links and manual product matches.
- Step-by-step cooking mode with prep checklist, scaled servings, cooking terms, substitutions, and panic help.
- Local-first account/sync panel with Supabase magic-link support when env vars are configured.
- On-device analytics dashboard, post-cook feedback capture, PWA install support, offline shell caching, and system dark mode.

## Legal and Reliability Notes
- Seed recipes are Cookr-original/manual curation and include source/licensing notes.
- Do not import copyrighted recipe instructions unless permission or a compatible licence is confirmed.
- Woolworths NZ product matching is a search-link/manual mapping prototype. It does not scrape product result pages, automate baskets, or claim checkout integration.
- Prices are estimates and can vary by location, date, store, specials, and product size.

## Setup

```bash
npm install
npm run dev
```

Optional Supabase auth/sync setup:

```bash
cp .env.example .env
# fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

Build and lint:

```bash
npm run build
npm run lint
```

Smoke test after starting the dev server:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
npm run qa:smoke
```

## Important Files
- `src/App.tsx`: complete MVP app shell and views.
- `src/data/recipes.ts`: seed recipe catalogue.
- `src/data/recipeGrowth.ts`: Cookr-original growth catalogue templates.
- `src/data/products.ts`: Woolworths search-link/manual matching prototype.
- `src/lib/recommendations.ts`: scoring and filtering.
- `src/lib/planner.ts`: weekly planner and starter pantry bundle logic.
- `src/lib/recipeVariants.ts`: easier/cheaper/protein/no-chop swap suggestions.
- `src/lib/account.ts`: local-first account and Supabase magic-link bridge.
- `src/lib/grocery.ts`: grocery merge and basket estimates.
- `docs/PRD.md`: product requirements.
- `docs/UX_FLOW.md`: user flow.
- `docs/ARCHITECTURE.md`: technical architecture.
- `docs/PRODUCTION_ARCHITECTURE.md`: scalable startup architecture, APIs, recommendation engine, ingestion, caching, security, and roadmap.
- `docs/PRODUCTION_READINESS_AUDIT.md`: production-readiness findings, fixes, residual risk, and launch scores.
- `docs/BETA_TEST_REPORT.md`: real-user beta simulation report, fixes, blockers, and next improvements.
- `docs/APP_STORE_READINESS.md`: app store metadata, screenshots plan, privacy/terms draft, and beta checklist.
- `docs/schema.sql`: Supabase-ready schema.
- `docs/schema.production.sql`: production-oriented normalized Supabase/Postgres schema.
- `docs/TESTING_CHECKLIST.md`: QA checklist.

## Product Matching Approach
Cookr maps common ingredient names to curated Woolworths NZ search links and approximate product descriptions. If a mapping is uncertain, the UI flags confidence and sends the user to a Woolworths search page to choose manually.
