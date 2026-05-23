# Cookr Production Architecture

## 1. Architecture Summary

Cookr should be built as a mobile-first Next.js product backed by Supabase/Postgres. The backend API must be reusable by web, native mobile, background jobs, and future partners. The core systems are:

- Recipe catalogue and taxonomy.
- Ingredient canonicalization and unit conversion.
- Recommendation engine.
- Meal planning and pantry memory.
- Grocery list generation and deduplication.
- Woolworths NZ product matching.
- Search and filtering.
- Analytics feedback loop.

The guiding technical principle: keep authoritative domain logic server-side, but keep the mobile UI optimistic and fast. The client should be able to render cached recommendations instantly, then reconcile with fresh server scores.

## 2. Recommended Stack

- Next.js App Router with TypeScript.
- Tailwind CSS with design tokens for mobile-first UI.
- Supabase Auth, Postgres, Storage, Edge Functions, and scheduled jobs.
- Postgres full-text search plus trigram search for MVP and beta.
- Optional Meilisearch/Typesense once catalogue size or typo-tolerant UX requires it.
- Vercel for web deployment and edge caching.
- Sentry for errors, PostHog or Amplitude for product analytics.
- OpenAI or similar model provider only for assisted classification, not as the source of truth.

## 3. System Boundaries

Frontend:
- Renders onboarding, Tonight modes, recipe discovery, plan, shop, cook, and progress.
- Uses server components for public recipe pages and cached discovery surfaces.
- Uses client components for onboarding, filters, shopping checklist, timers, and cooking mode.

Backend API:
- Owns profile reads/writes, recommendations, grocery list generation, product matching, events, and ingestion status.
- Does not expose service-role Supabase keys to browsers.

Postgres:
- Source of truth for recipes, ingredients, canonical ingredients, products, plans, pantry, events, and feedback.
- Public recipe reads are allowed through controlled policies or API views.
- User-owned data is protected by Row Level Security.

Jobs:
- Recipe ingestion and validation.
- Product matching refresh.
- Price estimate refresh where permitted.
- Search index refresh.
- Recommendation snapshot generation.

## 4. Folder Structure

```txt
apps/
  web/
    app/
      (public)/
      (authed)/
      api/
    components/
      ui/
      onboarding/
      tonight/
      recipes/
      shopping/
      cooking/
      progress/
    lib/
      supabase/
      analytics/
      cache/
    styles/
packages/
  domain/
    recipes/
    ingredients/
    recommendations/
    grocery/
    taxonomy/
    nutrition/
    pricing/
    units/
  api-contracts/
    schemas/
    types.ts
  jobs/
    ingestion/
    product-matching/
    search-indexing/
supabase/
  migrations/
  functions/
  seed/
docs/
```

For the current Vite MVP, the equivalent production modules can live under `src/lib/*` until migration.

## 5. Database Design

Use normalized tables for stable facts and JSONB only for flexible metadata, ingestion diagnostics, or feature snapshots. Main groups:

- Identity: `user_profiles`, `households`, `household_members`.
- Preferences: `user_preferences`, `dietary_preferences`, `appliances`.
- Recipes: `recipes`, `recipe_steps`, `recipe_ingredients`, `recipe_taxonomy_tags`.
- Taxonomy: `taxonomies`, `taxonomy_terms`.
- Ingredients: `canonical_ingredients`, `ingredient_aliases`, `ingredient_substitutions`.
- Units: `units`, conversion rules in application code plus DB references.
- Supermarket: `retailers`, `retailer_categories`, `retailer_products`, `ingredient_product_matches`.
- Planning: `meal_plans`, `meal_plan_items`, `cooking_sessions`.
- Pantry: `pantry_items`, `inventory_events`.
- Grocery: `grocery_lists`, `grocery_list_items`.
- Feedback: `recipe_feedback`, `recommendation_events`, `analytics_events`.
- Ingestion: `recipe_sources`, `recipe_ingestion_runs`, `recipe_ingestion_candidates`.

See `docs/schema.production.sql` for an example.

## 6. API Design

Use route handlers for web and mobile clients. All endpoints return typed JSON using shared Zod schemas.

### Auth and Profile

- `GET /api/me`
- `PATCH /api/me/profile`
- `PATCH /api/me/preferences`
- `GET /api/me/pantry`
- `POST /api/me/pantry/items`
- `PATCH /api/me/pantry/items/:id`
- `DELETE /api/me/pantry/items/:id`

### Onboarding

- `POST /api/onboarding/complete`
- `GET /api/onboarding/options`

### Recommendations

- `POST /api/recommendations/tonight`
- `POST /api/recommendations/weekly-plan`
- `POST /api/recommendations/emergency`
- `POST /api/recommendations/similar`
- `POST /api/recommendations/feedback`

Request example:

```json
{
  "mode": "no_energy",
  "timeAvailableMinutes": 15,
  "energyLevel": 1,
  "craving": "curry",
  "goal": "high_protein",
  "servings": 2,
  "pantryIngredientIds": ["rice", "soy-sauce"]
}
```

### Recipes

- `GET /api/recipes/:id`
- `GET /api/recipes/search?q=&tags=&maxTime=&difficulty=&dietary=`
- `POST /api/recipes/:id/save`
- `DELETE /api/recipes/:id/save`
- `POST /api/recipes/:id/cooked`
- `POST /api/recipes/:id/too-hard`

### Grocery and Products

- `POST /api/grocery/list`
- `PATCH /api/grocery/lists/:id/items/:itemId`
- `POST /api/products/match`
- `GET /api/products/search-link?ingredient=`
- `POST /api/products/feedback`

### Cooking

- `POST /api/cooking/sessions`
- `PATCH /api/cooking/sessions/:id`
- `POST /api/cooking/sessions/:id/help`
- `POST /api/cooking/sessions/:id/complete`

### Analytics

- `POST /api/events`

Events should be batched client-side and sent after hydration or during idle time.

## 7. Recommendation Engine Architecture

### Pipeline

1. Candidate generation:
   - Filter hard constraints: dietary, allergies, appliance availability, max time, household size.
   - Include user rotations, saved recipes, emergency recipes, and pantry-fit recipes.
   - Exclude recently rejected or too-hard recipes unless user asks.

2. Feature extraction:
   - Recipe features: active time, total time, dish count, step count, chopping required, technique difficulty, protein, price, pantry overlap, ingredient count, waste score.
   - User features: confidence, energy, schedule, goals, repeat tolerance, past completions, abandonment, pantry.
   - Context features: day/time, post-gym, payday/budget, weather later if useful, shopping status.

3. Scoring:
   - Practicality score.
   - Craving replacement score.
   - Confidence fit score.
   - Pantry/overlap score.
   - Health/protein score.
   - Novelty/repeat balance.
   - Waste reduction score.

4. Re-rank:
   - Ensure diversity.
   - Always include an easier fallback.
   - Cap cognitive load to 1 to 3 recommendations in Tonight mode.

5. Explain:
   - Return short reasons: "15 min", "uses your rice", "one pan", "high protein".

### Recommendation Pseudocode

```ts
function recommendTonight(user, context) {
  const hardConstraints = buildHardConstraints(user, context)
  const candidates = getCandidates(hardConstraints)

  const scored = candidates.map((recipe) => {
    const features = extractFeatures(recipe, user, context)
    return {
      recipe,
      score:
        0.22 * features.energyFit +
        0.18 * features.timeFit +
        0.16 * features.confidenceFit +
        0.14 * features.pantryFit +
        0.12 * features.cravingFit +
        0.08 * features.proteinGoalFit +
        0.06 * features.budgetFit +
        0.04 * features.noveltyFit,
      reasons: explain(features),
    }
  })

  const ranked = diversify(scored)
  return {
    best: ranked[0],
    easierFallback: firstWhere(ranked, isLowerEffortThan(ranked[0])),
    closestFakeaway: firstWhere(ranked, matchesCraving(context.craving)),
  }
}
```

### AI-Assisted Recommendations

Use AI to assist, not decide:
- Classify recipe difficulty and beginner risks.
- Generate plain-English step clarifications.
- Suggest substitutions from approved canonical ingredients.
- Summarize why a meal fits a user.

Do not let AI invent nutrition, prices, product availability, allergens, or licensed recipe instructions without validation.

## 8. Recipe Taxonomy

Primary dimensions:

- Meal type: dinner, lunch, breakfast, snack, meal prep.
- Effort mode: no-energy, emergency-15, low-effort, normal, project.
- Takeaway replacement: curry, noodles, pizza, burger, wrap, sushi, fried chicken, kebab, burrito bowl.
- Cooking method: no-cook, microwave, air-fryer, stovetop, oven, slow-cooker, rice-cooker, grill.
- Time: under-10, under-15, under-30, under-45, batch.
- Cleanup: one-bowl, one-pan, one-tray, low-cleanup, normal.
- Skill: complete-beginner, basic, comfortable, advanced.
- Goal: cheap, high-protein, high-fibre, lower-calorie, family, student, post-gym, leftovers.
- Dietary: vegetarian, vegan, gluten-free, dairy-free, halal-friendly, pescatarian.
- NZ fit: supermarket-friendly, freezer-friendly, lunchbox-friendly, flat-kitchen, limited-equipment.

Taxonomies should be controlled terms in the database, not free-form strings.

## 9. Ingredient Canonicalization

Canonical ingredient model:
- Canonical name: "chicken breast".
- Aliases: "chicken fillets", "skinless chicken breast", "diced chicken breast".
- Category: Meat and Seafood.
- Typical retailer category: Meat, Poultry.
- Default unit: grams.
- Density/conversion metadata where safe.
- Dietary flags.
- Allergen flags.
- Storage: chilled, frozen, pantry.
- Shelf-life estimate.

Canonicalization flow:

```ts
function canonicalize(rawIngredient) {
  const parsed = parseIngredient(rawIngredient)
  const normalizedName = normalizeText(parsed.name)
  const aliasHit = ingredientAliasIndex.get(normalizedName)
  if (aliasHit) return withConfidence(aliasHit.canonicalId, "high")

  const fuzzyHit = trigramSearchIngredient(normalizedName)
  if (fuzzyHit.score > 0.82) return withConfidence(fuzzyHit.id, "medium")

  const embeddingHit = semanticIngredientSearch(normalizedName)
  if (embeddingHit.score > 0.88) return withConfidence(embeddingHit.id, "medium")

  return queueForHumanReview(rawIngredient)
}
```

## 10. Units and Measurement Conversion

Handle unit conversion at two levels:

- Deterministic conversion: g to kg, ml to l, tsp to tbsp, tbsp to ml.
- Ingredient-specific conversion: cups to grams needs ingredient density, so store density only for reviewed canonical ingredients.

Rules:
- Never silently convert ambiguous units.
- Preserve original recipe quantity.
- Store normalized base quantity when confidence is high.
- Grocery deduplication can merge "500 g chicken breast" and "0.5 kg chicken breast".
- Do not merge "1 onion" and "100 g onion" unless canonical conversion is reviewed.

## 11. Grocery Deduplication

Deduping works by canonical ingredient, normalized unit, and purchase form.

```ts
function buildGroceryList(planItems, pantry) {
  const lines = new Map()

  for (const recipe of planItems) {
    for (const item of recipe.ingredients) {
      const canonical = canonicalize(item)
      const normalized = normalizeQuantity(item, canonical)
      const purchaseForm = choosePurchaseForm(canonical, normalized)
      const key = `${canonical.id}:${purchaseForm.unit}:${purchaseForm.retailerCategoryId}`

      lines.set(key, mergeLine(lines.get(key), item, normalized, recipe.id))
    }
  }

  return [...lines.values()]
    .map((line) => subtractPantry(line, pantry))
    .filter((line) => line.remainingQuantity > 0)
    .sort(byAisleThenName)
}
```

## 12. Woolworths Integration Architecture

Because Woolworths NZ robots rules disallow `/shop/searchproducts` and checkout/trolley/account areas, Cookr must not scrape search result pages or automate baskets without explicit permission.

Allowed MVP/beta approach:
- Store manual ingredient-to-product/search mappings.
- Generate user-clicked Woolworths search URLs.
- Let users choose products manually on Woolworths.
- Label availability and price as estimates.
- Cache only data we are licensed or permitted to store.

Future approved approach:
- Partner API or affiliate feed if available.
- Explicit written permission for product availability/pricing use.
- Respect rate limits, attribution, data retention, and product image licensing.

Product matching should prefer:
- Common affordable products.
- NZ-recognizable pack sizes.
- House-brand equivalents.
- Diet-compatible products.
- Lower uncertainty when exact brand/product is not needed.

### Product Matching Pseudocode

```ts
function matchIngredientToRetailerProduct(ingredient, user, retailer) {
  const canonical = canonicalize(ingredient)
  const manual = getManualMatch(canonical.id, retailer.id, user.dietary)
  if (manual) return manual

  const categoryMatch = getRetailerCategoryFallback(canonical.category, retailer.id)
  const query = buildSearchQuery(canonical, ingredient.purchaseForm)

  return {
    confidence: "low",
    productName: `Search ${retailer.name} for ${canonical.name}`,
    estimatedPrice: estimateFromHistoricalOrCategory(canonical),
    searchUrl: makeRetailerSearchUrl(retailer, query),
    requiresUserChoice: true,
  }
}
```

## 13. Search Architecture

MVP:
- Postgres full-text search on recipe title, description, cuisine, and tags.
- `pg_trgm` fuzzy search on recipe title and ingredient aliases.
- Indexed filters on tags, dietary flags, time, difficulty, cost, protein, appliances, and cleanup.

Beta:
- Materialized `recipe_search_documents` view refreshed on recipe publish.
- Ranking weights: title > takeaway category > tags > ingredients > source.
- Search suggestions from canonical ingredients and taxonomy terms.

Scale:
- Add Meilisearch or Typesense for typo tolerance, faceting, prefix search, and instant mobile search.
- Keep Postgres as source of truth.
- Rebuild search index asynchronously from recipe publish events.

## 14. Caching Strategy

Client:
- Cache current profile, pantry, last recommendations, active shopping list, and active cooking session in versioned local storage.
- Offline-friendly cooking mode after a session starts.

Next.js:
- Static and ISR for public recipe detail pages.
- Server component fetch caching for taxonomy and public recipe shells.
- `no-store` for personalized recommendations and pantry.
- Edge cache for public search facets, taxonomy options, and recipe images.

Backend:
- Cache recommendation snapshots per user/context for short TTLs.
- Cache product match lookups by canonical ingredient and retailer.
- Cache grocery list results by plan hash and pantry version.

Postgres:
- Use partial and composite indexes for common filters.
- Use materialized views for search documents and aggregated recipe facts.
- Avoid unbounded JSONB scans in user-facing paths.

## 15. Mobile Responsiveness Strategy

- Design from 360 px width first.
- Primary actions fixed near thumb reach, but never obscure cooking instructions.
- Use bottom navigation for primary app sections.
- Use sheets for filters and substitutions.
- Keep Tonight mode to 1 to 3 choices.
- Avoid heavy client bundles: lazy-load search, charts, and advanced planning.
- Use skeletons only where latency is unavoidable; prefer cached stale data.
- Cooking mode must work with screen always-on prompts, large text, and no horizontal scroll.

## 16. Authentication and Profiles

Use Supabase Auth:
- Email magic link and OAuth for beta.
- Anonymous trial profile optional, then upgrade to permanent account.
- Household membership for shared plans later.

Profile model:
- Stable identity: auth user.
- Preference facts: dietaries, budget, appliances, goals.
- Behavioural memory: cooked, abandoned, too hard, repeated, substitutions used.
- Context defaults: schedule, energy patterns, gym goals, household size.
- Pantry and inventory are household-scoped where shared.

Security:
- Enable RLS on all user-owned tables.
- Public catalogue reads through views or policies.
- Use service role only in server jobs and ingestion.

## 17. Analytics and Event Tracking

Track product learning, not vanity.

Core events:
- `onboarding_started`
- `onboarding_completed`
- `tonight_mode_selected`
- `recommendation_shown`
- `recommendation_selected`
- `recipe_added_to_plan`
- `grocery_list_created`
- `product_link_opened`
- `cooking_started`
- `step_help_opened`
- `panic_help_opened`
- `cooking_completed`
- `recipe_marked_too_hard`
- `recipe_repeated`
- `takeaway_rescue_used`

Activation metric:
- User completes onboarding, adds a recipe to plan, and starts cooking within 7 days.

Retention metric:
- User cooks or plans at least 2 meals in a rolling 7-day period.

North star:
- Home-cooked meals completed that users say were "realistic".

## 18. Error Handling

Frontend:
- Offline banner for network failures.
- Preserve active cooking session locally.
- Graceful empty states with a single next action.
- If recommendation fails, use cached emergency meals.

API:
- Typed errors: `VALIDATION_ERROR`, `AUTH_REQUIRED`, `NOT_FOUND`, `RATE_LIMITED`, `PRODUCT_MATCH_UNCERTAIN`, `INGESTION_REJECTED`.
- Include request IDs.
- Never expose service or provider errors directly.

Jobs:
- Idempotent ingestion and product refresh.
- Dead-letter queue for failed sources.
- Human review queue for uncertain canonicalization.

## 19. Cost Optimization

- Start with Postgres search before paying for external search.
- Batch analytics events.
- Use AI only on ingestion/admin paths or explicit premium interactions.
- Cache AI classifications and never re-run for unchanged input.
- Precompute recommendation features.
- Store image URLs where licensed; avoid proxying large images unless needed.
- Use edge caching for public recipe pages and taxonomy.
- Keep recommendation ranking deterministic for most users; reserve AI for explanation/simplification.

## 20. Testing Strategy

Unit:
- Ingredient parser.
- Unit conversion.
- Canonicalization.
- Grocery deduplication.
- Recommendation scoring.
- Dietary/allergen exclusion.

Integration:
- API route contract tests.
- Supabase RLS policy tests.
- Ingestion pipeline tests with fixture recipes.
- Product matching fallback tests.

E2E:
- Onboarding to recommendation.
- Tonight mode to cooking.
- Plan to grocery list.
- Pantry item affects grocery list.
- Mobile cooking mode.

Performance:
- Recipe search under target latency.
- Filter queries under indexed plans.
- Mobile Lighthouse budgets.

Accessibility:
- Keyboard navigation.
- Screen reader labels.
- Contrast.
- Reduced motion.
- Large text mode.

## 21. Deployment Pipeline

Branches:
- `main`: production.
- `staging`: beta.
- feature branches with preview deploys.

Pipeline:
1. Typecheck, lint, unit tests.
2. DB migration dry-run.
3. API contract tests.
4. Playwright mobile and desktop smoke tests.
5. Preview deploy.
6. Staging migration and seed.
7. Production deploy with migration gate.

Operational:
- Feature flags for recommendation changes.
- Rollback plan for migrations.
- Observability dashboards for API latency, error rate, search latency, recommendation acceptance, and job failures.

## 22. Security Considerations

- RLS enabled on all exposed Supabase tables.
- Service role never in client code.
- Validate all API input with shared schemas.
- Rate-limit recommendation, product matching, and ingestion endpoints.
- Sanitize imported recipe HTML.
- Store source URLs, licences, and ingestion provenance.
- Separate public recipe data from user-owned behavioural data.
- Encrypt sensitive tokens and partner API credentials.
- Audit product data permissions before storing or displaying retailer-specific data.

## 23. Legal and Compliance

Recipe data:
- Do not copy copyrighted recipe expression without permission.
- Store facts, original Cookr instructions, public-domain/permissively licensed content, or partner-licensed content.
- Keep source URL, licence, retrieved date, and transformation record.
- Human review before publishing imported recipes.

Product data:
- Woolworths NZ robots disallow `/shop/searchproducts` plus checkout/trolley/account paths, so scraping those paths is out of scope.
- Use manual mappings and search links until an approved API/feed/permission exists.
- Label prices as estimates.
- Do not use product images unless licensed.

Privacy:
- Treat diet, weight-loss, and health goals as sensitive preference data.
- Provide export/delete flows.
- Minimize analytics payloads and avoid raw free-text dislikes where possible.

Nutrition:
- Nutrition is estimated unless computed from a verified database.
- Avoid medical claims.
- Display uncertainty and source.

Reference sources checked during this design:
- Woolworths NZ `robots.txt`: https://www.woolworths.co.nz/robots.txt
- Woolworths NZ online shopping website and app terms: https://www.woolworths.co.nz/info/terms-and-conditions/online-shopping-website-and-app
- MBIE copyright guidance for New Zealand: https://www.mbie.govt.nz/business-and-employment/business/intellectual-property/copyright/copyright-protection-in-new-zealand
- Supabase RLS guidance: https://supabase.com/docs/guides/database/postgres/row-level-security

## 24. Roadmap: MVP to Scale

Phase 1 MVP:
- Next.js shell or current Vite prototype.
- Local seed recipes.
- Deterministic recommendation scoring.
- Grocery dedupe.
- Manual Woolworths search links.
- Basic analytics.

Phase 2 Polished Beta:
- Supabase auth and persisted profiles.
- Canonical ingredients and aliases.
- RLS-protected pantry, plans, feedback.
- Search documents and indexed filters.
- Recommendation feedback loop.
- Human-reviewed ingestion admin.

Phase 3 Launch-Ready:
- Production ingestion pipeline.
- Product matching review tooling.
- Robust error monitoring and analytics.
- Mobile performance hardening.
- Pricing estimate service.
- Accessibility pass.
- Legal/licence review workflow.

Phase 4 Growth:
- Native mobile app using same APIs.
- AI-assisted recipe simplification and substitutions.
- Premium high-protein, student, family, and shift-worker plans.
- Approved retailer integrations.
- Household collaboration.
- Personalized retention journeys.

## 25. Complexity and Risk Matrix

| Subsystem | Complexity | Risk | Notes |
| --- | --- | --- | --- |
| Next.js mobile UI | Medium | Medium | Main risk is interaction quality on low-end phones. |
| Supabase auth/RLS | Medium | High | Policy mistakes can leak data or block users. |
| Recipe schema/taxonomy | Medium | Medium | Over-modeling slows ingestion; under-modeling hurts search. |
| Ingredient canonicalization | High | High | Ambiguous food language and units are hard. |
| Unit conversion | High | Medium | Safe only with reviewed density data. |
| Recommendation engine | High | Medium | Start deterministic; learn from feedback later. |
| Grocery deduplication | Medium | Medium | Purchase forms and pantry subtraction need careful UX. |
| Woolworths integration | Medium | High | Legal/terms constraints are the main risk. |
| Product pricing | High | High | Availability and prices vary; needs permission or manual estimates. |
| Search | Medium | Medium | Postgres works early; external search later. |
| Recipe ingestion | High | High | Copyright, parsing quality, and data provenance. |
| Analytics | Low | Medium | Easy to over-collect; define events tightly. |
| Deployment | Medium | Medium | DB migrations and rollback must be disciplined. |
| Native mobile support | Medium | Low | Reusable APIs make this straightforward later. |
