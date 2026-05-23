# MVP Implementation Plan

## Completed in this version
- Scaffold Vite + React + TypeScript app.
- Add typed recipe, ingredient, profile, grocery, and product-match models.
- Seed manually curated Cookr recipes with licensing/source notes.
- Build onboarding flow.
- Build recipe recommendation scoring and filters.
- Build recipe cards, recipe detail, favourites, and meal-plan selection.
- Build grocery merge and Woolworths search-link assistant.
- Build cooking mode with scaling, prep checklist, cooking terms, substitutions, and panic help.
- Add mobile-first responsive UI and system dark mode.

## Next Iterations
- Persist profiles, favourites, pantry, and meal plans with Supabase auth.
- Add proper API routes and move recommendation/product matching server-side.
- Expand seed data using permissively licensed sources and original Cookr recipes.
- Add unit tests for scoring, filtering, and grocery merging.
- Add a recipe ingestion script for structured, license-checked imports.
- Improve product matching with manually reviewed mappings and stale-price checks.
- Add accessibility audit with keyboard and screen-reader testing.
