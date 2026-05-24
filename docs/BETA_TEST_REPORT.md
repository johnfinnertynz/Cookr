# Cookr Real User Beta Pass

Date: 2026-05-24

## Scope

This pass simulated 20 first-time New Zealand beta testers across onboarding, recipe discovery, meal plan selection, grocery list creation, Woolworths search-link flow, and cooking mode entry.

The intent was not to add more features for their own sake. The pass focused on whether a tired, low-confidence, price-sensitive user would actually get to a cookable dinner without being misled.

## Persona Walkthrough Findings

| Persona | Onboarding shape | Meal found | Plan and list result | Woolworths flow | Cooking mode result | Friction found |
| --- | --- | --- | --- | --- | --- | --- |
| Complete beginner cook | Complete beginner, under 15 min, low confidence blockers | Student Peanut Noodles | Starter plan now uses top recommendations | Curated noodle, peanut butter, soy sauce links | Short steps and visual cue fit | Default plan previously ignored profile |
| Gym high-protein user | Gym schedule, high protein, bulk/cut | Beginner Butter Chicken Tray Bake | High-protein plan generated | Chicken/rice/sauce links available | Protein-rich cooking path clear | Needs more lean high-protein variety |
| Student on tight budget | Tight budget, student, stovetop/microwave | Student Peanut Noodles | Cheap list with pantry items checked | Cheap staples map cleanly | Low effort and 12 min | Catalogue needed more sub-$4 meals |
| Tired worker | Energy 1, under 15 min | Student Peanut Noodles | No-energy starter plan | Minimal products, pantry checks work | Low cognitive load | Needed stronger no-energy ranking |
| Parent cooking for family | Household 4, family meals | Family Sausage & Potato Tray Bake | Four-serving tray bake in plan | Sausages, potatoes, frozen veg mapped | Tray-bake steps clear | Family recipe was missing from catalogue |
| Picky eater | Dislikes fish and tuna | Student Peanut Noodles | Fish recipes no longer surface first | Links unaffected | Safe non-fish path | Dislikes previously only checked ingredient names |
| Vegetarian user | Vegetarian, budget/health | Student Peanut Noodles | Meat recipes excluded | Vegetarian pantry products map | Beginner path works | Vegetarian needed hard constraints |
| Air fryer only | Air fryer plus microwave | No-Cook Tuna Sushi Bowls, fish tacos, satay bowls | Only appliance-compatible recipes returned | Frozen fish/chicken search links available | Air fryer paths work | Appliance matching previously allowed impossible recipes |
| Reducing Uber Eats | Reduce takeaways, not enough time | Student Peanut Noodles | Fakeaway options near top | Search-link assistant avoids checkout claims | Cooking mode gives quick start | Needs more fakeaway categories |
| Random pantry ingredients | Rice, soy sauce, peanut butter, tuna | Student Peanut Noodles | Pantry overlap improves ranking | Pantry staples auto-check | "Use pantry" path works | Pantry scoring needed a stronger boost |
| Shift worker late | Shift worker, energy 1, under 15 | Student Peanut Noodles | Fast plan selected | Small shop | Cooking mode avoids long prep | Needs late-night copy and more microwave meals |
| ADHD low dishes | Too many steps/dishes, one-pot/no-cook | No-Cook Tuna Sushi Bowls | Minimal dishes plan | Tuna/rice search links | One step at a time helps | Default filters hid viable options |
| Depressed/low-energy user | Energy 1, afraid of messing up | Student Peanut Noodles | Low effort plan | Few products, pantry auto-checks | Panic help visible | Needs more compassionate empty states |
| Student vegetarian | Vegetarian, tight budget | Student Peanut Noodles | Cheap vegetarian plan | Vegetarian staples map well | Beginner path works | More vegan/vegetarian protein needed |
| Parent with picky kids | Family, dislikes spicy/fish | Family Sausage & Potato Tray Bake | Comfort food now ranks first | Kid-safe products map | Tray-bake steps work | "Spicy" needed flavor-level detection |
| Microwave-only user | Microwave only, under 15 | No-Cook Tuna Sushi Bowls | Only microwave-compatible match | Rice/tuna/cucumber links | No stovetop needed | Previously got stovetop/air fryer recipes |
| Stovetop-only user | Stovetop, one-pot | Student Peanut Noodles | Stovetop-only plan | Staples map | Good one-pot path | Needs non-noodle stovetop variety |
| Vegan user | Vegan, tight budget | Chickpea Coconut Curry | Vegan hard constraint works | Chickpea/coconut/rice links map | Simple simmer path | Only one vegan recipe in seed set |
| Halal-aware user | Halal, no pork | Student Peanut Noodles | No pork recipes surfaced | Links safe but not certified | Cooking flow fine | Halal is preference-only, not certification |
| No pantry user | Empty pantry, no ingredients blocker | Five-Ingredient Pita Pizzas | Full list generated | All products have search links | Easy oven path | Needs "starter shop" bundle later |
| Vegan microwave-only edge | Vegan plus microwave only | No matches | Safe empty state path | No misleading product list | Cooking mode blocked with setup edit | Requires more seed coverage before launch |

## Bugs Found And Fixed

- Starter plan ignored onboarding and defaulted to meat-heavy meals. Onboarding now builds the first plan from the user's ranked recommendations.
- "No restrictions" could coexist with vegetarian/vegan. Dietary chips are now mutually sensible.
- Appliance-only users could receive impossible recipes. Recommendations now apply hard appliance constraints using primary appliances.
- Vegan and vegetarian preferences were soft penalties. They are now hard constraints.
- Picky users who wrote "spicy" still saw curry/satay first. Flavor-level disliked matching now penalizes spicy-leaning recipes.
- Recipe cards said "In plan" while still acting as a remove button. Selected cards now say "Remove".
- The recipe detail CTA always said "Add to plan". It now toggles between add and remove.
- Default "easy/fast" filtering hid relevant first recommendations for family and batch-cook users. New onboarding clears filters.
- Wrapper and pita quantities used "pack" as the shopping quantity. These now use "each" so duplicate merging is less misleading.
- Several new ingredients fell back to low-confidence Woolworths searches. Curated search-link matches were added.
- No-match profiles could still see an impossible fallback. The home and cooking views now show a safe setup-edit state when no recipe is cookable.
- The sticky onboarding CTA crowded blocker chips on small phones. On narrow screens it now sits in normal flow instead of covering choices.

## UX Improvements Made

- Added four real beta-seed recipes for missing high-value segments: air fryer high-protein, student budget, vegan/vegetarian pantry, and family comfort.
- Improved recommendation scoring for complete beginners, tight budgets, students, shift workers, family households, gym users, pantry use, and low-energy modes.
- Added an "Edit setup" path from the weekly plan panel for users who immediately realize their profile was wrong.
- Made active recipe and selected plan recipes respect hard dietary/appliance constraints so old local state cannot keep unsafe meals in the visible plan.
- Kept Woolworths integration compliant as user-controlled search links with estimated prices and confidence labels.

## Remaining Blockers

- Recipe catalogue is still too small for production. Launch needs at least 80 to 120 curated recipes, including more vegan, halal-aware, gluten-free, microwave-only, and air-fryer-only options.
- Nutrition and pricing are estimates, not verified per serving from authoritative product data.
- Halal, gluten-free, dairy-free, and allergen handling are not certified and must be framed carefully in app copy and policies.
- There is no real account sync, Supabase integration, or remote analytics pipeline yet.
- Woolworths links are search-link prototypes only; no product availability, store-specific pricing, or basket automation.
- Offline behavior is local-only. It is adequate for an MVP PWA but not full mobile app resilience.

## Launch Readiness Score

Beta launch readiness: 62/100

This is now credible for a small internal/TestFlight-style beta with clear disclaimers. It is not ready for broad public launch until catalogue depth, account sync, data governance, and policy copy are improved.

## Top 10 Next Improvements

1. Expand the seed catalogue to 100 Cookr-original recipes with explicit appliance, diet, energy, and budget coverage.
2. Add a true weekly planner with automatic ingredient-overlap optimization.
3. Add "starter shop" bundles for users with an empty pantry.
4. Add recipe variants: easier, cheaper, higher protein, vegetarian, and no-chop.
5. Add dietary/allergen warning copy and stronger profile validation.
6. Add Supabase auth, RLS-backed profiles, saved plans, events, and sync.
7. Add structured analytics dashboards for onboarding drop-off, plan creation, list generation, and cook completion.
8. Add store-aware product confidence and cached price snapshots from permitted data sources only.
9. Add real PWA install prompts, icons, offline recipe caches, and mobile safe-area QA.
10. Add beta feedback capture after cooking and after abandoning a recipe.

## Growth Pass Repeat

Date: 2026-05-24

After the beta pass, the top 10 improvements were implemented in MVP form and the real-user simulation was repeated.

### Improvements Added

- Catalogue expanded to 112 Cookr-original recipes using reusable growth templates and no scraped copyrighted instructions.
- Weekly planner added with tonight, repeat, rescue, batch, and ingredient-overlap slots.
- Starter pantry bundle added with Woolworths NZ search links for high-leverage staples.
- Recipe detail now suggests easier, cheaper, higher-protein, vegetarian, and no-chop swaps.
- Dietary/allergen caution copy added to onboarding, recipe detail, learn, and pantry surfaces.
- Supabase magic-link bridge added behind `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, with local-only fallback.
- On-device analytics dashboard added for onboarding, saves, cooks, lists, product clicks, and feedback.
- Shopping list now shows price-confidence summaries across high/medium/low product matches.
- PWA manifest and service worker improved with shortcuts, app install surface, offline navigation fallback, and shell caching.
- Post-cook and abandonment feedback capture added.

### Repeated Persona Results

| Persona | Top recommendation after growth pass | Weekly plan | Remaining friction |
| --- | --- | --- | --- |
| Complete beginner | Garlic Herb Microwave Egg Mug Rice | 4 slots | More non-egg microwave meals would help. |
| Gym/high-protein | Beginner Butter Chicken Tray Bake | 4 slots | Needs macro-verified nutrition later. |
| Student tight budget | Student Peanut Noodles | 4 slots | Cheap variety improved, but prices remain estimates. |
| Tired worker | Garlic Herb Microwave Egg Mug Rice | 4 slots | Strong low-energy path now. |
| Parent/family | Family Sausage & Potato Tray Bake | 4 slots | Needs more kid-specific picky filters. |
| Picky no fish | Student Peanut Noodles | 3 slots | Fish/tuna avoidance held. |
| Vegetarian | Student Peanut Noodles | 3 slots | More balanced vegetarian protein still needed. |
| Air fryer only | No-Cook Hummus Salad Wraps | 4 slots | No-cook is viable, but air-fryer-first ranking can improve. |
| Trying to stop Uber Eats | Student Peanut Noodles | 3 slots | Fakeaway variety improved. |
| Random pantry | Student Peanut Noodles | 4 slots | Pantry scoring works. |
| Shift worker late | Garlic Herb Microwave Egg Mug Rice | 4 slots | Late-night path is much safer. |
| ADHD low dishes | Garlic Herb Microwave Egg Mug Rice | 4 slots | One-step mode remains key. |
| Depressed low energy | Garlic Herb Microwave Egg Mug Rice | 4 slots | Copy should be tested with real users for tone. |
| Student vegetarian | Student Peanut Noodles | 4 slots | Good budget fit. |
| Parent picky kids | Family Sausage & Potato Tray Bake | 3 slots | Spice/fish avoidance held. |
| Microwave-only | Garlic Herb Microwave Egg Mug Rice | 4 slots | Previously weak, now covered. |
| Stovetop-only | Student Peanut Noodles | 4 slots | Strong coverage. |
| Vegan | Chickpea Coconut Curry in a Hurry | 3 slots | Vegan coverage improved but still narrower. |
| Halal-aware | Student Peanut Noodles | 3 slots | Halal remains non-certified and must be labelled carefully. |
| No pantry | Garlic Herb Microwave Egg Mug Rice | 4 slots | Starter pantry bundle now gives a next step. |
| Gluten-free beginner | Garlic Herb Microwave Egg Mug Rice | 4 slots | Gluten-risk filtering works, but not certified. |
| Dairy-free air fryer | No-Cook Tuna Sushi Bowls | 4 slots | Dairy-risk filtering works, but not certified. |
| Vegan microwave-only edge | Garlic Herb Microwave Bean Potato Bowl | 4 slots | Previously no-match, now covered. |

Simulation result: 23/23 personas returned at least one hard-constraint-safe recommendation and a weekly plan.

Updated beta launch readiness: 74/100

Remaining blockers are now less about MVP UX and more about production trust: real user accounts, real data governance, pricing freshness, nutrition verification, and human-tested recipe quality.
