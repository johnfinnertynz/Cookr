# Cookr

Cookr is an MVP cooking assistant for New Zealand users who want to reduce takeaways and cook simple, affordable meals with guided support.

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
- Grocery list generator that merges ingredients and marks pantry staples.
- Woolworths NZ shopping assistant using compliant search links and manual product matches.
- Step-by-step cooking mode with prep checklist, scaled servings, cooking terms, substitutions, and panic help.
- Mobile-first responsive UI with system dark mode.

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

Build and lint:

```bash
npm run build
npm run lint
```

## Important Files
- `src/App.tsx`: complete MVP app shell and views.
- `src/data/recipes.ts`: seed recipe catalogue.
- `src/data/products.ts`: Woolworths search-link/manual matching prototype.
- `src/lib/recommendations.ts`: scoring and filtering.
- `src/lib/grocery.ts`: grocery merge and basket estimates.
- `docs/PRD.md`: product requirements.
- `docs/UX_FLOW.md`: user flow.
- `docs/ARCHITECTURE.md`: technical architecture.
- `docs/PRODUCTION_ARCHITECTURE.md`: scalable startup architecture, APIs, recommendation engine, ingestion, caching, security, and roadmap.
- `docs/schema.sql`: Supabase-ready schema.
- `docs/schema.production.sql`: production-oriented normalized Supabase/Postgres schema.
- `docs/TESTING_CHECKLIST.md`: QA checklist.

## Product Matching Approach
Cookr maps common ingredient names to curated Woolworths NZ search links and approximate product descriptions. If a mapping is uncertain, the UI flags confidence and sends the user to a Woolworths search page to choose manually.
