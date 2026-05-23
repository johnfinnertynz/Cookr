# Technical Architecture

## MVP Stack
- React 19 + Vite for the frontend.
- TypeScript for domain models and scoring logic.
- CSS custom properties and responsive CSS for mobile-first design.
- Local static seed data for recipes and Woolworths product matches.
- Supabase/PostgreSQL-ready schema documented in `docs/schema.sql`.

## Runtime Modules
- `src/data/recipes.ts`: manually curated recipe seed data with licensing notes.
- `src/data/products.ts`: Woolworths NZ search-link/manual product matching prototype.
- `src/lib/recommendations.ts`: profile-based ranking and filter logic.
- `src/lib/grocery.ts`: grocery merge, pantry checks, and basket estimate.
- `src/lib/cookingHelp.ts`: cooking definitions, substitutions, and panic help.
- `src/App.tsx`: app shell, onboarding, discovery, detail, shopping, cooking, and learning views.

## Future Backend Shape
- Move recipe, ingredient, product match, pantry, saved recipe, meal plan, and grocery line entities to Supabase.
- Add API routes for `/api/recommendations`, `/api/grocery-list`, and `/api/product-match`.
- Keep product matching as a manual/search-link assistant unless Woolworths provides an approved API or explicit permission.
- Add authenticated profiles, household pantry, saved plans, and analytics once the UX loop is validated.

For the full production design, see `docs/PRODUCTION_ARCHITECTURE.md` and `docs/schema.production.sql`.

## Woolworths NZ Compliance Position
The MVP uses user-clicked search URLs and manual curated matches only. It does not scrape Woolworths search pages, trolley, checkout, account, or secure areas. Estimated prices are labelled as estimates because they vary by store, date, specials, and product size.
